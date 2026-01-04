--[[
Initialization script for OpenResty TLS sidecar

Validates required environment variables at startup.
Fails fast if configuration is missing.
]]--

local config = require "config"

-- Validate required environment variables
local function validate_env()
    local errors = {}

    if not config.INTERNAL_API_URL or config.INTERNAL_API_URL == "" then
        table.insert(errors, "INTERNAL_API_URL is required")
    end

    if not config.INTERNAL_SERVICE_KEY or config.INTERNAL_SERVICE_KEY == "" then
        table.insert(errors, "INTERNAL_SERVICE_KEY is required")
    end

    if #errors > 0 then
        for _, err in ipairs(errors) do
            ngx.log(ngx.ERR, "Configuration error: ", err)
        end
        error("Missing required environment variables: " .. table.concat(errors, ", "))
    end

    ngx.log(ngx.INFO, "TLS sidecar initialized successfully")
    ngx.log(ngx.INFO, "INTERNAL_API_URL: ", config.INTERNAL_API_URL)
end

validate_env()
