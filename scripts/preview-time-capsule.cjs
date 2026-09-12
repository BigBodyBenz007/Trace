#!/usr/bin/env node
'use strict';

// Development-only server. It cannot serve the app, user data, or the repository.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const repository = path.resolve(__dirname, '..');
const previewRoot = path.join(repository, 'docs', 'time-capsule-motion-preview');
const evidenceRoot = path.join(repository, 'artifacts', 'time-capsule-motion');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.webm': 'video/webm',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

let host = '127.0.0.1';
let port = 4174;
let serveEvidence = false;
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === '--evidence') {
    serveEvidence = true;
  } else if (argument === '--host') {
    host = args[++index];
    if (host !== '127.0.0.1' && host !== '0.0.0.0') {
      console.error('--host must be 127.0.0.1 or 0.0.0.0.');
      process.exit(1);
    }
  } else if (argument === '--port') {
    const value = args[++index];
    if (!value || !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
      console.error('--port must be an integer from 1 to 65535.');
      process.exit(1);
    }
    port = Number(value);
  } else if (argument === '--help') {
    console.log('Usage: node scripts/preview-time-capsule.cjs [--port 4174] [--host 127.0.0.1|0.0.0.0] [--evidence]');
    process.exit(0);
  } else {
    console.error(`Unknown argument: ${argument}. Use --help for usage.`);
    process.exit(1);
  }
}

function isWithin(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function reply(request, response, status, message, extraHeaders = {}) {
  const body = `${message}\n`;
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  response.end(request.method === 'HEAD' ? undefined : body);
}

const server = http.createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    reply(request, response, 405, 'Only GET and HEAD are supported.', { Allow: 'GET, HEAD' });
    return;
  }

  try {
    // Decode before resolving and reject traversal, including Windows separators.
    const pathname = decodeURIComponent((request.url || '/').split(/[?#]/, 1)[0]);
    if (!pathname.startsWith('/') || /[\\:\x00-\x1f]/.test(pathname) || pathname.split('/').includes('..')) {
      reply(request, response, 400, 'Invalid path.');
      return;
    }

    const isEvidence = pathname === '/evidence' || pathname.startsWith('/evidence/');
    if (isEvidence && !serveEvidence) {
      reply(request, response, 404, 'Not found.');
      return;
    }

    const root = isEvidence ? evidenceRoot : previewRoot;
    let relative = isEvidence ? pathname.slice('/evidence'.length) : pathname;
    if (relative === '') relative = '/';
    if (relative.endsWith('/')) relative += 'index.html';
    const target = path.resolve(root, `.${relative}`);
    if (!isWithin(root, target)) {
      reply(request, response, 403, 'Forbidden.');
      return;
    }

    const mimeType = mimeTypes[path.extname(target).toLowerCase()];
    if (!mimeType) {
      reply(request, response, 404, 'Not found.');
      return;
    }

    const [realRoot, realTarget] = await Promise.all([
      fs.promises.realpath(root),
      fs.promises.realpath(target),
    ]);
    // Also prevent a symlink inside the preview from exposing files outside it.
    if (!isWithin(root, realRoot) || !isWithin(realRoot, realTarget)) {
      reply(request, response, 403, 'Forbidden.');
      return;
    }
    const stat = await fs.promises.stat(realTarget);
    if (!stat.isFile()) {
      reply(request, response, 404, 'Not found.');
      return;
    }

    let start = 0;
    let end = stat.size - 1;
    let status = 200;
    const headers = {
      'Content-Type': mimeType,
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'bytes',
    };

    // Byte ranges let browsers seek the optional recorded WebM evidence.
    if (request.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      if (!range || (!range[1] && !range[2]) || stat.size === 0) {
        reply(request, response, 416, 'Invalid byte range.', { 'Content-Range': `bytes */${stat.size}` });
        return;
      }
      if (!range[1]) {
        start = Math.max(0, stat.size - Number(range[2]));
      } else {
        start = Number(range[1]);
        if (range[2]) end = Math.min(end, Number(range[2]));
      }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= stat.size) {
        reply(request, response, 416, 'Invalid byte range.', { 'Content-Range': `bytes */${stat.size}` });
        return;
      }
      status = 206;
      headers['Content-Length'] = end - start + 1;
      headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    }

    response.writeHead(status, headers);
    if (request.method === 'HEAD' || stat.size === 0) {
      response.end();
      return;
    }
    const stream = fs.createReadStream(realTarget, { start, end });
    stream.on('error', () => response.destroy());
    response.on('close', () => stream.destroy());
    stream.pipe(response);
  } catch (error) {
    if (response.headersSent) {
      response.destroy();
    } else if (error instanceof URIError) {
      reply(request, response, 400, 'Invalid path encoding.');
    } else if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      reply(request, response, 404, 'Not found.');
    } else {
      reply(request, response, 500, 'Unable to serve this file.');
    }
  }
});

server.on('error', (error) => {
  console.error(`Preview server failed: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Time Capsule motion preview: http://127.0.0.1:${port}/`);
  console.log(`Serving only: ${previewRoot}`);
  if (serveEvidence) console.log(`Evidence: http://127.0.0.1:${port}/evidence/ (only ${evidenceRoot})`);
  if (host === '0.0.0.0') {
    console.warn('LAN access enabled: other devices on your network can view this synthetic preview and any enabled evidence.');
    console.log(`Mobile URL: http://<this-computer-LAN-IP>:${port}/`);
  }
  console.log('Press Ctrl+C to stop.');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
