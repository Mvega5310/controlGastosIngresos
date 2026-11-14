/**
 * Cargar y borrar datos, desde Ajustes.
 *
 * Los ejemplos ya no se cargan solos. Antes sí, y el resultado era que
 * cualquier navegador —y cualquier cuenta recién creada— aparecía con cuentas
 * y movimientos que no eran suyos, de modo que iniciar sesión no cambiaba
 * nada de lo que se veía.
 */
import { newId } from '../core/finanzas'
import { Registro, sellar, sellarBorrado } from '../core/sincronizacion'
import {
  COLECCIONES,
  avisarCambioDatos,
  escribirLista,
  escribirPendientes,
  leerLista,
  leerPendientes
} from '../lib/almacenLocal'
import { cuentasDeEjemplo, movimientosDeEjemplo } from './catalogo'
import {
  deudasDeEjemplo,
  inversionesDeEjemplo,
  metasDeEjemplo,
  presupuestosDeEjemplo,
  suscripcionesDeEjemplo,
  vehiculosDeEjemplo
} from './entidades'

/** Añade identificador y marca de tiempo a cada fila de ejemplo. */
const conIdentidad = (filas: object[]) => filas.map(f => sellar({ ...f, id: newId() }))

/** Suma lo nuevo a lo que ya está pendiente de subir. */
const anotarPendientes = (clave: string, ids: string[]) =>
  escribirPendientes(clave, [...new Set([...leerPendientes(clave), ...ids])])

const escribirAnexando = (clave: string, filas: object[]) => {
  const nuevos = conIdentidad(filas)
  const previos = leerLista<Registro>(clave, [])
  escribirLista(clave, [...previos, ...nuevos])
  anotarPendientes(
    clave,
    nuevos.map(n => n.id)
  )
}

/**
 * Carga un juego de datos de ejemplo, añadiéndolo a lo que ya haya. Sirve para
 * ver cómo queda la aplicación llena sin tener que teclear veinte registros.
 */
export function cargarEjemplos() {
  escribirAnexando(COLECCIONES.cuentas, cuentasDeEjemplo)
  escribirAnexando(COLECCIONES.movimientos, movimientosDeEjemplo)
  escribirAnexando(COLECCIONES.suscripciones, suscripcionesDeEjemplo)
  escribirAnexando(COLECCIONES.deudas, deudasDeEjemplo)
  escribirAnexando(COLECCIONES.metas, metasDeEjemplo)
  escribirAnexando(COLECCIONES.presupuestos, presupuestosDeEjemplo)
  escribirAnexando(COLECCIONES.inversiones, inversionesDeEjemplo)
  escribirAnexando(COLECCIONES.vehiculos, vehiculosDeEjemplo)
  avisarCambioDatos()
}

/**
 * Borra todo.
 *
 * Los registros no se quitan de golpe: se marcan como borrados y se dejan
 * pendientes de subir. Si se borraran sin dejar rastro, la siguiente
 * sincronización se los volvería a bajar del servidor y parecería que la
 * aplicación ignora lo que se le pide.
 */
export function borrarTodosLosDatos() {
  for (const clave of Object.values(COLECCIONES)) {
    const filas = leerLista<Registro>(clave, [])
    const vivos = filas.filter(f => !f.eliminadoEn)
    if (!vivos.length) continue
    escribirLista(
      clave,
      filas.map(f => (f.eliminadoEn ? f : sellarBorrado(f)))
    )
    anotarPendientes(
      clave,
      vivos.map(f => f.id)
    )
  }
  avisarCambioDatos()
}

/** Cuántos registros vivos hay en total, para saber si la aplicación está vacía. */
export function contarDatos(): number {
  let total = 0
  for (const clave of Object.values(COLECCIONES)) {
    total += leerLista<Registro>(clave, []).filter(f => !f.eliminadoEn).length
  }
  return total
}
