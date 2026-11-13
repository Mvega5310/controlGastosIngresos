/** Fecha de un movimiento, en formato corto: "03 de nov de 2026". */
export const fmtDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
