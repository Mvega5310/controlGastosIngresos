/**
 * Pago de las suscripciones.
 *
 * Una suscripción es un recordatorio con un importe: dice cuánto cuesta y qué
 * día se cobra, pero por sí sola no mueve ningún saldo. Pagarla es un gasto, y
 * hay que registrarlo para que cuente en el balance, en los reportes y en el
 * presupuesto de su categoría.
 *
 * Aquí está lo que hace falta para registrarlo desde la propia suscripción:
 * a qué cobro corresponde un pago, cómo se sabe que ya está pagado (sin pedirle
 * nada nuevo a la suscripción) y el gasto que se crea.
 *
 * Módulo puro: sin navegador ni servidor. Importes en centavos.
 */
import { Movement } from '../datos/catalogo'
import { Suscripcion } from '../datos/entidades'
import { todayISO } from './finanzas'
import { hayGastoDe, origenDe } from './origenes'
import { diasHasta, proximaFecha } from './planificacion'

/** Fecha del cobro de un día del mes en un mes dado; si el mes no tiene ese día, el último. */
export const fechaDeCobro = (diaMes: number, anio: number, mes: number): string => {
  const ultimo = new Date(anio, mes, 0).getDate()
  const dia = Math.min(Math.max(1, Math.round(diaMes) || 1), ultimo)
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export type Cobro = {
  /** Mes del cobro, 'AAAA-MM'. Identifica el ciclo. */
  mes: string
  /** Día exacto del cobro, 'AAAA-MM-DD'. */
  fecha: string
}

/**
 * A qué cobro corresponde un pago hecho en `fecha`: al más cercano.
 *
 * Quien paga el 26 un cobro del 25 está pagando el de este mes, no el del mes
 * que viene; y quien paga el 20 de noviembre una suscripción del 25 también.
 * Mirar solo el mes de la fecha de pago fallaría en el cambio de mes: pagar el
 * 1 de diciembre lo que se cobraba el 28 de noviembre es el cobro de noviembre.
 * Si dos cobros están igual de cerca, gana el anterior: es el que se debía.
 */
export function cobroMasCercano(diaMes: number, fecha: string): Cobro {
  const anio = +fecha.slice(0, 4)
  const mes = +fecha.slice(5, 7)
  const candidatos: Cobro[] = [-1, 0, 1].map(delta => {
    const indice = anio * 12 + (mes - 1) + delta
    const y = Math.floor(indice / 12)
    const m = (indice % 12) + 1
    const f = fechaDeCobro(diaMes, y, m)
    return { mes: f.slice(0, 7), fecha: f }
  })
  return candidatos.reduce((mejor, c) =>
    Math.abs(diasHasta(c.fecha, fecha)) < Math.abs(diasHasta(mejor.fecha, fecha)) ? c : mejor
  )
}

export const origenDeCobro = (suscripcionId: string, mes: string) =>
  origenDe('suscripcion', suscripcionId, mes)

/** ¿Ya hay un pago registrado de ese cobro? */
export const cobroPagado = (movimientos: { origen?: string }[], suscripcionId: string, mes: string) =>
  hayGastoDe(movimientos, origenDeCobro(suscripcionId, mes))

/** ¿Está pagado el próximo cobro de esta suscripción? */
export const proximoCobroPagado = (
  s: Pick<Suscripcion, 'id' | 'diaCobro'>,
  movimientos: { origen?: string }[],
  hoy = todayISO()
) => cobroPagado(movimientos, s.id, proximaFecha(s.diaCobro, hoy).slice(0, 7))

/** El gasto que deja registrar el pago de una suscripción. */
export const gastoDeSuscripcion = (
  s: Pick<Suscripcion, 'id' | 'nombre' | 'categoria' | 'diaCobro'>,
  datos: { id: string; cuenta: string; fecha: string; valor: number }
): Movement => ({
  id: datos.id,
  title: `Suscripción · ${s.nombre}`,
  category: s.categoria,
  account: datos.cuenta,
  date: datos.fecha,
  amount: datos.valor,
  type: 'Gasto',
  origen: origenDeCobro(s.id, cobroMasCercano(s.diaCobro, datos.fecha).mes)
})
