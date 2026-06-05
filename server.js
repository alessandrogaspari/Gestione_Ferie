const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = process.env.PORT || 3000;

// MIME types per diversi tipi di file
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.bas': 'application/octet-stream'  // Aggiunto per file .bas
};

const server = http.createServer((req, res) => {
  // Aggiungi headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // SOLUZIONE A: Aggiungi header per bypassare l'avviso ngrok
  res.setHeader('ngrok-skip-browser-warning', 'true');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Estrai solo il percorso dall'URL, ignorando i parametri di query
  const parsedUrl = url.parse(req.url);
  
  // NUOVO: Endpoint specifico per download file .bas
  if (parsedUrl.pathname === '/download-bas') {
    const basFilePath = path.join(__dirname, 'FormattazioneProspettoFerie.bas');
    
    fs.readFile(basFilePath, (error, content) => {
      if (error) {
        console.error('Errore lettura file .bas:', error);
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File FormattazioneProspettoFerie.bas non trovato</h1>', 'utf-8');
      } else {
        // IMPORTANTE: Headers per forzare il download
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 'attachment; filename="FormattazioneProspettoFerie.bas"');
        res.setHeader('Content-Length', content.length);
        res.writeHead(200);
        res.end(content);
      }
    });
    return;
  }

  let filePath = path.join(__dirname, parsedUrl.pathname);
  
  console.log('URL richiesto:', req.url);
  console.log('Pathname estratto:', parsedUrl.pathname);
  console.log('Percorso file completo:', filePath);
  
  if (parsedUrl.pathname === '/') {
    filePath = path.join(__dirname, 'index.html');
  }

  // Gestione speciale per i moduli node_modules
  if (parsedUrl.pathname.startsWith('/node_modules/')) {
    filePath = path.join(__dirname, parsedUrl.pathname);
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});