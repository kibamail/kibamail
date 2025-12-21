--[[
  KumoMTA Policy for Integration Tests

  This policy configures KumoMTA to:
  1. Accept HTTP injection requests without authentication
  2. Actually deliver emails (DNS override routes them to mailpit)
  3. Send webhook notifications to the email-agent

  All emails are delivered to mailpit via DNS override (dnsmasq).
]]

local kumo = require 'kumo'
local log_hooks = require 'policy-extras.log_hooks'

-- Environment variables
local WEBHOOK_URL = os.getenv 'WEBHOOK_URL' or 'http://host.docker.internal:18080/webhooks'

-- Initialize KumoMTA
kumo.on('init', function()
  kumo.configure_accounting_db_path(os.tmpname())

  -- Start HTTP listener for injection API
  kumo.start_http_listener {
    listen = '0.0.0.0:8000',
    trusted_hosts = { '0.0.0.0/0', '::/0' },
  }

  -- Define spool locations using RocksDB
  kumo.define_spool {
    name = 'data',
    path = '/var/spool/kumomta/data',
    kind = 'RocksDB',
  }

  kumo.define_spool {
    name = 'meta',
    path = '/var/spool/kumomta/meta',
    kind = 'RocksDB',
  }

  -- Configure local logs for debugging
  kumo.configure_local_logs {
    log_dir = '/var/log/kumomta',
    max_segment_duration = '10 seconds',
    headers = { 'Subject', 'X-Kibamail-*' },
  }
end)

-- Configure webhook logging
log_hooks:new_json {
  name = 'webhook',
  url = WEBHOOK_URL,
  log_parameters = {
    headers = { 'Subject', 'X-Kibamail-*' },
  },
}

-- Allow all HTTP injection requests (no auth for testing)
kumo.on('http_server_validate_auth_header', function(auth_header)
  return true
end)

-- Process HTTP-injected messages
kumo.on('http_message_generated', function(msg)
  -- Extract tenant from headers for routing
  local tenant = msg:get_first_named_header_value('X-Kibamail-Tenant') or 'default'
  msg:set_meta('tenant', tenant)
  msg:set_meta('campaign', 'test')
end)

-- Queue configuration - use simple routing
kumo.on('get_queue_config', function(domain, tenant, campaign, routing_domain)
  return kumo.make_queue_config {
    -- Use default egress pool
    retry_interval = '1m',
    max_retry_interval = '5m',
    max_age = '10m',
  }
end)
