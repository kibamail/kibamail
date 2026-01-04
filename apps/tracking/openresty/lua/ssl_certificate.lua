--[[
Dynamic SSL Certificate Loading for OpenResty

Handles SNI-based certificate selection for customer tracking domains.
Fetches certificates from the internal API and caches them in shared memory.

Flow:
1. Extract hostname from SNI
2. Check shared memory cache
3. If not cached, fetch from internal API
4. Parse and set certificate/key
5. Fall back to default cert on any error
]]--

local ssl = require "ngx.ssl"
local http = require "resty.http"
local cjson = require "cjson.safe"
local config = require "config"

local function get_cert_from_cache(hostname)
    local cache = ngx.shared.ssl_certs

    local cert_pem = cache:get(hostname .. ":cert")
    local key_pem = cache:get(hostname .. ":key")

    if cert_pem and key_pem then
        return cert_pem, key_pem
    end

    return nil, nil
end

local function cache_cert(hostname, cert_pem, key_pem)
    local cache = ngx.shared.ssl_certs

    local ok, err = cache:set(hostname .. ":cert", cert_pem, config.CACHE_TTL)
    if not ok then
        ngx.log(ngx.WARN, "Failed to cache cert for ", hostname, ": ", err)
    end

    ok, err = cache:set(hostname .. ":key", key_pem, config.CACHE_TTL)
    if not ok then
        ngx.log(ngx.WARN, "Failed to cache key for ", hostname, ": ", err)
    end
end

local function fetch_cert_from_api(hostname)
    local httpc = http.new()
    httpc:set_timeout(config.API_TIMEOUT)

    local url = config.INTERNAL_API_URL .. "/api/internal/v1/ssl-certificates/" .. hostname

    local res, err = httpc:request_uri(url, {
        method = "GET",
        headers = {
            ["Authorization"] = "Bearer " .. config.INTERNAL_SERVICE_KEY,
            ["Accept"] = "application/json",
        },
        ssl_verify = false,
    })

    if not res then
        ngx.log(ngx.ERR, "Failed to fetch certificate for ", hostname, ": ", err)
        return nil, nil
    end

    if res.status == 404 then
        ngx.log(ngx.INFO, "No certificate found for hostname: ", hostname)
        return nil, nil
    end

    if res.status ~= 200 then
        ngx.log(ngx.ERR, "API returned status ", res.status, " for hostname: ", hostname)
        return nil, nil
    end

    local data, json_err = cjson.decode(res.body)
    if not data then
        ngx.log(ngx.ERR, "Failed to parse API response: ", json_err)
        return nil, nil
    end

    if data.certificate and data.privateKey then
        return data.certificate, data.privateKey
    end

    ngx.log(ngx.ERR, "API response missing certificate or privateKey")
    return nil, nil
end

local function set_dynamic_cert()
    local hostname, err = ssl.server_name()
    if not hostname then
        ngx.log(ngx.INFO, "No SNI hostname provided, using fallback cert")
        return
    end

    hostname = string.lower(hostname)

    local cert_pem, key_pem = get_cert_from_cache(hostname)

    if not cert_pem then
        cert_pem, key_pem = fetch_cert_from_api(hostname)

        if cert_pem and key_pem then
            cache_cert(hostname, cert_pem, key_pem)
        else
            ngx.log(ngx.INFO, "Using fallback cert for: ", hostname)
            return
        end
    end

    local ok, err = ssl.clear_certs()
    if not ok then
        ngx.log(ngx.ERR, "Failed to clear certs: ", err)
        return
    end

    local cert, err = ssl.parse_pem_cert(cert_pem)
    if not cert then
        ngx.log(ngx.ERR, "Failed to parse certificate for ", hostname, ": ", err)
        return
    end

    ok, err = ssl.set_cert(cert)
    if not ok then
        ngx.log(ngx.ERR, "Failed to set certificate for ", hostname, ": ", err)
        return
    end

    local key, err = ssl.parse_pem_priv_key(key_pem)
    if not key then
        ngx.log(ngx.ERR, "Failed to parse private key for ", hostname, ": ", err)
        return
    end

    ok, err = ssl.set_priv_key(key)
    if not ok then
        ngx.log(ngx.ERR, "Failed to set private key for ", hostname, ": ", err)
        return
    end
end

set_dynamic_cert()
