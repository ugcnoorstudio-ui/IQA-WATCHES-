'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
const compressible = /^(text\/|application\/(?:javascript|json|xml)|image\/svg\+xml)/;
const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(requestUrl.pathname);
  const requested = pathname.startsWith('/products/') ? '/index.html' : (pathname === '/' ? '/index.html' : pathname);
  const file = path.resolve(root, '.' + requested);
  if (!file.startsWith(root + path.sep) && file !== path.join(root, 'index.html')) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file, (statError, stat) => {
    const target = !statError && stat.isDirectory() ? path.join(file, 'index.html') : file;
    fs.readFile(target, (error, data) => {
      if (error) { res.writeHead(404, {'content-type':'text/plain; charset=utf-8'}); return res.end('Not found'); }
      const type = types[path.extname(target)] || 'application/octet-stream';
      const html = path.extname(target) === '.html';
      const versioned = requestUrl.searchParams.has('v');
      const cache = html ? 'public, max-age=0, must-revalidate' : versioned ? 'public, max-age=31536000, immutable' : 'public, max-age=3600, stale-while-revalidate=86400';
      const headers = {'content-type':type,'cache-control':cache,'vary':'Accept-Encoding'};
      let body = data;
      if (compressible.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
        body = zlib.gzipSync(data);
        headers['content-encoding'] = 'gzip';
      }
      headers['content-length'] = body.length;
      res.writeHead(200, headers);
      if (req.method === 'HEAD') return res.end();
      res.end(body);
    });
  });
});
const port = Number(process.env.PORT || 4173);
server.listen(port, '127.0.0.1', () => process.stdout.write('IQA SEO server listening on ' + port + '\n'));
