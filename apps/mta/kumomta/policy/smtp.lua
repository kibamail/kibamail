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
  kumo.log_info(string.format(
    'AUTH ATTEMPT: user=%s authz=%s',
    authc or '<nil>', authz or '<nil>'
  ))

  if password == '' then
    kumo.log_warn(string.format('AUTH REJECTED: empty password for user=%s', authc or '<nil>'))
    return false
  end

  local ok, auth_result = pcall(control_plane.validate_credentials, authc, password)

  if not ok then
    kumo.log_error(string.format(
      'AUTH ERROR: control plane request failed for user=%s error=%s',
      authc or '<nil>', tostring(auth_result)
    ))
    return false
  end

  if not auth_result then
    kumo.log_warn(string.format('AUTH REJECTED: nil response from control plane for user=%s', authc or '<nil>'))
    return false
  end

  if not auth_result.valid then
    kumo.log_warn(string.format(
      'AUTH REJECTED: invalid credentials for user=%s workspace=%s',
      authc or '<nil>', auth_result.workspaceId or '<nil>'
    ))
    return false
  end

  kumo.log_info(string.format(
    'AUTH SUCCESS: user=%s workspace=%s',
    authc, auth_result.workspaceId or '<nil>'
  ))

  conn_meta:set_meta('workspace_id', auth_result.workspaceId or '')
  conn_meta:set_meta('auth_user', authc)
  return true
end)

-- =============================================================================
-- INTERNAL HEADERS TO STRIP
-- =============================================================================
-- All X-Kibamail-* headers must be stripped from SMTP-injected messages to:
-- 1. Prevent clients from spoofing tracking metadata (workspace_id, etc.)
-- 2. Prevent internal headers from leaking to recipients
local INTERNAL_HEADERS = {
  'X-Kibamail-Pool',
  'X-Kibamail-Broadcast-Id',
  'X-Kibamail-Contact-Id',
  'X-Kibamail-Workspace-Id',
  'X-Kibamail-Email-Send-Id',
  'X-Kibamail-Sending-Domain-Id',
  'X-Kibamail-Sender-Identity-Id',
  'X-Kibamail-Click-Tracking',
  'X-Kibamail-Open-Tracking',
  'X-Kibamail-Broadcast',
  'X-Kibamail-Contact',
  'X-Kibamail-Message',
  'X-Kibamail-Meta-envelope_sender',
  'X-Kibamail-Meta-message_id',
  'X-Kibamail-Tenant',
}

-- =============================================================================
-- MESSAGE RECEIVED (SMTP INJECTION)
-- =============================================================================

kumo.on('smtp_server_message_received', function(msg, conn_meta)
  -- Validate and fix message conformance
  -- Syntax: check_fix_conformance(CHECK_FLAGS, FIX_FLAGS) where flags are pipe-separated
  msg:check_fix_conformance(
    'MISSING_DATE_HEADER|MISSING_MESSAGE_ID_HEADER|MISSING_MIME_VERSION',
    'MISSING_DATE_HEADER|MISSING_MESSAGE_ID_HEADER|MISSING_MIME_VERSION'
  )

  -- =========================================================================
  -- PHASE 1: STRIP INTERNAL HEADERS (security)
  -- =========================================================================
  -- Remove all X-Kibamail-* headers BEFORE import_x_headers to prevent
  -- clients from spoofing internal metadata via SMTP injection.
  -- We set the correct metadata from auth context instead.
  for _, header_name in ipairs(INTERNAL_HEADERS) do
    msg:remove_all_named_headers(header_name)
  end

  -- Strip client-injected Return-Path — the receiving MX adds it from the SMTP envelope
  msg:remove_all_named_headers('Return-Path')

  -- RELAY GUARD: reject unauthenticated outbound messages
  -- Inbound traffic (bounces, DMARC, inbox) is identified by listener domain
  -- metadata set in get_listener_domain. Any message without auth AND without
  -- inbound metadata is an unauthorized relay attempt.
  local is_authenticated = false
  local is_inbound = false

  if conn_meta then
    local auth_user = conn_meta:get_meta('auth_user') or ''
    is_authenticated = (auth_user ~= '')

    local inbox_domain = conn_meta:get_meta('inbox_domain') or ''
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
  if is_inbound and not is_authenticated and conn_meta then
    local bounce_workspace_id = conn_meta:get_meta('bounce_workspace_id') or ''
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
  if is_authenticated and conn_meta then
    local workspace_id = conn_meta:get_meta('workspace_id') or ''
    if workspace_id ~= '' then
      msg:set_meta('workspace_id', workspace_id)
      msg:set_meta('x_kibamail_workspace_id', workspace_id)
    end
  end

  -- =========================================================================
  -- PHASE 4: SENDER DOMAIN VERIFICATION (strict)
  -- =========================================================================
  -- For authenticated SMTP injection, verify:
  -- 1. Domain belongs to the authenticated workspace
  -- 2. DKIM is configured and verified
  -- 3. Return path is configured and verified
  local domain_info = nil  -- Will hold DKIM/domain info for later phases

  if is_authenticated and conn_meta then
    local workspace_id = conn_meta:get_meta('workspace_id') or ''
    local from_header = msg:from_header()
    local sender_domain = from_header and from_header.domain or nil

    if sender_domain and workspace_id ~= '' then
      -- Verify domain ownership
      local domain_ok, domain_workspace = pcall(control_plane.get_domain_workspace_id, sender_domain)

      if not domain_ok then
        kumo.reject(550, '5.7.1 Sender domain not authorized')
        return
      end

      if domain_workspace ~= workspace_id then
        kumo.reject(550, '5.7.1 Sender domain not authorized for this account')
        return
      end

      -- Fetch full domain info (cached) for DKIM, return path, and envelope rewriting
      local dkim_ok, dkim_info = pcall(control_plane.get_tenant_dkim_key, sender_domain)

      if not dkim_ok or not dkim_info then
        kumo.reject(550, '5.7.1 Sender domain DKIM not configured')
        return
      end

      -- Verify return path is configured and verified
      if not dkim_info.return_path_sub_domain or dkim_info.return_path_sub_domain == '' then
        kumo.reject(550, '5.7.1 Sender domain return path not configured')
        return
      end

      if not dkim_info.return_path_domain_verified_at then
        kumo.reject(550, '5.7.1 Sender domain return path not verified')
        return
      end

      -- Store for use in later phases
      domain_info = dkim_info
    end
  end

  if conn_meta then
    -- ==========================================================================
    -- INBOX MESSAGE HANDLING
    -- ==========================================================================
    -- Check if this is an inbox message (reply to outbound email)
    local inbox_domain = conn_meta:get_meta('inbox_domain') or ''
    if inbox_domain == 'true' then
      if not config.CONTROL_PLANE_URL or config.CONTROL_PLANE_URL == '' then
        kumo.log_error('CONTROL_PLANE_URL not configured, rejecting inbox message')
        kumo.reject(550, '5.7.1 Inbox processing not configured')
        return
      end

      local inbox_workspace_id = conn_meta:get_meta('inbox_workspace_id') or ''
      local inbox_sending_domain_id = conn_meta:get_meta('inbox_sending_domain_id') or ''

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
        tostring(kumo.uuid.new_v4()):sub(1, 8)
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

  -- =========================================================================
  -- PHASE 1 & 2: POOL ASSIGNMENT AND METADATA ENRICHMENT
  -- =========================================================================

  -- SMTP injection always uses transactional pool
  -- Marketing emails are only supported via HTTP injection
  msg:set_meta('campaign', 'transactional')
  msg:set_meta('x_kibamail_pool', 'transactional')

  -- Generate email_send_id for tracking and VERP envelope sender
  local email_send_id = tostring(kumo.uuid.new_v4())
  msg:set_meta('x_kibamail_email_send_id', email_send_id)

  -- Enrich sending domain metadata
  if domain_info then
    msg:set_meta('x_kibamail_sending_domain_id', domain_info.sending_domain_id or '')

    -- =========================================================================
    -- PHASE 2: REWRITE ENVELOPE SENDER FOR SPF ALIGNMENT
    -- =========================================================================
    -- Rewrite MAIL FROM to VERP format: bounces+{emailSendId}@{returnPathSubDomain}.{domain}
    -- This ensures SPF passes via the customer's return-path CNAME record,
    -- matching the behavior of HTTP API injection.
    local return_path_sub_domain = domain_info.return_path_sub_domain
    local sender_domain_name = domain_info.domain

    if return_path_sub_domain and return_path_sub_domain ~= '' and sender_domain_name then
      local verp_sender = string.format(
        'bounces+%s@%s.%s',
        email_send_id,
        return_path_sub_domain,
        sender_domain_name
      )
      msg:set_sender(verp_sender)
    end
  end

  -- =========================================================================
  -- PHASE 3: SET REMAINING WEBHOOK METADATA
  -- =========================================================================
  -- These ensure webhook events from SMTP-injected messages have the same
  -- metadata as HTTP-injected messages for consistent processing.
  msg:set_meta('x_kibamail_click_tracking', '0')
  msg:set_meta('x_kibamail_open_tracking', '0')

  -- Store sender info as metadata so webhook events carry enough data
  -- for the control plane to create TransactionalEmail records reactively
  local smtp_from = msg:from_header()
  if smtp_from then
    msg:set_meta('x_kibamail_from_email', smtp_from.email or '')
  end
  local smtp_subject = msg:get_first_named_header_value('Subject') or ''
  msg:set_meta('x_kibamail_subject', smtp_subject)

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
