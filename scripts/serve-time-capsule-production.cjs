// Local production-build server for isolated browser validation. No user data is read.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

function startServer(port = 4180) {
  const root = path.resolve(__dirname, '../build');
  if (!fs.existsSync(path.join(root, 'index.html'))) throw Error('Run npm run build first.');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.txt': 'text/plain', '.ico': 'image/x-icon' };
  const server = http.createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); }
    catch { response.writeHead(400); response.end(); return; }
    let file = path.resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) { response.writeHead(403); response.end(); return; }
    if (file === root || !path.extname(file)) file = path.join(root, 'index.html');
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) { response.writeHead(404); response.end(); return; }
      const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' };
      let start = 0, end = stat.size - 1, status = 200;
      const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range || '');
      if (range && (range[1] || range[2])) {
        start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2]));
        end = range[1] && range[2] ? Math.min(Number(range[2]), end) : end;
        if (start > end || start >= stat.size) { response.writeHead(416, { ...headers, 'Content-Range': `bytes */${stat.size}` }); response.end(); return; }
        status = 206;
        headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
      }
      headers['Content-Length'] = end - start + 1;
      response.writeHead(status, headers);
      if (request.method === 'HEAD') response.end();
      else fs.createReadStream(file, { start, end }).pipe(response);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

if (require.main === module) startServer(Number(process.env.PORT) || 4180)
  .then(() => console.log(`Trace production build: http://127.0.0.1:${Number(process.env.PORT) || 4180}`))
  .catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { startServer };
