// Servidor local solo para probar: node scripts/serve.mjs  ->  http://localhost:8787/demo
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = 8787;

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/demo') {
      // Página de prueba con un "tema" agresivo para comprobar que el widget no hereda sus estilos.
      let w = await readFile(join(RAIZ, 'widget', 'noticias.html'), 'utf8');
      w = w.replace(/data-src="[^"]*"/, 'data-src="/data/news.json"');
      const pagina = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demo</title>
<style>body{font-family:Comic Sans MS,cursive;background:#e8f0ff;color:#003;margin:0;padding:12px}h3,a,p,button,li{color:hotpink!important;text-transform:lowercase!important;font-size:30px!important}</style>
<p style="font-size:14px!important;color:#003!important">Contenido de la web (el tema tiene estilos agresivos a propósito)</p>${w}`;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(pagina);
    }
    const ruta = url.pathname.startsWith('/data/') ? join(RAIZ, url.pathname) : null;
    if (!ruta) { res.writeHead(404); return res.end('404'); }
    const datos = await readFile(ruta);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(datos);
  } catch { res.writeHead(404); res.end('404'); }
}).listen(PUERTO, () => console.log('Demo en http://localhost:' + PUERTO + '/demo'));
