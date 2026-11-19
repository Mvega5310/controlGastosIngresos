/**
 * Compras de equipos, muebles, software y demás inversiones del proyecto.
 *
 * Es la lista que el formato del SENA llama «inversiones fijas»: rubro,
 * descripción, valor unitario, cantidad y valor total. La aplicación le añade el
 * estado (por cotizar, cotizado, comprado) y el mes del plan en que se espera
 * comprar, y al registrar la compra crea el gasto real.
 *
 * Módulo puro: sin navegador ni servidor. Importes en centavos.
 */
import { Movement } from '../datos/catalogo'
import { origenDe } from './origenes'

export const ESTADOS_COMPRA = ['Por cotizar', 'Cotizado', 'Comprado'] as const
export type EstadoCompra = (typeof ESTADOS_COMPRA)[number]

export type Compra = {
  id: string
  descripcion: string
  rubro: string
  cantidad: number
  /** Valor unitario planeado o cotizado, en centavos. */
  valorUnitario: number
  estado: EstadoCompra
  proveedor?: string
  /** Mes del plan (1 = el primero) en que se espera comprar. 0 o vacío: sin asignar. */
  mes?: number
  /** Lo que de verdad se pagó, en centavos, al registrar la compra. */
  valorReal?: number
  fechaCompra?: string
}

/** Valor total planeado: cantidad por valor unitario. */
export const totalDeCompra = (c: Pick<Compra, 'cantidad' | 'valorUnitario'>) =>
  Math.round((Number(c.cantidad) || 0) * (Number(c.valorUnitario) || 0))

export const origenDeCompra = (id: string) => origenDe('compra', id)

/** Lo pagado si ya se pagó, y si no, lo planeado. */
export const valorEfectivo = (c: Compra) => (c.valorReal && c.valorReal > 0 ? c.valorReal : totalDeCompra(c))

export type ResumenCompras = {
  cuantas: number
  /** Todo lo planeado, comprado o no. */
  planeado: number
  /** Lo ya comprado, a su valor real. */
  comprado: number
  /** Lo planeado que aún no se compra. */
  porComprar: number
  porCotizar: number
  /** Compras sin un mes del plan asignado: no se pueden repartir en el plan. */
  sinMes: number
}

export function resumenCompras(compras: Compra[]): ResumenCompras {
  const r: ResumenCompras = {
    cuantas: compras.length,
    planeado: 0,
    comprado: 0,
    porComprar: 0,
    porCotizar: 0,
    sinMes: 0
  }
  for (const c of compras) {
    r.planeado += totalDeCompra(c)
    if (c.estado === 'Comprado') r.comprado += valorEfectivo(c)
    else r.porComprar += totalDeCompra(c)
    if (c.estado === 'Por cotizar') r.porCotizar += 1
    if (!c.mes || c.mes < 1) r.sinMes += 1
  }
  return r
}

/** Primero lo que falta por comprar; dentro de cada estado, por descripción. */
export const ordenarCompras = (compras: Compra[]) =>
  [...compras].sort(
    (a, b) =>
      ESTADOS_COMPRA.indexOf(a.estado) - ESTADOS_COMPRA.indexOf(b.estado) ||
      a.descripcion.localeCompare(b.descripcion, 'es')
  )

/** El gasto que deja registrar una compra. */
export const gastoDeCompra = (
  c: Compra,
  datos: { id: string; cuenta: string; fecha: string; valor: number }
): Movement => ({
  id: datos.id,
  title: `Compra · ${c.descripcion}`,
  category: c.rubro,
  account: datos.cuenta,
  date: datos.fecha,
  amount: datos.valor,
  type: 'Gasto',
  origen: origenDeCompra(c.id)
})
