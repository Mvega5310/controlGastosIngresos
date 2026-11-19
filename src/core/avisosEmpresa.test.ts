import { describe, expect, it } from 'vitest'
import { calcularAvisosEmpresa, EntradaAvisosEmpresa } from './avisosEmpresa'
import { aCentavos } from './dinero'
import { Cargo, PARAMETROS_POR_DEFECTO, origenDePago } from './nomina'
import { PlanItem, calcularPlan, idDePlan, parametrosProyectoDe } from './plan'
import { Tramite } from './tramites'
import { AccionMercadeo } from './mercadeo'
import { Compra } from './compras'
import { RUBROS } from '../datos/empresa'

const [SALARIOS, EQUIPOS, MUEBLES] = RUBROS

const proyecto = parametrosProyectoDe({ valorSolicitado: aCentavos(100000000), inicio: '2026-11', meses: 3 })

const item = (rubro: string, mes: number, pesos: number): PlanItem => ({
  id: idDePlan(rubro, mes),
  rubro,
  mes,
  monto: aCentavos(pesos)
})

const base = (extra: Partial<EntradaAvisosEmpresa> = {}): EntradaAvisosEmpresa => ({
  tramites: [],
  compras: [],
  acciones: [],
  cargos: [],
  parametrosNomina: PARAMETROS_POR_DEFECTO,
  plan: calcularPlan([], [], proyecto, RUBROS),
  movimientos: [],
  ...extra
})

const tramite = (extra: Partial<Tramite>): Tramite => ({
  id: 't1',
  nombre: 'Registro de marca',
  rubro: 'Permisos, licencias y registros',
  costo: 0,
  dias: 10,
  estado: 'En trámite',
  inicio: '2026-11-01',
  ...extra
})

const cargo = (extra: Partial<Cargo> = {}): Cargo => ({
  id: 'c1',
  rol: 'Analista',
  vinculacion: 'Prestación de servicios',
  salario: aCentavos(3000000),
  meses: 12,
  ...extra
})

describe('sin nada que avisar', () => {
  it('una empresa recién creada no tiene avisos', () => {
    expect(calcularAvisosEmpresa(base(), '2026-11-19')).toEqual([])
  })
})

describe('trámites', () => {
  it('avisa del que ya pasó su fecha estimada, como vencido', () => {
    const [a] = calcularAvisosEmpresa(base({ tramites: [tramite({})] }), '2026-11-19')
    expect(a).toMatchObject({ nivel: 'vencido', seccion: 'Trámites', titulo: 'Registro de marca', dias: -8 })
    expect(a.detalle).toContain('atrasado 8 días')
  })

  it('avisa del que está a una semana o menos, como pronto', () => {
    const [a] = calcularAvisosEmpresa(
      base({ tramites: [tramite({ inicio: '2026-11-19', dias: 7 })] }),
      '2026-11-19'
    )
    expect(a).toMatchObject({ nivel: 'pronto', dias: 7 })
  })

  it('no avisa del que está a más de una semana', () => {
    expect(
      calcularAvisosEmpresa(base({ tramites: [tramite({ inicio: '2026-11-19', dias: 8 })] }), '2026-11-19')
    ).toEqual([])
  })

  it('no avisa de los listos ni de los que no tienen fecha de inicio', () => {
    const t = [tramite({ estado: 'Listo' }), tramite({ id: 't2', inicio: undefined })]
    expect(calcularAvisosEmpresa(base({ tramites: t }), '2026-11-19')).toEqual([])
  })

  it('reprogramar un trámite lo convierte en otro aviso, no en el ya visto', () => {
    const a = calcularAvisosEmpresa(base({ tramites: [tramite({})] }), '2026-11-19')[0].id
    const b = calcularAvisosEmpresa(base({ tramites: [tramite({ inicio: '2026-11-05' })] }), '2026-11-19')[0]
      .id
    expect(a).not.toBe(b)
  })
})

describe('la nómina del mes', () => {
  const c = cargo()

  it('avisa cuando faltan 5 días o menos para fin de mes y hay cargos sin pagar', () => {
    const [a] = calcularAvisosEmpresa(base({ cargos: [c] }), '2026-11-25')
    expect(a).toMatchObject({ nivel: 'pronto', seccion: 'Nómina', dias: 5 })
    expect(a.detalle).toContain('1 cargo')
  })

  it('no avisa antes', () => {
    expect(calcularAvisosEmpresa(base({ cargos: [c] }), '2026-11-24')).toEqual([])
  })

  it('no avisa si el pago del mes ya está registrado', () => {
    const movs = [{ origen: origenDePago(c.id, '2026-11') }]
    expect(calcularAvisosEmpresa(base({ cargos: [c], movimientos: movs }), '2026-11-28')).toEqual([])
  })

  it('el pago de otro mes no cuenta', () => {
    const movs = [{ origen: origenDePago(c.id, '2026-10') }]
    expect(calcularAvisosEmpresa(base({ cargos: [c], movimientos: movs }), '2026-11-28')).toHaveLength(1)
  })

  it('cuenta solo los cargos que faltan', () => {
    const otro = cargo({ id: 'c2' })
    const movs = [{ origen: origenDePago(c.id, '2026-11') }]
    const [a] = calcularAvisosEmpresa(base({ cargos: [c, otro], movimientos: movs }), '2026-11-30')
    expect(a.detalle).toContain('1 cargo')
    expect(a.detalle).toContain('hoy')
  })

  it('un cargo sin costo no genera aviso', () => {
    expect(calcularAvisosEmpresa(base({ cargos: [cargo({ salario: 0 })] }), '2026-11-30')).toEqual([])
  })
})

describe('el plan', () => {
  it('avisa del rubro que pasa su tope', () => {
    const plan = calcularPlan([item(MUEBLES, 1, 20000000), item(SALARIOS, 1, 80000000)], [], proyecto, RUBROS)
    const a = calcularAvisosEmpresa(base({ plan }), '2026-11-19').find(x => x.id.startsWith('top-'))!
    expect(a).toMatchObject({ nivel: 'vencido', seccion: 'Plan', titulo: MUEBLES })
    expect(a.detalle).toContain('15 %')
  })

  it('no avisa del tope si el rubro no lo pasa', () => {
    const plan = calcularPlan([item(MUEBLES, 1, 15000000), item(SALARIOS, 1, 85000000)], [], proyecto, RUBROS)
    expect(calcularAvisosEmpresa(base({ plan }), '2026-11-19')).toEqual([])
  })

  it('avisa del rubro que gastó más de lo planeado', () => {
    const gasto = { type: 'Gasto', category: EQUIPOS, date: '2026-11-10', amount: aCentavos(3000000) }
    const plan = calcularPlan(
      [item(EQUIPOS, 1, 2000000), item(SALARIOS, 1, 98000000)],
      [gasto],
      proyecto,
      RUBROS
    )
    const a = calcularAvisosEmpresa(base({ plan }), '2026-11-19')
    expect(a).toHaveLength(1)
    expect(a[0]).toMatchObject({ nivel: 'vencido', titulo: EQUIPOS })
  })

  it('avisa del rubro que gasta sin tener plan', () => {
    const gasto = { type: 'Gasto', category: EQUIPOS, date: '2026-11-10', amount: aCentavos(1000) }
    const plan = calcularPlan([item(SALARIOS, 1, 100000000)], [gasto], proyecto, RUBROS)
    const a = calcularAvisosEmpresa(base({ plan }), '2026-11-19')
    expect(a).toHaveLength(1)
    expect(a[0]).toMatchObject({ nivel: 'atencion', titulo: EQUIPOS })
  })

  it('avisa de lo que falta o sobra para llegar al valor solicitado', () => {
    const plan = calcularPlan([item(SALARIOS, 1, 60000000)], [], proyecto, RUBROS)
    const [a] = calcularAvisosEmpresa(base({ plan }), '2026-11-19')
    expect(a).toMatchObject({ nivel: 'atencion', titulo: 'El plan no suma el valor solicitado' })
    expect(a.detalle).toContain('Faltan')
    const sobra = calcularPlan([item(SALARIOS, 1, 130000000)], [], proyecto, RUBROS)
    expect(calcularAvisosEmpresa(base({ plan: sobra }), '2026-11-19')[0].detalle).toContain('Sobran')
  })

  it('un plan vacío no se queja de no sumar: aún no se ha empezado', () => {
    expect(calcularAvisosEmpresa(base(), '2026-11-19')).toEqual([])
  })

  it('un plan que cuadra no genera aviso', () => {
    const plan = calcularPlan([item(SALARIOS, 1, 100000000)], [], proyecto, RUBROS)
    expect(calcularAvisosEmpresa(base({ plan }), '2026-11-19')).toEqual([])
  })
})

describe('compras y mercadeo', () => {
  const compra = (mes?: number): Compra => ({
    id: 'k' + mes,
    descripcion: 'x',
    rubro: EQUIPOS,
    cantidad: 1,
    valorUnitario: 1,
    estado: 'Cotizado',
    mes
  })
  const accion = (extra: Partial<AccionMercadeo>): AccionMercadeo => ({
    id: 'a',
    nombre: 'Pauta',
    tipo: 'Estrategia de comunicación',
    costo: 1,
    estado: 'Realizada',
    ...extra
  })

  it('avisa de las compras sin mes del plan', () => {
    const [a] = calcularAvisosEmpresa(
      base({ compras: [compra(0), compra(undefined), compra(1)] }),
      '2026-11-19'
    )
    expect(a).toMatchObject({ nivel: 'atencion', seccion: 'Compras' })
    expect(a.detalle).toContain('2 compras')
  })

  it('avisa de lo realizado sin evidencia, y no de lo que la tiene o no se ha hecho', () => {
    const acciones = [
      accion({}),
      accion({ id: 'b', evidencia: 'enlace' }),
      accion({ id: 'c', estado: 'Planeada' })
    ]
    const [a] = calcularAvisosEmpresa(base({ acciones }), '2026-11-19')
    expect(a).toMatchObject({ nivel: 'atencion', seccion: 'Mercadeo' })
    expect(a.detalle).toContain('1 acción realizada')
  })
})

describe('el orden', () => {
  it('lo vencido va primero, luego lo próximo y al final lo que solo conviene mirar', () => {
    const plan = calcularPlan([item(SALARIOS, 1, 60000000)], [], proyecto, RUBROS) // no suma: atención
    const niveles = calcularAvisosEmpresa(
      base({
        plan,
        compras: [
          { id: 'k', descripcion: 'x', rubro: EQUIPOS, cantidad: 1, valorUnitario: 1, estado: 'Cotizado' }
        ],
        tramites: [tramite({}), tramite({ id: 't2', inicio: '2026-11-19', dias: 3 })]
      }),
      '2026-11-19'
    ).map(a => a.nivel)
    expect(niveles).toEqual(['vencido', 'pronto', 'atencion', 'atencion'])
  })

  it('cada aviso tiene un identificador distinto', () => {
    const plan = calcularPlan([item(SALARIOS, 1, 60000000)], [], proyecto, RUBROS)
    const avisos = calcularAvisosEmpresa(
      base({ plan, tramites: [tramite({}), tramite({ id: 't2', inicio: '2026-11-02' })], cargos: [cargo()] }),
      '2026-11-27'
    )
    expect(new Set(avisos.map(a => a.id)).size).toBe(avisos.length)
  })
})
