'use strict';

/*
 * Small mock server standing in for a job application backend, so submissions
 * and error cases can be tested without touching the live portal.
 * No dependencies. Data is kept in memory and lost on restart.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { validate } = require('../shared/validation');

const PORT = Number(process.env.PORT) || 4173;
const HOST = '127.0.0.1';
const MAX_BODY_BYTES = 16 * 1024;
const JOB_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const PUBLIC_DIR = path.join(__dirname, 'public');
const STATIC_FILES = new Map([
  ['/', { file: path.join(PUBLIC_DIR, 'index.html'), type: 'text/html; charset=utf-8' }],
  ['/app.js', { file: path.join(PUBLIC_DIR, 'app.js'), type: 'text/javascript; charset=utf-8' }],
  ['/styles.css', { file: path.join(PUBLIC_DIR, 'styles.css'), type: 'text/css; charset=utf-8' }],
  [
    '/validation.js',
    {
      file: path.join(__dirname, '..', 'shared', 'validation.js'),
      type: 'text/javascript; charset=utf-8',
    },
  ],
]);

const applicationsByJob = new Map();
let sequence = 0;

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), { 'Content-Type': 'application/json; charset=utf-8' });
}

function serveStatic(res, entry, method) {
  fs.readFile(entry.file, (error, content) => {
    if (error) return sendJson(res, 500, { error: 'static_file_unavailable' });
    return send(res, 200, method === 'HEAD' ? undefined : content, {
      'Content-Type': entry.type,
      'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
    });
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

async function createApplication(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, error.status || 400, {
      error: error.status === 413 ? 'payload_too_large' : 'invalid_json',
    });
  }

  if (!body || typeof body !== 'object' || !JOB_ID_PATTERN.test(String(body.jobId))) {
    return sendJson(res, 400, { error: 'invalid_job' });
  }

  const { values, errors } = validate(body);
  if (Object.keys(errors).length > 0) {
    return sendJson(res, 400, { errors });
  }

  const jobId = String(body.jobId);
  const existing = applicationsByJob.get(jobId) || [];
  const emailKey = values.email.toLowerCase();
  if (existing.some((application) => application.email.toLowerCase() === emailKey)) {
    return sendJson(res, 409, {
      error: 'duplicate_application',
      message: 'You have already applied for this role.',
    });
  }

  sequence += 1;
  const application = {
    id: `APP-${String(sequence).padStart(4, '0')}`,
    jobId,
    fullName: values.fullName,
    email: values.email,
    experience: Number(values.experience),
    coverNote: values.coverNote,
    createdAt: new Date().toISOString(),
  };
  applicationsByJob.set(jobId, [...existing, application]);
  return sendJson(res, 201, { id: application.id, fullName: application.fullName });
}

function listApplications(url, res) {
  const jobId = url.searchParams.get('jobId') || '';
  if (!JOB_ID_PATTERN.test(jobId)) return sendJson(res, 400, { error: 'invalid_job' });
  const applications = applicationsByJob.get(jobId) || [];
  return sendJson(res, 200, { count: applications.length, applications });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}`);
  const { pathname } = url;
  const method = req.method;

  try {
    if (pathname === '/healthz' && method === 'GET') return sendJson(res, 200, { status: 'ok' });

    if (STATIC_FILES.has(pathname)) {
      if (method !== 'GET' && method !== 'HEAD') {
        return sendJson(res, 405, { error: 'method_not_allowed' });
      }
      return serveStatic(res, STATIC_FILES.get(pathname), method);
    }

    if (pathname === '/api/applications') {
      if (method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });
      return await createApplication(req, res);
    }

    // Test-only read endpoint: lets tests check what the server really stored.
    if (pathname === '/api/test/applications') {
      if (method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' });
      return listApplications(url, res);
    }

    return sendJson(res, 404, { error: 'not_found' });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: 'internal_error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Mock application form running at http://${HOST}:${PORT}/?job=qa-engineer`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
