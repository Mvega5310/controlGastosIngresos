/**
 * Acciones de mercadeo.
 *
 * El fondo exige cumplir un número de «eventos de mercadeo», que el formato del
 * SENA cuenta como las acciones que se describen en la sección 8 (canales):
 * estrategias de comunicación, de promoción y de distribución. Aquí cada acción
 * tiene estado y, cuando se hace, se registra su gasto y su evidencia.
 *
 * Módulo puro: sin navegador ni servidor. Importes en centavos.
 */
import { Movement } from '../datos/catalogo'
import { origenDe } from './origenes'

export const TIPOS_ACCION = [
  'Estrategia de comunicación',
  'Estrategia de promoción',
  'Canal de distribución'
] as const
export type TipoAccion = (typeof TIPOS_ACCION)[number]

export const ESTADOS_ACCION = ['Planeada', 'En curso', 'Realizada'] as const
export type EstadoAccion = (typeof ESTADOS_ACCION)[number]

/** El gasto de mercadeo cae en este rubro del fondo. */
export const RUBRO_MERCADEO = 'Publicidad y comunicación'

export type AccionMercadeo = {
  id: string
  nombre: string
  tipo: TipoAccion
  descripcion?: string
  /** Costo del primer año, en centavos. */
  costo: number
  estado: EstadoAccion
  /** Mes del plan (1 = el primero) en que se hace. 0 o vacío: sin asignar. */
  mes?: number
  fecha?: string
  /** Dónde está la prueba de que se hizo: un enlace, un nombre de archivo, una nota. */
  evidencia?: string
}

export const origenDeAccion = (id: string) => origenDe('mercadeo', id)

export type ResumenMercadeo = {
  /** Eventos de mercadeo a cumplir: todas las acciones registradas. */
  eventos: number
  realizadas: number
  enCurso: number
  planeadas: number
  costo: number
  costoRealizado: number
  /** Realizadas sin evidencia: el fondo las pedirá. */
  sinEvidencia: number
}

export function resumenMercadeo(acciones: AccionMercadeo[]): ResumenMercadeo {
  const r: ResumenMercadeo = {
    eventos: acciones.length,
    realizadas: 0,
    enCurso: 0,
    planeadas: 0,
    costo: 0,
    costoRealizado: 0,
    sinEvidencia: 0
  }
  for (const a of acciones) {
    r.costo += a.costo || 0
    if (a.estado === 'Realizada') {
      r.realizadas += 1
      r.costoRealizado += a.costo || 0
      if (!a.evidencia?.trim()) r.sinEvidencia += 1
    } else if (a.estado === 'En curso') r.enCurso += 1
    else r.planeadas += 1
  }
  return r
}

export const gastoDeAccion = (
  a: AccionMercadeo,
  datos: { id: string; cuenta: string; fecha: string; valor: number }
): Movement => ({
  id: datos.id,
  title: `Mercadeo · ${a.nombre}`,
  category: RUBRO_MERCADEO,
  account: datos.cuenta,
  date: datos.fecha,
  amount: datos.valor,
  type: 'Gasto',
  origen: origenDeAccion(a.id)
})
