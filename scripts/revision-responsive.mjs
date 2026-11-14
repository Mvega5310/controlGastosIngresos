/**
 * Revisión responsive de FinControl.
 *
 * Recorre las 12 secciones en los siete tamaños de docs/REDISENO-MOVIL.md, más
 * cuatro formatos horizontales y un plegable, y
 * falla si encuentra lo que el rediseño móvil quiso quitar:
 *
 *   - scroll horizontal del documento, o elementos que se salen de la pantalla;
 *   - la tabla de movimientos en móvil, o las tarjetas en escritorio;
 *   - el botón + de la barra inferior cortado, o por debajo de 44 px;
 *   - la cabecera móvil con controles por debajo de 44 px;
 *   - el modal de nuevo movimiento que no cabe o deja el guardar fuera de vista.
 *
 * No forma parte de `npm run verificar`: necesita un navegador.
 *
 *   npx playwright install chromium     (una sola vez)
 *   npm run build
 *   npm run revision:responsive
 *
 * También sirve para revisar algo ya desplegado, sin compilar ni arrancar nada:
 *
 *   REVISION_URL=https://mi-staging.up.railway.app npm run revision:responsive
 *
 * Arranca su propio servidor sobre `dist/`, con el mismo `server.mjs` que usa
 * producción, de modo que lo que se revisa es lo que se despliega.
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUERTO = Number(process.env.PUERTO) || 4179
/** Con REVISION_URL se revisa una dirección ya desplegada (p. ej. el staging). */
const URL_EXTERNA = process.env.REVISION_URL
const BASE = URL_EXTERNA ? URL_EXTERNA.replace(/\/?$/, '/') : `http://127.0.0.1:${PUERTO}/`

/**
 * [ancho, alto, táctil]. `táctil` es si el dispositivo se maneja con el dedo, que
 * no es lo mismo que el ancho: un móvil en horizontal mide 844 px de ancho y
 * sigue siendo un móvil. Los cuatro últimos son los formatos horizontales y el
 * plegable; el manifiesto no fuerza la orientación, así que han de funcionar.
 */
const TAMANOS = [
  [320, 640, true],
  [360, 800, true],
  [390, 844, true],
  [430, 932, true],
  [768, 1024, true],
  [1366, 768, false],
  [1440, 900, false],
  [667, 375, true],
  [844, 390, true],
  [1024, 768, true],
  [884, 1104, true]
]
const SECCIONES = [
  'Inicio',
  'Movimientos',
  'Cuentas',
  'Calendario',
  'Suscripciones',
  'Deudas',
  'Metas de ahorro',
  'Presupuestos',
  'Inversiones',
  'Transporte',
  'Reportes',
  'Ajustes'
]
/** Hasta este ancho los movimientos se muestran como tarjetas. */
const ANCHO_TARJETAS = 767
/** Hasta este ancho hay barra inferior y menú lateral desplegable. */
const ANCHO_BARRA_INFERIOR = 900
const TACTIL = 44

let playwright
try {
  playwright = await import('playwright')
} catch {
  console.error('Falta Playwright. Instálalo con:  npm i -D playwright && npx playwright install chromium')
  process.exit(2)
}
if (!URL_EXTERNA && !existsSync(join(RAIZ, 'dist', 'index.html'))) {
  console.error('No hay compilación. Ejecuta primero:  npm run build')
  process.exit(2)
}

// Con una dirección externa no hay servidor que arrancar.
const servidor = URL_EXTERNA
  ? null
  : spawn(process.execPath, ['server.mjs'], {
      cwd: RAIZ,
      env: { ...process.env, PORT: String(PUERTO) },
      stdio: 'ignore'
    })
const apagar = () => servidor?.kill()
process.on('exit', apagar)
if (servidor) await new Promise(r => setTimeout(r, 900))

const fallos = []
const anotar = (tam, seccion, texto) => fallos.push(`${tam[0]}×${tam[1]} · ${seccion}: ${texto}`)

// Si el entorno obliga a salir por un proxy, se indica con REVISION_PROXY.
const proxy = process.env.REVISION_PROXY ? { server: process.env.REVISION_PROXY } : undefined
const navegador = await playwright.chromium.launch({ proxy })
try {
  for (const tam of TAMANOS) {
    const [w, h, tactil] = tam
    const tarjetas = w <= ANCHO_TARJETAS
    const barraInferior = w <= ANCHO_BARRA_INFERIOR
    const ctx = await navegador.newContext({
      viewport: { width: w, height: h },
      isMobile: tactil,
      hasTouch: tactil,
      deviceScaleFactor: 1
    })
    const p = await ctx.newPage()
    const errores = []
    p.on('pageerror', e => errores.push(e.message))
    await p.goto(BASE, { waitUntil: 'networkidle' })

    const ir = nombre =>
      p.evaluate(
        n => [...document.querySelectorAll('.nav-item')].find(b => b.textContent.trim() === n)?.click(),
        nombre
      )

    // Datos de muestra, para que haya tabla, tarjetas, avisos y gráfica.
    await ir('Ajustes')
    await p.waitForTimeout(150)
    await p.evaluate(() =>
      [...document.querySelectorAll('button')].find(b => b.textContent.includes('Cargar ejemplos'))?.click()
    )
    await p.waitForTimeout(250)

    for (const seccion of SECCIONES) {
      await ir(seccion)
      await p.waitForTimeout(220)
      const r = await p.evaluate(() => {
        const W = document.documentElement.clientWidth
        const fuera = []
        for (const e of document.querySelectorAll('.content *')) {
          // La tabla desplaza por dentro, y la gráfica gestiona su propio ancho.
          if (e.closest('.table-wrap') || e.closest('.recharts-wrapper')) continue
          const c = e.getBoundingClientRect()
          if (c.width && c.height && (c.right > W + 1 || c.left < -1))
            fuera.push(String(e.className).split(' ')[0] || e.tagName)
        }
        return { desborde: document.documentElement.scrollWidth - W, fuera: [...new Set(fuera)].slice(0, 3) }
      })
      if (r.desborde > 0) anotar(tam, seccion, `desborde horizontal de ${r.desborde} px`)
      if (r.fuera.length) anotar(tam, seccion, `se sale de la pantalla: ${r.fuera.join(', ')}`)
    }

    // Tabla a partir de 768 px, tarjetas por debajo.
    await ir('Movimientos')
    await p.waitForTimeout(250)
    const vista = await p.evaluate(() => {
      const visible = s => {
        const e = document.querySelector(s)
        return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0
      }
      return { tabla: visible('.tabla-escritorio'), tarjetas: visible('.lista-movil') }
    })
    if (tarjetas && (vista.tabla || !vista.tarjetas))
      anotar(tam, 'Movimientos', 'aquí deben verse las tarjetas y no la tabla')
    if (!tarjetas && (!vista.tabla || vista.tarjetas))
      anotar(tam, 'Movimientos', 'aquí debe verse la tabla y no las tarjetas')

    if (barraInferior) {
      const m = await p.evaluate(() => {
        const mas = document.querySelector('.mobile-nav button:nth-child(3)').getBoundingClientRect()
        const medidas = [...document.querySelectorAll('.topbar button, .mobile-nav button')]
          .map(b => b.getBoundingClientRect())
          .filter(r => r.width)
        return {
          masAlto: Math.round(mas.height),
          masAbajo: Math.round(mas.bottom),
          alto: innerHeight,
          pequenos: medidas.filter(r => r.width < 44 || r.height < 44).length
        }
      })
      if (m.masAlto < 54 || m.masAbajo > m.alto)
        anotar(tam, 'barra inferior', `el botón + está cortado (${m.masAlto} px de alto)`)
      if (m.pequenos) anotar(tam, 'cabecera', `${m.pequenos} controles por debajo de ${TACTIL} px`)
    }
    if (barraInferior) {
      // El modal de nuevo movimiento ha de caber en pantalla y dejar a la vista el
      // botón de guardar sin desplazar: en horizontal sobran 390 px de alto o menos.
      await p.click('.mobile-nav button:nth-child(3)')
      await p.waitForSelector('.modal form')
      await p.waitForTimeout(200)
      const m = await p.evaluate(() => {
        const mo = document.querySelector('.modal').getBoundingClientRect()
        const g = document.querySelector('.modal form .modal-actions .btn-primary').getBoundingClientRect()
        return {
          cabe: mo.top >= 0 && mo.bottom <= innerHeight && mo.left >= 0 && mo.right <= innerWidth,
          guardar: g.top >= 0 && g.bottom <= innerHeight
        }
      })
      if (!m.cabe) anotar(tam, 'modal', 'el modal de nuevo movimiento no cabe en la pantalla')
      if (!m.guardar) anotar(tam, 'modal', 'el botón de guardar no está a la vista sin desplazar')
      await p.keyboard.press('Escape')
    }
    for (const e of errores) anotar(tam, 'consola', e)
    await ctx.close()
  }
} finally {
  await navegador.close()
  apagar()
}

if (fallos.length) {
  console.error(`\nRevisión responsive: ${fallos.length} problema${fallos.length === 1 ? '' : 's'}\n`)
  for (const f of fallos) console.error('  ✗ ' + f)
  process.exit(1)
}
console.log(`Revisión responsive: ${TAMANOS.length} tamaños × ${SECCIONES.length} secciones, sin problemas.`)
