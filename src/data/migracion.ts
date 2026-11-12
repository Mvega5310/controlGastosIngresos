/**
 * Migración de lo que ya está guardado en el navegador.
 *
 * La versión 1 guardaba los importes en pesos; la 2 los guarda en centavos.
 * Sin esta migración, un saldo de 285.000 pesos guardado antes se leería como
 * 2.850 pesos: la cifra cambiaría en pantalla sin que nadie tocara nada.
 *
 * Se ejecuta una sola vez, antes de que React lea nada, y deja constancia de
 * la versión aplicada para no repetirse.
 */
import { CENTAVOS } from '../core/dinero'
import { CLAVES } from './entidades'

const CLAVE_VERSION = 'fc-version'
const VERSION_ACTUAL = 2

/** Campos con importes en cada colección guardada. */
const IMPORTES: Record<string, string[]> = {
  'fc-movements': ['amount'],
  [CLAVES.suscripciones]: ['monto'],
  [CLAVES.deudas]: ['montoTotal', 'pagado', 'cuotaMensual'],
  [CLAVES.metas]: ['objetivo', 'ahorrado'],
  [CLAVES.presupuestos]: ['limite'],
  [CLAVES.inversiones]: ['invertido', 'valorActual']
}

const escalar = (clave: string, campos: string[], factor: number) => {
  const crudo = localStorage.getItem(clave)
  if (!crudo) return
  let filas: unknown
  try { filas = JSON.parse(crudo) } catch { return }
  if (!Array.isArray(filas)) return
  const migradas = filas.map(fila => {
    if (!fila || typeof fila !== 'object') return fila
    const copia = { ...(fila as Record<string, unknown>) }
    for (const campo of campos) {
      const valor = copia[campo]
      if (typeof valor === 'number' && Number.isFinite(valor)) copia[campo] = Math.round(valor * factor)
    }
    return copia
  })
  localStorage.setItem(clave, JSON.stringify(migradas))
}

/**
 * Lleva lo guardado a la versión actual. Un navegador sin datos previos queda
 * marcado en la versión actual sin tocar nada, porque las semillas ya vienen
 * en centavos.
 */
export function migrar() {
  try {
    const guardada = Number(localStorage.getItem(CLAVE_VERSION) || '1')
    if (guardada >= VERSION_ACTUAL) return
    if (guardada < 2) {
      for (const [clave, campos] of Object.entries(IMPORTES)) escalar(clave, campos, CENTAVOS)
    }
    localStorage.setItem(CLAVE_VERSION, String(VERSION_ACTUAL))
  } catch {
    // Modo privado o almacenamiento bloqueado: la aplicación arranca igual,
    // con los datos de ejemplo, que ya están en centavos.
  }
}
