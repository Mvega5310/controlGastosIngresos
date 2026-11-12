import { describe, expect, it } from 'vitest'
import {
  diasHasta, proximaFecha, urgencia, porcentaje,
  calcularPresupuestos, calcularMetas, calcularDeudas, calcularSuscripciones,
  calcularInversiones, resumenInversiones, calcularVehiculos,
  gastoPorCategoria, totalDeuda, cuotasDelMes, gastoMensualSuscripciones
} from './planificacion'
import { Movement } from '../data/mock'

const HOY = '2026-11-12'
const NOV = { year: 2026, month: 11 }

const mov = (p: Partial<Movement>): Movement => ({
  id: 'x', title: 't', category: 'Otros', account: 'Cuenta principal',
  date: '2026-11-10', amount: 1000, type: 'Gasto', ...p
})

describe('fechas', () => {
  it('cuenta los días que faltan, y los negativos si ya pasó', () => {
    expect(diasHasta('2026-11-12', HOY)).toBe(0)
    expect(diasHasta('2026-11-15', HOY)).toBe(3)
    expect(diasHasta('2026-11-01', HOY)).toBe(-11)
    expect(diasHasta('2027-02-12', HOY)).toBe(92)
  })

  it('no se descuadra al cruzar un cambio de hora', () => {
    // Si se usara la hora local en vez de UTC, estos saldrían 29 o 31.
    expect(diasHasta('2026-04-30', '2026-03-31')).toBe(30)
    expect(diasHasta('2026-11-30', '2026-10-31')).toBe(30)
  })

  it('el próximo cobro es este mes si el día aún no pasó, y el siguiente si ya pasó', () => {
    expect(proximaFecha(15, HOY)).toBe('2026-11-15')
    expect(proximaFecha(12, HOY)).toBe('2026-11-12')
    expect(proximaFecha(5, HOY)).toBe('2026-12-05')
  })

  it('cruza el fin de año', () => {
    expect(proximaFecha(5, '2026-12-20')).toBe('2027-01-05')
  })

  it('un cobro el 31 cae en el último día de los meses cortos', () => {
    expect(proximaFecha(31, '2027-02-01')).toBe('2027-02-28')
    expect(proximaFecha(31, '2028-02-01')).toBe('2028-02-29')
    expect(proximaFecha(31, '2026-04-01')).toBe('2026-04-30')
  })

  it('clasifica vencido, próximo y vigente', () => {
    expect(urgencia('2026-11-01', 30, HOY)).toBe('vencido')
    expect(urgencia('2026-11-20', 30, HOY)).toBe('proximo')
    expect(urgencia('2026-11-12', 30, HOY)).toBe('proximo')
    expect(urgencia('2027-06-01', 30, HOY)).toBe('vigente')
  })

  it('porcentaje no divide por cero', () => {
    expect(porcentaje(50, 0)).toBe(0)
    expect(porcentaje(285000, 600000)).toBe(48)
    expect(porcentaje(85000, 50000)).toBe(170)
  })
})

describe('presupuestos', () => {
  const movs = [
    mov({ id: '1', category: 'Alimentación', amount: 285000, type: 'Gasto' }),
    mov({ id: '2', category: 'Alimentación', amount: 15000, type: 'Gasto', date: '2026-10-02' }),
    mov({ id: '3', category: 'Alimentación', amount: 999, type: 'Ingreso' }),
    mov({ id: '4', category: 'Transporte', amount: 85000, type: 'Gasto' })
  ]
  const presupuestos = [
    { id: 'b1', categoria: 'Alimentación', limite: 600000 },
    { id: 'b2', categoria: 'Transporte', limite: 50000 },
    { id: 'b3', categoria: 'Salud', limite: 250000 }
  ]

  it('cuenta solo el gasto de esa categoría y de ese periodo', () => {
    const [alimentacion] = calcularPresupuestos(presupuestos, movs, NOV)
    expect(alimentacion.gastado).toBe(285000)
    expect(alimentacion.restante).toBe(315000)
    expect(alimentacion.progreso).toBe(48)
    expect(alimentacion.estado).toBe('ok')
  })

  it('un ingreso de la categoría no consume presupuesto', () => {
    const soloIngreso = calcularPresupuestos(
      [{ id: 'b', categoria: 'Trabajo', limite: 100 }],
      [mov({ category: 'Trabajo', amount: 999999, type: 'Ingreso' })], NOV)
    expect(soloIngreso[0].gastado).toBe(0)
  })

  it('marca excedido cuando el gasto pasa del límite', () => {
    const transporte = calcularPresupuestos(presupuestos, movs, NOV)[1]
    expect(transporte.estado).toBe('excedido')
    expect(transporte.progreso).toBe(170)
    expect(transporte.restante).toBe(-35000)
  })

  it('avisa a partir del 80 %', () => {
    const casi = calcularPresupuestos([{ id: 'b', categoria: 'X', limite: 100000 }],
      [mov({ category: 'X', amount: 80000, type: 'Gasto' })], NOV)
    expect(casi[0].estado).toBe('cerca')
  })

  it('una categoría sin gasto queda en cero, no se omite', () => {
    const salud = calcularPresupuestos(presupuestos, movs, NOV)[2]
    expect(salud.gastado).toBe(0)
    expect(salud.progreso).toBe(0)
  })
})

describe('metas', () => {
  const metas = [{ id: 'm', nombre: 'Fondo', objetivo: 5000000, ahorrado: 3500000, fechaLimite: '2027-06-30' }]

  it('calcula progreso, lo que falta y los días', () => {
    const [m] = calcularMetas(metas, HOY)
    expect(m.progreso).toBe(70)
    expect(m.falta).toBe(1500000)
    expect(m.dias).toBe(230)
  })

  it('una meta pasada de rosca no muestra que falte dinero', () => {
    const [m] = calcularMetas([{ ...metas[0], ahorrado: 6000000 }], HOY)
    expect(m.falta).toBe(0)
    expect(m.progreso).toBe(120)
  })
})

describe('deudas', () => {
  const deudas = [
    { id: 'd1', nombre: 'Tarjeta', entidad: 'Visa', montoTotal: 2400000, pagado: 0, cuotaMensual: 420000, diaPago: 18 },
    { id: 'd2', nombre: 'Crédito', entidad: 'Banco', montoTotal: 2450000, pagado: 980000, cuotaMensual: 200000, diaPago: 5 }
  ]

  it('calcula lo pendiente, el progreso y las cuotas que faltan', () => {
    const [tarjeta, credito] = calcularDeudas(deudas, HOY)
    expect(tarjeta.pendiente).toBe(2400000)
    expect(tarjeta.progreso).toBe(0)
    expect(tarjeta.cuotasRestantes).toBe(6)
    expect(credito.pendiente).toBe(1470000)
    expect(credito.progreso).toBe(40)
  })

  it('sitúa cada próximo pago según haya pasado o no su día', () => {
    const [tarjeta, credito] = calcularDeudas(deudas, HOY)
    expect(tarjeta.proximoPago).toBe('2026-11-18')
    expect(credito.proximoPago).toBe('2026-12-05')
  })

  it('una deuda saldada no deja pendiente negativo ni cuotas', () => {
    const [d] = calcularDeudas([{ ...deudas[0], pagado: 3000000 }], HOY)
    expect(d.pendiente).toBe(0)
    expect(d.cuotasRestantes).toBe(0)
  })

  it('sin cuota mensual no divide por cero', () => {
    const [d] = calcularDeudas([{ ...deudas[0], cuotaMensual: 0 }], HOY)
    expect(d.cuotasRestantes).toBe(0)
  })

  it('suma el total pendiente y las cuotas del mes', () => {
    expect(totalDeuda(calcularDeudas(deudas, HOY))).toBe(3870000)
    expect(cuotasDelMes(deudas)).toBe(620000)
  })
})

describe('suscripciones', () => {
  const subs = [
    { id: 's1', nombre: 'Netflix', monto: 32900, diaCobro: 22, categoria: 'Entretenimiento', cuenta: 'Tarjeta crédito', activa: true },
    { id: 's2', nombre: 'Internet', monto: 95000, diaCobro: 15, categoria: 'Vivienda', cuenta: 'Cuenta principal', activa: true },
    { id: 's3', nombre: 'Pausada', monto: 50000, diaCobro: 3, categoria: 'Otros', cuenta: 'Efectivo', activa: false }
  ]

  it('ordena por el próximo cobro, no por el día del mes', () => {
    // El día 3 ya pasó, así que su próximo cobro cae en diciembre y va al final.
    expect(calcularSuscripciones(subs, HOY).map(s => s.nombre)).toEqual(['Internet', 'Netflix', 'Pausada'])
  })

  it('cuenta los días que faltan para cada cobro', () => {
    const [internet] = calcularSuscripciones(subs, HOY)
    expect(internet.proximoCobro).toBe('2026-11-15')
    expect(internet.dias).toBe(3)
  })

  it('el gasto mensual deja fuera las pausadas', () => {
    expect(gastoMensualSuscripciones(subs)).toBe(127900)
    expect(gastoMensualSuscripciones(subs.map(s => ({ ...s, activa: false })))).toBe(0)
  })
})

describe('inversiones', () => {
  const inv = [
    { id: 'i1', nombre: 'CDT', tipo: 'Renta fija', invertido: 3000000, valorActual: 3180000 },
    { id: 'i2', nombre: 'Acciones', tipo: 'Renta variable', invertido: 1800000, valorActual: 1660000 }
  ]

  it('calcula el rendimiento en dinero y en porcentaje, también en pérdida', () => {
    const [cdt, acciones] = calcularInversiones(inv)
    expect(cdt.rendimiento).toBe(180000)
    expect(cdt.porcentajeRendimiento).toBe(6)
    expect(acciones.rendimiento).toBe(-140000)
    expect(acciones.porcentajeRendimiento).toBe(-7.8)
  })

  it('resume el portafolio sumando sus partes', () => {
    const r = resumenInversiones(calcularInversiones(inv))
    expect(r.invertido).toBe(4800000)
    expect(r.valor).toBe(4840000)
    expect(r.rendimiento).toBe(40000)
  })

  it('una inversión sin capital no rompe el porcentaje', () => {
    const [x] = calcularInversiones([{ id: 'z', nombre: 'Z', tipo: 'Otro', invertido: 0, valorActual: 500 }])
    expect(x.porcentajeRendimiento).toBe(0)
    expect(x.rendimiento).toBe(500)
  })

  it('un portafolio vacío no divide por cero', () => {
    expect(resumenInversiones([])).toEqual({ invertido: 0, valor: 0, rendimiento: 0, porcentaje: 0 })
  })
})

describe('vehículos', () => {
  const v = [{ id: 'v', nombre: 'Auto', placa: 'ABC-123', soat: '2027-02-12', tecnomecanica: '2026-11-20' }]

  it('calcula los días de cada documento y su estado', () => {
    const [auto] = calcularVehiculos(v, HOY)
    expect(auto.soatDias).toBe(92)
    expect(auto.soatEstado).toBe('vigente')
    expect(auto.tecnoDias).toBe(8)
    expect(auto.tecnoEstado).toBe('proximo')
  })

  it('marca como vencido lo que ya pasó', () => {
    const [auto] = calcularVehiculos([{ ...v[0], soat: '2026-10-01' }], HOY)
    expect(auto.soatEstado).toBe('vencido')
    expect(auto.soatDias).toBeLessThan(0)
  })
})

describe('gasto por categoría', () => {
  const movs = [
    mov({ id: '1', category: 'Alimentación', amount: 285000, type: 'Gasto' }),
    mov({ id: '2', category: 'Transporte', amount: 85000, type: 'Gasto' }),
    mov({ id: '3', category: 'Entretenimiento', amount: 32900, type: 'Gasto' }),
    mov({ id: '4', category: 'Trabajo', amount: 4200000, type: 'Ingreso' }),
    mov({ id: '5', category: 'Alimentación', amount: 500000, type: 'Gasto', date: '2026-10-10' })
  ]

  it('agrupa, ordena de mayor a menor y reparte el 100 %', () => {
    const filas = gastoPorCategoria(movs, NOV)
    expect(filas.map(f => f.categoria)).toEqual(['Alimentación', 'Transporte', 'Entretenimiento'])
    expect(filas[0].total).toBe(285000)
    expect(filas[0].porcentaje).toBe(71)
    expect(filas.reduce((s, f) => s + f.porcentaje, 0)).toBeGreaterThanOrEqual(99)
  })

  it('un periodo sin gastos devuelve una lista vacía', () => {
    expect(gastoPorCategoria(movs, { year: 2020, month: 1 })).toEqual([])
  })
})
