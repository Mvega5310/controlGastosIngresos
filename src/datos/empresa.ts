/**
 * Datos propios del espacio de la empresa.
 *
 * Las cuentas y los movimientos reutilizan los del espacio personal; aquí
 * viven solo las entidades que no existen allí.
 */
import { Cargo, ParametrosNomina } from '../core/nomina'

export type { Cargo, ParametrosNomina }

/** Los parámetros se guardan como un único registro, con identificador fijo. */
export const ID_PARAMETROS_NOMINA = 'nomina'

export type RegistroParametros = { id: string } & Partial<ParametrosNomina>

/**
 * Rubros financiables del Fondo Emprender, tal y como los lista el formato.
 * Son las categorías de los movimientos de la empresa: así lo gastado se puede
 * comparar con lo planeado por rubro.
 */
export const RUBROS = [
  'Pago de salarios u honorarios',
  'Adquisición de maquinaria, equipos y software',
  'Adquisición o arriendo de bienes muebles y vehículos automotores',
  'Adecuaciones o remodelaciones estructurales',
  'Adecuaciones técnicas',
  'Insumos para el ciclo productivo',
  'Permisos, licencias y registros',
  'Tasas para el registro de derechos de propiedad intelectual o industrial',
  'Adquisición e implementación de franquicias mediante el modelo de franquicias',
  'Publicidad y comunicación',
  'Otros'
] as const

export const RUBRO_NOMINA = RUBROS[0]
