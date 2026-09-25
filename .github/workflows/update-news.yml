// Actualiza data/news.json leyendo los feeds RSS de sources.json.
// Sin dependencias: solo Node 18+ (fetch incluido).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const RUTA_FUENTES = join(RAIZ, 'sources.json');
const RUTA_SALIDA = join(RAIZ, 'data', 'news.json');

// ---------- utilidades de texto ----------
const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', laquo: '«', raquo: '»', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', euro: '€' };
function decodificar(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return String.fromCodePoint(n); } catch { return ''; }
    }
    return ENTIDADES[e.toLowerCase()] ?? m;
  });
}
function textoPlano(html) {
  let s = html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  s = decodificar(s); // por si el HTML venía escapado
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<\/?(p|br|div|li|ul|ol|h[1-6]|blockquote|figure|figcaption|tr|td)\b[^>]*>/gi, ' ').replace(/<[^>]+>/g, '');
  s = decodificar(s);
  return s.replace(/\s+/g, ' ').trim();
}
function limpiarExtracto(texto, titulo, max) {
  let s = texto
    .replace(/(The post|La entrada|El artículo|El post)\b.*?(appeared first on|apareció primero en|apareció en).*$/i, '')
    .replace(/\bLeer (más|mas)\b.*$/i, '')
    .replace(/\s*\bLeer\s*$/i, '')
    .replace(/\[…\]|\[\.\.\.\]/g, '')
    .trim();
  if (s.toLowerCase().startsWith(titulo.toLowerCase())) s = s.slice(titulo.length).replace(/^[\s:.\-–—]+/, '');
  if (s.length > max) {
    s = s.slice(0, max - 1);
    const i = s.lastIndexOf(' ');
    if (i > max * 0.6) s = s.slice(0, i);
    s = s.replace(/[\s,;:.\-–—]+$/, '') + '…';
  }
  return s;
}

// ---------- parser RSS/Atom ----------
function etiqueta(bloque, nombre) {
  const m = bloque.match(new RegExp(`<${nombre}(?:\\s[^>]*)?>([\\s\\S]*?)</${nombre}>`, 'i'));
  return m ? m[1] : '';
}
function atributo(bloque, nombre, attr, filtro) {
  for (const t of bloque.match(new RegExp(`<${nombre}\\s[^>]*?>`, 'gi')) || []) {
    if (filtro && !filtro(t)) continue;
    const m = t.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i'));
    if (m) return decodificar(m[1]);
  }
  return '';
}
function urlHttps(u) {
  if (!u) return '';
  u = u.trim();
  if (u.startsWith('//')) u = 'https:' + u;
  if (!/^https?:\/\//i.test(u)) return '';
  return u.replace(/^http:\/\//i, 'https://');
}
function parsearFeed(xml) {
  const bloques = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  return bloques.map((b) => {
    const titulo = textoPlano(etiqueta(b, 'title'));
    let link = textoPlano(etiqueta(b, 'link'));
    if (!link) link = atributo(b, 'link', 'href', (t) => !/rel=["'](?!alternate)/i.test(t));
    const descRaw = etiqueta(b, 'content:encoded') || etiqueta(b, 'description') || etiqueta(b, 'summary') || etiqueta(b, 'content');
    const fecha = textoPlano(etiqueta(b, 'pubDate') || etiqueta(b, 'published') || etiqueta(b, 'updated') || etiqueta(b, 'dc:date'));
    let img = atributo(b, 'media:content', 'url', (t) => !/medium=["'](?!image)|type=["'](?!image)/i.test(t))
      || atributo(b, 'media:thumbnail', 'url')
      || atributo(b, 'enclosure', 'url', (t) => /type=["']image/i.test(t));
    if (!img) {
      const html = decodificar(descRaw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'));
      const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (m) img = m[1];
    }
    return { titulo, link: link.trim(), descRaw, fecha, imagen: urlHttps(decodificar(img || '')) };
  });
}

// ---------- normalización y duplicados ----------
function urlCanonica(u) {
  try {
    const x = new URL(u);
    x.hash = '';
    for (const k of [...x.searchParams.keys()]) if (/^(utm_|fbclid|gclid|ref$|xtor|cmp)/i.test(k)) x.searchParams.delete(k);
    return (x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/+$/, '') + x.search).toLowerCase();
  } catch { return u.toLowerCase(); }
}
const PARADA = new Set('el la los las un una unos unas de del al y o en a con por para que se su sus es lo como más mas pero sin sobre tras entre ante'.split(' '));
function tokens(t) {
  return new Set(t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !PARADA.has(w)));
}
function similitud(a, b) {
  if (!a.size || !b.size) return 0;
  let c = 0;
  for (const w of a) if (b.has(w)) c++;
  return c / (a.size + b.size - c);
}
function deduplicar(lista, umbral) {
  const vistas = new Set();
  const salida = [];
  for (const n of lista) { // lista ya ordenada por fecha desc
    const k = urlCanonica(n.url);
    if (vistas.has(k)) continue;
    const tk = tokens(n.title);
    if (salida.some((o) => similitud(tk, o._tk) >= umbral)) continue;
    vistas.add(k);
    n._tk = tk;
    salida.push(n);
  }
  return salida;
}

// ---------- selección equilibrada ----------
function seleccionar(lista, max, maxPorFuente) {
  const elegidas = new Set();
  const porFuente = {};
  const cuota = Math.floor(max / 2);
  const tomar = (n) => { elegidas.add(n); porFuente[n.source] = (porFuente[n.source] || 0) + 1; };
  for (const c of ['Economía', 'Tecnología']) {
    let k = 0;
    for (const n of lista) {
      if (k >= cuota) break;
      if (n.category !== c || (porFuente[n.source] || 0) >= maxPorFuente) continue;
      tomar(n); k++;
    }
  }
  for (const n of lista) { // rellenar hasta max con lo más reciente
    if (elegidas.size >= max) break;
    if (!elegidas.has(n) && (porFuente[n.source] || 0) < maxPorFuente) tomar(n);
  }
  for (const n of lista) { // último recurso: ignorar el tope por fuente
    if (elegidas.size >= max) break;
    if (!elegidas.has(n)) tomar(n);
  }
  return lista.filter((n) => elegidas.has(n));
}

// ---------- descarga ----------
async function descargar(url, timeoutS) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutS * 1000);
  try {
    const r = await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NoticiasWidget/1.0)', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}

async function main() {
  const cfg = JSON.parse(await readFile(RUTA_FUENTES, 'utf8'));
  const a = cfg.ajustes;
  const ahora = Date.now();
  const limite = ahora - a.maxDiasAntiguedad * 86400000;

  let anterior = null;
  try { anterior = JSON.parse(await readFile(RUTA_SALIDA, 'utf8')); } catch { /* primera vez */ }

  const fuentes = cfg.fuentes.filter((f) => f.activa !== false);
  // Una a una y con un reintento: evita el error 429 (demasiadas peticiones) de algunos medios.
  const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
  const resultados = [];
  for (const f of fuentes) {
    try {
      let xml;
      try { xml = await descargar(f.url, a.timeoutSegundos); } catch { await pausa(4000); xml = await descargar(f.url, a.timeoutSegundos); }
      const items = parsearFeed(xml);
      if (!items.length) throw new Error('feed sin noticias');
      resultados.push({ status: 'fulfilled', value: items });
    } catch (e) {
      resultados.push({ status: 'rejected', reason: e });
    }
    await pausa(500);
  }

  const nuevas = [];
  const fallidas = new Set();
  resultados.forEach((r, i) => {
    const f = fuentes[i];
    if (r.status === 'rejected') {
      fallidas.add(f.nombre);
      console.warn(`✗ ${f.nombre}: ${r.reason?.message || r.reason}`);
      return;
    }
    let ok = 0;
    for (const it of r.value) {
      const ms = Date.parse(it.fecha);
      const url = urlHttps(it.link);
      if (!it.titulo || !url || Number.isNaN(ms) || ms < limite) continue;
      nuevas.push({
        title: it.titulo,
        excerpt: limpiarExtracto(textoPlano(it.descRaw), it.titulo, a.extractoMax),
        source: f.nombre,
        category: f.categoria,
        url,
        date: new Date(Math.min(ms, ahora)).toISOString(),
        image: it.imagen || null,
      });
      if (++ok >= a.noticiasPorFeed) break;
    }
    console.log(`✓ ${f.nombre}: ${ok} noticias`);
  });

  // Si una fuente falló, conservamos lo que ya teníamos de ella (mientras sea reciente).
  for (const n of anterior?.items || []) {
    if (fallidas.has(n.source) && Date.parse(n.date) >= limite) nuevas.push(n);
  }

  nuevas.sort((x, y) => Date.parse(y.date) - Date.parse(x.date));
  const unicas = deduplicar(nuevas, a.umbralTitulosSimilares);
  const items = seleccionar(unicas, a.maxNoticias, a.maxPorFuente).map(({ _tk, ...n }) => n);

  if (items.length < 3) {
    console.warn('Muy pocas noticias: se conserva el news.json anterior.');
    return;
  }
  if (anterior && JSON.stringify(anterior.items) === JSON.stringify(items)) {
    console.log('Sin cambios: news.json no se modifica.');
    return;
  }
  const salida = { generatedAt: new Date().toISOString(), count: items.length, items };
  await mkdir(dirname(RUTA_SALIDA), { recursive: true });
  await writeFile(RUTA_SALIDA, JSON.stringify(salida, null, 2) + '\n', 'utf8');
  console.log(`news.json actualizado con ${items.length} noticias.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
