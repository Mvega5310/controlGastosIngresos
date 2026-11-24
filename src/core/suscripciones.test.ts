import { describe, expect, it } from 'vitest'
import { aCentavos } from './dinero'
import {
  cobroMasCercano,
  cobroPagado,
  fechaDeCobro,
  gastoDeSuscripcion,
  origenDeCobro,
  proximoCobroPagado
} from './suscripciones'
import { calcularAvisos, proximosPagos } from './avisos'
import { periodOf } from './finanzas'
import { Suscripcion } from '../datos/entidades'

const sus = (extra: Partial<Suscripcion> = {}): Suscripcion => ({
  id: 'netflix',
  nombre: 'Netflix',
  monto: aCentavos(32900),
  diaCobro: 25,
  categoria: 'Entretenimiento',
  cuenta: 'Tarjeta',
  activa: true,
  ...extra
})

describe('la fecha de un cobro', () => {
  it('es el día del mes pedido', () => {
    expect(fechaDeCobro(25, 2026, 11)).toBe('2026-11-25')
  })

  it('en un mes más corto cae el último día', () => {
    expect(fechaDeCobro(31, 2026, 2)).toBe('2026-02-28')
    expect(fechaDeCobro(31, 2028, 2)).toBe('2028-02-29')
    expect(fechaDeCobro(31, 2026, 4)).toBe('2026-04-30')
  })

  it('un día imposible se acota', () => {
    expect(fechaDeCobro(0, 2026, 11)).toBe('2026-11-01')
    expect(fechaDeCobro(45, 2026, 11)).toBe('2026-11-30')
  })
})

describe('a qué cobro corresponde un pago', () => {
  it('pagar el mismo día es ese cobro', () => {
    expect(cobroMasCercano(25, '2026-11-25')).toEqual({ mes: '2026-11', fecha: '2026-11-25' })
  })

  it('pagar unos días antes es el cobro que viene', () => {
    expect(cobroMasCercano(25, '2026-11-20').mes).toBe('2026-11')
  })

  it('pagar unos días tarde es el cobro que se debía, no el siguiente', () => {
    expect(cobroMasCercano(25, '2026-11-26').mes).toBe('2026-11')
    expect(cobroMasCercano(25, '2026-11-30').mes).toBe('2026-11')
  })

  it('en el cambio de mes, pagar el 1 lo que se cobraba el 28 es el cobro del mes anterior', () => {
    expect(cobroMasCercano(28, '2026-12-01').mes).toBe('2026-11')
  })

  it('y pagar el 28 de diciembre un cobro del 2 de enero es el de enero', () => {
    expect(cobroMasCercano(2, '2026-12-28')).toEqual({ mes: '2027-01', fecha: '2027-01-02' })
  })

  it('cruza el año hacia atrás', () => {
    expect(cobroMasCercano(30, '2027-01-03')).toEqual({ mes: '2026-12', fecha: '2026-12-30' })
  })

  it('con el cobro el 31, febrero cae el 28', () => {
    expect(cobroMasCercano(31, '2026-02-27')).toEqual({ mes: '2026-02', fecha: '2026-02-28' })
  })

  it('a mitad de camino gana el anterior, que es el que se debía', () => {
    // 15 de nov y 15 de dic distan 30 d; el 30 de nov está a 15 de uno y 15 del otro.
    expect(cobroMasCercano(15, '2026-11-30').mes).toBe('2026-11')
  })
})

describe('el gasto de una suscripción', () => {
  const g = gastoDeSuscripcion(sus(), {
    id: 'm1',
    cuenta: 'Tarjeta',
    fecha: '2026-11-26',
    valor: aCentavos(34000)
  })

  it('es un gasto en la categoría y la cuenta de la suscripción, por lo que se pagó', () => {
    expect(g).toMatchObject({
      type: 'Gasto',
      category: 'Entretenimiento',
      account: 'Tarjeta',
      date: '2026-11-26',
      amount: aCentavos(34000)
    })
    expect(g.title).toContain('Netflix')
  })

  it('lleva el origen del cobro que paga', () => {
    expect(g.origen).toBe(origenDeCobro('netflix', '2026-11'))
  })

  it('el pago de otro mes tiene otro origen', () => {
    const otro = gastoDeSuscripcion(sus(), { id: 'm2', cuenta: 'Tarjeta', fecha: '2026-12-24', valor: 1 })
    expect(otro.origen).toBe(origenDeCobro('netflix', '2026-12'))
    expect(otro.origen).not.toBe(g.origen)
  })

  it('el pago de otra suscripción no se confunde', () => {
    expect(origenDeCobro('spotify', '2026-11')).not.toBe(origenDeCobro('netflix', '2026-11'))
  })
})

describe('cuándo está pagado un cobro', () => {
  const g = gastoDeSuscripcion(sus(), { id: 'm1', cuenta: 'Tarjeta', fecha: '2026-11-20', valor: 1 })

  it('lo está si hay un gasto con su origen', () => {
    expect(cobroPagado([g], 'netflix', '2026-11')).toBe(true)
    expect(cobroPagado([g], 'netflix', '2026-12')).toBe(false)
    expect(cobroPagado([], 'netflix', '2026-11')).toBe(false)
  })

  it('el próximo cobro está pagado si se pagó por adelantado', () => {
    expect(proximoCobroPagado(sus(), [g], '2026-11-20')).toBe(true)
  })

  it('pasado el día de cobro, el próximo es el del mes siguiente y ya no está pagado', () => {
    expect(proximoCobroPagado(sus(), [g], '2026-11-26')).toBe(false)
  })
})

describe('el aviso y los próximos pagos, una vez pagado', () => {
  const HOY = '2026-11-20'
  const periodo = periodOf(new Date(2026, 10, 20))
  const entrada = (movimientos: { origen?: string }[]) => ({
    suscripciones: [sus()],
    deudas: [],
    vehiculos: [],
    presupuestos: [],
    movimientos: movimientos as never[],
    periodo
  })
  const pago = gastoDeSuscripcion(sus(), { id: 'm1', cuenta: 'Tarjeta', fecha: HOY, valor: 1 })

  it('sin pagar, avisa (a 5 días)', () => {
    expect(calcularAvisos(entrada([]), HOY)).toHaveLength(1)
  })

  it('pagado, ya no avisa', () => {
    expect(calcularAvisos(entrada([pago]), HOY)).toEqual([])
  })

  it('el pago de otro mes no apaga el aviso', () => {
    const viejo = gastoDeSuscripcion(sus(), { id: 'm0', cuenta: 'Tarjeta', fecha: '2026-10-25', valor: 1 })
    expect(calcularAvisos(entrada([viejo]), HOY)).toHaveLength(1)
  })

  it('sin pagar, sale en los próximos pagos; pagado, sale de la lista', () => {
    expect(proximosPagos([sus()], [], HOY, undefined, undefined, [])).toHaveLength(1)
    expect(proximosPagos([sus()], [], HOY, undefined, undefined, [pago])).toEqual([])
  })

  it('sin pasar los movimientos, se comporta como siempre', () => {
    expect(proximosPagos([sus()], [], HOY)).toHaveLength(1)
  })
})
