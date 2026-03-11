--[[
  Kibamail KumoMTA Production Policy — Orchestrator

  This policy implements:
  - 2-fold DKIM signing (MTA + Tenant)
  - SMTP credential validation via Control Plane
  - Listener domain validation via Control Plane (for bounces/FBL)
  - DMARC aggregate report reception and forwarding to Control Plane
  - Inbox message reception and forwarding to Control Plane
  - Marketing pool with round-robin IP distribution
  - TSA integration with Redis
  - Webhook logging to Control Plane

  Modules:
  - config.lua           — Environment variables and shared constants
  - control_plane.lua    — Memoized Control Plane API clients
  - dkim.lua             — DKIM signing (MTA + tenant)
  - dmarc.lua            — DMARC report handler
  - listener_domains.lua — Listener domain routing
  - smtp.lua             — SMTP auth and message handling
  - http.lua             — HTTP injection handler
]]

local kumo = require 'kumo'
local config = require 'config'

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
  url = config.WEBHOOK_URL,
  log_parameters = {
    -- import_x_headers converts X-Kibamail-* headers to x_kibamail_* meta keys
    -- (lowercase, hyphens to underscores, X- prefix retained as x_)
    meta = {
      'x_kibamail_broadcast_id', 'x_kibamail_contact_id', 'x_kibamail_workspace_id',
      'x_kibamail_email_send_id', 'x_kibamail_pool', 'workspace_id',
      'x_kibamail_sending_domain_id', 'x_kibamail_sender_identity_id',
      'x_kibamail_click_tracking', 'x_kibamail_open_tracking',
      'x_kibamail_from_email', 'x_kibamail_subject',
    },
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

-- =============================================================================
-- LOAD MODULES (registers kumo.on handlers)
-- =============================================================================

require 'control_plane'
require 'dkim'
require 'dmarc'
require 'listener_domains'
require 'smtp'
require 'http'

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
    hostname = config.MTA_HOSTNAME,
    tls_private_key = config.TLS_KEY_PATH,
    tls_certificate = config.TLS_CERT_PATH,
    max_messages_per_connection = 100,
    max_recipients_per_message = 1,  -- Bounces are single recipient
    banner = config.MTA_HOSTNAME .. ' Kibamail ESMTP',
  }

  -- Port 587: Submission — relay only granted after successful SMTP AUTH
  kumo.start_esmtp_listener {
    listen = '0.0.0.0:587',
    hostname = config.MTA_HOSTNAME,
    tls_private_key = config.TLS_KEY_PATH,
    tls_certificate = config.TLS_CERT_PATH,
    max_messages_per_connection = 10000,
    max_recipients_per_message = 1000,
    banner = config.MTA_HOSTNAME .. ' Kibamail ESMTP',
  }

  -- ==========================================================================
  -- HTTP LISTENERS
  -- ==========================================================================

  -- HTTP API (accessible from trusted hosts - configurable via TRUSTED_HOSTS env var)
  kumo.start_http_listener {
    listen = '0.0.0.0:8000',
    trusted_hosts = config.trusted_hosts_list,
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
