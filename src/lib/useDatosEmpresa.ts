import { useColeccion } from './useColeccion'
import { COLECCIONES_EMPRESA } from './almacenLocal'
import { Account, Movement } from '../datos/catalogo'
import { Cargo, RegistroParametros } from '../datos/empresa'
import { PlanItem } from '../core/plan'
import { Compra } from '../core/compras'
import { AccionMercadeo } from '../core/mercadeo'
import { Tramite } from '../core/tramites'

/**
 * Las colecciones del espacio de la empresa.
 *
 * Se montan siempre, esté o no a la vista este espacio: la sincronización
 * reescribe el almacenamiento de los dos y cada colección vuelve a leer lo suyo.
 */
export function useDatosEmpresa() {
  return {
    movimientos: useColeccion<Movement>(COLECCIONES_EMPRESA.movimientos),
    cuentas: useColeccion<Account>(COLECCIONES_EMPRESA.cuentas),
    cargos: useColeccion<Cargo>(COLECCIONES_EMPRESA.cargos),
    plan: useColeccion<PlanItem>(COLECCIONES_EMPRESA.plan),
    compras: useColeccion<Compra>(COLECCIONES_EMPRESA.compras),
    mercadeo: useColeccion<AccionMercadeo>(COLECCIONES_EMPRESA.mercadeo),
    tramites: useColeccion<Tramite>(COLECCIONES_EMPRESA.tramites),
    parametros: useColeccion<RegistroParametros>(COLECCIONES_EMPRESA.parametros)
  }
}

export type DatosEmpresa = ReturnType<typeof useDatosEmpresa>
