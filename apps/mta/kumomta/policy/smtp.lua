--[[
  SMTP event handlers.
  Handles SMTP authentication and message processing for submission (port 587)
  and inbound (port 25).
]]

local kumo = require 'kumo'
local config = require 'config'
local control_plane = require 'control_plane'
local dkim = require 'dkim'

-- =============================================================================
-- SMTP AUTHENTICATION
-- =============================================================================

kumo.on('smtp_server_auth_plain', function(authz, authc, password, conn_meta)
  if password == '' then
    return false
  end

  local ok, auth_result = pcall(control_plane.validate_credentials, authc, password)

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
  msg:import_x_headers(config.TRACKING_HEADERS)

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
      else
        local bounce_info = control_plane.validate_listener_domain(rd)
        if bounce_info.valid then
          is_inbound = true
        end
      end
    end
  end

  if not is_authenticated and not is_inbound then
    kumo.reject(550, '5.7.1 Relay denied — authentication required')
    return
  end

  -- Enrich inbound bounce/FBL messages with workspace and VERP metadata
  if is_inbound and not is_authenticated and conn_meta_ok and conn_meta then
    local bounce_workspace_id = conn_meta:get('bounce_workspace_id') or ''
    if bounce_workspace_id ~= '' then
      msg:set_meta('x_kibamail_workspace_id', bounce_workspace_id)
    end

    -- Parse VERP address to extract email_send_id
    -- Format: bounces+{emailSendId}@kb.{domain}
    local recipient = msg:recipient()
    local recipient_email = recipient and recipient.email or ''
    local local_part = recipient_email:match('([^@]+)@')
    if local_part then
      local email_send_id = local_part:match('^bounces%+(.+)$')
      if email_send_id and email_send_id ~= '' then
        msg:set_meta('x_kibamail_email_send_id', email_send_id)
      end
    end
  end

  -- Set workspace metadata from auth
  if is_authenticated and conn_meta_ok and conn_meta then
    local workspace_id = conn_meta:get('workspace_id') or ''
    if workspace_id ~= '' then
      msg:set_meta('workspace_id', workspace_id)
      -- Also set the prefixed key that log_hooks.meta actually sends
      if (msg:get_meta('x_kibamail_workspace_id') or '') == '' then
        msg:set_meta('x_kibamail_workspace_id', workspace_id)
      end
    end
  end

  -- SENDER DOMAIN VERIFICATION: ensure authenticated workspace owns the From domain
  if is_authenticated and conn_meta_ok and conn_meta then
    local workspace_id = conn_meta:get('workspace_id') or ''
    local from_header = msg:from_header()
    local sender_domain = from_header and from_header.domain or nil

    if sender_domain and workspace_id ~= '' then
      local domain_ok, domain_workspace = pcall(control_plane.get_domain_workspace_id, sender_domain)

      if not domain_ok then
        kumo.reject(550, '5.7.1 Sender domain not authorized')
        return
      end

      if domain_workspace ~= workspace_id then
        kumo.reject(550, '5.7.1 Sender domain not authorized for this account')
        return
      end

      -- Enrich SMTP-authenticated messages with sending domain metadata
      -- Use DKIM key lookup (already cached) to get sendingDomainId
      local dkim_ok, dkim_info = pcall(control_plane.get_tenant_dkim_key, sender_domain)
      if dkim_ok and dkim_info and dkim_info.sending_domain_id then
        msg:set_meta('x_kibamail_sending_domain_id', dkim_info.sending_domain_id)
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
      if not config.CONTROL_PLANE_URL or config.CONTROL_PLANE_URL == '' then
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

        local response = client:post(config.CONTROL_PLANE_URL .. '/api/internal/v1/webhooks/inbox/receive')
          :header('Authorization', 'Bearer ' .. config.INTERNAL_SERVICE_KEY)
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
  local rejected = dkim.sign_with_tenant_dkim(msg, sender_domain, {
    reject_on_missing = is_authenticated,
  })
  if rejected then
    return
  end

  -- 2. MTA DKIM SIGNING (third-party signature - MUST COME LAST)
  dkim.sign_with_mta_dkim(msg)
end)
