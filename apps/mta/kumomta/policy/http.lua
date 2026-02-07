--[[
  HTTP injection handler.
  Processes messages injected via the HTTP API (trusted hosts only).
]]

local kumo = require 'kumo'
local config = require 'config'
local dkim = require 'dkim'

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
  msg:import_x_headers(config.TRACKING_HEADERS)

  -- Remove all internal X-Kibamail-* headers that should not be sent to recipients
  msg:remove_all_named_headers('X-Kibamail-Pool')
  msg:remove_all_named_headers('X-Kibamail-Broadcast-Id')
  msg:remove_all_named_headers('X-Kibamail-Contact-Id')
  msg:remove_all_named_headers('X-Kibamail-Workspace-Id')
  msg:remove_all_named_headers('X-Kibamail-Email-Send-Id')
  msg:remove_all_named_headers('X-Kibamail-Sending-Domain-Id')
  msg:remove_all_named_headers('X-Kibamail-Sender-Identity-Id')
  msg:remove_all_named_headers('X-Kibamail-Click-Tracking')
  msg:remove_all_named_headers('X-Kibamail-Open-Tracking')
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
  dkim.sign_with_tenant_dkim(msg, sender_domain, {
    reject_on_missing = false,
  })

  -- 2. MTA DKIM SIGNING (third-party signature - MUST COME LAST)
  dkim.sign_with_mta_dkim(msg)
end)
