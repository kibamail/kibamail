--[[
  Kibamail KumoMTA Production Policy

  This policy implements:
  - 2-fold DKIM signing (MTA + Tenant)
  - SMTP credential validation via Control Plane
  - Listener domain validation via Control Plane (for bounces/FBL)
  - DMARC aggregate report reception and forwarding to Control Plane
  - Inbox message reception and forwarding to Control Plane
  - Marketing pool with round-robin IP distribution
  - TSA integration with Redis
  - Webhook logging to Control Plane
]]

local kumo = require 'kumo'
local utils = require 'policy-extras.policy_utils'

-- =============================================================================
-- ENVIRONMENT CONFIGURATION (all required, no defaults)
-- =============================================================================

local WEBHOOK_URL = os.getenv('WEBHOOK_URL')
local MTA_HOSTNAME = os.getenv('MTA_HOSTNAME')
local CONTROL_PLANE_URL = os.getenv('CONTROL_PLANE_URL')
local INTERNAL_SERVICE_KEY = os.getenv('INTERNAL_SERVICE_KEY')
local TRUSTED_HOSTS = os.getenv('TRUSTED_HOSTS') or '127.0.0.1,::1'

-- Parse comma-separated trusted hosts into a table
local function parse_trusted_hosts(hosts_str)
  local hosts = {}
  for host in string.gmatch(hosts_str, '([^,]+)') do
    local trimmed = host:match('^%s*(.-)%s*$')  -- Trim whitespace
    if trimmed and trimmed ~= '' then
      table.insert(hosts, trimmed)
    end
  end
  return hosts
end

local trusted_hosts_list = parse_trusted_hosts(TRUSTED_HOSTS)

-- TLS certificates (standard location)
local TLS_CERT_PATH = '/opt/kumomta/etc/tls/fullchain.pem'
local TLS_KEY_PATH = '/opt/kumomta/etc/tls/privkey.pem'

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
    -- import_x_headers converts X-Kibamail-* headers to x_kibamail_* meta keys
    -- (lowercase, hyphens to underscores, X- prefix retained as x_)
    meta = { 'x_kibamail_broadcast_id', 'x_kibamail_contact_id', 'x_kibamail_workspace_id', 'x_kibamail_email_send_id', 'x_kibamail_pool' },
  },
}

-- Setup traffic shaping with TSA automation
local shaper = shaping:setup_with_automation {
  publish = { 'http://127.0.0.1:8008' },
  subscribe = { 'http://127.0.0.1:8008' },
  extra_files = {
    '/opt/kumomta/share/policy-extras/shaping.toml',
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
-- NOTE: This function throws an error on cache miss/not found, which prevents
-- memoize from caching negative results. Use pcall() when calling.
-- Uses existing endpoint: POST /api/internal/v1/tenants/by-domain
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
    error('DKIM lookup failed for domain: ' .. domain .. ' (status: ' .. response:status_code() .. ')')
  end

  local data = kumo.json_parse(response:text())

  -- Response format: { id, sending_domains: [{ dkim_private_key, dkim_sub_domain, dkim_verified_at, ... }] }
  if not data or not data.sending_domains or #data.sending_domains == 0 then
    error('DKIM not found for domain: ' .. domain)
  end

  local sd = data.sending_domains[1]

  -- Only return DKIM if it's verified and has a private key
  if not sd.dkim_private_key or sd.dkim_private_key == '' then
    error('DKIM not configured for domain: ' .. domain)
  end

  if not sd.dkim_verified_at then
    error('DKIM not verified for domain: ' .. domain)
  end

  -- Extract selector from dkim_sub_domain (e.g., "kibamail._domainkey" -> "kibamail")
  local selector = sd.dkim_sub_domain and sd.dkim_sub_domain:gsub('%._domainkey$', '') or 'kibamail'

  -- Private key comes from control plane in plain text (PEM format)
  return {
    domain = sd.name,
    selector = selector,
    private_key = sd.dkim_private_key,
    algorithm = 'rsa-sha256',
  }
end, {
  name = 'tenant_dkim_cache',
  ttl = '24 hours',
  capacity = 10000,
})

-- Cache for listener domain validation (24 hour TTL)
-- Validates if a domain is a known tenant bounce domain via Control Plane
-- Uses existing endpoint: POST /api/internal/v1/tenants/by-bounce-domain
local validate_listener_domain = kumo.memoize(function(domain)
  local client = kumo.http.build_client {
    timeout = '5s',
  }

  local response = client:post(CONTROL_PLANE_URL .. '/api/internal/v1/tenants/by-bounce-domain')
    :header('Authorization', 'Bearer ' .. INTERNAL_SERVICE_KEY)
    :header('Content-Type', 'application/json')
    :body(kumo.json_encode({ domain = domain }))
    :send()

  if response:status_code() ~= 200 then
    return false
  end

  -- Response format: { valid: true, workspace_id, sending_domain }
  local data = kumo.json_parse(response:text())
  return data and data.valid == true
end, {
  name = 'listener_domain_cache',
  ttl = '24 hours',
  capacity = 10000,
})

-- Cache for inbox domain validation (24 hour TTL)
-- Validates if a domain has inbox enabled and MX verified via Control Plane
-- Uses existing endpoint: POST /api/internal/v1/sending-domains/validate-inbox/:domain
local validate_inbox_domain = kumo.memoize(function(domain)
  if not CONTROL_PLANE_URL or CONTROL_PLANE_URL == '' then
    return { valid = false }
  end

  local client = kumo.http.build_client {
    timeout = '5s',
  }

  local ok, response = pcall(function()
    return client:post(CONTROL_PLANE_URL .. '/api/internal/v1/sending-domains/validate-inbox/' .. domain)
      :header('Authorization', 'Bearer ' .. INTERNAL_SERVICE_KEY)
      :header('Content-Type', 'application/json')
      :body('{}')
      :send()
  end)

  if not ok then
    kumo.log_warn('Inbox domain validation failed for ' .. domain .. ': ' .. tostring(response))
    return { valid = false }
  end

  if response:status_code() ~= 200 then
    return { valid = false }
  end

  -- Parse JSON response
  local data = kumo.json_parse(response:text())
  if data and data.valid then
    return {
      valid = true,
      workspace_id = data.workspace_id,
      sending_domain_id = data.sending_domain_id,
    }
  end

  return { valid = false }
end, {
  name = 'inbox_domain_cache',
  ttl = '24 hours',
  capacity = 10000,
})

-- Cache for sender domain ownership (24 hour TTL)
-- Returns the workspace ID that owns a given sending domain
local get_domain_workspace_id = kumo.memoize(function(domain)
  local client = kumo.http.build_client { timeout = '10s' }

  local response = client:post(CONTROL_PLANE_URL .. '/api/internal/v1/tenants/by-domain')
    :header('Authorization', 'Bearer ' .. INTERNAL_SERVICE_KEY)
    :header('Content-Type', 'application/json')
    :body(kumo.json_encode({ domain = domain }))
    :send()

  if response:status_code() ~= 200 then
    error('Domain lookup failed: ' .. domain)
  end

  local data = kumo.json_parse(response:text())
  if not data or not data.id then
    error('Domain not found: ' .. domain)
  end

  return data.id  -- workspace ID
end, {
  name = 'domain_workspace_cache',
  ttl = '24 hours',
  capacity = 10000,
})

-- Validate credentials via Control Plane (no caching - always verify)
-- Uses endpoint: POST /api/internal/v1/mta/auth/validate
-- This endpoint accepts raw password and hashes it internally
local function validate_credentials(username, password)
  local client = kumo.http.build_client {
    timeout = '10s',
  }

  local response = client:post(CONTROL_PLANE_URL .. '/api/internal/v1/mta/auth/validate')
    :header('Authorization', 'Bearer ' .. INTERNAL_SERVICE_KEY)
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

  -- Port 587: Submission — relay only granted after successful SMTP AUTH
  kumo.start_esmtp_listener {
    listen = '0.0.0.0:587',
    hostname = MTA_HOSTNAME,
    tls_private_key = TLS_KEY_PATH,
    tls_certificate = TLS_CERT_PATH,
    max_messages_per_connection = 10000,
    max_recipients_per_message = 1000,
    banner = MTA_HOSTNAME .. ' Kibamail ESMTP',
  }

  -- ==========================================================================
  -- HTTP LISTENERS
  -- ==========================================================================

  -- HTTP API (accessible from trusted hosts - configurable via TRUSTED_HOSTS env var)
  kumo.start_http_listener {
    listen = '0.0.0.0:8000',
    trusted_hosts = trusted_hosts_list,
  }

end)

-- =============================================================================
-- QUEUE CONFIGURATION
-- =============================================================================

kumo.on('get_queue_config', function(domain, tenant, campaign, routing_domain)
  -- DMARC reports - forward to control plane via custom handler
  if domain == 'dmarc.kbmta.net' then
    return kumo.make_queue_config {
      protocol = {
        custom_lua = {
          constructor = 'make.dmarc_report_handler',
        },
      },
    }
  end

  -- Select egress pool based on campaign (set per-message in http_message_generated)
  -- Campaign is set to 'marketing' or 'transactional' based on X-Kibamail-Pool header
  local pool = 'marketing'  -- default
  if campaign == 'transactional' then
    pool = 'transactional'
  end

  return kumo.make_queue_config {
    egress_pool = pool,
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

-- Custom handler to forward DMARC aggregate reports to Control Plane
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

      -- Forward to Control Plane for parsing and processing
      local client = kumo.http.build_client {
        timeout = '30s',
      }

      local response = client:post(CONTROL_PLANE_URL .. '/api/internal/v1/mta/dmarc/reports')
        :header('Authorization', 'Bearer ' .. INTERNAL_SERVICE_KEY)
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
  if password == '' then
    return false
  end

  local ok, auth_result = pcall(validate_credentials, authc, password)

  if not ok then
    kumo.log_error(string.format(
      'AUTH ERROR: control plane unreachable for user=%s error=%s',
      authc, tostring(auth_result)
    ))
    return false
  end

  if not auth_result or not auth_result.valid then
    return false
  end

  conn_meta:set('workspace_id', auth_result.workspaceId or '')
  conn_meta:set('auth_user', authc)
  return true
end)

-- =============================================================================
-- LISTENER DOMAINS (Bounces and Feedback Loops)
-- =============================================================================

kumo.on('get_listener_domain', function(domain, listener, conn_meta)
  -- Authenticated connections (port 587) can relay to any domain
  local auth_user = conn_meta:get_meta('auth_user')
  if auth_user then
    return kumo.make_listener_domain {
      relay_to = true,
    }
  end

  -- DMARC aggregate reports - accept and relay to queue for processing
  -- Reports sent to: re+<tracking>@dmarc.kbmta.net
  if domain == 'dmarc.kbmta.net' then
    return kumo.make_listener_domain {
      relay_to = true,  -- Accept and queue for delivery (to custom handler)
    }
  end

  -- Check if this is an inbox-enabled domain (MX points to our MTA)
  -- This allows receiving replies to outbound emails
  local inbox_info = validate_inbox_domain(domain)
  if inbox_info.valid then
    -- Store inbox metadata for use in smtp_server_message_received
    conn_meta:set('inbox_domain', 'true')
    conn_meta:set('inbox_workspace_id', inbox_info.workspace_id or '')
    conn_meta:set('inbox_sending_domain_id', inbox_info.sending_domain_id or '')
    return kumo.make_listener_domain {
      relay_to = true,  -- Accept and queue for delivery (to inbox handler)
    }
  end

  -- Validate domain against Control Plane (cached for 24 hours)
  -- Control Plane checks if this is a known tenant bounce domain
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
    'X-Kibamail-Pool',
  }

  -- RELAY GUARD: reject unauthenticated outbound messages
  -- Inbound traffic (bounces, DMARC, inbox) is identified by listener domain
  -- metadata set in get_listener_domain. Any message without auth AND without
  -- inbound metadata is an unauthorized relay attempt.
  local conn_meta_ok, conn_meta = pcall(function() return msg:conn_meta() end)

  local is_authenticated = false
  local is_inbound = false

  if conn_meta_ok and conn_meta then
    local auth_user = conn_meta:get('auth_user') or ''
    is_authenticated = (auth_user ~= '')

    local inbox_domain = conn_meta:get('inbox_domain') or ''
    is_inbound = (inbox_domain == 'true')
  end

  -- Check if recipient is a known inbound domain (DMARC, bounces)
  if not is_inbound then
    local recipient = msg:recipient()
    local rd = recipient and recipient.domain or nil
    if rd then
      if rd == 'dmarc.kbmta.net' then
        is_inbound = true
      elseif validate_listener_domain(rd) then
        is_inbound = true
      end
    end
  end

  if not is_authenticated and not is_inbound then
    kumo.reject(550, '5.7.1 Relay denied — authentication required')
    return
  end

  -- Set workspace metadata from auth
  if is_authenticated and conn_meta_ok and conn_meta then
    local workspace_id = conn_meta:get('workspace_id') or ''
    if workspace_id ~= '' then
      msg:set_meta('workspace_id', workspace_id)
    end
  end

  -- SENDER DOMAIN VERIFICATION: ensure authenticated workspace owns the From domain
  if is_authenticated and conn_meta_ok and conn_meta then
    local workspace_id = conn_meta:get('workspace_id') or ''
    local from_header = msg:from_header()
    local sender_domain = from_header and from_header.domain or nil

    if sender_domain and workspace_id ~= '' then
      local domain_ok, domain_workspace = pcall(get_domain_workspace_id, sender_domain)

      if not domain_ok then
        kumo.reject(550, '5.7.1 Sender domain not authorized')
        return
      end

      if domain_workspace ~= workspace_id then
        kumo.reject(550, '5.7.1 Sender domain not authorized for this account')
        return
      end
    end
  end

  if conn_meta_ok and conn_meta then
    -- ==========================================================================
    -- INBOX MESSAGE HANDLING
    -- ==========================================================================
    -- Check if this is an inbox message (reply to outbound email)
    local inbox_domain = conn_meta:get('inbox_domain') or ''
    if inbox_domain == 'true' then
      if not CONTROL_PLANE_URL or CONTROL_PLANE_URL == '' then
        kumo.log_error('CONTROL_PLANE_URL not configured, rejecting inbox message')
        kumo.reject(550, '5.7.1 Inbox processing not configured')
        return
      end

      local inbox_workspace_id = conn_meta:get('inbox_workspace_id') or ''
      local inbox_sending_domain_id = conn_meta:get('inbox_sending_domain_id') or ''

      -- Extract envelope information
      local recipient_obj = msg:recipient()
      local sender_obj = msg:sender()
      local recipient = recipient_obj and recipient_obj.email or 'unknown'
      local sender = sender_obj and sender_obj.email or 'unknown'
      local recipient_domain = recipient_obj and recipient_obj.domain or 'unknown'

      -- Parse plus-addressed token from recipient
      -- Format: localpart+token@domain -> token is the emailSendId
      local local_part = recipient:match('([^@]+)@')
      local token = ''
      if local_part then
        local _, parsed_token = local_part:match('([^+]+)%+(.+)')
        token = parsed_token or ''
      end

      -- Generate request ID for tracing: inb-{timestamp}-{sender_prefix}-{recipient_prefix}-{random}
      -- This ID flows from MTA -> Control Plane -> Job for end-to-end tracing
      local sender_prefix = sender:match('([^@]+)'):sub(1, 4):gsub('[^%w]', '')
      local recipient_prefix = recipient:match('([^@]+)'):sub(1, 4):gsub('[^%w]', '')
      local request_id = string.format('inb-%d-%s-%s-%s',
        os.time(),
        sender_prefix:lower(),
        recipient_prefix:lower(),
        kumo.uuid():sub(1, 8)
      )

      -- Get raw message data (RFC822 format)
      local raw_message = msg:get_data()

      -- Forward to Control Plane
      local forward_ok, forward_err = pcall(function()
        local client = kumo.http.build_client {
          timeout = '30s',
        }

        local response = client:post(CONTROL_PLANE_URL .. '/api/internal/v1/webhooks/inbox/receive')
          :header('Authorization', 'Bearer ' .. INTERNAL_SERVICE_KEY)
          :header('Content-Type', 'message/rfc822')
          :header('X-Inbox-Request-Id', request_id)
          :header('X-Inbox-Token', token)
          :header('X-Inbox-Recipient', recipient)
          :header('X-Inbox-Sender', sender)
          :header('X-Inbox-Domain', recipient_domain)
          :header('X-Workspace-Id', inbox_workspace_id)
          :header('X-Sending-Domain-Id', inbox_sending_domain_id)
          :body(raw_message)
          :send()

        local status = response:status_code()

        if status >= 200 and status < 300 then
          kumo.log_info('Inbox message forwarded: request_id=' .. request_id .. ' to=' .. recipient .. ' from=' .. sender .. ' token=' .. token)
        else
          kumo.log_error('Inbox forward failed: request_id=' .. request_id .. ' to=' .. recipient .. ' status=' .. tostring(status))
          error('Control Plane returned status ' .. tostring(status))
        end
      end)

      if not forward_ok then
        kumo.log_error('Inbox forward error: request_id=' .. request_id .. ' error=' .. tostring(forward_err))
        kumo.reject(451, '4.7.1 Temporary failure processing message')
        return
      end

      -- Message handled, don't queue for delivery
      return
    end
  end

  -- SMTP injection always uses transactional pool
  -- Marketing emails are only supported via HTTP injection
  msg:set_meta('egress_pool', 'transactional')

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
  -- Use pcall() because get_tenant_dkim_key throws errors for not-found domains
  -- (errors are not cached by memoize, allowing retry on next request)
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
          'List-Unsubscribe', 'List-Unsubscribe-Post',
        },
        over_sign = true,
      }

      msg:dkim_sign(tenant_signer)
      kumo.log_debug('Tenant DKIM signed for domain: ' .. sender_domain)
    elseif is_authenticated then
      kumo.reject(550, '5.7.1 DKIM not configured or verified for sender domain')
      return
    end
  end

  -- 2. MTA DKIM SIGNING (third-party signature - MUST COME LAST)
  sign_with_mta_dkim(msg)
end)

-- =============================================================================
-- HTTP MESSAGE INJECTION
-- =============================================================================

kumo.on('http_message_generated', function(msg)
  -- Build custom Received header (replacing KumoMTA's auto-generated one)
  local from_header = msg:from_header()
  local sender_domain = from_header and from_header.domain or 'unknown'
  local recipient = msg:recipient()
  local recipient_email = recipient and recipient.email or 'unknown'
  local msg_id = msg:id()
  local timestamp = os.date('!%a, %d %b %Y %H:%M:%S +0000')

  local custom_received = string.format(
    'from %s by mail.kbmta.net with ESMTP id %s for <%s>; %s',
    sender_domain,
    msg_id,
    recipient_email,
    timestamp
  )

  -- Remove auto-generated Received header and add our custom one
  msg:remove_all_named_headers('Received')
  msg:prepend_header('Received', custom_received)

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
    'X-Kibamail-Pool',
  }

  -- Remove all internal X-Kibamail-* headers that should not be sent to recipients
  msg:remove_all_named_headers('X-Kibamail-Pool')
  msg:remove_all_named_headers('X-Kibamail-Broadcast-Id')
  msg:remove_all_named_headers('X-Kibamail-Contact-Id')
  msg:remove_all_named_headers('X-Kibamail-Workspace-Id')
  msg:remove_all_named_headers('X-Kibamail-Email-Send-Id')
  msg:remove_all_named_headers('X-Kibamail-Broadcast')
  msg:remove_all_named_headers('X-Kibamail-Contact')
  msg:remove_all_named_headers('X-Kibamail-Message')
  msg:remove_all_named_headers('X-Kibamail-Meta-envelope_sender')
  msg:remove_all_named_headers('X-Kibamail-Meta-message_id')
  msg:remove_all_named_headers('X-Kibamail-Tenant')

  -- Read pool from header (set by control plane)
  -- Valid values: 'marketing', 'transactional'
  -- Note: import_x_headers converts X-Kibamail-Pool to x_kibamail_pool
  local pool = msg:get_meta('x_kibamail_pool') or 'marketing'

  -- Set the campaign to the pool name so get_queue_config can select the right pool
  msg:set_meta('campaign', pool)

  -- Get sender domain
  local from_header = msg:from_header()
  local sender_domain = from_header and from_header.domain or nil

  -- 1. TENANT DKIM SIGNING
  -- Use pcall() because get_tenant_dkim_key throws errors for not-found domains
  -- (errors are not cached by memoize, allowing retry on next request)
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
-- HTTP injection does not require authentication.
-- Security is provided by trusted_hosts configuration.
-- Only SMTP submission (port 587) requires authentication.

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
