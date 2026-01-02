/**
 * Production-Grade SMTP Test Server
 *
 * This server simulates a real mail provider:
 * - Listens on port 25 (standard SMTP)
 * - Supports STARTTLS (opportunistic TLS)
 * - Accepts all emails (catch-all)
 * - Stores emails in memory
 * - Exposes REST API for email retrieval (mailpit-compatible)
 */

const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Configuration
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '25', 10);
const API_PORT = parseInt(process.env.API_PORT || '8025', 10);
const TLS_KEY = process.env.TLS_KEY || '/certs/privkey.pem';
const TLS_CERT = process.env.TLS_CERT || '/certs/fullchain.pem';
const HOSTNAME = process.env.HOSTNAME || 'mail.test.local';

// In-memory email storage
const emails = new Map();

// Load TLS certificates
let tlsOptions = null;
try {
  if (fs.existsSync(TLS_KEY) && fs.existsSync(TLS_CERT)) {
    tlsOptions = {
      key: fs.readFileSync(TLS_KEY),
      cert: fs.readFileSync(TLS_CERT),
    };
    console.log('[TLS] Certificates loaded successfully');
  } else {
    console.log('[TLS] Certificate files not found, generating self-signed...');
  }
} catch (err) {
  console.error('[TLS] Error loading certificates:', err.message);
}

// Create SMTP server with production-like configuration
const smtpServer = new SMTPServer({
  // Server identification
  name: HOSTNAME,
  banner: `${HOSTNAME} ESMTP Kibamail Test Server`,

  // TLS configuration - opportunistic (STARTTLS)
  secure: false, // Start unencrypted, allow STARTTLS upgrade
  key: tlsOptions?.key,
  cert: tlsOptions?.cert,

  // Allow connections without TLS (but advertise STARTTLS)
  allowInsecureAuth: true,
  disabledCommands: [], // Enable all commands including STARTTLS

  // Accept any authentication (test mode)
  authOptional: true,
  onAuth(auth, session, callback) {
    console.log(`[AUTH] User: ${auth.username}`);
    callback(null, { user: auth.username });
  },

  // Accept mail from anyone
  onMailFrom(address, session, callback) {
    console.log(`[MAIL FROM] ${address.address}`);
    callback();
  },

  // Accept mail to anyone (catch-all)
  onRcptTo(address, session, callback) {
    console.log(`[RCPT TO] ${address.address}`);
    callback();
  },

  // Process incoming email
  onData(stream, session, callback) {
    const chunks = [];

    stream.on('data', (chunk) => chunks.push(chunk));

    stream.on('end', async () => {
      try {
        const rawEmail = Buffer.concat(chunks);
        const parsed = await simpleParser(rawEmail);

        const emailId = uuidv4();
        const email = {
          ID: emailId,
          MessageID: parsed.messageId,
          From: {
            Address: parsed.from?.value?.[0]?.address || '',
            Name: parsed.from?.value?.[0]?.name || '',
          },
          To: (parsed.to?.value || []).map(addr => ({
            Address: addr.address || '',
            Name: addr.name || '',
          })),
          Cc: (parsed.cc?.value || []).map(addr => ({
            Address: addr.address || '',
            Name: addr.name || '',
          })),
          Bcc: (parsed.bcc?.value || []).map(addr => ({
            Address: addr.address || '',
            Name: addr.name || '',
          })),
          ReplyTo: (parsed.replyTo?.value || []).map(addr => ({
            Address: addr.address || '',
            Name: addr.name || '',
          })),
          Subject: parsed.subject || '',
          Date: parsed.date?.toISOString() || new Date().toISOString(),
          Text: parsed.text || '',
          HTML: parsed.html || '',
          Size: rawEmail.length,
          Headers: {},
          Attachments: (parsed.attachments || []).map(att => ({
            FileName: att.filename || 'attachment',
            ContentType: att.contentType || 'application/octet-stream',
            Size: att.size || 0,
            ContentID: att.contentId || '',
          })),
          Raw: rawEmail.toString('base64'),
          ReceivedAt: new Date().toISOString(),
          Session: {
            ClientIP: session.remoteAddress,
            Secure: session.secure,
            EHLO: session.clientHostname,
          },
        };

        // Parse headers into map
        if (parsed.headers) {
          for (const [key, value] of parsed.headers) {
            if (!email.Headers[key]) {
              email.Headers[key] = [];
            }
            email.Headers[key].push(typeof value === 'object' ? JSON.stringify(value) : String(value));
          }
        }

        emails.set(emailId, email);

        console.log(`[EMAIL] Received: ID=${emailId} From=${email.From.Address} To=${email.To.map(t => t.Address).join(',')} Subject="${email.Subject}" TLS=${session.secure}`);

        callback();
      } catch (err) {
        console.error('[EMAIL] Parse error:', err);
        callback(new Error('Failed to process message'));
      }
    });

    stream.on('error', (err) => {
      console.error('[EMAIL] Stream error:', err);
      callback(err);
    });
  },

  // Log connection events
  onConnect(session, callback) {
    console.log(`[CONNECT] ${session.remoteAddress}`);
    callback();
  },

  onClose(session) {
    console.log(`[DISCONNECT] ${session.remoteAddress}`);
  },

  // Error handling
  onError(err) {
    console.error('[SMTP ERROR]', err);
  },
});

// Create REST API server (mailpit-compatible)
const app = express();
app.use(express.json());

// Health check
app.get('/api/v1/info', (req, res) => {
  res.json({
    Name: 'Kibamail Test SMTP Server',
    Version: '1.0.0',
    Messages: emails.size,
    SMTPPort: SMTP_PORT,
    TLSEnabled: !!tlsOptions,
  });
});

// List messages (mailpit-compatible format)
app.get('/api/v1/messages', (req, res) => {
  const limit = parseInt(req.query.limit || '50', 10);
  const offset = parseInt(req.query.offset || '0', 10);

  const allEmails = Array.from(emails.values())
    .sort((a, b) => new Date(b.ReceivedAt) - new Date(a.ReceivedAt));

  const messages = allEmails.slice(offset, offset + limit).map(email => ({
    ID: email.ID,
    MessageID: email.MessageID,
    From: email.From,
    To: email.To,
    Subject: email.Subject,
    Date: email.Date,
    Size: email.Size,
    Attachments: email.Attachments.length,
  }));

  res.json({
    messages,
    total: emails.size,
    unread: emails.size,
    count: messages.length,
  });
});

// Get single message
app.get('/api/v1/message/:id', (req, res) => {
  const email = emails.get(req.params.id);
  if (!email) {
    return res.status(404).json({ error: 'Message not found' });
  }

  res.json({
    ID: email.ID,
    MessageID: email.MessageID,
    From: email.From,
    To: email.To,
    Cc: email.Cc,
    Bcc: email.Bcc,
    ReplyTo: email.ReplyTo,
    Subject: email.Subject,
    Date: email.Date,
    Text: email.Text,
    HTML: email.HTML,
    Size: email.Size,
    Attachments: email.Attachments,
    Headers: email.Headers,
  });
});

// Get message headers (separate endpoint like mailpit)
app.get('/api/v1/message/:id/headers', (req, res) => {
  const email = emails.get(req.params.id);
  if (!email) {
    return res.status(404).json({ error: 'Message not found' });
  }

  res.json(email.Headers);
});

// Get raw message
app.get('/api/v1/message/:id/raw', (req, res) => {
  const email = emails.get(req.params.id);
  if (!email) {
    return res.status(404).json({ error: 'Message not found' });
  }

  res.set('Content-Type', 'message/rfc822');
  res.send(Buffer.from(email.Raw, 'base64'));
});

// Search messages
app.get('/api/v1/search', (req, res) => {
  const query = (req.query.query || '').toLowerCase();
  const limit = parseInt(req.query.limit || '50', 10);

  const results = Array.from(emails.values())
    .filter(email => {
      return (
        email.Subject.toLowerCase().includes(query) ||
        email.From.Address.toLowerCase().includes(query) ||
        email.To.some(t => t.Address.toLowerCase().includes(query)) ||
        email.Text.toLowerCase().includes(query)
      );
    })
    .slice(0, limit)
    .map(email => ({
      ID: email.ID,
      From: email.From,
      To: email.To,
      Subject: email.Subject,
      Date: email.Date,
    }));

  res.json({
    messages: results,
    total: results.length,
  });
});

// Delete all messages
app.delete('/api/v1/messages', (req, res) => {
  const count = emails.size;
  emails.clear();
  console.log(`[API] Deleted ${count} messages`);
  res.json({ deleted: count });
});

// Delete single message
app.delete('/api/v1/message/:id', (req, res) => {
  if (emails.delete(req.params.id)) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Message not found' });
  }
});

// Handle server-level errors to prevent crashes
smtpServer.on('error', (err) => {
  // Log but don't crash on TLS errors (common with self-signed certs)
  if (err.code === 'ERR_SSL_TLSV1_ALERT_UNKNOWN_CA' ||
      err.code === 'ECONNRESET' ||
      err.code === 'EPIPE' ||
      err.code?.includes?.('SSL')) {
    console.log(`[TLS] Client rejected certificate or connection reset: ${err.code}`);
  } else {
    console.error('[SMTP] Server error:', err);
  }
});

// Start servers
smtpServer.listen(SMTP_PORT, '0.0.0.0', () => {
  console.log(`[SMTP] Server listening on port ${SMTP_PORT}`);
  console.log(`[SMTP] STARTTLS: ${tlsOptions ? 'enabled' : 'disabled (no certs)'}`);
  console.log(`[SMTP] Hostname: ${HOSTNAME}`);
});

app.listen(API_PORT, '0.0.0.0', () => {
  console.log(`[API] Server listening on port ${API_PORT}`);
  console.log(`[API] Endpoints:`);
  console.log(`      GET  /api/v1/info`);
  console.log(`      GET  /api/v1/messages`);
  console.log(`      GET  /api/v1/message/:id`);
  console.log(`      GET  /api/v1/message/:id/headers`);
  console.log(`      GET  /api/v1/message/:id/raw`);
  console.log(`      DELETE /api/v1/messages`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] Received SIGTERM');
  smtpServer.close(() => {
    console.log('[SMTP] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] Received SIGINT');
  smtpServer.close(() => {
    console.log('[SMTP] Server closed');
    process.exit(0);
  });
});
