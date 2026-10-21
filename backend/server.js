'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PORT = Number.parseInt(process.env.PORT || '8765', 10);
const HOST = process.env.HOST || '127.0.0.1';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.zip': 'application/zip',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function sendJson(response, statusCode, data) {
  const body = JSON.stringify(data);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  response.end(body);
}

function resolvePublicPath(urlPath) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(urlPath);
  } catch {
    return null;
  }

  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
  const requestedPath = path.resolve(PROJECT_ROOT, relativePath);
  const relativeToRoot = path.relative(PROJECT_ROOT, requestedPath);

  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  return requestedPath;
}

function serveFile(request, response, filePath) {
  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      sendJson(response, 404, { error: 'Recurso no encontrado' });
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extension] || 'application/octet-stream';
    const headers = {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin'
    };

    // Durante el desarrollo evita que el navegador conserve HTML, CSS y JS antiguos.
    if (['.html', '.css', '.js', '.json'].includes(extension)) {
      headers['Cache-Control'] = 'no-store';
    }

    response.writeHead(200, headers);

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!response.headersSent) {
        sendJson(response, 500, { error: 'No se pudo leer el recurso' });
      } else {
        response.destroy();
      }
    });
    stream.pipe(response);
  });
}

const server = http.createServer((request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: 'Solicitud no válida' });
    return;
  }

  if (!['GET', 'HEAD'].includes(request.method || '')) {
    response.setHeader('Allow', 'GET, HEAD');
    sendJson(response, 405, { error: 'Método no permitido en esta etapa' });
    return;
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (requestUrl.pathname === '/api/health') {
    sendJson(response, 200, {
      status: 'ok',
      service: 'polo-oeste-web',
      stage: 1
    });
    return;
  }

  const filePath = resolvePublicPath(requestUrl.pathname);
  if (!filePath) {
    sendJson(response, 400, { error: 'Ruta no válida' });
    return;
  }

  serveFile(request, response, filePath);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`El puerto ${PORT} ya está en uso. Cierra Live Server u otro proceso que utilice ese puerto.`);
  } else {
    console.error('No se pudo iniciar el servidor:', error.message);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log('Servidor de Polo Oeste iniciado.');
  console.log(`Web: http://${HOST}:${PORT}`);
  console.log(`Comprobación: http://${HOST}:${PORT}/api/health`);
  console.log('Para detenerlo, cierra esta ventana o pulsa Ctrl+C.');
});
