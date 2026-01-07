/**
 * Control Plane Mock Server for KumoMTA Testing
 *
 * Handles the API endpoints that init.lua expects:
 * - POST /api/internal/v1/tenants/by-domain
 * - POST /api/internal/v1/tenants/by-bounce-domain
 * - POST /api/internal/v1/mta/auth/validate
 * - POST /api/internal/v1/mta/dmarc/reports
 * - POST /api/internal/v1/webhooks/inbox/receive
 * - POST /webhooks (log hook endpoint)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3333;
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'test-internal-service-key';

// Test data
const testData = {
  workspaces: {
    'ws_test_123': {
      id: 'ws_test_123',
      name: 'Test Workspace',
      sendingDomains: ['hq.kibamail.xyz'],
      bounceDomain: 'kb.hq.kibamail.xyz',
      dkimSelector: 'kibamail',
    },
    'ws_test_456': {
      id: 'ws_test_456',
      name: 'Test Customer',
      sendingDomains: ['testcustomer.com'],
      bounceDomain: 'kb.testcustomer.com',
      dkimSelector: 'kibamail',
    },
  },
  domainToWorkspace: {
    'hq.kibamail.xyz': 'ws_test_123',
    'testcustomer.com': 'ws_test_456',
  },
  bounceDomains: {
    'kb.hq.kibamail.xyz': { workspaceId: 'ws_test_123', sendingDomain: 'hq.kibamail.xyz' },
    'kb.testcustomer.com': { workspaceId: 'ws_test_456', sendingDomain: 'testcustomer.com' },
  },
  apiKeys: {
    'test-api-key-12345': { workspaceId: 'ws_test_123', valid: true },
    'test-api-key-67890': { workspaceId: 'ws_test_456', valid: true },
  },
  dkimKeys: {},
  webhookLogs: [],
};

// Load DKIM keys from certs directory
function loadDkimKeys() {
  const certPaths = ['/certs', './certs', '../certs'];
  const dkimFiles = {
    'hq.kibamail.xyz': 'tenant-hq-dkim-private.pem',
    'testcustomer.com': 'tenant-testcustomer-dkim-private.pem',
  };

  for (const basePath of certPaths) {
    for (const [domain, filename] of Object.entries(dkimFiles)) {
      const filePath = path.join(basePath, filename);
      try {
        if (fs.existsSync(filePath)) {
          testData.dkimKeys[domain] = fs.readFileSync(filePath, 'utf-8');
          console.log(`Loaded DKIM key for ${domain} from ${filePath}`);
        }
      } catch (e) {
        // Ignore
      }
    }
  }
}

// Parse JSON body from request
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// Send JSON response
function jsonResponse(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Check authorization header
function checkAuth(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return false;
  }
  return auth.slice(7) === INTERNAL_SERVICE_KEY;
}

// Request handler
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method;

  console.log(`${method} ${pathname}`);

  // Health check
  if (pathname === '/health') {
    return jsonResponse(res, { status: 'ok', service: 'control-plane-mock' });
  }

  // POST /api/internal/v1/tenants/by-domain
  if (pathname === '/api/internal/v1/tenants/by-domain' && method === 'POST') {
    if (!checkAuth(req)) {
      return jsonResponse(res, { error: 'Unauthorized' }, 401);
    }

    const body = await parseBody(req);
    const domain = body.domain;

    if (!domain) {
      return jsonResponse(res, { error: 'Missing domain' }, 400);
    }

    const wsId = testData.domainToWorkspace[domain];
    if (!wsId) {
      return jsonResponse(res, { error: 'Domain not found' }, 404);
    }

    const ws = testData.workspaces[wsId];
    const dkimKey = testData.dkimKeys[domain] || '';

    return jsonResponse(res, {
      id: ws.id,
      sending_domains: [{
        id: `domain_${domain}`,
        name: domain,
        dkim_sub_domain: `${ws.dkimSelector}._domainkey`,
        dkim_private_key: dkimKey,
        dkim_verified_at: dkimKey ? '2024-01-01T00:00:00Z' : null,
        return_path_domain: ws.bounceDomain,
      }],
    });
  }

  // POST /api/internal/v1/tenants/by-bounce-domain
  if (pathname === '/api/internal/v1/tenants/by-bounce-domain' && method === 'POST') {
    if (!checkAuth(req)) {
      return jsonResponse(res, { error: 'Unauthorized' }, 401);
    }

    const body = await parseBody(req);
    const domain = body.domain;

    if (!domain) {
      return jsonResponse(res, { error: 'Missing domain' }, 400);
    }

    const info = testData.bounceDomains[domain];
    if (!info) {
      return jsonResponse(res, { valid: false }, 404);
    }

    return jsonResponse(res, {
      valid: true,
      workspace_id: info.workspaceId,
      sending_domain: info.sendingDomain,
    });
  }

  // POST /api/internal/v1/mta/auth/validate
  if (pathname === '/api/internal/v1/mta/auth/validate' && method === 'POST') {
    if (!checkAuth(req)) {
      return jsonResponse(res, { error: 'Unauthorized' }, 401);
    }

    const body = await parseBody(req);
    const { username, password } = body;

    // For testing, accept any non-empty password
    if (!password) {
      return jsonResponse(res, { valid: false });
    }

    // Check if it's a known API key
    const apiKey = testData.apiKeys[username] || testData.apiKeys[password];
    if (apiKey && apiKey.valid) {
      return jsonResponse(res, {
        valid: true,
        workspaceId: apiKey.workspaceId,
      });
    }

    // Accept any non-empty credentials for testing
    return jsonResponse(res, {
      valid: true,
      workspaceId: 'test-workspace',
    });
  }

  // POST /api/internal/v1/sending-domains/validate-inbox/:domain
  if (pathname.startsWith('/api/internal/v1/sending-domains/validate-inbox/') && method === 'POST') {
    if (!checkAuth(req)) {
      return jsonResponse(res, { error: 'Unauthorized' }, 401);
    }

    const domain = pathname.split('/').pop();

    // For testing, accept known sending domains
    const wsId = testData.domainToWorkspace[domain];
    if (wsId) {
      return jsonResponse(res, {
        valid: true,
        workspace_id: wsId,
        sending_domain_id: `domain_${domain}`,
      });
    }

    return jsonResponse(res, { valid: false });
  }

  // POST /api/internal/v1/mta/dmarc/reports
  if (pathname === '/api/internal/v1/mta/dmarc/reports' && method === 'POST') {
    if (!checkAuth(req)) {
      return jsonResponse(res, { error: 'Unauthorized' }, 401);
    }

    console.log('Received DMARC report');
    console.log('  Recipient:', req.headers['x-dmarc-recipient']);
    console.log('  Sender:', req.headers['x-dmarc-sender']);

    return jsonResponse(res, { received: true });
  }

  // POST /api/internal/v1/webhooks/inbox/receive
  if (pathname === '/api/internal/v1/webhooks/inbox/receive' && method === 'POST') {
    if (!checkAuth(req)) {
      return jsonResponse(res, { error: 'Unauthorized' }, 401);
    }

    console.log('Received inbox message');
    console.log('  Token:', req.headers['x-inbox-token']);
    console.log('  Recipient:', req.headers['x-inbox-recipient']);
    console.log('  Sender:', req.headers['x-inbox-sender']);

    return jsonResponse(res, { received: true });
  }

  // POST /webhooks (log hook)
  if (pathname === '/webhooks' && method === 'POST') {
    const body = await parseBody(req);
    testData.webhookLogs.push({
      timestamp: new Date().toISOString(),
      data: body,
    });
    console.log('Received webhook log:', JSON.stringify(body).slice(0, 200));
    return jsonResponse(res, { received: true });
  }

  // GET /test/logs - Get webhook logs
  if (pathname === '/test/logs' && method === 'GET') {
    return jsonResponse(res, { logs: testData.webhookLogs });
  }

  // POST /test/reset - Reset test data
  if (pathname === '/test/reset' && method === 'POST') {
    testData.webhookLogs = [];
    return jsonResponse(res, { reset: true });
  }

  // GET /test/status - Get test data status
  if (pathname === '/test/status' && method === 'GET') {
    return jsonResponse(res, {
      workspaces: Object.keys(testData.workspaces),
      domains: Object.keys(testData.domainToWorkspace),
      bounceDomains: Object.keys(testData.bounceDomains),
      dkimDomains: Object.keys(testData.dkimKeys),
      webhookLogCount: testData.webhookLogs.length,
    });
  }

  // 404 for unknown routes
  jsonResponse(res, { error: 'Not found', path: pathname }, 404);
}

// Start server
loadDkimKeys();

const server = http.createServer(handleRequest);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Control Plane Mock running on port ${PORT}`);
  console.log(`Workspaces: ${Object.keys(testData.workspaces).join(', ')}`);
  console.log(`DKIM domains: ${Object.keys(testData.dkimKeys).join(', ') || 'none'}`);
});
