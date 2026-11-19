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
 *   6. el plan por rubro se escribe, sincroniza y sobrevive a «Borrar todo».
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

console.log(`\nFALLOS: ${fallos}`)
await nav.close()
servidorEstatico.kill()
process.exit(fallos ? 1 : 0)
