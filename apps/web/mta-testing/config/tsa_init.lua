--[[
  Kibamail TSA (Traffic Shaping Automation) Daemon Configuration
  Test environment version
]]

local tsa = require 'tsa'
local kumo = require 'kumo'

-- =============================================================================
-- ENVIRONMENT CONFIGURATION
-- =============================================================================

local TSA_LISTEN_PORT = os.getenv('TSA_LISTEN_PORT') or '8008'

-- =============================================================================
-- SHAPING DATA LOADING
-- =============================================================================

local cached_load_shaping_data = kumo.memoize(kumo.shaping.load, {
  name = 'tsa_load_shaping_data',
  ttl = '5 minutes',
  capacity = 1,
})

kumo.on('tsa_load_shaping_data', function()
  local shaping = cached_load_shaping_data {
    '/opt/kumomta/share/policy-extras/shaping.toml',
    '/opt/kumomta/etc/policy/shaping.toml',
  }
  return shaping
end)

-- =============================================================================
-- TSA INITIALIZATION
-- =============================================================================

kumo.on('tsa_init', function()
  tsa.start_http_listener {
    listen = '0.0.0.0:' .. TSA_LISTEN_PORT,
    trusted_hosts = {
      '127.0.0.1',
      '::1',
      '172.30.0.0/16',
    },
  }
end)
