/**
 * Único punto por el que se lee y escribe el almacenamiento del navegador.
 *
 * Existe porque la sincronización necesita tocar todas las colecciones a la
 * vez, mientras que cada sección usa la suya. En vez de levantar todo el
 * estado a la raíz de la aplicación, la sincronización escribe aquí y avisa;
 * cada colección vuelve a leer lo suyo y la pantalla se actualiza.
 */
import { CLAVES } from '../data/entidades'

/** Todas las colecciones que viajan entre dispositivos. */
export const COLECCIONES = {
  movimientos: 'fc-movements',
  suscripciones: CLAVES.suscripciones,
  deudas: CLAVES.deudas,
  metas: CLAVES.metas,
  presupuestos: CLAVES.presupuestos,
  inversiones: CLAVES.inversiones,
  vehiculos: CLAVES.vehiculos
} as const

export type NombreColeccion = keyof typeof COLECCIONES

/** Nombre de la colección a partir de su clave de almacenamiento. */
export const nombreDe = (clave: string): string =>
  Object.entries(COLECCIONES).find(([, v]) => v === clave)?.[0] || clave

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
    for (const clave of Object.values(COLECCIONES)) {
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
