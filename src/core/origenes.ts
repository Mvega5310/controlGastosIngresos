/**
 * De dónde viene un gasto que no escribió una persona.
 *
 * Una compra registrada, el pago de una acción de mercadeo, el de un trámite o
 * el de un cargo de nómina crean un movimiento con una marca de origen. Con ella
 * se sabe qué ya está registrado y no se vuelve a registrar, y se puede volver
 * del movimiento a lo que lo originó.
 *
 * Módulo puro: sin navegador ni servidor.
 */

export type TipoOrigen = 'nomina' | 'compra' | 'mercadeo' | 'tramite'

/** 'compra:abc' o 'nomina:abc:2026-11'. */
export const origenDe = (tipo: TipoOrigen, ...partes: string[]) => [tipo, ...partes].join(':')

type ConOrigen = { origen?: string }

/** El movimiento que ya registró este origen, si lo hay. */
export const gastoDeOrigen = <T extends ConOrigen>(movimientos: T[], origen: string): T | undefined =>
  movimientos.find(m => m.origen === origen)

export const hayGastoDe = (movimientos: ConOrigen[], origen: string) =>
  Boolean(gastoDeOrigen(movimientos, origen))
