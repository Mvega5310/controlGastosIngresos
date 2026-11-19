/**
 * Revisión de la sincronización entre dos dispositivos.
 *
 * Simula un móvil y un PC con la misma cuenta contra un "Supabase" de mentira
 * compartido (PostgREST: filtros eq./gt., upsert con on_conflict, hora del
 * servidor). No toca datos reales ni crea cuentas, y no necesita red.
 *
 * Comprueba lo que los tests unitarios del motor no ven, porque pasa por la
 * interfaz y por el almacenamiento del navegador:
 *
 *   1. lo que crea un aparato aparece en el otro, en los dos sentidos;
 *   2. lo que ya estaba guardado antes de que hubiera sincronización (sin marca
 *      de tiempo ni cola de pendientes) se sube en la primera sincronización;
 *   3. lo escrito sin sesión se sube al iniciarla;
 *   4. el panel de cuenta dice cuánto subió y cuánto bajó;
 *   5. el espacio de la empresa viaja aparte del personal, nunca se mezclan y
 *      «Borrar todo» en uno no toca el otro;
 *   6. el plan por rubro se escribe, sincroniza y sobrevive a «Borrar todo»;
 *   7. compras, mercadeo y trámites se registran como gasto, llenan el plan y
 *      se sincronizan sin duplicar el gasto en el otro dispositivo;
 *   8. los avisos de la empresa salen en la campana, se cuentan una vez y no
 *      se mezclan con los personales;
 *   9. lo guardado sube solo a los pocos segundos, sin pisar lo escrito mientras
 *      otra subida estaba en marcha, al ocultar la pestaña y al volver la conexión.
 *
 * El caso 2 era un fallo real: esos registros no se subían nunca.
 *
 *   npx playwright install chromium     (una sola vez)
 *   npm run build
 *   npm run revision:sincronizacion
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUERTO = Number(process.env.PUERTO) || 4180

let pw
try {
  pw = await import('playwright')
} catch {
  console.error('Falta Playwright. Instálalo con:  npm i -D playwright && npx playwright install chromium')
  process.exit(2)
}
if (!existsSync(join(RAIZ, 'dist', 'index.html'))) {
  console.error('No hay compilación. Ejecuta primero:  npm run build')
  process.exit(2)
}
const { chromium, devices } = pw

const servidorEstatico = spawn(process.execPath, ['server.mjs'], {
  cwd: RAIZ,
  env: { ...process.env, PORT: String(PUERTO) },
  stdio: 'ignore'
})
process.on('exit', () => servidorEstatico.kill())
await new Promise(r => setTimeout(r, 900))

const BASE = `http://127.0.0.1:${PUERTO}/`

const REF = 'inqzoecbfjuwzfoehrux'
const UID = '00000000-0000-0000-0000-00000000aaaa'
const sesion = JSON.stringify({
  access_token: 'a.b.c',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'r',
  user: {
    id: UID,
    aud: 'authenticated',
    email: 'persona@correo.co',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString()
  }
})

// ---- servidor de mentira, compartido por todos los dispositivos ----------------
const filas = new Map() // "usuario|coleccion|id" -> fila
let relojFalso = Date.now()
const ahora = () => new Date((relojFalso += 5)).toISOString().replace('Z', '+00:00')
const registro = { escrituras: 0, lecturas: 0 }
/** Milisegundos que tarda el servidor de mentira en contestar a una lectura. */
let retardoLectura = 0

async function servidor(ruta) {
  const url = new URL(ruta.request().url())
  const m = ruta.request().method()
  const json = (cuerpo, estado = 200) =>
    ruta.fulfill({ status: estado, contentType: 'application/json', body: JSON.stringify(cuerpo) })

  if (url.pathname.includes('/auth/v1/settings'))
    return json({ external: { email: true, google: false }, disable_signup: false })
  if (url.pathname.includes('/auth/v1/user')) return json(JSON.parse(sesion).user)
  if (url.pathname.includes('/rest/v1/rpc/ahora_servidor')) return json(ahora())

  if (url.pathname.endsWith('/rest/v1/registros')) {
    if (m === 'GET') {
      registro.lecturas++
      if (retardoLectura) await new Promise(r => setTimeout(r, retardoLectura))
      const col = (url.searchParams.get('coleccion') || '').replace('eq.', '')
      const gt = url.searchParams.get('servidor_en')
      const desde = gt ? new Date(gt.replace('gt.', '')).getTime() : -Infinity
      const salida = [...filas.values()].filter(
        f => f.coleccion === col && new Date(f.servidor_en).getTime() > desde
      )
      return json(salida)
    }
    if (m === 'POST') {
      const cuerpo = JSON.parse(ruta.request().postData() || '[]')
      for (const f of Array.isArray(cuerpo) ? cuerpo : [cuerpo]) {
        registro.escrituras++
        filas.set(`${f.usuario_id}|${f.coleccion}|${f.id}`, { ...f, servidor_en: ahora() })
      }
      return ruta.fulfill({ status: 201, body: '' })
    }
  }
  return ruta.continue()
}

const nav = await chromium.launch()
let fallos = 0
const ok = (c, t) => {
  console.log(`   ${c ? 'OK ' : 'FALLA'} ${t}`)
  if (!c) fallos++
}

async function dispositivo(nombre, { conSesion, almacen = {} }) {
  const ctx = await nav.newContext({ ...devices['Pixel 7'], colorScheme: 'dark' })
  await ctx.route(/inqzoecbfjuwzfoehrux\.supabase\.co/, servidor)
  await ctx.addInitScript(
    ({ almacen, conSesion, REF, sesion }) => {
      // Solo la primera vez: así una recarga conserva lo que el propio dispositivo haya guardado.
      if (!localStorage.getItem('__sembrado')) {
        for (const [k, v] of Object.entries(almacen)) localStorage.setItem(k, v)
        localStorage.setItem('__sembrado', '1')
      }
      if (conSesion) localStorage.setItem(`sb-${REF}-auth-token`, sesion)
    },
    { almacen, conSesion, REF, sesion }
  )
  const p = await ctx.newPage()
  p.on('pageerror', e => console.log(`   [${nombre}] error de página:`, e.message))
  await p.goto(BASE, { waitUntil: 'networkidle' })
  return { ctx, p, nombre }
}
const ir = (p, n) =>
  p.evaluate(
    x => [...document.querySelectorAll('.nav-item')].find(b => b.textContent.trim() === x).click(),
    n
  )
const sincronizar = async p => {
  await p.click('.icon-button.estado-sync')
  await p.waitForSelector('.modal-estrecho')
  await p.click('.modal-actions .btn-primary:has-text("Sincronizar ahora")')
  await p.waitForTimeout(1200)
  await p.keyboard.press('Escape')
  await p.waitForTimeout(200)
}
const resumen = async p => {
  await p.click('.icon-button.estado-sync')
  await p.waitForSelector('.modal-estrecho')
  const t = await p.evaluate(
    () =>
      document.querySelector('[data-resumen-sync]')?.textContent.replace(/\s+/g, ' ').trim() ||
      '(sin resumen)'
  )
  await p.keyboard.press('Escape')
  await p.waitForTimeout(150)
  return t
}
const enServidor = col => [...filas.values()].filter(f => f.coleccion === col && !f.eliminado_en).length

// =============================================================== ESCENARIO 1
console.log('== 1. Flujo normal: A crea una cuenta y un movimiento; B inicia sesión y los recibe ==')
{
  const A = await dispositivo('A', { conSesion: true })
  await ir(A.p, 'Cuentas')
  await A.p.waitForTimeout(250)
  await A.p.evaluate(() =>
    [...document.querySelectorAll('button')]
      .find(b => /Agregar cuenta|Nueva cuenta|Crear/.test(b.textContent))
      ?.click()
  )
  await A.p.waitForSelector('.modal form')
  await A.p.fill('#campo-name', 'Cuenta del móvil')
  await A.p.fill('#campo-bank', 'Banco')
  await A.p.evaluate(() => {
    const i = document.querySelector('#campo-openingBalance')
    if (i) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, '50000')
      i.dispatchEvent(new Event('input', { bubbles: true }))
    }
  })
  await A.p.click('.modal form .btn-primary')
  await A.p.waitForTimeout(300)
  await A.p.click('.mobile-nav button:nth-child(3)')
  await A.p.waitForSelector('.modal form')
  await A.p.fill('#mov-titulo', 'Compra desde el móvil')
  await A.p.fill('#mov-valor', '12000')
  await A.p.click('.modal form .btn-primary')
  await A.p.waitForTimeout(300)
  await sincronizar(A.p)
  ok(
    enServidor('cuentas') === 1 && enServidor('movimientos') === 1,
    `A subió su cuenta y su movimiento (servidor: ${enServidor('cuentas')} cuenta, ${enServidor('movimientos')} movimiento)`
  )

  const B = await dispositivo('B', { conSesion: true })
  await B.p.waitForTimeout(1500) // sincroniza sola al iniciar sesión
  await ir(B.p, 'Movimientos')
  await B.p.waitForTimeout(300)
  const visto = await B.p.evaluate(() => document.body.textContent.includes('Compra desde el móvil'))
  ok(visto, 'B muestra el movimiento creado en A, sin pulsar nada')

  // y a la vuelta
  await B.p.click('.nav-item:has-text("Inicio")').catch(() => {})
  await B.p.evaluate(() =>
    [...document.querySelectorAll('.nav-item')].find(b => b.textContent.trim() === 'Inicio').click()
  )
  await B.p.waitForTimeout(200)
  await ir(B.p, 'Movimientos')
  await B.p.click('.mobile-nav button:nth-child(3)')
  await B.p.waitForSelector('.modal form')
  await B.p.fill('#mov-titulo', 'Compra desde el PC')
  await B.p.fill('#mov-valor', '3000')
  await B.p.click('.modal form .btn-primary')
  await B.p.waitForTimeout(300)
  await sincronizar(B.p)
  await sincronizar(A.p)
  await ir(A.p, 'Movimientos')
  await A.p.waitForTimeout(300)
  ok(
    await A.p.evaluate(() => document.body.textContent.includes('Compra desde el PC')),
    'y A recibe lo que B creó'
  )
  await A.ctx.close()
  await B.ctx.close()
}

// =============================================================== ESCENARIO 2
console.log(
  '\n== 2. Datos "de antes": ya estaban guardados en el navegador, sin marca ni cola (versiones anteriores a la sincronización) =='
)
filas.clear()
{
  const hoy = new Date().toISOString().slice(0, 10)
  // Tal y como los guardaban las versiones anteriores: sin actualizadoEn, y sin lista de pendientes.
  const viejoCuentas = [
    {
      id: 'c-viejo',
      name: 'Cuenta de siempre',
      bank: 'Banco',
      kind: 'Ahorros',
      color: 'verde',
      openingBalance: 5000000
    }
  ]
  const viejoMovs = [
    {
      id: 'm-viejo-1',
      title: 'Compra de hace semanas',
      amount: 4500000,
      type: 'Gasto',
      category: 'Otros',
      account: 'Cuenta de siempre',
      date: hoy
    },
    {
      id: 'm-viejo-2',
      title: 'Sueldo de hace semanas',
      amount: 36500000,
      type: 'Ingreso',
      category: 'Trabajo',
      account: 'Cuenta de siempre',
      date: hoy
    }
  ]
  const A = await dispositivo('A-viejo', {
    conSesion: true,
    almacen: {
      'fc-cuentas': JSON.stringify(viejoCuentas),
      'fc-movements': JSON.stringify(viejoMovs),
      'fc-version': '2'
    }
  })
  await ir(A.p, 'Movimientos')
  await A.p.waitForTimeout(400)
  const localmente = await A.p.evaluate(() => document.body.textContent.includes('Compra de hace semanas'))
  ok(localmente, 'el dispositivo A enseña sus datos de antes (están ahí)')
  await sincronizar(A.p)
  console.log(
    `    en el servidor tras sincronizar: ${enServidor('cuentas')} cuentas, ${enServidor('movimientos')} movimientos`
  )
  const textoA = await resumen(A.p)
  console.log('    panel de cuenta en A:', textoA)
  ok(
    /subió 3 registros y bajó 0/.test(textoA),
    'el panel de A dice que subió 3 y bajó 0 (lo suyo no cuenta como novedad)'
  )
  const sube = enServidor('movimientos') === 2 && enServidor('cuentas') === 1
  ok(
    sube,
    'los datos de antes SE SUBEN a la cuenta en la primera sincronización (lo que promete la pantalla de acceso)'
  )

  const B = await dispositivo('B', { conSesion: true })
  await B.p.waitForTimeout(1500)
  await ir(B.p, 'Movimientos')
  await B.p.waitForTimeout(300)
  const textoB = await resumen(B.p)
  console.log('    panel de cuenta en B:', textoB)
  ok(
    /subió 0 registros y bajó 3/.test(textoB),
    'el panel de B dice que subió 0 y bajó 3 de otros dispositivos'
  )
  const bVe = await B.p.evaluate(() => document.body.textContent.includes('Compra de hace semanas'))
  ok(bVe, 'y el segundo dispositivo (el PC) los recibe')
  await A.ctx.close()
  await B.ctx.close()
}

// =============================================================== ESCENARIO 3
console.log('\n== 3. Datos creados SIN sesión, y después se inicia sesión ==')
filas.clear()
{
  const A = await dispositivo('A-sin-sesion', { conSesion: false })
  await ir(A.p, 'Cuentas')
  await A.p.waitForTimeout(250)
  await A.p.evaluate(() =>
    [...document.querySelectorAll('button')]
      .find(b => /Agregar cuenta|Nueva cuenta|Crear/.test(b.textContent))
      ?.click()
  )
  await A.p.waitForSelector('.modal form')
  await A.p.fill('#campo-name', 'Cuenta sin sesión')
  await A.p.fill('#campo-bank', 'Banco')
  await A.p.click('.modal form .btn-primary')
  await A.p.waitForTimeout(300)
  await A.p.click('.mobile-nav button:nth-child(3)')
  await A.p.waitForSelector('.modal form')
  await A.p.fill('#mov-titulo', 'Hecho sin sesión')
  await A.p.fill('#mov-valor', '7000')
  await A.p.click('.modal form .btn-primary')
  await A.p.waitForTimeout(300)
  // Ahora "inicia sesión": se pone la sesión y se recarga.
  await A.p.evaluate(({ REF, sesion }) => localStorage.setItem(`sb-${REF}-auth-token`, sesion), {
    REF,
    sesion
  })
  await A.p.reload({ waitUntil: 'networkidle' })
  await A.p.waitForTimeout(1500)
  console.log(
    `    en el servidor: ${enServidor('cuentas')} cuentas, ${enServidor('movimientos')} movimientos`
  )
  ok(
    enServidor('movimientos') === 1 && enServidor('cuentas') === 1,
    'lo escrito sin sesión se sube al iniciar sesión'
  )
  await A.ctx.close()
}

// =============================================================== ESCENARIO 4
console.log('\n== 4. Espacio de la empresa: separado del personal, con nómina, y sincronizado ==')
filas.clear()
{
  const abrirMenu = p => p.click('.mobile-menu')
  const aEspacio = async (p, nombre) => {
    await abrirMenu(p)
    await p.click(`.espacios button:has-text("${nombre}")`)
    await p.waitForTimeout(250)
  }
  const nuevaCuenta = async (p, nombre) => {
    await ir(p, 'Cuentas')
    await p.waitForTimeout(250)
    await p.evaluate(() =>
      [...document.querySelectorAll('button')]
        .find(b => /Agregar cuenta|Nueva cuenta|Crear/.test(b.textContent))
        ?.click()
    )
    await p.waitForSelector('.modal form')
    await p.fill('#campo-name', nombre)
    await p.fill('#campo-bank', 'Banco')
    await p.click('.modal form .btn-primary')
    await p.waitForTimeout(300)
  }
  const nuevoCargo = async (p, rol, vinculacion, salario) => {
    await p.click('button:has-text("Nuevo cargo")')
    await p.waitForSelector('.modal form')
    await p.fill('#campo-rol', rol)
    await p.selectOption('#campo-vinculacion', vinculacion)
    await p.fill('#campo-salario', String(salario))
    await p.fill('#campo-meses', '12')
    await p.click('.modal form .btn-primary')
    await p.waitForTimeout(300)
  }
  const texto = p => p.evaluate(() => document.body.textContent)

  const A = await dispositivo('A-empresa', { conSesion: true })
  // Algo personal, para comprobar que no se mezcla ni se borra.
  await nuevaCuenta(A.p, 'Cuenta personal')

  await aEspacio(A.p, 'Empresa')
  ok(
    !(await texto(A.p)).includes('Cuenta personal'),
    'al pasar a Empresa no aparece nada del espacio personal'
  )
  await nuevaCuenta(A.p, 'Cuenta de la empresa')
  await ir(A.p, 'Nómina')
  await A.p.waitForTimeout(300)
  await nuevoCargo(A.p, 'Analista', 'Contrato laboral a término fijo', 3200000)
  await nuevoCargo(A.p, 'Gerente', 'Prestación de servicios', 7000000)
  let t = await texto(A.p)
  ok(/4\.920\.320/.test(t), 'el cargo laboral de 3.200.000 cuesta 4.920.320 (con el factor del 53,76 %)')
  ok(
    /11\.920\.320/.test(t),
    'el costo mensual del equipo suma 11.920.320 (4.920.320 + 7.000.000 sin prestaciones)'
  )
  ok(/auxilio de transporte/.test(t), 'avisa del auxilio de transporte que el formato no incluye')

  await A.p.click('button:has-text("Registrar los 2 pagos")')
  await A.p.waitForTimeout(300)
  t = await texto(A.p)
  ok(/Todo pagado este mes/.test(t), 'registra los pagos del mes y ya no ofrece registrarlos otra vez')
  await ir(A.p, 'Movimientos')
  await A.p.waitForTimeout(300)
  t = await texto(A.p)
  ok(
    /Nómina · Analista/.test(t) && /Nómina · Gerente/.test(t),
    'los pagos aparecen como movimientos de la empresa'
  )

  await sincronizar(A.p)
  const personal = enServidor('cuentas'),
    deEmpresa = enServidor('empresa:cuentas')
  console.log(
    `    servidor: ${personal} cuenta personal, ${deEmpresa} de empresa, ${enServidor('empresa:cargos')} cargos, ${enServidor('empresa:movimientos')} movimientos de empresa`
  )
  ok(personal === 1 && deEmpresa === 1, 'cada espacio sube a su propia colección, sin mezclarse')
  ok(
    enServidor('empresa:cargos') === 2 && enServidor('empresa:movimientos') === 2,
    'cargos y pagos de la empresa suben'
  )
  ok(enServidor('movimientos') === 0, 'los pagos de nómina no caen en los movimientos personales')

  // El otro dispositivo
  const B = await dispositivo('B-empresa', { conSesion: true })
  await B.p.waitForTimeout(1500)
  await aEspacio(B.p, 'Empresa')
  await ir(B.p, 'Nómina')
  await B.p.waitForTimeout(300)
  t = await texto(B.p)
  ok(
    /Analista/.test(t) && /Gerente/.test(t) && /4\.920\.320/.test(t),
    'B recibe el equipo de la empresa con el mismo costo'
  )
  await aEspacio(B.p, 'Personal')
  await ir(B.p, 'Cuentas')
  await B.p.waitForTimeout(250)
  t = await texto(B.p)
  ok(
    /Cuenta personal/.test(t) && !/Cuenta de la empresa/.test(t),
    'y en su espacio personal solo ve lo personal'
  )

  // Borrar todo en la empresa no toca lo personal
  await ir(A.p, 'Ajustes')
  await A.p.waitForTimeout(250)
  await A.p.click('button:has-text("Borrar todo")')
  await A.p.click('button:has-text("Sí, borrar todo")')
  await A.p.waitForTimeout(300)
  await sincronizar(A.p)
  ok(
    enServidor('empresa:cuentas') === 0 &&
      enServidor('empresa:cargos') === 0 &&
      enServidor('empresa:movimientos') === 0,
    'Borrar todo en la empresa vacía la empresa, también en el servidor'
  )
  ok(enServidor('cuentas') === 1, 'y deja intacto lo personal')
  await aEspacio(A.p, 'Personal')
  await ir(A.p, 'Cuentas')
  await A.p.waitForTimeout(250)
  ok((await texto(A.p)).includes('Cuenta personal'), 'la cuenta personal sigue ahí')
  await A.ctx.close()
  await B.ctx.close()
}

// =============================================================== ESCENARIO 5
console.log('\n== 5. Plan por rubro: se escribe, se sincroniza y sobrevive a «Borrar todo» ==')
filas.clear()
{
  const aEspacio = async (p, nombre) => {
    await p.click('.mobile-menu')
    await p.click(`.espacios button:has-text("${nombre}")`)
    await p.waitForTimeout(250)
  }
  const texto = p => p.evaluate(() => document.body.textContent)
  const ponerValor = async (p, cifras) => {
    await p.waitForSelector('#pro-valor')
    await p.fill('#pro-valor', cifras)
    await p.click('.form-proyecto .btn-primary')
    await p.waitForTimeout(250)
  }

  const A = await dispositivo('A-plan', { conSesion: true })
  await aEspacio(A.p, 'Empresa')
  await ir(A.p, 'Plan')
  await A.p.waitForTimeout(300)
  await ponerValor(A.p, '100000000')
  await A.p.click('.rubro-plan summary')
  await A.p.fill('.celda-plan input', '5000000')
  await A.p.keyboard.press('Tab')
  await A.p.waitForTimeout(300)
  let t = await texto(A.p)
  ok(
    /5\.000\.000/.test(t) && /100\.000\.000/.test(t),
    'el plan muestra lo escrito, con puntos de mil, y el valor solicitado'
  )
  ok(/faltan \$\s?95\.000\.000/.test(t), 'avisa de cuánto falta por repartir para llegar al valor solicitado')

  await sincronizar(A.p)
  ok(
    enServidor('empresa:plan') === 1 && enServidor('empresa:parametros') === 1,
    'el plan y los datos del proyecto suben a la nube'
  )

  const B = await dispositivo('B-plan', { conSesion: true })
  await B.p.waitForTimeout(1500)
  await aEspacio(B.p, 'Empresa')
  await ir(B.p, 'Plan')
  await B.p.waitForTimeout(300)
  t = await texto(B.p)
  ok(
    /5\.000\.000/.test(t) && /100\.000\.000/.test(t),
    'el otro dispositivo recibe el plan y el valor solicitado'
  )

  // Borrar todo y volver a escribir: lo nuevo no puede perderse tras sincronizar.
  await ir(A.p, 'Ajustes')
  await A.p.waitForTimeout(250)
  await A.p.click('button:has-text("Borrar todo")')
  await A.p.click('button:has-text("Sí, borrar todo")')
  await A.p.waitForTimeout(300)
  await sincronizar(A.p)
  ok(
    enServidor('empresa:plan') === 0 && enServidor('empresa:parametros') === 0,
    'Borrar todo vacía el plan en la nube'
  )
  await ir(A.p, 'Plan')
  await A.p.waitForTimeout(300)
  await ponerValor(A.p, '200000000')
  await A.p.click('.rubro-plan summary')
  await A.p.fill('.celda-plan input', '7000000')
  await A.p.keyboard.press('Tab')
  await A.p.waitForTimeout(300)
  await sincronizar(A.p)
  await sincronizar(A.p)
  ok(
    enServidor('empresa:parametros') === 1 && enServidor('empresa:plan') === 1,
    'lo escrito después de «Borrar todo» sube y no lo borra el registro antiguo'
  )
  await ir(A.p, 'Plan')
  await A.p.waitForTimeout(300)
  t = await texto(A.p)
  ok(/7\.000\.000/.test(t) && /200\.000\.000/.test(t), 'y sigue a la vista tras sincronizar')
  await A.ctx.close()
  await B.ctx.close()
}

// =============================================================== ESCENARIO 6
console.log(
  '\n== 6. Compras, mercadeo y trámites: se registran como gasto, llenan el plan y se sincronizan =='
)
filas.clear()
{
  const aEspacio = async (p, nombre) => {
    await p.click('.mobile-menu')
    await p.click(`.espacios button:has-text("${nombre}")`)
    await p.waitForTimeout(250)
  }
  const texto = p => p.evaluate(() => document.body.textContent)
  const guardar = async p => {
    await p.click('.modal form .btn-primary')
    await p.waitForTimeout(300)
  }

  const A = await dispositivo('A-listas', { conSesion: true })
  await aEspacio(A.p, 'Empresa')
  await ir(A.p, 'Cuentas')
  await A.p.waitForTimeout(250)
  await A.p.evaluate(() =>
    [...document.querySelectorAll('button')]
      .find(b => /Agregar cuenta|Nueva cuenta|Crear/.test(b.textContent))
      ?.click()
  )
  await A.p.waitForSelector('.modal form')
  await A.p.fill('#campo-name', 'Cuenta de la empresa')
  await A.p.fill('#campo-bank', 'Banco')
  await guardar(A.p)

  // Compras
  await ir(A.p, 'Compras')
  await A.p.waitForTimeout(300)
  await A.p.click('button:has-text("Nueva compra")')
  await A.p.waitForSelector('.modal form')
  await A.p.fill('#campo-descripcion', 'Portátil')
  await A.p.selectOption('#campo-rubro', 'Adquisición de maquinaria, equipos y software')
  await A.p.fill('#campo-cantidad', '2')
  await A.p.fill('#campo-valorUnitario', '3500000')
  await A.p.fill('#campo-mes', '1')
  await guardar(A.p)
  let t = await texto(A.p)
  ok(
    /7\.000\.000/.test(t) && /Por cotizar/.test(t),
    'la compra de 2 × 3.500.000 suma 7.000.000 y queda por cotizar'
  )

  await A.p.click('.fila-compra button:has-text("Registrar compra")')
  await A.p.waitForSelector('.modal form')
  ok(
    (await A.p.inputValue('#campo-valor')).replace(/\D/g, '') === '7000000',
    'registrar la compra propone lo planeado como valor pagado'
  )
  await A.p.fill('#campo-valor', '6800000')
  await guardar(A.p)
  t = await texto(A.p)
  ok(/Gasto registrado/.test(t) && /Comprado/.test(t), 'la compra queda comprada y con su gasto registrado')
  ok(
    /6\.800\.000/.test(t) && !/Registrar compra/.test(t),
    'cuenta lo pagado de verdad y no ofrece registrarla otra vez'
  )
  await ir(A.p, 'Movimientos')
  await A.p.waitForTimeout(300)
  ok(/Compra · Portátil/.test(await texto(A.p)), 'el gasto aparece en los movimientos de la empresa')

  // Mercadeo
  await ir(A.p, 'Mercadeo')
  await A.p.waitForTimeout(300)
  await A.p.click('button:has-text("Nueva acción")')
  await A.p.waitForSelector('.modal form')
  await A.p.fill('#campo-nombre', 'Pauta digital')
  await A.p.fill('#campo-costo', '2000000')
  await A.p.fill('#campo-mes', '1')
  await guardar(A.p)
  t = await texto(A.p)
  ok(
    /0 de 1/.test(t) && /2\.000\.000/.test(t),
    'una acción de mercadeo cuenta como 1 evento, aún sin realizar'
  )

  // Trámites
  await ir(A.p, 'Trámites')
  await A.p.waitForTimeout(300)
  await A.p.click('button:has-text("Nuevo trámite")')
  await A.p.waitForSelector('.modal form')
  await A.p.fill('#campo-nombre', 'Facturación electrónica')
  await A.p.fill('#campo-costo', '3000000')
  await A.p.fill('#campo-dias', '14')
  await A.p.fill('#campo-mes', '1')
  await guardar(A.p)
  t = await texto(A.p)
  ok(/3\.000\.000/.test(t) && /14d/.test(t), 'el trámite guarda su costo y los días que toma')

  // Plan desde las listas
  await ir(A.p, 'Plan')
  await A.p.waitForTimeout(300)
  await A.p.waitForSelector('#pro-valor')
  await A.p.fill('#pro-valor', '100000000')
  await A.p.click('.form-proyecto .btn-primary')
  await A.p.waitForTimeout(250)
  t = await texto(A.p)
  ok(
    /Completar 3 casillas desde las listas/.test(t),
    'el plan ofrece completar las 3 casillas que dicen las listas'
  )
  await A.p.click('button:has-text("Completar 3 casillas")')
  await A.p.waitForTimeout(300)
  t = await texto(A.p)
  ok(
    /12\.000\.000/.test(t),
    'tras completar, el plan suma 12.000.000 (7 M de equipos + 2 M de mercadeo + 3 M de trámites)'
  )
  ok(/El plan ya refleja las listas/.test(t), 'y ya no ofrece completar nada más')

  await sincronizar(A.p)
  console.log(
    `    servidor: ${enServidor('empresa:compras')} compras, ${enServidor('empresa:mercadeo')} acciones, ${enServidor('empresa:tramites')} trámites, ${enServidor('empresa:plan')} celdas del plan, ${enServidor('empresa:movimientos')} movimientos`
  )
  ok(
    enServidor('empresa:compras') === 1 &&
      enServidor('empresa:mercadeo') === 1 &&
      enServidor('empresa:tramites') === 1,
    'compras, acciones y trámites suben a la nube'
  )
  ok(
    enServidor('empresa:plan') === 3 && enServidor('empresa:movimientos') === 1,
    'las 3 celdas del plan y el gasto de la compra suben también'
  )
  ok(
    enServidor('movimientos') === 0 && enServidor('cuentas') === 0,
    'y nada de esto cae en el espacio personal'
  )

  // El otro dispositivo
  const B = await dispositivo('B-listas', { conSesion: true })
  await B.p.waitForTimeout(1500)
  await aEspacio(B.p, 'Empresa')
  await ir(B.p, 'Compras')
  await B.p.waitForTimeout(300)
  t = await texto(B.p)
  ok(
    /Portátil/.test(t) && /Comprado/.test(t) && /Gasto registrado/.test(t),
    'B ve la compra ya comprada y con su gasto registrado (no la ofrece registrar de nuevo)'
  )
  await ir(B.p, 'Plan')
  await B.p.waitForTimeout(300)
  ok(/12\.000\.000/.test(await texto(B.p)), 'y el plan completado')
  await A.ctx.close()
  await B.ctx.close()
}

// =============================================================== ESCENARIO 7
console.log(
  '\n== 7. Avisos de la empresa: aparecen en la campana, se cuentan una vez y no se mezclan con los personales =='
)
filas.clear()
{
  const aEspacio = async (p, nombre) => {
    await p.click('.mobile-menu')
    await p.click(`.espacios button:has-text("${nombre}")`)
    await p.waitForTimeout(250)
  }
  const insignia = p =>
    p.evaluate(() => document.querySelector('.icon-button.notification i')?.textContent?.trim() ?? '')

  const A = await dispositivo('A-avisos', { conSesion: true })
  await aEspacio(A.p, 'Empresa')
  ok((await insignia(A.p)) === '', 'una empresa nueva no tiene avisos: la campana no muestra número')

  await ir(A.p, 'Trámites')
  await A.p.waitForTimeout(300)
  await A.p.click('button:has-text("Nuevo trámite")')
  await A.p.waitForSelector('.modal form')
  await A.p.fill('#campo-nombre', 'Registro de marca')
  await A.p.fill('#campo-dias', '10')
  await A.p.fill('#campo-inicio', '2026-01-01')
  await A.p.selectOption('#campo-estado', 'En trámite')
  await A.p.click('.modal form .btn-primary')
  await A.p.waitForTimeout(400)
  ok((await insignia(A.p)) === '1', 'un trámite que pasó su fecha estimada pone un 1 en la campana')

  await A.p.click('.icon-button.notification')
  await A.p.waitForSelector('.avisos-panel')
  const panel = await A.p.evaluate(() => document.querySelector('.avisos-panel').textContent)
  ok(
    /Registro de marca/.test(panel) && /atrasado/.test(panel),
    'la campana dice qué trámite y cuánto se atrasó'
  )
  await A.p.click('.avisos-lista button')
  await A.p.waitForTimeout(300)
  ok(
    (await A.p.evaluate(() => document.querySelector('.breadcrumb b')?.textContent)) === 'Trámites',
    'pulsar el aviso lleva a la sección del trámite'
  )
  ok((await insignia(A.p)) === '', 'ya visto, el número baja a cero (el aviso sigue en la lista)')

  await aEspacio(A.p, 'Personal')
  ok((await insignia(A.p)) === '', 'el espacio personal no hereda los avisos de la empresa')
  await aEspacio(A.p, 'Empresa')
  ok((await insignia(A.p)) === '', 'y al volver a la empresa lo visto sigue visto')
  const guardado = await A.p.evaluate(() => ({
    empresa: JSON.parse(localStorage.getItem('fc-avisos-vistos-empresa') || '[]').length,
    personal: JSON.parse(localStorage.getItem('fc-avisos-vistos') || '[]').length
  }))
  ok(
    guardado.empresa === 1 && guardado.personal === 0,
    'los avisos vistos se guardan por separado en cada espacio'
  )
  await A.ctx.close()
}

// =============================================================== ESCENARIO 8
console.log(
  '\n== 8. Subida rápida: sin pulsar nada, sin pisar lo escrito durante una vuelta, al ocultar y sin conexión =='
)
filas.clear()
{
  const esperar = async (cond, ms = 20000) => {
    const fin = Date.now() + ms
    while (Date.now() < fin) {
      if (await cond()) return true
      await new Promise(r => setTimeout(r, 200))
    }
    return false
  }
  const nuevoMovimiento = async (p, titulo, valor) => {
    await p.click('.mobile-nav button:nth-child(3)')
    await p.waitForSelector('.modal form')
    await p.fill('#mov-titulo', titulo)
    await p.fill('#mov-valor', String(valor))
    await p.click('.modal form .btn-primary')
    await p.waitForTimeout(150)
  }
  const pendientesLocales = p =>
    p.evaluate(() => JSON.parse(localStorage.getItem('fc-movements:pendientes') || '[]').length)

  const A = await dispositivo('A-rapida', { conSesion: true })
  await ir(A.p, 'Cuentas')
  await A.p.waitForTimeout(250)
  await A.p.evaluate(() =>
    [...document.querySelectorAll('button')]
      .find(b => /Agregar cuenta|Nueva cuenta|Crear/.test(b.textContent))
      ?.click()
  )
  await A.p.waitForSelector('.modal form')
  await A.p.fill('#campo-name', 'Cuenta rápida')
  await A.p.fill('#campo-bank', 'Banco')
  await A.p.click('.modal form .btn-primary')

  ok(
    await esperar(() => enServidor('cuentas') === 1, 8000),
    'lo guardado sube solo, a los pocos segundos, sin pulsar «Sincronizar ahora»'
  )

  // Una escritura mientras el servidor aún contesta a la vuelta anterior.
  retardoLectura = 2500
  await ir(A.p, 'Movimientos')
  await nuevoMovimiento(A.p, 'Uno', 1000)
  await A.p.waitForTimeout(3600) // la subida rápida ya salió y espera la respuesta del servidor
  await nuevoMovimiento(A.p, 'Dos', 2000)
  ok(
    await esperar(() => enServidor('movimientos') === 2, 25000),
    'lo escrito mientras otra subida estaba en marcha no se pierde: sube en la vuelta siguiente'
  )
  retardoLectura = 0
  await A.p.waitForTimeout(400)
  const visto = await A.p.evaluate(() => document.body.textContent)
  ok(/Uno/.test(visto) && /Dos/.test(visto), 'y los dos siguen a la vista en la pantalla')
  ok((await pendientesLocales(A.p)) === 0, 'sin nada pendiente al terminar')

  // Al ocultar la pestaña sale enseguida, sin esperar el plazo de unos segundos.
  await nuevoMovimiento(A.p, 'Tres', 3000)
  await A.p.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  ok(
    await esperar(() => enServidor('movimientos') === 3, 1500),
    'al ocultar la pestaña lo pendiente sale en seguida'
  )
  await A.p.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await A.p.waitForTimeout(800)

  // Sin conexión no se intenta, no se pierde, y al volver sale.
  await A.ctx.setOffline(true)
  await nuevoMovimiento(A.p, 'Cuatro', 4000)
  await A.p.waitForTimeout(4500)
  ok(enServidor('movimientos') === 3, 'sin conexión no sube nada (y no se queja en cada guardado)')
  ok((await pendientesLocales(A.p)) === 1, 'lo guardado sin conexión queda en la cola local')
  await A.ctx.setOffline(false)
  ok(await esperar(() => enServidor('movimientos') === 4, 8000), 'al volver la conexión sale solo')

  // Y el otro dispositivo lo ve todo.
  const B = await dispositivo('B-rapida', { conSesion: true })
  await B.p.waitForTimeout(1500)
  await ir(B.p, 'Movimientos')
  await B.p.waitForTimeout(400)
  const enB = await B.p.evaluate(() => document.body.textContent)
  ok(
    /Uno/.test(enB) && /Dos/.test(enB) && /Tres/.test(enB) && /Cuatro/.test(enB),
    'el otro dispositivo recibe los cuatro movimientos'
  )
  await A.ctx.close()
  await B.ctx.close()
}

console.log(`\nFALLOS: ${fallos}`)
await nav.close()
servidorEstatico.kill()
process.exit(fallos ? 1 : 0)
