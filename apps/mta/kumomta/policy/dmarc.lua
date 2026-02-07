--[[
  DMARC aggregate report handler.
  Receives DMARC reports and forwards them to the Control Plane.
]]

local kumo = require 'kumo'
local config = require 'config'

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

      local response = client:post(config.CONTROL_PLANE_URL .. '/api/internal/v1/mta/dmarc/reports')
        :header('Authorization', 'Bearer ' .. config.INTERNAL_SERVICE_KEY)
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
