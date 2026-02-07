--[[
  DKIM signing logic.
  Provides MTA third-party signing and tenant first-party signing.
]]

local kumo = require 'kumo'
local control_plane = require 'control_plane'

local dkim = {}

-- MTA DKIM key (for third-party / 2-fold signing)
local MTA_DKIM_KEY_PATH = '/opt/kumomta/etc/dkim/kbmta.net/kbmta.key'
local MTA_DKIM_DOMAIN = 'kbmta.net'
local MTA_DKIM_SELECTOR = 'kbmta'

-- Sign message with MTA DKIM key (third-party signature)
-- This adds the ESP/MTA signature to ALL outbound messages
function dkim.sign_with_mta_dkim(msg)
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

-- Sign message with tenant DKIM key (first-party signature)
-- opts.reject_on_missing: if true, reject the message when DKIM is not configured
--   (true for SMTP authenticated senders, false for HTTP injection)
-- Returns true if the message was rejected (caller should return early)
function dkim.sign_with_tenant_dkim(msg, sender_domain, opts)
  opts = opts or {}

  if not sender_domain then
    return false
  end

  local ok, tenant_dkim = pcall(control_plane.get_tenant_dkim_key, sender_domain)

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

    -- Enrich message with workspace data from DKIM response (if not already set)
    if tenant_dkim.workspace_id and (msg:get_meta('x_kibamail_workspace_id') or '') == '' then
      msg:set_meta('x_kibamail_workspace_id', tenant_dkim.workspace_id)
    end

    return false
  end

  if opts.reject_on_missing then
    kumo.reject(550, '5.7.1 DKIM not configured or verified for sender domain')
    return true
  end

  return false
end

return dkim
