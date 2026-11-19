import { useColeccion } from './useColeccion'
import { COLECCIONES_EMPRESA } from './almacenLocal'
import { Account, Movement } from '../datos/catalogo'
import { Cargo, RegistroParametros } from '../datos/empresa'
import { PlanItem } from '../core/plan'

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
    parametros: useColeccion<RegistroParametros>(COLECCIONES_EMPRESA.parametros)
  }
}

export type DatosEmpresa = ReturnType<typeof useDatosEmpresa>
