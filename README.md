# Widget de noticias de Economía y Tecnología

Se actualiza solo cada 3 horas, cuesta 0 € y no necesita servidor ni claves de API.

```
Medios (RSS) ──> GitHub Action (cada 3 h) ──> data/news.json ──> GitHub Pages ──> widget (tu web)
```

## Qué hay en el repositorio

| Archivo | Para qué sirve |
|---|---|
| `sources.json` | **Lista de feeds.** Aquí añades/quitas medios y ajustas límites. |
| `scripts/update-news.mjs` | Lee los feeds y genera `data/news.json` (Node 18+, sin dependencias). |
| `.github/workflows/update-news.yml` | La automatización: ejecuta el script, guarda el JSON y hace keepalive. |
| `data/news.json` | Resultado que lee el widget. |
| `widget/noticias.html` | El widget: un único bloque para pegar en WordPress. |
| `scripts/serve.mjs` | Solo para probar en local (`node scripts/serve.mjs` y abrir `http://localhost:8787/demo`). |

## Puesta en marcha (una sola vez)

1. **Crea el repositorio.** En GitHub: *New repository* → nombre, por ejemplo, `noticias-widget` → **Public** → *Create*.
2. **Sube los archivos** de esta carpeta (botón *Add file → Upload files*, incluida la carpeta oculta `.github`). Si usas git: `git init`, `git add .`, `git commit`, `git remote add origin …`, `git push`.
3. **Permisos de Actions.** *Settings → Actions → General → Workflow permissions* → marca **Read and write permissions** → *Save*.
4. **Activa GitHub Pages.** *Settings → Pages* → *Source*: **Deploy from a branch** → Branch: `main`, carpeta `/ (root)` → *Save*.
5. **Lanza la primera actualización.** Pestaña *Actions* → *Actualizar noticias* → *Run workflow*. Debe terminar en verde.
6. **Comprueba la URL del JSON:** `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/data/news.json` (tarda 1-2 minutos la primera vez). Debe mostrar las noticias.

A partir de aquí no tienes que hacer nada más.

## Pegar el widget en WordPress con WPCode

1. Abre `widget/noticias.html` y **cambia solo** la URL de `data-src` por la de tu `news.json` (paso 6).
2. En WordPress: *Code Snippets → Add Snippet → Add Your Custom Code (New Snippet)*.
3. Tipo de código: **HTML Snippet**. Pega el contenido completo del archivo.
4. Inserción: *Auto Insert* (por ejemplo, tras el contenido de una página) o *Shortcode*; después pega el shortcode donde quieras mostrarlo.
5. Activa el interruptor y pulsa **Save Snippet**.

Alternativa sin plugin: bloque **HTML personalizado** del editor y pegar el contenido.

Para usarlo en otras webs, pega el mismo bloque con la misma `data-src`. Puedes cambiar `data-max` (nº de tarjetas mostradas, por defecto 12).

## Añadir o quitar medios

Edita `sources.json` (puedes hacerlo desde la web de GitHub con el icono del lápiz):

```json
{ "nombre": "Nombre del medio", "categoria": "Economía", "url": "https://…/feed", "activa": true }
```

`categoria` solo puede ser `Economía` o `Tecnología`. Para desactivar un medio, pon `"activa": false`. Comprueba siempre que el feed devuelve noticias recientes antes de añadirlo.

## Cómo funciona el "keepalive"

GitHub **desactiva los workflows programados si el repositorio lleva 60 días sin actividad**. Hay dos defensas:

1. `news.json` cambia varias veces al día, y cada cambio es un commit (actividad real).
2. En cada ejecución, el último paso del workflow llama a la API de GitHub para **volver a habilitar el propio workflow**, lo que reinicia ese contador de 60 días.

Si aun así un día recibes un aviso de GitHub de que el workflow se desactivó, entra en *Actions* y pulsa *Enable workflow*.

## Qué pasa si un medio falla

El script trabaja feed a feed: si uno falla (caído, bloqueado, error 429) se sigue con los demás y se conservan las noticias recientes que ya teníamos de ese medio. Si se caen todos, `news.json` no se toca. Y el widget guarda una copia en el navegador: si no puede descargar el JSON, muestra la última que vio.

## Notas legales

Solo se guardan titular, extracto de 160 caracteres como máximo, fuente, fecha, imagen (enlazada, no copiada) y enlace al original. El widget muestra «Noticias vía RSS de sus respectivos medios». Revisa las condiciones de uso de cada medio antes de usar sus feeds con fines comerciales.
