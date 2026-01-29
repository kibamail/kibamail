--[[
  Kibamail KumoMTA Test Policy

  Simplified policy for integration testing. This version:
  - Uses the control-plane-mock for API calls
  - Skips tenant DKIM signing (uses MTA DKIM only)
  - Accepts all SMTP auth (for easy testing)
  - Routes via SOCKS5 proxies to mailpit
]]

local kumo = require 'kumo'

-- =============================================================================
-- ENVIRONMENT CONFIGURATION
-- =============================================================================

local WEBHOOK_URL = os.getenv('WEBHOOK_URL') or 'http://control-plane-mock:3333/webhooks'
local MTA_HOSTNAME = os.getenv('MTA_HOSTNAME') or 'mail.kbmta.net'
local CONTROL_PLANE_URL = os.getenv('CONTROL_PLANE_URL') or 'http://control-plane-mock:3333'
local INTERNAL_SERVICE_KEY = os.getenv('INTERNAL_SERVICE_KEY') or 'test-internal-service-key'

-- TLS certificates
local TLS_CERT_PATH = '/opt/kumomta/etc/tls/fullchain.pem'
local TLS_KEY_PATH = '/opt/kumomta/etc/tls/privkey.pem'

-- =============================================================================
-- POLICY HELPERS SETUP
-- =============================================================================

local shaping = require 'policy-extras.shaping'
local sources = require 'policy-extras.sources'
local log_hooks = require 'policy-extras.log_hooks'

-- =============================================================================
-- WEBHOOK LOGGING TO CONTROL PLANE
-- =============================================================================
-- IMPORTANT: This must be called BEFORE the queues helper (shaper setup)
-- Events are sent to the configured WEBHOOK_URL as JSON batches
log_hooks:new_json {
  name = 'control_plane_webhook',
  url = WEBHOOK_URL,
  log_parameters = {
    headers = { 'Subject', 'X-Kibamail-Broadcast-Id', 'X-Kibamail-Contact-Id', 'X-Kibamail-Workspace-Id' },
  },
}

-- Setup traffic shaping with TSA automation
local shaper = shaping:setup_with_automation {
  publish = { 'http://127.0.0.1:8008' },
  subscribe = { 'http://127.0.0.1:8008' },
  extra_files = {
    '/opt/kumomta/share/policy-extras/shaping.toml',
    '/opt/kumomta/etc/policy/shaping.toml',
  },
}

-- Load egress sources and pools from TOML
sources:setup { '/opt/kumomta/etc/policy/sources.toml' }

-- MTA DKIM key path (for signing)
local MTA_DKIM_KEY_PATH = '/opt/kumomta/etc/dkim/kbmta.net/kbmta.key'
local MTA_DKIM_DOMAIN = 'kbmta.net'
local MTA_DKIM_SELECTOR = 'kbmta'

-- Check if DKIM key exists
local function file_exists(path)
  local f = io.open(path, 'r')
  if f then
    f:close()
    return true
  end
  return false
end

local HAS_DKIM_KEY = file_exists(MTA_DKIM_KEY_PATH)

-- Function to sign message with MTA DKIM key
local function sign_with_mta_dkim(msg)
  if not HAS_DKIM_KEY then
    kumo.log_info('Skipping DKIM signing - no key file found at ' .. MTA_DKIM_KEY_PATH)
    return
  end

  local mta_signer = kumo.dkim.rsa_sha256_signer {
    domain = MTA_DKIM_DOMAIN,
    selector = MTA_DKIM_SELECTOR,
    key = MTA_DKIM_KEY_PATH,
    headers = {
      'From', 'To', 'Subject', 'Date', 'Message-ID',
      'Reply-To', 'Cc', 'Content-Type', 'MIME-Version',
    },
    over_sign = true,
  }
  msg:dkim_sign(mta_signer)
end

-- =============================================================================
-- CACHING UTILITIES
-- =============================================================================

-- Cache for tenant DKIM keys (via control-plane-mock)
local get_tenant_dkim_key = kumo.memoize(function(domain)
  local client = kumo.http.build_client {
    timeout = '10s',
  }

  local response = client:post(CONTROL_PLANE_URL .. '/api/internal/v1/tenants/by-domain')
    :header('Authorization', 'Bearer ' .. INTERNAL_SERVICE_KEY)
    :header('Content-Type', 'application/json')
    :body(kumo.json_encode({ domain = domain }))
    :send()

  if response:status_code() ~= 200 then
    error('DKIM lookup failed for domain: ' .. domain)
  end

  local data = kumo.json_parse(response:text())

  if not data or not data.sending_domains or #data.sending_domains == 0 then
    error('DKIM not found for domain: ' .. domain)
  end

  local sd = data.sending_domains[1]

  if not sd.dkim_private_key or sd.dkim_private_key == '' then
    error('DKIM not configured for domain: ' .. domain)
  end

  local selector = sd.dkim_sub_domain and sd.dkim_sub_domain:gsub('%._domainkey$', '') or 'kibamail'

  return {
    domain = sd.name,
    selector = selector,
    private_key = sd.dkim_private_key,
  }
end, {
  name = 'tenant_dkim_cache',
  ttl = '1 hour',
  capacity = 100,
})

-- =============================================================================
-- INITIALIZATION EVENT
-- =============================================================================

kumo.on('init', function()
  -- Define spools
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

  -- Configure local logging
  kumo.configure_local_logs {
    log_dir = '/var/log/kumomta',
    max_segment_duration = '60 seconds',
  }

  -- Configure bounce classifier
  kumo.configure_bounce_classifier {
    files = {
      '/opt/kumomta/share/bounce_classifier/iana.toml',
    },
  }

  -- ==========================================================================
  -- SMTP LISTENERS
  -- ==========================================================================

  -- Port 25: Inbound
  kumo.start_esmtp_listener {
    listen = '0.0.0.0:25',
    hostname = MTA_HOSTNAME,
    tls_private_key = TLS_KEY_PATH,
    tls_certificate = TLS_CERT_PATH,
    max_messages_per_connection = 100,
    max_recipients_per_message = 100,
    banner = MTA_HOSTNAME .. ' Kibamail ESMTP (Test)',
  }

  -- Port 587: Submission — relay only granted after successful SMTP AUTH
  kumo.start_esmtp_listener {
    listen = '0.0.0.0:587',
    hostname = MTA_HOSTNAME,
    tls_private_key = TLS_KEY_PATH,
    tls_certificate = TLS_CERT_PATH,
    max_messages_per_connection = 10000,
    max_recipients_per_message = 1000,
    banner = MTA_HOSTNAME .. ' Kibamail ESMTP (Test)',
  }

  -- ==========================================================================
  -- HTTP LISTENERS
  -- ==========================================================================

  kumo.start_http_listener {
    listen = '0.0.0.0:8000',
    trusted_hosts = { '0.0.0.0/0' },
  }

end)

-- =============================================================================
-- QUEUE CONFIGURATION
-- =============================================================================

kumo.on('get_queue_config', function(domain, tenant, campaign, routing_domain)
  -- Read pool from message metadata, default to marketing
  return kumo.make_queue_config {
    egress_pool = 'marketing',
    max_age = '24 hours',
    retry_interval = '1 minute',
    max_retry_interval = '10 minutes',
  }
end)

-- =============================================================================
-- TRAFFIC SHAPING
-- =============================================================================

kumo.on('get_egress_path_config', shaper.get_egress_path_config)

-- =============================================================================
-- SMTP AUTHENTICATION (Accept anything for testing)
-- =============================================================================

kumo.on('smtp_server_auth_plain', function(authz, authc, password, conn_meta)
  -- For testing, accept any non-empty credentials
  if password == '' then
    return false
  end

  -- Store metadata
  conn_meta:set('auth_user', authc)
  conn_meta:set('workspace_id', 'test-workspace')

  kumo.log_info('Test auth accepted for user: ' .. authc)
  return true
end)

-- =============================================================================
-- LISTENER DOMAINS
-- =============================================================================

kumo.on('get_listener_domain', function(domain, listener, conn_meta)
  -- Authenticated connections (port 587) can relay to any domain
  local auth_user = conn_meta:get_meta('auth_user')
  if auth_user then
    return kumo.make_listener_domain {
      relay_to = true,
    }
  end

  -- Accept DMARC reports
  if domain == 'dmarc.kbmta.net' then
    return kumo.make_listener_domain {
      relay_to = true,
    }
  end

  -- Accept bounce domains
  if domain:match('^kb%.') then
    return kumo.make_listener_domain {
      log_oob = 'LogThenDrop',
      log_arf = 'LogThenDrop',
    }
  end

  -- Reject unknown domains
  return nil
end)

-- =============================================================================
-- MESSAGE RECEIVED (SMTP INJECTION)
-- =============================================================================

kumo.on('smtp_server_message_received', function(msg)
  msg:check_fix_conformance(
    'MISSING_DATE_HEADER|MISSING_MESSAGE_ID_HEADER|MISSING_MIME_VERSION',
    'MISSING_DATE_HEADER|MISSING_MESSAGE_ID_HEADER|MISSING_MIME_VERSION'
  )

  -- Import tracking headers
  msg:import_x_headers {
    'X-Kibamail-Broadcast-Id',
    'X-Kibamail-Contact-Id',
    'X-Kibamail-Workspace-Id',
    'X-Kibamail-Email-Send-Id',
    'X-Kibamail-Pool',
  }

  -- Set pool from header or default
  local pool = msg:get_meta('kibamail_pool') or 'marketing'
  msg:set_meta('egress_pool', pool)

  -- Determine if connection is authenticated
  local conn_meta_ok, conn_meta = pcall(function() return msg:conn_meta() end)
  local is_authenticated = false
  if conn_meta_ok and conn_meta then
    local auth_user = conn_meta:get('auth_user') or ''
    is_authenticated = (auth_user ~= '')
  end

  -- Tenant DKIM signing with enforcement for authenticated senders
  local from_header = msg:from_header()
  local sender_domain = from_header and from_header.domain or nil

  if sender_domain then
    local ok, tenant_dkim = pcall(get_tenant_dkim_key, sender_domain)

    if ok and tenant_dkim and tenant_dkim.private_key then
      local tenant_signer = kumo.dkim.rsa_sha256_signer {
        domain = tenant_dkim.domain,
        selector = tenant_dkim.selector,
        key = {
          key_data = tenant_dkim.private_key,
        },
        headers = {
          'From', 'To', 'Subject', 'Date', 'Message-ID',
          'Reply-To', 'Cc', 'Content-Type', 'MIME-Version',
        },
        over_sign = true,
      }
      msg:dkim_sign(tenant_signer)
    elseif is_authenticated then
      kumo.reject(550, '5.7.1 DKIM not configured or verified for sender domain')
      return
    end
  end

  -- Sign with MTA DKIM
  sign_with_mta_dkim(msg)
end)

-- =============================================================================
-- HTTP MESSAGE INJECTION
-- =============================================================================

kumo.on('http_message_generated', function(msg)
  -- Build Received header
  local from_header = msg:from_header()
  local sender_domain = from_header and from_header.domain or 'unknown'
  local recipient = msg:recipient()
  local recipient_email = recipient and recipient.email or 'unknown'
  local msg_id = msg:id()
  local timestamp = os.date('!%a, %d %b %Y %H:%M:%S +0000')

  local custom_received = string.format(
    'from %s by %s with ESMTP id %s for <%s>; %s',
    sender_domain,
    MTA_HOSTNAME,
    msg_id,
    recipient_email,
    timestamp
  )

  msg:remove_all_named_headers('Received')
  msg:prepend_header('Received', custom_received)

  msg:check_fix_conformance(
    'MISSING_DATE_HEADER|MISSING_MESSAGE_ID_HEADER|MISSING_MIME_VERSION',
    'MISSING_DATE_HEADER|MISSING_MESSAGE_ID_HEADER|MISSING_MIME_VERSION'
  )

  -- Import tracking headers
  msg:import_x_headers {
    'X-Kibamail-Broadcast-Id',
    'X-Kibamail-Contact-Id',
    'X-Kibamail-Workspace-Id',
    'X-Kibamail-Email-Send-Id',
    'X-Kibamail-Pool',
  }

  -- Remove internal headers before sending
  msg:remove_all_named_headers('X-Kibamail-Pool')
  msg:remove_all_named_headers('X-Kibamail-Broadcast-Id')
  msg:remove_all_named_headers('X-Kibamail-Contact-Id')
  msg:remove_all_named_headers('X-Kibamail-Workspace-Id')
  msg:remove_all_named_headers('X-Kibamail-Email-Send-Id')

  -- Set pool from header or default
  local pool = msg:get_meta('kibamail_pool') or 'marketing'
  msg:set_meta('egress_pool', pool)

  -- Try tenant DKIM signing
  local sender_domain = from_header and from_header.domain or nil
  if sender_domain then
    local ok, tenant_dkim = pcall(get_tenant_dkim_key, sender_domain)
    if ok and tenant_dkim and tenant_dkim.private_key then
      local tenant_signer = kumo.dkim.rsa_sha256_signer {
        domain = tenant_dkim.domain,
        selector = tenant_dkim.selector,
        key = {
          key_data = tenant_dkim.private_key,
        },
        headers = {
          'From', 'To', 'Subject', 'Date', 'Message-ID',
          'Reply-To', 'Cc', 'Content-Type', 'MIME-Version',
        },
        over_sign = true,
      }
      msg:dkim_sign(tenant_signer)
    end
  end

  -- MTA DKIM signing
  sign_with_mta_dkim(msg)
end)

-- =============================================================================
-- HTTP AUTHENTICATION (Accept anything for testing)
-- =============================================================================

kumo.on('http_server_validate_auth_basic', function(user, password)
  if password == '' then
    return false
  end
  return true
end)

-- =============================================================================
-- LOGGING
-- =============================================================================

kumo.on('should_enqueue_log_record', function(msg, hook_name)
  -- Log everything for testing
  return true
end)

kumo.on('get_log_custom_meta', function(record)
  local msg = record:get_message()
  if not msg then
    return nil
  end

  local meta = msg:get_meta_all()
  local custom = {}

  for k, v in pairs(meta) do
    if type(v) == 'string' or type(v) == 'number' or type(v) == 'boolean' then
      custom[k] = tostring(v)
    end
  end

  return custom
end)
