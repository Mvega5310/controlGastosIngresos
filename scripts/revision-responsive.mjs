/**
 * Revisión responsive de FinControl.
 *
 * Recorre las 12 secciones en los siete tamaños de docs/REDISENO-MOVIL.md y
 * falla si encuentra lo que el rediseño móvil quiso quitar:
 *
 *   - scroll horizontal del documento, o elementos que se salen de la pantalla;
 *   - la tabla de movimientos en móvil, o las tarjetas en escritorio;
 *   - el botón + de la barra inferior cortado, o por debajo de 44 px;
 *   - la cabecera móvil con controles por debajo de 44 px.
 *
 * No forma parte de `npm run verificar`: necesita un navegador.
 *
 *   npx playwright install chromium     (una sola vez)
 *   npm run build
 *   npm run revision:responsive
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
const BASE = `http://127.0.0.1:${PUERTO}/`

const TAMANOS = [
  [320, 640],
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1366, 768],
  [1440, 900]
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
/** Hasta aquí la aplicación se comporta como móvil: tarjetas y barra inferior. */
const ANCHO_MOVIL = 767
const TACTIL = 44

let playwright
try {
  playwright = await import('playwright')
} catch {
  console.error('Falta Playwright. Instálalo con:  npm i -D playwright && npx playwright install chromium')
  process.exit(2)
}
if (!existsSync(join(RAIZ, 'dist', 'index.html'))) {
  console.error('No hay compilación. Ejecuta primero:  npm run build')
  process.exit(2)
}

const servidor = spawn(process.execPath, ['server.mjs'], {
  cwd: RAIZ,
  env: { ...process.env, PORT: String(PUERTO) },
  stdio: 'ignore'
})
const apagar = () => servidor.kill()
process.on('exit', apagar)
await new Promise(r => setTimeout(r, 900))

const fallos = []
const anotar = (tam, seccion, texto) => fallos.push(`${tam[0]}×${tam[1]} · ${seccion}: ${texto}`)

const navegador = await playwright.chromium.launch()
try {
  for (const tam of TAMANOS) {
    const [w, h] = tam
    const movil = w <= ANCHO_MOVIL
    const ctx = await navegador.newContext({
      viewport: { width: w, height: h },
      isMobile: movil,
      hasTouch: movil,
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

    // Tabla en escritorio, tarjetas en móvil.
    await ir('Movimientos')
    await p.waitForTimeout(250)
    const vista = await p.evaluate(() => {
      const visible = s => {
        const e = document.querySelector(s)
        return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0
      }
      return { tabla: visible('.tabla-escritorio'), tarjetas: visible('.lista-movil') }
    })
    if (movil && (vista.tabla || !vista.tarjetas))
      anotar(tam, 'Movimientos', 'en móvil deben verse las tarjetas y no la tabla')
    if (!movil && (!vista.tabla || vista.tarjetas))
      anotar(tam, 'Movimientos', 'en escritorio debe verse la tabla y no las tarjetas')

    if (movil) {
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
