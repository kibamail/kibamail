--[[
  Kibamail TSA (Traffic Shaping Automation) Daemon Configuration

  This daemon:
  - Monitors SMTP responses from mailbox providers
  - Adjusts traffic shaping rules in real-time
  - Uses Redis for distributed state across cluster nodes
  - Responds to tempfails, rate limits, and blocklisting
]]

local tsa = require 'tsa'
local kumo = require 'kumo'

-- =============================================================================
-- ENVIRONMENT CONFIGURATION (all required, no defaults)
-- =============================================================================

local REDIS_URL = os.getenv('REDIS_URL')
local TSA_LISTEN_PORT = os.getenv('TSA_LISTEN_PORT') or '8008'

-- =============================================================================
-- SHAPING DATA LOADING (REQUIRED FOR TSA)
-- =============================================================================

-- Cache for shaping data to avoid reloading on every request
local cached_load_shaping_data = kumo.memoize(kumo.shaping.load, {
  name = 'tsa_load_shaping_data',
  ttl = '5 minutes',
  capacity = 1,
})

-- This event is REQUIRED - TSA daemon calls it to load shaping rules
kumo.on('tsa_load_shaping_data', function()
  local shaping = cached_load_shaping_data {
    -- Community shaping rules (bundled with KumoMTA)
    '/opt/kumomta/share/policy-extras/shaping.toml',
    -- Custom shaping rules
    '/opt/kumomta/etc/policy/shaping.toml',
  }
  return shaping
end)

-- =============================================================================
-- TSA INITIALIZATION
-- =============================================================================

kumo.on('tsa_init', function()
  -- Start HTTP listener for KumoMTA nodes to connect
  tsa.start_http_listener {
    listen = '0.0.0.0:' .. TSA_LISTEN_PORT,
    trusted_hosts = {
      '127.0.0.1',
      '::1',
      '10.0.0.0/8',
    },
  }
end)

-- Note: Automation rules are defined in shaping.toml using the [automation]
-- section with regex patterns for matching SMTP responses and triggering
-- actions like Suspend, Throttle, etc.
