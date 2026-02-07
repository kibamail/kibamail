--[[
  Control Plane API clients.
  All memoized lookups and credential validation against the Control Plane.
]]

local kumo = require 'kumo'
local config = require 'config'

local control_plane = {}

-- Cache for tenant DKIM keys (24 hour TTL)
-- NOTE: This function throws an error on cache miss/not found, which prevents
-- memoize from caching negative results. Use pcall() when calling.
-- Uses existing endpoint: POST /api/internal/v1/tenants/by-domain
control_plane.get_tenant_dkim_key = kumo.memoize(function(domain)
  local client = kumo.http.build_client {
    timeout = '10s',
  }

  local response = client:post(config.CONTROL_PLANE_URL .. '/api/internal/v1/tenants/by-domain')
    :header('Authorization', 'Bearer ' .. config.INTERNAL_SERVICE_KEY)
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
    workspace_id = data.id,
    sending_domain_id = sd.id,
  }
end, {
  name = 'tenant_dkim_cache',
  ttl = '24 hours',
  capacity = 10000,
})

-- Cache for listener domain validation (24 hour TTL)
-- Validates if a domain is a known tenant bounce domain via Control Plane
-- Uses existing endpoint: POST /api/internal/v1/tenants/by-bounce-domain
control_plane.validate_listener_domain = kumo.memoize(function(domain)
  local client = kumo.http.build_client {
    timeout = '5s',
  }

  local response = client:post(config.CONTROL_PLANE_URL .. '/api/internal/v1/tenants/by-bounce-domain')
    :header('Authorization', 'Bearer ' .. config.INTERNAL_SERVICE_KEY)
    :header('Content-Type', 'application/json')
    :body(kumo.json_encode({ domain = domain }))
    :send()

  if response:status_code() ~= 200 then
    return { valid = false }
  end

  -- Response format: { valid: true, workspace_id, sending_domain }
  local data = kumo.json_parse(response:text())
  if data and data.valid == true then
    return {
      valid = true,
      workspace_id = data.workspace_id or '',
      sending_domain = data.sending_domain or '',
    }
  end
  return { valid = false }
end, {
  name = 'listener_domain_cache',
  ttl = '24 hours',
  capacity = 10000,
})

-- Cache for inbox domain validation (24 hour TTL)
-- Validates if a domain has inbox enabled and MX verified via Control Plane
-- Uses existing endpoint: POST /api/internal/v1/sending-domains/validate-inbox/:domain
control_plane.validate_inbox_domain = kumo.memoize(function(domain)
  if not config.CONTROL_PLANE_URL or config.CONTROL_PLANE_URL == '' then
    return { valid = false }
  end

  local client = kumo.http.build_client {
    timeout = '5s',
  }

  local ok, response = pcall(function()
    return client:post(config.CONTROL_PLANE_URL .. '/api/internal/v1/sending-domains/validate-inbox/' .. domain)
      :header('Authorization', 'Bearer ' .. config.INTERNAL_SERVICE_KEY)
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
control_plane.get_domain_workspace_id = kumo.memoize(function(domain)
  local client = kumo.http.build_client { timeout = '10s' }

  local response = client:post(config.CONTROL_PLANE_URL .. '/api/internal/v1/tenants/by-domain')
    :header('Authorization', 'Bearer ' .. config.INTERNAL_SERVICE_KEY)
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
function control_plane.validate_credentials(username, password)
  local client = kumo.http.build_client {
    timeout = '10s',
  }

  local response = client:post(config.CONTROL_PLANE_URL .. '/api/internal/v1/mta/auth/validate')
    :header('Authorization', 'Bearer ' .. config.INTERNAL_SERVICE_KEY)
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

return control_plane
