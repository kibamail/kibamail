--[[
Configuration module for OpenResty TLS sidecar

Loads configuration from environment variables.
No fallback values for secrets - we want failures to be explicit.
]]--

local _M = {}

-- Required: Internal API URL for fetching certificates
_M.INTERNAL_API_URL = os.getenv("INTERNAL_API_URL")

-- Required: Service key for authenticating with internal API
_M.INTERNAL_SERVICE_KEY = os.getenv("INTERNAL_SERVICE_KEY")

-- Cache settings
-- 7 days cache is safe since certificate renewal happens 30 days before expiry
_M.CACHE_TTL = 7 * 24 * 60 * 60  -- 7 days in seconds

-- API timeout
_M.API_TIMEOUT = 5000  -- 5 seconds

return _M
