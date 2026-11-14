/**
 * Paginación de listas.
 *
 * Una tabla con doscientos movimientos no se lee, y en el móvil además pesa:
 * se pintan doscientas filas para mirar cinco. Módulo puro, sin React, para
 * poder probar los bordes —la última página incompleta, una lista vacía, un
 * número de página que se sale— sin montar la interfaz.
 */

/** Cuántas filas caben en una página. */
export const POR_PAGINA = 10

export const totalPaginas = (cuantos: number, porPagina = POR_PAGINA): number =>
  Math.max(1, Math.ceil(cuantos / porPagina))

/**
 * Encierra el número de página dentro de lo que existe.
 *
 * Hace falta porque la página sobrevive a los filtros: estando en la cuatro y
 * buscando algo que deja dos resultados, sin esto la tabla saldría vacía y
 * parecería que no hay nada.
 */
export const paginaValida = (pagina: number, cuantos: number, porPagina = POR_PAGINA): number => {
  const ultima = totalPaginas(cuantos, porPagina)
  if (!Number.isFinite(pagina)) return 1
  return Math.min(Math.max(1, Math.floor(pagina)), ultima)
}

/** El trozo de la lista que toca enseñar. */
export function paginaDe<T>(items: T[], pagina: number, porPagina = POR_PAGINA): T[] {
  const p = paginaValida(pagina, items.length, porPagina)
  return items.slice((p - 1) * porPagina, p * porPagina)
}

/** "11–20 de 37", para que se sepa dónde se está. */
export const rangoVisible = (
  pagina: number,
  cuantos: number,
  porPagina = POR_PAGINA
): { desde: number; hasta: number } => {
  if (!cuantos) return { desde: 0, hasta: 0 }
  const p = paginaValida(pagina, cuantos, porPagina)
  const desde = (p - 1) * porPagina + 1
  return { desde, hasta: Math.min(p * porPagina, cuantos) }
}
