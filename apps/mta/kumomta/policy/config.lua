--[[
  Environment configuration and shared constants.
  Loaded first by init.lua — all other modules depend on this.
]]

local config = {}

-- Environment variables
config.WEBHOOK_URL = os.getenv('WEBHOOK_URL')
config.MTA_HOSTNAME = os.getenv('MTA_HOSTNAME')
config.CONTROL_PLANE_URL = os.getenv('CONTROL_PLANE_URL')
config.INTERNAL_SERVICE_KEY = os.getenv('INTERNAL_SERVICE_KEY')
config.TRUSTED_HOSTS = os.getenv('TRUSTED_HOSTS') or '127.0.0.1,::1'

-- Parse comma-separated trusted hosts into a table
function config.parse_trusted_hosts(hosts_str)
  local hosts = {}
  for host in string.gmatch(hosts_str, '([^,]+)') do
    local trimmed = host:match('^%s*(.-)%s*$')  -- Trim whitespace
    if trimmed and trimmed ~= '' then
      table.insert(hosts, trimmed)
    end
  end
  return hosts
end

config.trusted_hosts_list = config.parse_trusted_hosts(config.TRUSTED_HOSTS)

-- TLS certificates (standard location)
config.TLS_CERT_PATH = '/opt/kumomta/etc/tls/fullchain.pem'
config.TLS_KEY_PATH = '/opt/kumomta/etc/tls/privkey.pem'

-- Validate required environment variables
local required_envs = {
  'CONTROL_PLANE_URL',
  'INTERNAL_SERVICE_KEY',
  'WEBHOOK_URL',
  'MTA_HOSTNAME',
}

for _, env_name in ipairs(required_envs) do
  if not os.getenv(env_name) or os.getenv(env_name) == '' then
    error('Required environment variable ' .. env_name .. ' is not set')
  end
end

-- Tracking headers shared between SMTP and HTTP handlers
config.TRACKING_HEADERS = {
  'X-Kibamail-Broadcast-Id',
  'X-Kibamail-Contact-Id',
  'X-Kibamail-Workspace-Id',
  'X-Kibamail-Email-Send-Id',
  'X-Kibamail-Pool',
  'X-Kibamail-Sending-Domain-Id',
  'X-Kibamail-Sender-Identity-Id',
  'X-Kibamail-Click-Tracking',
  'X-Kibamail-Open-Tracking',
}

return config
