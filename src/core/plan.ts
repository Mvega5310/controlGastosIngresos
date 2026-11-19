/**
 * Plan operativo por rubro y mes, frente a lo que se ha gastado.
 *
 * El formato del SENA pide repartir el valor solicitado entre los rubros
 * financiables mes a mes (hoja «Proyecto», sección 15) y vigila dos cosas: que
 * el plan sume exactamente lo solicitado y que ciertos rubros no pasen de un
 * porcentaje del total. Aquí se hace lo mismo y se añade lo que el formato no
 * puede: compararlo con los gastos reales de cada mes.
 *
 * Módulo puro: sin navegador ni servidor. Los importes son enteros en centavos
 * y los porcentajes, enteros en puntos base (1500 = 15 %), para que ninguna
 * comparación dependa de un redondeo en coma flotante.
 */
import { Registro } from './sincronizacion'

/** Lo planeado para un rubro en un mes del proyecto (1 = el primer mes). */
export type PlanItem = {
  id: string
  rubro: string
  mes: number
  /** Importe en centavos. */
  monto: number
}

export type ParametrosProyecto = {
  /** Valor solicitado al fondo, en centavos. */
  valorSolicitado: number
  /** Primer mes del proyecto, 'AAAA-MM'. */
  inicio: string
  /** Cuántos meses dura el plan. */
  meses: number
  /** Tope de cada rubro como porcentaje del valor solicitado, en puntos base. */
  topes: Record<string, number>
}

/**
 * Los topes que fija el formato (columna «Límites rubros financiables»):
 * muebles y vehículos 15 %, adecuaciones estructurales 20 %, adecuaciones
 * técnicas 50 % y tasas de propiedad intelectual 20 %.
 */
export const TOPES_DEL_FORMATO: Record<string, number> = {
  'Adquisición o arriendo de bienes muebles y vehículos automotores': 1500,
  'Adecuaciones o remodelaciones estructurales': 2000,
  'Adecuaciones técnicas': 5000,
  'Tasas para el registro de derechos de propiedad intelectual o industrial': 2000
}

export const MESES_POR_DEFECTO = 9

const FORMATO_MES = /^\d{4}-(0[1-9]|1[0-2])$/

export const claveDeMes = (fecha: Date) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`

/** Mezcla lo guardado con los valores por defecto, por si falta algún campo o viene mal. */
export function parametrosProyectoDe(
  guardado?: Partial<ParametrosProyecto> | null,
  hoy: Date = new Date()
): ParametrosProyecto {
  const meses = Number(guardado?.meses)
  return {
    valorSolicitado: Math.max(0, Number(guardado?.valorSolicitado) || 0),
    inicio: guardado?.inicio && FORMATO_MES.test(guardado.inicio) ? guardado.inicio : claveDeMes(hoy),
    meses: Number.isInteger(meses) && meses >= 1 && meses <= 120 ? meses : MESES_POR_DEFECTO,
    topes: { ...TOPES_DEL_FORMATO, ...(guardado?.topes || {}) }
  }
}

/** Los meses del plan como claves 'AAAA-MM', empezando en `inicio`. */
export function mesesDelPlan(inicio: string, meses: number): string[] {
  const [anio, mes] = (FORMATO_MES.test(inicio) ? inicio : claveDeMes(new Date())).split('-').map(Number)
  return Array.from({ length: Math.max(0, meses) }, (_, i) => {
    const indice = anio * 12 + (mes - 1) + i
    return `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, '0')}`
  })
}

// --- Identidad de cada celda -------------------------------------------------

const quitarTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Nombre del rubro apto para un identificador. */
export const ficha = (rubro: string) =>
  quitarTildes(rubro)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

/**
 * Identificador fijo de cada celda rubro × mes.
 *
 * Fijo a propósito: si dos dispositivos rellenan la misma celda a la vez, es el
 * mismo registro y gana el último, en vez de quedar dos registros que sumarían
 * el doble.
 */
export const idDePlan = (rubro: string, mes: number) => `plan-${mes}-${ficha(rubro)}`

/**
 * Si escribir `monto` en una celda cambiaría algo.
 *
 * Una celda nunca se borra: un cero es un registro con importe cero. Si no
 * existe y el importe es cero, no hay nada que escribir; si existe borrada
 * (por «Borrar todo») y el importe es cero, tampoco. Quien escribe usa
 * `fijarRegistro`, que revive la celda en vez de duplicar su identificador.
 */
export function cambiaLaCelda(
  todos: (PlanItem & Partial<Registro>)[],
  rubro: string,
  mes: number,
  monto: number
): boolean {
  const importe = Math.max(0, Math.round(Number(monto) || 0))
  const existente = todos.find(x => x.id === idDePlan(rubro, mes))
  if (!existente) return importe > 0
  return existente.eliminadoEn ? importe > 0 : existente.monto !== importe
}

// --- Cálculo -----------------------------------------------------------------

export type FilaMes = { mes: string; planeado: number; ejecutado: number }

export type EstadoRubro = 'vacio' | 'sin-plan' | 'en-curso' | 'excedido'

export type FilaRubro = {
  rubro: string
  planeado: number
  ejecutado: number
  /** Lo que falta por ejecutar; nunca negativo. */
  restante: number
  /** Ejecutado sobre planeado, en %, redondeado. Puede pasar de 100. */
  progreso: number
  estado: EstadoRubro
  meses: FilaMes[]
  tope: {
    /** Límite en puntos base, o null si el rubro no tiene tope. */
    limite: number | null
    /** Parte del total que ocupa el plan de este rubro, en puntos base. */
    usado: number
    excedido: boolean
  }
}

export type ResultadoPlan = {
  filas: FilaRubro[]
  porMes: FilaMes[]
  totalPlaneado: number
  totalEjecutado: number
  /** Gastos de la empresa en meses fuera del plan: no cuentan arriba, pero no se esconden. */
  ejecutadoFuera: number
  /** Total planeado menos valor solicitado. Cero si cuadra. */
  diferencia: number
  /** Hay un valor solicitado con el que comparar. */
  hayValor: boolean
  cuadra: boolean
}

type Gasto = { type: string; category: string; date: string; amount: number }

export function calcularPlan(
  items: PlanItem[],
  movimientos: Gasto[],
  params: ParametrosProyecto,
  rubros: readonly string[]
): ResultadoPlan {
  const meses = mesesDelPlan(params.inicio, params.meses)
  const indice = new Map(meses.map((m, i) => [m, i]))

  // planeado[rubro][i] y ejecutado[rubro][i], con i = mes del plan - 1
  const planeado = new Map<string, number[]>()
  const ejecutado = new Map<string, number[]>()
  const celdas = (mapa: Map<string, number[]>, rubro: string) => {
    let fila = mapa.get(rubro)
    if (!fila) mapa.set(rubro, (fila = Array(meses.length).fill(0)))
    return fila
  }

  for (const it of items) {
    if (!Number.isInteger(it.mes) || it.mes < 1 || it.mes > meses.length) continue
    celdas(planeado, it.rubro)[it.mes - 1] += it.monto || 0
  }

  let ejecutadoFuera = 0
  for (const m of movimientos) {
    if (m.type !== 'Gasto') continue
    const i = indice.get(m.date.slice(0, 7))
    if (i === undefined) ejecutadoFuera += m.amount
    else celdas(ejecutado, m.category)[i] += m.amount
  }

  // Los rubros conocidos, y al final cualquier otro con algo planeado o gastado.
  const extras = [...new Set([...planeado.keys(), ...ejecutado.keys()])]
    .filter(r => !rubros.includes(r))
    .sort()
  const nombres = [...rubros, ...extras]

  const suma = (a: number[] | undefined) => (a ?? []).reduce((s, x) => s + x, 0)
  const totalPlaneado = nombres.reduce((s, r) => s + suma(planeado.get(r)), 0)
  const totalEjecutado = nombres.reduce((s, r) => s + suma(ejecutado.get(r)), 0)
  const base = params.valorSolicitado > 0 ? params.valorSolicitado : totalPlaneado

  const filas: FilaRubro[] = nombres.map(rubro => {
    const p = suma(planeado.get(rubro))
    const e = suma(ejecutado.get(rubro))
    const limite = rubro in params.topes ? params.topes[rubro] : null
    return {
      rubro,
      planeado: p,
      ejecutado: e,
      restante: Math.max(0, p - e),
      progreso: p > 0 ? Math.round((e * 100) / p) : 0,
      estado: p === 0 && e === 0 ? 'vacio' : p === 0 ? 'sin-plan' : e > p ? 'excedido' : 'en-curso',
      meses: meses.map((mes, i) => ({
        mes,
        planeado: planeado.get(rubro)?.[i] ?? 0,
        ejecutado: ejecutado.get(rubro)?.[i] ?? 0
      })),
      tope: {
        limite,
        usado: base > 0 ? Math.round((p * 10000) / base) : 0,
        // Se compara sin dividir: p / base > limite / 10000
        excedido: limite !== null && base > 0 && p * 10000 > limite * base
      }
    }
  })

  const porMes: FilaMes[] = meses.map((mes, i) => ({
    mes,
    planeado: nombres.reduce((s, r) => s + (planeado.get(r)?.[i] ?? 0), 0),
    ejecutado: nombres.reduce((s, r) => s + (ejecutado.get(r)?.[i] ?? 0), 0)
  }))

  const hayValor = params.valorSolicitado > 0
  const diferencia = hayValor ? totalPlaneado - params.valorSolicitado : 0
  return {
    filas,
    porMes,
    totalPlaneado,
    totalEjecutado,
    ejecutadoFuera,
    diferencia,
    hayValor,
    cuadra: hayValor && diferencia === 0
  }
}
