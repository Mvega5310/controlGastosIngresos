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
import { Espacio } from '../core/espacios'
import { aCentavos } from '../core/dinero'
import {
  COLECCIONES,
  COLECCIONES_EMPRESA,
  avisarCambioDatos,
  coleccionesDe,
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
export function cargarEjemplos(espacio: Espacio = 'personal') {
  if (espacio === 'empresa') {
    cargarEjemplosDeEmpresa()
    return
  }
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

/** Muestra mínima del espacio de la empresa: genérica, para que no se confunda con datos reales. */
function cargarEjemplosDeEmpresa() {
  escribirAnexando(COLECCIONES_EMPRESA.cuentas, [
    {
      name: 'Cuenta del proyecto',
      bank: 'Bancolombia',
      kind: 'Corriente',
      color: 'blue',
      openingBalance: aCentavos(50000000)
    }
  ])
  escribirAnexando(COLECCIONES_EMPRESA.cargos, [
    {
      rol: 'Gerente general',
      vinculacion: 'Prestación de servicios',
      salario: aCentavos(6000000),
      meses: 12
    },
    {
      rol: 'Analista de operaciones',
      vinculacion: 'Contrato laboral a término fijo',
      salario: aCentavos(2500000),
      meses: 12
    },
    {
      rol: 'Auxiliar de mercadeo',
      vinculacion: 'Contrato laboral a término fijo',
      salario: aCentavos(3200000),
      meses: 12
    }
  ])
  avisarCambioDatos()
}

/**
 * Borra todo lo de un espacio, y solo de ese: el otro no se toca.
 *
 * Los registros no se quitan de golpe: se marcan como borrados y se dejan
 * pendientes de subir. Si se borraran sin dejar rastro, la siguiente
 * sincronización se los volvería a bajar del servidor y parecería que la
 * aplicación ignora lo que se le pide.
 */
export function borrarTodosLosDatos(espacio: Espacio = 'personal') {
  for (const clave of Object.values(coleccionesDe(espacio))) {
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
export function contarDatos(espacio: Espacio = 'personal'): number {
  let total = 0
  for (const clave of Object.values(coleccionesDe(espacio))) {
    total += leerLista<Registro>(clave, []).filter(f => !f.eliminadoEn).length
  }
  return total
}
