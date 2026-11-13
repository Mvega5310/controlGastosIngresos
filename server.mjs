/**
 * Servidor estático de producción para FinControl.
 *
 * Sirve la carpeta `dist` que genera `npm run build`. Usa solo módulos propios
 * de Node: ninguna dependencia externa, y por tanto ninguna superficie de
 * vulnerabilidades que mantener en una aplicación que maneja dinero.
 */
import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join, normalize, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'dist')
const PORT = Number(process.env.PORT) || 3000

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
}

/** Resuelve la ruta pedida dentro de dist, sin permitir salir de ella. */
const resolve = urlPath => {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.[/\\])+/, '')
  const full = join(ROOT, clean)
  return full.startsWith(ROOT) ? full : null
}

const serve = (res, file, status = 200) => {
  const ext = extname(file).toLowerCase()
  // Vite pone un hash en el nombre de cada recurso, así que pueden cachearse
  // para siempre. El index.html no, o el navegador nunca vería una versión nueva.
  const cache =
    ext === '.html' || file.endsWith('.webmanifest') ? 'no-cache' : 'public, max-age=31536000, immutable'
  res.writeHead(status, {
    'Content-Type': TYPES[ext] || 'application/octet-stream',
    'Cache-Control': cache,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin'
  })
  createReadStream(file).pipe(res)
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end('Método no permitido')
    return
  }
  const index = join(ROOT, 'index.html')
  const target = resolve(req.url || '/')
  if (!target) {
    serve(res, index, 200)
    return
  }
  try {
    const info = await stat(target)
    if (info.isFile()) {
      serve(res, target, 200)
      return
    }
    if (info.isDirectory()) {
      const inner = join(target, 'index.html')
      const innerInfo = await stat(inner).catch(() => null)
      if (innerInfo?.isFile()) {
        serve(res, inner, 200)
        return
      }
    }
  } catch {
    /* no existe: cae al index */
  }
  // Aplicación de una sola página: cualquier ruta desconocida la resuelve el cliente.
  serve(res, index, 200)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`FinControl servido en http://0.0.0.0:${PORT}`)
})
