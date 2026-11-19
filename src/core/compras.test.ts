import { describe, expect, it } from 'vitest'
import { aCentavos } from './dinero'
import {
  Compra,
  gastoDeCompra,
  ordenarCompras,
  origenDeCompra,
  resumenCompras,
  totalDeCompra,
  valorEfectivo
} from './compras'
import { gastoDeOrigen, hayGastoDe, origenDe } from './origenes'
import { RUBROS } from '../datos/empresa'

const [, EQUIPOS, MUEBLES, ESTRUCTURALES, TECNICAS] = RUBROS

const compra = (
  descripcion: string,
  rubro: string,
  cantidad: number,
  pesos: number,
  extra: Partial<Compra> = {}
): Compra => ({
  id: descripcion,
  descripcion,
  rubro,
  cantidad,
  valorUnitario: aCentavos(pesos),
  estado: 'Cotizado',
  mes: 1,
  ...extra
})

/**
 * Las inversiones fijas del formato del SENA (hoja «Proyecto», filas 436 a 448),
 * sin la nómina. El formato calcula 60.050.000 en equipos, 51.000.000 en muebles
 * y arriendo, 12.000.000 en adecuaciones estructurales y 10.000.000 en técnicas.
 */
const delFormato: Compra[] = [
  compra('MacBook Pro', EQUIPOS, 2, 13100000),
  compra('Monitor 4K', EQUIPOS, 2, 1800000, { estado: 'Por cotizar' }),
  compra('Portátiles de los empleados', EQUIPOS, 2, 3500000),
  compra('Celulares de pruebas', EQUIPOS, 3, 1500000),
  compra('Discos SSD', EQUIPOS, 2, 900000),
  compra('UPS', EQUIPOS, 3, 700000),
  compra('Router y switch', EQUIPOS, 1, 1200000, { estado: 'Por cotizar' }),
  compra('Impresora', EQUIPOS, 1, 1000000, { estado: 'Por cotizar' }),
  compra('Software y nube', EQUIPOS, 1, 12650000),
  compra('Escritorios y sillas', MUEBLES, 7, 1500000),
  compra('Arriendo del local', MUEBLES, 9, 4500000),
  compra('Red y puntos eléctricos', ESTRUCTURALES, 1, 12000000),
  compra('Operación y conectividad', TECNICAS, 1, 10000000)
]

describe('el total de una compra', () => {
  it('es cantidad por valor unitario', () => {
    expect(totalDeCompra(compra('x', EQUIPOS, 2, 13100000))).toBe(aCentavos(26200000))
  })

  it('un dato vacío o roto cuenta como cero', () => {
    expect(totalDeCompra({ cantidad: NaN, valorUnitario: 5 })).toBe(0)
    expect(totalDeCompra({ cantidad: 3, valorUnitario: undefined as unknown as number })).toBe(0)
  })
})

describe('las inversiones del formato', () => {
  const r = resumenCompras(delFormato)
  const porRubro = (rubro: string) =>
    delFormato.filter(c => c.rubro === rubro).reduce((s, c) => s + totalDeCompra(c), 0)

  it('suman lo que suma el formato en cada rubro', () => {
    expect(porRubro(EQUIPOS)).toBe(aCentavos(60050000))
    expect(porRubro(MUEBLES)).toBe(aCentavos(51000000))
    expect(porRubro(ESTRUCTURALES)).toBe(aCentavos(12000000))
    expect(porRubro(TECNICAS)).toBe(aCentavos(10000000))
  })

  it('suman 133.050.000 en total, todo por comprar', () => {
    expect(r.cuantas).toBe(13)
    expect(r.planeado).toBe(aCentavos(133050000))
    expect(r.comprado).toBe(0)
    expect(r.porComprar).toBe(aCentavos(133050000))
  })

  it('cuentan las tres marcadas [COTIZAR] como por cotizar', () => {
    expect(r.porCotizar).toBe(3)
  })
})

describe('lo comprado', () => {
  it('cuenta lo que se pagó de verdad, no lo planeado', () => {
    const c = compra('Portátil', EQUIPOS, 1, 3500000, { estado: 'Comprado', valorReal: aCentavos(3200000) })
    expect(valorEfectivo(c)).toBe(aCentavos(3200000))
    const r = resumenCompras([c])
    expect(r.comprado).toBe(aCentavos(3200000))
    expect(r.porComprar).toBe(0)
    expect(r.planeado).toBe(aCentavos(3500000))
  })

  it('una compra marcada como comprada sin valor real cuenta por lo planeado', () => {
    const c = compra('Portátil', EQUIPOS, 1, 3500000, { estado: 'Comprado' })
    expect(valorEfectivo(c)).toBe(aCentavos(3500000))
  })

  it('separa lo comprado de lo que falta', () => {
    const r = resumenCompras([
      compra('a', EQUIPOS, 1, 100, { estado: 'Comprado', valorReal: aCentavos(90) }),
      compra('b', EQUIPOS, 1, 200),
      compra('c', EQUIPOS, 1, 300, { estado: 'Por cotizar' })
    ])
    expect(r.comprado).toBe(aCentavos(90))
    expect(r.porComprar).toBe(aCentavos(500))
    expect(r.porCotizar).toBe(1)
  })
})

describe('el mes del plan', () => {
  it('cuenta las compras sin mes asignado', () => {
    const r = resumenCompras([
      compra('a', EQUIPOS, 1, 1, { mes: 2 }),
      compra('b', EQUIPOS, 1, 1, { mes: 0 }),
      compra('c', EQUIPOS, 1, 1, { mes: undefined })
    ])
    expect(r.sinMes).toBe(2)
  })
})

describe('el orden de la lista', () => {
  it('pone primero lo que falta por comprar y deja lo comprado al final', () => {
    const orden = ordenarCompras([
      compra('B', EQUIPOS, 1, 1, { estado: 'Comprado' }),
      compra('A', EQUIPOS, 1, 1, { estado: 'Cotizado' }),
      compra('C', EQUIPOS, 1, 1, { estado: 'Por cotizar' }),
      compra('Á', EQUIPOS, 1, 1, { estado: 'Cotizado' })
    ]).map(c => c.descripcion)
    expect(orden).toEqual(['C', 'A', 'Á', 'B'])
  })

  it('no modifica la lista original', () => {
    const original = [compra('b', EQUIPOS, 1, 1), compra('a', EQUIPOS, 1, 1, { estado: 'Por cotizar' })]
    ordenarCompras(original)
    expect(original[0].descripcion).toBe('b')
  })
})

describe('registrar una compra como gasto', () => {
  const c = compra('Portátil', EQUIPOS, 1, 3500000)
  const g = gastoDeCompra(c, {
    id: 'm1',
    cuenta: 'Cuenta del proyecto',
    fecha: '2026-11-20',
    valor: aCentavos(3200000)
  })

  it('crea un gasto en el rubro de la compra, con su origen', () => {
    expect(g).toMatchObject({
      type: 'Gasto',
      category: EQUIPOS,
      account: 'Cuenta del proyecto',
      date: '2026-11-20',
      amount: aCentavos(3200000),
      origen: origenDeCompra(c.id)
    })
    expect(g.title).toContain('Portátil')
  })

  it('el origen permite saber que ya está registrada, y de qué compra viene', () => {
    expect(hayGastoDe([g], origenDeCompra(c.id))).toBe(true)
    expect(hayGastoDe([g], origenDeCompra('otra'))).toBe(false)
    expect(hayGastoDe([{}], origenDeCompra(c.id))).toBe(false)
    expect(gastoDeOrigen([g], origenDeCompra(c.id))).toBe(g)
  })

  it('los orígenes de cada tipo no se confunden', () => {
    expect(origenDe('compra', 'a')).not.toBe(origenDe('tramite', 'a'))
    expect(origenDe('nomina', 'a', '2026-11')).toBe('nomina:a:2026-11')
  })
})
