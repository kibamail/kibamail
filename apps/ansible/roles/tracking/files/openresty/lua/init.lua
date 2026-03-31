--[[
Initialization script for OpenResty dynamic SSL
Managed by Ansible - do not edit manually

Validates configuration at startup. Fails fast if configuration is missing.
]]--

local config = require "config"

local function validate_config()
    local errors = {}

    if not config.INTERNAL_API_URL or config.INTERNAL_API_URL == "" then
        table.insert(errors, "INTERNAL_API_URL is not configured")
    end

    if not config.INTERNAL_SERVICE_KEY or config.INTERNAL_SERVICE_KEY == "" then
        table.insert(errors, "INTERNAL_SERVICE_KEY is not configured")
    end

    if #errors > 0 then
        for _, err in ipairs(errors) do
            ngx.log(ngx.ERR, "Configuration error: ", err)
        end
        error("Missing required configuration: " .. table.concat(errors, ", "))
    end

    ngx.log(ngx.INFO, "OpenResty dynamic SSL initialized successfully")
    ngx.log(ngx.INFO, "INTERNAL_API_URL: ", config.INTERNAL_API_URL)
end

validate_config()
