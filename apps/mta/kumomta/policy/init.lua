--[[
  Kibamail KumoMTA Production Policy

  This policy implements:
  - 2-fold DKIM signing (MTA + Tenant)
  - SMTP credential validation via Email Agent
  - Listener domain validation via Email Agent (for bounces/FBL)
  - DMARC aggregate report reception and forwarding to Email Agent
  - Marketing pool with round-robin IP distribution
  - TSA integration with Redis
  - Webhook logging to Email Agent
]]

local kumo = require 'kumo'
local utils = require 'policy-extras.policy_utils'

-- =============================================================================
-- ENVIRONMENT CONFIGURATION (all required, no defaults)
-- =============================================================================

local EMAIL_AGENT_URL = os.getenv('EMAIL_AGENT_URL')
local WEBHOOK_URL = os.getenv('WEBHOOK_URL')
local MTA_HOSTNAME = os.getenv('MTA_HOSTNAME')

-- TLS certificates (standard location)
local TLS_CERT_PATH = '/opt/kumomta/etc/tls/fullchain.pem'
local TLS_KEY_PATH = '/opt/kumomta/etc/tls/privkey.pem'

-- Validate required environment variables
local required_envs = {
  'EMAIL_AGENT_URL',
  'WEBHOOK_URL',
  'MTA_HOSTNAME',
}

for _, env_name in ipairs(required_envs) do
  if not os.getenv(env_name) or os.getenv(env_name) == '' then
    error('Required environment variable ' .. env_name .. ' is not set')
  end
end

-- =============================================================================
-- POLICY HELPERS SETUP
-- =============================================================================

local shaping = require 'policy-extras.shaping'
local sources = require 'policy-extras.sources'

-- Setup traffic shaping with TSA automation
local shaper = shaping:setup_with_automation {
  publish = { 'http://127.0.0.1:8008' },
  subscribe = { 'http://127.0.0.1:8008' },
  extra_files = {
    '/opt/kumomta/share/community/shaping.toml',
    '/opt/kumomta/etc/policy/shaping.toml',
  },
}

-- Load egress sources and pools from TOML (source of truth)
sources:setup { '/opt/kumomta/etc/policy/sources.toml' }

-- MTA DKIM key path (for 2-fold signing)
local MTA_DKIM_KEY_PATH = '/opt/kumomta/etc/dkim/kbmta.net/kbmta.key'
local MTA_DKIM_DOMAIN = 'kbmta.net'
local MTA_DKIM_SELECTOR = 'kbmta'

-- Function to sign message with MTA DKIM key (third-party signature)
-- This adds the ESP/MTA signature to ALL outbound messages
local function sign_with_mta_dkim(msg)
  local mta_signer = kumo.dkim.rsa_sha256_signer {
    domain = MTA_DKIM_DOMAIN,
    selector = MTA_DKIM_SELECTOR,
    key = MTA_DKIM_KEY_PATH,
    headers = {
      'From', 'To', 'Subject', 'Date', 'Message-ID',
      'Reply-To', 'Cc', 'Content-Type', 'MIME-Version',
      'Sender',
    },
    over_sign = true,
  }
  msg:dkim_sign(mta_signer)
end

-- =============================================================================
-- CACHING UTILITIES
-- =============================================================================

-- Cache for tenant DKIM keys (24 hour TTL)
local get_tenant_dkim_key = kumo.memoize(function(domain)
  local client = kumo.http.build_client {
    timeout = '10s',
  }

  local response = client:get(EMAIL_AGENT_URL .. '/api/v1/dkim/' .. domain):send()

  if response:status_code() ~= 200 then
    return nil
  end

  local data = kumo.json_parse(response:text())

  if not data or not data.private_key then
    return nil
  end

  -- Private key comes from email agent in plain text (PEM format)
  return {
    domain = data.domain,
    selector = data.selector or 'kibamail',
    private_key = data.private_key,
    algorithm = data.algorithm or 'rsa-sha256',
  }
end, {
  name = 'tenant_dkim_cache',
  ttl = '24 hours',
  capacity = 10000,
})

-- Cache for listener domain validation (24 hour TTL)
-- Validates if a domain is a known tenant bounce domain via Email Agent
local validate_listener_domain = kumo.memoize(function(domain)
  local client = kumo.http.build_client {
    timeout = '5s',
  }

  local response = client:get(EMAIL_AGENT_URL .. '/api/v1/domains/validate-listener/' .. domain):send()

  if response:status_code() ~= 200 then
    return false
  end

  -- Parse JSON response and check valid field
  local data = kumo.json_parse(response:text())
  return data and data.valid == true
end, {
  name = 'listener_domain_cache',
  ttl = '24 hours',
  capacity = 10000,
})

-- Validate credentials via Email Agent (no caching - always verify)
local function validate_credentials(username, password)
  local client = kumo.http.build_client {
    timeout = '10s',
  }

  local response = client:post(EMAIL_AGENT_URL .. '/api/v1/auth/validate')
    :header('Content-Type', 'application/json')
    :body(kumo.json_encode({
      username = username,
      password = password,
    }))
    :send()

  if response:status_code() ~= 200 then
    return nil
  end

  return kumo.json_parse(response:text())
end

-- =============================================================================
-- INITIALIZATION EVENT
-- =============================================================================

kumo.on('init', function()
  -- Define RocksDB spools for high performance
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

  -- Configure local logging (compressed JSON)
  kumo.configure_local_logs {
    log_dir = '/var/log/kumomta',
    max_segment_duration = '60 seconds',
  }

  -- Configure bounce classifier (standards + community rules)
  kumo.configure_bounce_classifier {
    files = {
      '/opt/kumomta/share/bounce_classifier/iana.toml',
      '/opt/kumomta/share/community/bounces.toml',
    },
  }

  -- ==========================================================================
  -- SMTP LISTENERS
  -- ==========================================================================

  -- Port 25: Inbound for bounces, feedback loops, and DMARC reports
  -- No relay_hosts = only accept mail to listener domains (not open relay)
  kumo.start_esmtp_listener {
    listen = '0.0.0.0:25',
    hostname = MTA_HOSTNAME,
    tls_private_key = TLS_KEY_PATH,
    tls_certificate = TLS_CERT_PATH,
    max_messages_per_connection = 100,
    max_recipients_per_message = 1,  -- Bounces are single recipient
    banner = MTA_HOSTNAME .. ' Kibamail ESMTP',
  }

  -- Port 587: Submission with authentication
  kumo.start_esmtp_listener {
    listen = '0.0.0.0:587',
    hostname = MTA_HOSTNAME,
    relay_hosts = { '0.0.0.0/0' },  -- Relay allowed (with auth)
    tls_private_key = TLS_KEY_PATH,
    tls_certificate = TLS_CERT_PATH,
    max_messages_per_connection = 10000,
    max_recipients_per_message = 1000,
    banner = MTA_HOSTNAME .. ' Kibamail ESMTP',
  }

  -- ==========================================================================
  -- HTTP LISTENERS
  -- ==========================================================================

  -- HTTP API (accessible from Docker network for health checks)
  kumo.start_http_listener {
    listen = '0.0.0.0:8000',
    trusted_hosts = { '127.0.0.1', '::1', '172.28.0.0/16' },
  }

  -- ==========================================================================
  -- WEBHOOK LOGGING TO EMAIL AGENT
  -- ==========================================================================

  -- Configure log hook for event tracking
  -- Events are sent to the configured WEBHOOK_URL via custom protocol handler
  kumo.configure_log_hook {
    name = 'email_agent_webhook',
    headers = { 'Subject', 'X-Kibamail-Broadcast-Id', 'X-Kibamail-Contact-Id', 'X-Kibamail-Workspace-Id' },
  }
end)

-- =============================================================================
-- QUEUE CONFIGURATION
-- =============================================================================

kumo.on('get_queue_config', function(domain, tenant, campaign, routing_domain)
  -- DMARC reports - forward to email agent via custom handler
  if domain == 'dmarc.kbmta.net' then
    return kumo.make_queue_config {
      protocol = {
        custom_lua = {
          constructor = 'make.dmarc_report_handler',
        },
      },
    }
  end

  -- Default: outbound marketing mail
  return kumo.make_queue_config {
    egress_pool = 'marketing',
    max_age = '24 hours',
    retry_interval = '10 minutes',
    max_retry_interval = '2 hours',
  }
end)

-- =============================================================================
-- TRAFFIC SHAPING
-- =============================================================================

kumo.on('get_egress_path_config', shaper.get_egress_path_config)

-- =============================================================================
-- DMARC REPORT HANDLER
-- =============================================================================

-- Custom handler to forward DMARC aggregate reports to Email Agent
-- Reports arrive as emails with gzipped XML attachments from providers like
-- Google, Microsoft, Yahoo, etc.
kumo.on('make.dmarc_report_handler', function(domain, tenant, campaign)
  local handler = {}

  function handler:send(message)
    local ok, err = pcall(function()
      -- Extract envelope information
      local recipient_obj = message:recipient()
      local sender_obj = message:sender()
      local recipient = recipient_obj and recipient_obj.email or 'unknown'
      local sender = sender_obj and sender_obj.email or 'unknown'

      -- Get raw message data (RFC822 format with headers and attachments)
      local raw_message = message:get_data()

      -- Forward to Email Agent for parsing and processing
      local client = kumo.http.build_client {
        timeout = '30s',
      }

      local response = client:post(EMAIL_AGENT_URL .. '/api/v1/dmarc/reports')
        :header('Content-Type', 'message/rfc822')
        :header('X-Dmarc-Recipient', recipient)
        :header('X-Dmarc-Sender', sender)
        :body(raw_message)
        :send()

      local status = response:status_code()

      if status >= 200 and status < 300 then
        kumo.log_info('DMARC report forwarded: to=' .. recipient .. ' from=' .. sender)
        return 'delivered'
      end

      kumo.log_error('DMARC report forward failed: to=' .. recipient .. ' status=' .. tostring(status))
      -- Return 400 to trigger retry, 500 for permanent failure
      if status >= 500 then
        kumo.reject(500, 'Permanent failure processing DMARC report')
      else
        kumo.reject(400, 'Temporary failure processing DMARC report')
      end
    end)

    if not ok then
      kumo.log_error('DMARC handler error: ' .. tostring(err))
      kumo.reject(400, 'DMARC handler error: ' .. tostring(err))
    end
  end

  return handler
end)

-- =============================================================================
-- SMTP AUTHENTICATION
-- =============================================================================

kumo.on('smtp_server_auth_plain', function(authz, authc, password, conn_meta)
  -- Reject empty passwords
  if password == '' then
    kumo.log_warn('Auth rejected: empty password for user ' .. authc)
    return false
  end

  -- Validate credentials via Email Agent (always verify, no caching)
  local auth_result = validate_credentials(authc, password)

  if not auth_result or not auth_result.valid then
    kumo.log_warn('Auth rejected: invalid credentials for user ' .. authc)
    return false
  end

  -- Store auth metadata for later use
  conn_meta:set('workspace_id', auth_result.workspaceId or '')
  conn_meta:set('auth_user', authc)

  kumo.log_info('Auth successful for user ' .. authc .. ' workspace ' .. (auth_result.workspaceId or 'unknown'))
  return true
end)

-- =============================================================================
-- LISTENER DOMAINS (Bounces and Feedback Loops)
-- =============================================================================

kumo.on('get_listener_domain', function(domain, listener, conn_meta)
  -- DMARC aggregate reports - accept and relay to queue for processing
  -- Reports sent to: re+<tracking>@dmarc.kbmta.net
  if domain == 'dmarc.kbmta.net' then
    return kumo.make_listener_domain {
      relay_to = true,  -- Accept and queue for delivery (to custom handler)
    }
  end

  -- Validate domain against Email Agent (cached for 24 hours)
  -- Email Agent checks if this is a known tenant bounce domain
  -- Example: kb.hq.kibamail.xyz -> validates tenant owns hq.kibamail.xyz
  if validate_listener_domain(domain) then
    return kumo.make_listener_domain {
      log_oob = 'LogThenDrop',  -- Parse OOB bounce, log to webhook, discard
      log_arf = 'LogThenDrop',  -- Parse ARF feedback, log to webhook, discard
    }
  end

  -- Domain not recognized - reject
  return nil
end)

-- =============================================================================
-- MESSAGE RECEIVED (SMTP INJECTION)
-- =============================================================================

kumo.on('smtp_server_message_received', function(msg)
  -- Validate and fix message conformance
  -- Syntax: check_fix_conformance(CHECK_FLAGS, FIX_FLAGS) where flags are pipe-separated
  msg:check_fix_conformance(
    'MISSING_DATE_HEADER|MISSING_MESSAGE_ID_HEADER|MISSING_MIME_VERSION',
    'MISSING_DATE_HEADER|MISSING_MESSAGE_ID_HEADER|MISSING_MIME_VERSION'
  )

  -- Import custom headers for tracking
  msg:import_x_headers {
    'X-Kibamail-Broadcast-Id',
    'X-Kibamail-Contact-Id',
    'X-Kibamail-Workspace-Id',
    'X-Kibamail-Email-Send-Id',
  }

  -- Get the workspace ID from auth metadata (if available)
  -- Note: conn_meta method may not exist for unauthenticated inbound connections (e.g., DMARC reports on port 25)
  -- We use pcall to safely handle this case
  local ok, conn_meta = pcall(function() return msg:conn_meta() end)
  if ok and conn_meta then
    local workspace_id = conn_meta:get('workspace_id') or ''
    if workspace_id ~= '' then
      msg:set_meta('workspace_id', workspace_id)
    end
  end

  -- Assign to marketing pool
  msg:set_meta('egress_pool', 'marketing')

  -- ==========================================================================
  -- 2-FOLD DKIM SIGNING
  -- ==========================================================================

  -- Skip DKIM signing for inbound messages (DMARC reports, bounces, etc.)
  -- These are received messages, not messages we're sending
  local recipient = msg:recipient()
  local recipient_domain = recipient and recipient.domain or nil

  -- Known inbound domains that should not be DKIM signed
  local inbound_domains = {
    ['dmarc.kbmta.net'] = true,
    -- Add other inbound domains here (bounces, FBL, etc.)
  }

  if recipient_domain and inbound_domains[recipient_domain] then
    -- This is an inbound message, skip DKIM signing
    return
  end

  -- Get sender domain for tenant DKIM signing
  local from_header = msg:from_header()
  local sender_domain = from_header and from_header.domain or nil

  -- 1. TENANT DKIM SIGNING (if domain key available)
  if sender_domain then
    local tenant_dkim = get_tenant_dkim_key(sender_domain)

    if tenant_dkim and tenant_dkim.private_key then
      local tenant_signer = kumo.dkim.rsa_sha256_signer {
        domain = tenant_dkim.domain,
        selector = tenant_dkim.selector,
        key = {
          key_data = tenant_dkim.private_key,
        },
        headers = {
          'From', 'To', 'Subject', 'Date', 'Message-ID',
          'Reply-To', 'Cc', 'Content-Type', 'MIME-Version',
          'List-Unsubscribe', 'List-Unsubscribe-Post',
        },
        over_sign = true,
      }

      msg:dkim_sign(tenant_signer)
      kumo.log_debug('Tenant DKIM signed for domain: ' .. sender_domain)
    else
      kumo.log_warn('No tenant DKIM key available for domain: ' .. sender_domain)
    end
  end

  -- 2. MTA DKIM SIGNING (third-party signature - MUST COME LAST)
  sign_with_mta_dkim(msg)
end)

-- =============================================================================
-- HTTP MESSAGE INJECTION
-- =============================================================================

kumo.on('http_message_generated', function(msg)
  -- Apply same processing as SMTP messages
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
  }

  -- Assign to marketing pool
  msg:set_meta('egress_pool', 'marketing')

  -- Get sender domain
  local from_header = msg:from_header()
  local sender_domain = from_header and from_header.domain or nil

  -- 1. TENANT DKIM SIGNING
  if sender_domain then
    local tenant_dkim = get_tenant_dkim_key(sender_domain)

    if tenant_dkim and tenant_dkim.private_key then
      local tenant_signer = kumo.dkim.rsa_sha256_signer {
        domain = tenant_dkim.domain,
        selector = tenant_dkim.selector,
        key = {
          key_data = tenant_dkim.private_key,
        },
        headers = {
          'From', 'To', 'Subject', 'Date', 'Message-ID',
          'Reply-To', 'Cc', 'Content-Type', 'MIME-Version',
          'List-Unsubscribe', 'List-Unsubscribe-Post',
        },
        over_sign = true,
      }

      msg:dkim_sign(tenant_signer)
    end
  end

  -- 2. MTA DKIM SIGNING (third-party signature - MUST COME LAST)
  sign_with_mta_dkim(msg)
end)

-- =============================================================================
-- HTTP AUTHENTICATION
-- =============================================================================

kumo.on('http_server_validate_auth_basic', function(user, password)
  if password == '' then
    return false
  end

  local auth_result = validate_credentials(user, password)

  return auth_result and auth_result.valid
end)

-- =============================================================================
-- LOGGING CONFIGURATION
-- =============================================================================

-- Log all events to webhook
kumo.on('log_record', function(record)
  local meta = record:get_meta()

  -- Ensure workspace tracking
  if meta.workspace_id then
    record:set_meta('workspace_id', meta.workspace_id)
  end
end)
