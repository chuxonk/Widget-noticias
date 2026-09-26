// Descarga el Euribor a 12 meses (media mensual, Banco Central Europeo) y escribe data/euribor.json.
// Si la fuente falla o el dato no es razonable, NO toca el archivo anterior y termina sin error.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = join(RAIZ, 'data', 'euribor.json');
const URL_BCE = 'https://data-api.ecb.europa.eu/service/data/FM/M.U2.EUR.RT.MM.EURIBOR1YD_.HSTA?lastNObservations=4&format=csvdata';

try {
  const res = await fetch(URL_BCE, { headers: { 'User-Agent': 'calculoexperto-euribor/1.0' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const filas = (await res.text()).trim().split(/\r?\n/).map((l) => l.split(','));
  const cab = filas.shift();
  const iP = cab.indexOf('TIME_PERIOD'), iV = cab.indexOf('OBS_VALUE');
  if (iP < 0 || iV < 0) throw new Error('formato inesperado');
  const serie = filas
    .map((f) => ({ periodo: f[iP], valor: parseFloat(f[iV]) }))
    .filter((o) => /^\d{4}-\d{2}$/.test(o.periodo) && Number.isFinite(o.valor) && o.valor > -1 && o.valor < 10)
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
  if (serie.length < 2) throw new Error('datos insuficientes');
  const r3 = (n) => Math.round(n * 1000) / 1000;
  const ultimo = serie[serie.length - 1], anterior = serie[serie.length - 2];
  const salida = {
    serie: 'Euribor 12 meses (media mensual)',
    fuente: 'Banco Central Europeo',
    consultado: new Date().toISOString().slice(0, 10),
    ultimo: { periodo: ultimo.periodo, valor: r3(ultimo.valor) },
    anterior: { periodo: anterior.periodo, valor: r3(anterior.valor) },
    variacion: r3(ultimo.valor - anterior.valor)
  };
  await mkdir(dirname(SALIDA), { recursive: true });
  const nuevo = JSON.stringify(salida, null, 2) + '\n';
  let viejo = '';
  try { viejo = await readFile(SALIDA, 'utf8'); } catch {}
  if (viejo !== nuevo) await writeFile(SALIDA, nuevo, 'utf8');
  console.log('Euribor 12 m', ultimo.periodo, ultimo.valor, '(variación', salida.variacion + ')');
} catch (e) {
  console.log('Euribor: no se pudo actualizar (' + e.message + '). Se conserva el dato anterior.');
}
