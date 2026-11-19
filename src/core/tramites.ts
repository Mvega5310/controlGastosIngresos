/**
 * Trámites legales: permisos, licencias y registros.
 *
 * La sección 7 del formato del SENA los lista con su costo y los días que toma
 * cada uno (el registro de marca, por ejemplo, 240). Aquí cada uno tiene estado,
 * fecha de inicio y la fecha en que debería estar listo.
 *
 * Un detalle del formato: la constitución legal de la empresa es un rubro **no
 * financiable**, que asume el emprendedor. Por eso no entra al plan que se pide
 * al fondo.
 *
 * Módulo puro: sin navegador ni servidor. Importes en centavos.
 */
import { Movement } from '../datos/catalogo'
import { origenDe } from './origenes'

export const ESTADOS_TRAMITE = ['Por iniciar', 'En trámite', 'Listo'] as const
export type EstadoTramite = (typeof ESTADOS_TRAMITE)[number]

export const NO_FINANCIABLE = 'Constitución legal (lo asume el emprendedor)'

export const RUBROS_TRAMITE = [
  'Permisos, licencias y registros',
  'Tasas para el registro de derechos de propiedad intelectual o industrial',
  NO_FINANCIABLE
] as const

export type Tramite = {
  id: string
  nombre: string
  descripcion?: string
  rubro: string
  /** Costo en centavos. */
  costo: number
  /** Días que toma el trámite. */
  dias: number
  estado: EstadoTramite
  /** Mes del plan (1 = el primero) en que se paga. 0 o vacío: sin asignar. */
  mes?: number
  /** Cuándo se inició, 'AAAA-MM-DD'. */
  inicio?: string
}

export const esFinanciable = (t: Pick<Tramite, 'rubro'>) => t.rubro !== NO_FINANCIABLE

export const origenDeTramite = (id: string) => origenDe('tramite', id)

const DIA = 86400000
const FECHA = /^\d{4}-\d{2}-\d{2}$/

/** Fecha 'AAAA-MM-DD' como instante UTC, para que la hora local no mueva el día. */
const enUTC = (fecha: string) => new Date(`${fecha}T00:00:00Z`).getTime()

/** Cuándo debería estar listo: la fecha de inicio más los días del trámite. */
export function fechaEstimada(inicio: string | undefined, dias: number): string | null {
  if (!inicio || !FECHA.test(inicio)) return null
  const t = enUTC(inicio)
  if (Number.isNaN(t)) return null
  return new Date(t + Math.max(0, Math.round(dias || 0)) * DIA).toISOString().slice(0, 10)
}

/**
 * Días que faltan para la fecha estimada (negativo si ya pasó), o null si el
 * trámite no tiene fecha de inicio o ya está listo.
 */
export function diasParaListo(t: Tramite, hoy: string): number | null {
  if (t.estado === 'Listo') return null
  const estimada = fechaEstimada(t.inicio, t.dias)
  if (!estimada || !FECHA.test(hoy)) return null
  return Math.round((enUTC(estimada) - enUTC(hoy)) / DIA)
}

export type ResumenTramites = {
  cuantos: number
  listos: number
  enTramite: number
  porIniciar: number
  /** Lo que entra al plan que se pide al fondo. */
  costoFinanciable: number
  /** Lo que asume el emprendedor. */
  costoNoFinanciable: number
  /** Los que ya pasaron su fecha estimada sin estar listos. */
  atrasados: number
  /** Lo que más tarda: define cuánto antes hay que empezar. */
  diasMayor: number
}

export function resumenTramites(tramites: Tramite[], hoy: string): ResumenTramites {
  const r: ResumenTramites = {
    cuantos: tramites.length,
    listos: 0,
    enTramite: 0,
    porIniciar: 0,
    costoFinanciable: 0,
    costoNoFinanciable: 0,
    atrasados: 0,
    diasMayor: 0
  }
  for (const t of tramites) {
    if (esFinanciable(t)) r.costoFinanciable += t.costo || 0
    else r.costoNoFinanciable += t.costo || 0
    if (t.estado === 'Listo') r.listos += 1
    else if (t.estado === 'En trámite') r.enTramite += 1
    else r.porIniciar += 1
    const faltan = diasParaListo(t, hoy)
    if (faltan !== null && faltan < 0) r.atrasados += 1
    r.diasMayor = Math.max(r.diasMayor, t.dias || 0)
  }
  return r
}

/** Un trámite no financiable se gasta fuera de los rubros del fondo. */
export const gastoDeTramite = (
  t: Tramite,
  datos: { id: string; cuenta: string; fecha: string; valor: number }
): Movement => ({
  id: datos.id,
  title: `Trámite · ${t.nombre}`,
  category: esFinanciable(t) ? t.rubro : 'Otros',
  account: datos.cuenta,
  date: datos.fecha,
  amount: datos.valor,
  type: 'Gasto',
  origen: origenDeTramite(t.id)
})
