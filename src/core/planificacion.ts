/**
 * Cálculos de las secciones de planificación y patrimonio.
 *
 * Módulo puro, como `finance.ts`: ninguna de estas cifras debe volver a estar
 * escrita a mano dentro de una vista.
 */
import { Movement } from '../datos/catalogo'
import { Deuda, Inversion, Meta, Presupuesto, Suscripcion, Vehiculo } from '../datos/entidades'
import { Period, inPeriod, todayISO } from './finanzas'

/** Días completos entre hoy y una fecha AAAA-MM-DD. Negativo si ya pasó. */
export const diasHasta = (fecha: string, hoy = todayISO()) => {
  if (!fecha) return NaN
  const a = Date.UTC(+hoy.slice(0, 4), +hoy.slice(5, 7) - 1, +hoy.slice(8, 10))
  const b = Date.UTC(+fecha.slice(0, 4), +fecha.slice(5, 7) - 1, +fecha.slice(8, 10))
  return Math.round((b - a) / 86400000)
}

/**
 * Próxima vez que cae un día del mes (1-31), a partir de hoy inclusive.
 * Si el mes no tiene ese día (un cobro el 31 en febrero) se usa el último.
 */
export const proximaFecha = (diaMes: number, hoy = todayISO()): string => {
  const anio = +hoy.slice(0, 4),
    mes = +hoy.slice(5, 7),
    dia = +hoy.slice(8, 10)
  const construir = (y: number, m: number) => {
    const ultimo = new Date(y, m, 0).getDate()
    const d = Math.min(Math.max(1, Math.round(diaMes) || 1), ultimo)
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  const esteMes = construir(anio, mes)
  if (+esteMes.slice(8, 10) >= dia) return esteMes
  return mes === 12 ? construir(anio + 1, 1) : construir(anio, mes + 1)
}

export type Urgencia = 'vencido' | 'proximo' | 'vigente'

/** Clasifica una fecha: vencida, próxima (dentro de `aviso` días) o vigente. */
export const urgencia = (fecha: string, aviso = 30, hoy = todayISO()): Urgencia => {
  const d = diasHasta(fecha, hoy)
  if (isNaN(d)) return 'vigente'
  return d < 0 ? 'vencido' : d <= aviso ? 'proximo' : 'vigente'
}

export const porcentaje = (parte: number, total: number) =>
  total > 0 ? Math.min(999, Math.round((parte / total) * 100)) : 0

// --- Presupuestos -----------------------------------------------------------

export type PresupuestoCalculado = Presupuesto & {
  gastado: number
  restante: number
  progreso: number
  estado: 'ok' | 'cerca' | 'excedido'
}

/**
 * Cruza cada presupuesto con el gasto real de su categoría en el periodo.
 * Esta es la cifra que antes estaba escrita a mano junto a cada barra.
 */
export const calcularPresupuestos = (
  presupuestos: Presupuesto[],
  movimientos: Movement[],
  periodo: Period
): PresupuestoCalculado[] =>
  presupuestos.map(p => {
    const gastado = movimientos.reduce(
      (suma, m) =>
        m.type === 'Gasto' && m.category === p.categoria && inPeriod(m, periodo) ? suma + m.amount : suma,
      0
    )
    const progreso = porcentaje(gastado, p.limite)
    return {
      ...p,
      gastado,
      restante: p.limite - gastado,
      progreso,
      estado: progreso > 100 ? 'excedido' : progreso >= 80 ? 'cerca' : 'ok'
    }
  })

// --- Metas ------------------------------------------------------------------

export type MetaCalculada = Meta & { falta: number; progreso: number; dias: number }

export const calcularMetas = (metas: Meta[], hoy = todayISO()): MetaCalculada[] =>
  metas.map(m => ({
    ...m,
    falta: Math.max(0, m.objetivo - m.ahorrado),
    progreso: porcentaje(m.ahorrado, m.objetivo),
    dias: diasHasta(m.fechaLimite, hoy)
  }))

// --- Deudas -----------------------------------------------------------------

export type DeudaCalculada = Deuda & {
  pendiente: number
  progreso: number
  proximoPago: string
  cuotasRestantes: number
}

export const calcularDeudas = (deudas: Deuda[], hoy = todayISO()): DeudaCalculada[] =>
  deudas.map(d => {
    const pendiente = Math.max(0, d.montoTotal - d.pagado)
    return {
      ...d,
      pendiente,
      progreso: porcentaje(d.pagado, d.montoTotal),
      proximoPago: proximaFecha(d.diaPago, hoy),
      cuotasRestantes: d.cuotaMensual > 0 ? Math.ceil(pendiente / d.cuotaMensual) : 0
    }
  })

export const totalDeuda = (deudas: DeudaCalculada[]) => deudas.reduce((s, d) => s + d.pendiente, 0)
export const cuotasDelMes = (deudas: Deuda[]) => deudas.reduce((s, d) => s + d.cuotaMensual, 0)

// --- Suscripciones ----------------------------------------------------------

export type SuscripcionCalculada = Suscripcion & { proximoCobro: string; dias: number }

export const calcularSuscripciones = (subs: Suscripcion[], hoy = todayISO()): SuscripcionCalculada[] =>
  subs
    .map(s => {
      const proximoCobro = proximaFecha(s.diaCobro, hoy)
      return { ...s, proximoCobro, dias: diasHasta(proximoCobro, hoy) }
    })
    .sort((a, b) => a.proximoCobro.localeCompare(b.proximoCobro))

export const gastoMensualSuscripciones = (subs: Suscripcion[]) =>
  subs.reduce((s, x) => (x.activa ? s + x.monto : s), 0)

// --- Inversiones ------------------------------------------------------------

export type InversionCalculada = Inversion & { rendimiento: number; porcentajeRendimiento: number }

export const calcularInversiones = (inv: Inversion[]): InversionCalculada[] =>
  inv.map(i => {
    const rendimiento = i.valorActual - i.invertido
    return {
      ...i,
      rendimiento,
      porcentajeRendimiento: i.invertido > 0 ? Math.round((rendimiento / i.invertido) * 1000) / 10 : 0
    }
  })

export const resumenInversiones = (inv: InversionCalculada[]) => {
  const invertido = inv.reduce((s, i) => s + i.invertido, 0)
  const valor = inv.reduce((s, i) => s + i.valorActual, 0)
  return {
    invertido,
    valor,
    rendimiento: valor - invertido,
    porcentaje: invertido > 0 ? Math.round(((valor - invertido) / invertido) * 1000) / 10 : 0
  }
}

// --- Vehículos --------------------------------------------------------------

export type VehiculoCalculado = Vehiculo & {
  soatDias: number
  soatEstado: Urgencia
  tecnoDias: number
  tecnoEstado: Urgencia
}

export const calcularVehiculos = (v: Vehiculo[], hoy = todayISO()): VehiculoCalculado[] =>
  v.map(x => ({
    ...x,
    soatDias: diasHasta(x.soat, hoy),
    soatEstado: urgencia(x.soat, 30, hoy),
    tecnoDias: diasHasta(x.tecnomecanica, hoy),
    tecnoEstado: urgencia(x.tecnomecanica, 30, hoy)
  }))

// --- Reportes ---------------------------------------------------------------

export type FilaCategoria = { categoria: string; total: number; porcentaje: number }

/** Desglose del gasto del periodo por categoría, de mayor a menor. */
export const gastoPorCategoria = (movimientos: Movement[], periodo: Period): FilaCategoria[] => {
  const mapa = new Map<string, number>()
  let total = 0
  for (const m of movimientos) {
    if (m.type !== 'Gasto' || !inPeriod(m, periodo)) continue
    mapa.set(m.category, (mapa.get(m.category) || 0) + m.amount)
    total += m.amount
  }
  return [...mapa.entries()]
    .map(([categoria, suma]) => ({ categoria, total: suma, porcentaje: porcentaje(suma, total) }))
    .sort((a, b) => b.total - a.total)
}
