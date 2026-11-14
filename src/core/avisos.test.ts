import { describe, expect, it } from 'vitest'
import { calcularAvisos, podarVistos, proximosPagos, sinVer, EntradaAvisos } from './avisos'
import { Movement } from '../datos/catalogo'

const HOY = '2026-11-12'
const NOV = { year: 2026, month: 11 }

const vacio: EntradaAvisos = {
  suscripciones: [],
  deudas: [],
  vehiculos: [],
  presupuestos: [],
  movimientos: [],
  periodo: NOV
}

const sus = (p: Partial<EntradaAvisos['suscripciones'][0]> = {}) => ({
  id: 's1',
  nombre: 'Netflix',
  monto: 1000,
  diaCobro: 15,
  categoria: 'Entretenimiento',
  cuenta: 'Tarjeta',
  activa: true,
  ...p
})

const deuda = (p: Partial<EntradaAvisos['deudas'][0]> = {}) => ({
  id: 'd1',
  nombre: 'Tarjeta',
  entidad: 'Visa',
  montoTotal: 100000,
  pagado: 0,
  cuotaMensual: 10000,
  diaPago: 15,
  ...p
})

const vehiculo = (p: Partial<EntradaAvisos['vehiculos'][0]> = {}) => ({
  id: 'v1',
  nombre: 'Auto',
  placa: 'ABC-123',
  soat: '2027-06-01',
  tecnomecanica: '2027-06-01',
  ...p
})

const gasto = (categoria: string, amount: number): Movement => ({
  id: 'm' + Math.random(),
  title: 'g',
  category: categoria,
  account: 'Cuenta',
  date: '2026-11-05',
  amount,
  type: 'Gasto'
})

describe('sin nada que avisar', () => {
  it('no inventa avisos cuando no hay datos', () => {
    expect(calcularAvisos(vacio, HOY)).toEqual([])
  })

  it('calla si todo está lejos', () => {
    const r = calcularAvisos(
      { ...vacio, suscripciones: [sus({ diaCobro: 30 })], vehiculos: [vehiculo()] },
      HOY
    )
    expect(r).toEqual([])
  })
})

describe('suscripciones', () => {
  it('avisa de un cobro dentro de los próximos días', () => {
    const r = calcularAvisos({ ...vacio, suscripciones: [sus({ diaCobro: 15 })] }, HOY)
    expect(r).toHaveLength(1)
    expect(r[0].titulo).toBe('Netflix')
    expect(r[0].detalle).toContain('en 3 días')
    expect(r[0].seccion).toBe('Suscripciones')
  })

  it('no avisa de una suscripción pausada', () => {
    expect(calcularAvisos({ ...vacio, suscripciones: [sus({ activa: false })] }, HOY)).toEqual([])
  })

  it('no avisa de un cobro lejano', () => {
    // El día 25 está a trece días: fuera del margen de siete.
    expect(calcularAvisos({ ...vacio, suscripciones: [sus({ diaCobro: 25 })] }, HOY)).toEqual([])
  })
})

describe('deudas', () => {
  it('avisa de una cuota próxima', () => {
    const r = calcularAvisos({ ...vacio, deudas: [deuda({ diaPago: 14 })] }, HOY)
    expect(r[0].detalle).toContain('Cuota')
    expect(r[0].seccion).toBe('Deudas')
  })

  it('una deuda ya saldada no avisa', () => {
    const saldada = deuda({ diaPago: 14, pagado: 100000 })
    expect(calcularAvisos({ ...vacio, deudas: [saldada] }, HOY)).toEqual([])
  })
})

describe('documentos del vehículo', () => {
  it('avisa de lo que vence dentro del mes', () => {
    const r = calcularAvisos({ ...vacio, vehiculos: [vehiculo({ soat: '2026-11-20' })] }, HOY)
    expect(r.some(a => a.titulo.includes('SOAT'))).toBe(true)
  })

  it('marca como vencido lo que ya pasó', () => {
    const r = calcularAvisos({ ...vacio, vehiculos: [vehiculo({ soat: '2026-10-01' })] }, HOY)
    const soat = r.find(a => a.titulo.includes('SOAT'))!
    expect(soat.nivel).toBe('vencido')
    expect(soat.detalle).toContain('venció hace')
  })

  it('un documento sin fecha no genera aviso', () => {
    const r = calcularAvisos({ ...vacio, vehiculos: [vehiculo({ soat: '', tecnomecanica: '' })] }, HOY)
    expect(r).toEqual([])
  })
})

describe('presupuestos', () => {
  const presupuesto = { id: 'p1', categoria: 'Alimentación', limite: 100000 }

  it('avisa al excederse', () => {
    const r = calcularAvisos(
      { ...vacio, presupuestos: [presupuesto], movimientos: [gasto('Alimentación', 120000)] },
      HOY
    )
    expect(r[0].nivel).toBe('vencido')
    expect(r[0].detalle).toContain('excedido')
  })

  it('avisa al acercarse al límite', () => {
    const r = calcularAvisos(
      { ...vacio, presupuestos: [presupuesto], movimientos: [gasto('Alimentación', 85000)] },
      HOY
    )
    expect(r[0].nivel).toBe('atencion')
    expect(r[0].detalle).toContain('casi agotado')
  })

  it('calla mientras va holgado', () => {
    const r = calcularAvisos(
      { ...vacio, presupuestos: [presupuesto], movimientos: [gasto('Alimentación', 10000)] },
      HOY
    )
    expect(r).toEqual([])
  })
})

describe('orden', () => {
  it('lo vencido va primero y, dentro de cada grupo, lo más inminente', () => {
    const r = calcularAvisos(
      {
        ...vacio,
        suscripciones: [
          sus({ id: 's1', nombre: 'Lejana', diaCobro: 18 }),
          sus({ id: 's2', nombre: 'Hoy', diaCobro: 12 })
        ],
        vehiculos: [vehiculo({ id: 'v1', soat: '2026-10-01', tecnomecanica: '' })]
      },
      HOY
    )
    expect(r[0].nivel).toBe('vencido')
    expect(r[1].titulo).toBe('Hoy')
    expect(r[2].titulo).toBe('Lejana')
  })
})

describe('proximosPagos', () => {
  it('con nada registrado no anuncia ningún pago', () => {
    expect(proximosPagos([], [], HOY)).toEqual([])
  })

  it('junta suscripciones y cuotas, de lo más cercano a lo más lejano', () => {
    const r = proximosPagos(
      [sus({ id: 's1', nombre: 'Lejana', diaCobro: 28 }), sus({ id: 's2', nombre: 'Cercana', diaCobro: 14 })],
      [deuda({ diaPago: 20 })],
      HOY
    )
    expect(r.map(p => p.nombre)).toEqual(['Cercana', 'Tarjeta', 'Lejana'])
    expect(r[0].concepto).toBe('Suscripción')
    expect(r[1].concepto).toBe('Deuda')
  })

  it('lleva el importe de cada uno, no uno inventado', () => {
    const r = proximosPagos([sus({ monto: 32900, diaCobro: 14 })], [], HOY)
    expect(r[0].monto).toBe(32900)
  })

  it('deja fuera lo pausado y lo ya saldado', () => {
    const r = proximosPagos(
      [sus({ activa: false, diaCobro: 14 })],
      [deuda({ diaPago: 14, pagado: 100000 })],
      HOY
    )
    expect(r).toEqual([])
  })

  it('no mira más allá de la ventana pedida', () => {
    expect(proximosPagos([sus({ diaCobro: 14 })], [], HOY, 1)).toEqual([])
  })
})

describe('avisos vistos', () => {
  const conSuscripcion = (dia: number) =>
    calcularAvisos({ ...vacio, suscripciones: [sus({ diaCobro: dia })] }, HOY)

  it('el cobro del mes que viene no hereda el «visto» de este', () => {
    // Lo que se da por visto es una ocurrencia concreta, no la suscripción:
    // si el identificador no llevara la fecha, callar el aviso de noviembre
    // callaría también el de diciembre.
    const esteMes = conSuscripcion(15)
    const otroMes = calcularAvisos({ ...vacio, suscripciones: [sus({ diaCobro: 15 })] }, '2026-12-12')
    expect(esteMes[0].id).not.toBe(otroMes[0].id)
  })

  it('sin ver nada, todos son nuevos', () => {
    const r = conSuscripcion(15)
    expect(sinVer(r, [])).toHaveLength(1)
  })

  it('una vez visto, deja de contar', () => {
    const r = conSuscripcion(15)
    expect(sinVer(r, [r[0].id])).toEqual([])
  })

  it('haber visto uno no calla a los demás', () => {
    const r = calcularAvisos(
      {
        ...vacio,
        suscripciones: [
          sus({ id: 's1', nombre: 'Una', diaCobro: 14 }),
          sus({ id: 's2', nombre: 'Otra', diaCobro: 15 })
        ]
      },
      HOY
    )
    expect(sinVer(r, [r[0].id]).map(a => a.titulo)).toEqual([r[1].titulo])
  })

  it('se olvidan los vistos que ya no existen', () => {
    const r = conSuscripcion(15)
    expect(podarVistos([r[0].id, 'sus-viejo-2020-01-01'], r)).toEqual([r[0].id])
  })

  it('sin avisos, no queda nada guardado', () => {
    expect(podarVistos(['a', 'b'], [])).toEqual([])
  })
})
