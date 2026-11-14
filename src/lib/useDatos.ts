import { useColeccion } from './useColeccion'
import { COLECCIONES } from './almacenLocal'
import { Account, Movement } from '../datos/catalogo'
import { Deuda, Inversion, Meta, Presupuesto, Suscripcion, Vehiculo } from '../datos/entidades'

/**
 * Todas las colecciones de la aplicación, en un único sitio.
 *
 * Antes cada sección creaba la suya por dentro. Eso bastaba mientras cada una
 * solo se miraba a sí misma, pero dejó de bastar en cuanto algo necesitó verlo
 * todo a la vez: los avisos cruzan suscripciones, deudas, presupuestos y
 * vehículos, y dos `useColeccion` sobre la misma clave serían dos estados
 * distintos que se pisarían.
 */
export function useDatos() {
  return {
    movimientos: useColeccion<Movement>(COLECCIONES.movimientos),
    cuentas: useColeccion<Account>(COLECCIONES.cuentas),
    suscripciones: useColeccion<Suscripcion>(COLECCIONES.suscripciones),
    deudas: useColeccion<Deuda>(COLECCIONES.deudas),
    metas: useColeccion<Meta>(COLECCIONES.metas),
    presupuestos: useColeccion<Presupuesto>(COLECCIONES.presupuestos),
    inversiones: useColeccion<Inversion>(COLECCIONES.inversiones),
    vehiculos: useColeccion<Vehiculo>(COLECCIONES.vehiculos)
  }
}

export type Datos = ReturnType<typeof useDatos>

/** Una colección cualquiera, tal y como la reciben las secciones. */
export type Coleccion<T extends { id: string }> = {
  items: T[]
  agregar: (datos: Omit<T, 'id'>) => void
  agregarVarios: (registros: T[]) => void
  actualizar: (id: string, cambios: Partial<T>) => void
  eliminar: (id: string) => void
  eliminarVarios: (ids: string[]) => void
}
