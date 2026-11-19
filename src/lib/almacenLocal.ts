/**
 * Único punto por el que se lee y escribe el almacenamiento del navegador.
 *
 * Existe porque la sincronización necesita tocar todas las colecciones a la
 * vez, mientras que cada sección usa la suya. En vez de levantar todo el
 * estado a la raíz de la aplicación, la sincronización escribe aquí y avisa;
 * cada colección vuelve a leer lo suyo y la pantalla se actualiza.
 */
import { CLAVES } from '../datos/entidades'
import { Espacio, nombreRemoto } from '../core/espacios'

/** Todas las colecciones que viajan entre dispositivos. */
export const COLECCIONES = {
  movimientos: 'fc-movements',
  cuentas: CLAVES.cuentas,
  suscripciones: CLAVES.suscripciones,
  deudas: CLAVES.deudas,
  metas: CLAVES.metas,
  presupuestos: CLAVES.presupuestos,
  inversiones: CLAVES.inversiones,
  vehiculos: CLAVES.vehiculos
} as const

/**
 * Colecciones del espacio de la empresa. Guardan aparte de las personales, con
 * otras claves: «Borrar todo» en un espacio no puede tocar el otro.
 */
export const COLECCIONES_EMPRESA = {
  movimientos: 'fc-emp-movements',
  cuentas: 'fc-emp-cuentas',
  cargos: 'fc-emp-cargos',
  plan: 'fc-emp-plan',
  parametros: 'fc-emp-parametros'
} as const

export type NombreColeccion = keyof typeof COLECCIONES

/** Las colecciones de un espacio: nombre -> clave de almacenamiento. */
export const coleccionesDe = (espacio: Espacio): Record<string, string> =>
  espacio === 'empresa' ? COLECCIONES_EMPRESA : COLECCIONES

/**
 * Todo lo que se sincroniza, de los dos espacios, con el nombre con que viaja
 * al servidor -> clave local. La sincronización recorre esto y no necesita
 * saber qué espacio está a la vista: se sube y se baja todo.
 */
export const COLECCIONES_SINCRONIZABLES: Record<string, string> = (() => {
  const salida: Record<string, string> = {}
  for (const espacio of ['personal', 'empresa'] as const) {
    for (const [nombre, clave] of Object.entries(coleccionesDe(espacio))) {
      salida[nombreRemoto(espacio, nombre)] = clave
    }
  }
  return salida
})()

export function leerLista<T>(clave: string, porDefecto: T[]): T[] {
  try {
    const guardado = localStorage.getItem(clave)
    if (!guardado) return porDefecto
    const leido = JSON.parse(guardado)
    return Array.isArray(leido) ? leido : porDefecto
  } catch {
    return porDefecto
  }
}

export function escribirLista(clave: string, filas: unknown[]) {
  try {
    localStorage.setItem(clave, JSON.stringify(filas))
  } catch {
    /* modo privado */
  }
}

const clavePendientes = (clave: string) => `${clave}:pendientes`

export const leerPendientes = (clave: string): string[] => leerLista<string>(clavePendientes(clave), [])
export const escribirPendientes = (clave: string, ids: string[]) => escribirLista(clavePendientes(clave), ids)

const claveCortes = 'fc-cortes'
export const leerCortes = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(claveCortes) || '{}') || {}
  } catch {
    return {}
  }
}
export const escribirCortes = (cortes: Record<string, string>) => {
  try {
    localStorage.setItem(claveCortes, JSON.stringify(cortes))
  } catch {
    /* modo privado */
  }
}

/**
 * Al cerrar sesión se borra todo lo sincronizado de este navegador: los datos
 * son de la cuenta, no del aparato, y dejarlos ahí se los mostraría a quien
 * entrara después.
 */
export function limpiarDatosSincronizados() {
  try {
    for (const clave of Object.values(COLECCIONES_SINCRONIZABLES)) {
      localStorage.removeItem(clave)
      localStorage.removeItem(clavePendientes(clave))
    }
    localStorage.removeItem(claveCortes)
  } catch {
    /* modo privado */
  }
}

// --- Aviso de cambios externos ---------------------------------------------

const oyentes = new Set<() => void>()

/** Avisa cuando la sincronización ha reescrito el almacenamiento. */
export function alCambiarDatos(fn: () => void) {
  oyentes.add(fn)
  return () => {
    oyentes.delete(fn)
  }
}

export function avisarCambioDatos() {
  for (const fn of [...oyentes]) fn()
}
