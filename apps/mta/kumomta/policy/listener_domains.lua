--[[
  Listener domain routing.
  Determines how to handle inbound mail based on the recipient domain.
]]

local kumo = require 'kumo'
local control_plane = require 'control_plane'

kumo.on('get_listener_domain', function(domain, listener, conn_meta)
  -- Authenticated connections (port 587) can relay to any domain
  local auth_user = conn_meta:get_meta('auth_user')
  if auth_user and auth_user ~= '' then
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
  local inbox_info = control_plane.validate_inbox_domain(domain)
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
  local bounce_info = control_plane.validate_listener_domain(domain)
  if bounce_info.valid then
    conn_meta:set('bounce_workspace_id', bounce_info.workspace_id or '')
    conn_meta:set('bounce_sending_domain', bounce_info.sending_domain or '')
    return kumo.make_listener_domain {
      log_oob = 'LogThenDrop',  -- Parse OOB bounce, log to webhook, discard
      log_arf = 'LogThenDrop',  -- Parse ARF feedback, log to webhook, discard
    }
  end

  -- Domain not recognized - reject
  return nil
end)
