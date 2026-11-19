import { describe, expect, it } from 'vitest'
import { aCentavos } from './dinero'
import {
  PlanItem,
  TOPES_DEL_FORMATO,
  calcularPlan,
  ficha,
  idDePlan,
  mesesDelPlan,
  cambiaLaCelda,
  cambiosDeRelleno,
  sugerenciasDelPlan,
  parametrosProyectoDe
} from './plan'
import { RUBROS } from '../datos/empresa'

const [SALARIOS, EQUIPOS, MUEBLES, ESTRUCTURALES, TECNICAS, , PERMISOS, TASAS, , PUBLICIDAD] = RUBROS

/**
 * El plan operativo del formato del SENA (hoja «Proyecto», filas 509 a 516), en
 * pesos y por mes. El propio formato dice que suma el valor solicitado,
 * 508.000.000, y calcula cuánto pesa cada rubro con tope: si estas pruebas
 * fallan, la aplicación ya no coincide con el proyecto presentado.
 */
const planDelFormato: Record<string, number[]> = {
  [SALARIOS]: Array(9).fill(34750000),
  [EQUIPOS]: [49226800, ...Array(8).fill(1352900)],
  [MUEBLES]: [15000000, ...Array(8).fill(4500000)],
  [ESTRUCTURALES]: [12000000, 0, 0, 0, 0, 0, 0, 0, 0],
  [TECNICAS]: [1200000, ...Array(8).fill(1100000)],
  [PERMISOS]: [3000000, 0, 0, 0, 0, 0, 0, 0, 0],
  [TASAS]: [0, 3000000, 0, 0, 0, 0, 0, 0, 0],
  [PUBLICIDAD]: [2000000, 3000000, 4000000, 6000000, 10000000, 10000000, 8000000, 6600000, 6600000]
}

const itemsDelFormato = (): PlanItem[] =>
  Object.entries(planDelFormato).flatMap(([rubro, meses]) =>
    meses.map((m, i) => ({ id: idDePlan(rubro, i + 1), rubro, mes: i + 1, monto: aCentavos(m) }))
  )

const params = parametrosProyectoDe({ valorSolicitado: aCentavos(508000000), inicio: '2026-11', meses: 9 })

describe('los meses del plan', () => {
  it('empiezan en el mes de inicio y cruzan el cambio de año', () => {
    expect(mesesDelPlan('2026-11', 9)).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
      '2027-05',
      '2027-06',
      '2027-07'
    ])
  })

  it('un inicio mal escrito no rompe nada', () => {
    expect(mesesDelPlan('hola', 3)).toHaveLength(3)
    expect(mesesDelPlan('2026-11', 0)).toEqual([])
  })
})

describe('los parámetros del proyecto', () => {
  it('traen los topes del formato por defecto', () => {
    const p = parametrosProyectoDe(null, new Date(2026, 10, 19))
    expect(p.inicio).toBe('2026-11')
    expect(p.meses).toBe(9)
    expect(p.valorSolicitado).toBe(0)
    expect(p.topes).toEqual(TOPES_DEL_FORMATO)
  })

  it('cada tope del formato corresponde a un rubro que existe', () => {
    for (const rubro of Object.keys(TOPES_DEL_FORMATO)) expect(RUBROS).toContain(rubro)
  })

  it('descarta valores imposibles y conserva los buenos', () => {
    const p = parametrosProyectoDe(
      { meses: -2, inicio: '2026-13', valorSolicitado: -5 },
      new Date(2026, 0, 5)
    )
    expect(p.meses).toBe(9)
    expect(p.inicio).toBe('2026-01')
    expect(p.valorSolicitado).toBe(0)
    expect(parametrosProyectoDe({ meses: 12 }).meses).toBe(12)
  })

  it('un tope propio se suma a los del formato', () => {
    const p = parametrosProyectoDe({ topes: { [EQUIPOS]: 3000 } })
    expect(p.topes[EQUIPOS]).toBe(3000)
    expect(p.topes[TECNICAS]).toBe(5000)
  })
})

describe('el plan del formato', () => {
  const r = calcularPlan(itemsDelFormato(), [], params, RUBROS)

  it('suma 508.000.000 y cuadra con el valor solicitado', () => {
    expect(r.totalPlaneado).toBe(aCentavos(508000000))
    expect(r.hayValor).toBe(true)
    expect(r.diferencia).toBe(0)
    expect(r.cuadra).toBe(true)
  })

  it('suma por mes lo mismo que la fila TOTAL del formato', () => {
    expect(r.porMes[0].planeado).toBe(aCentavos(117176800))
    expect(r.porMes[1].planeado).toBe(aCentavos(47702900))
    expect(r.porMes[2].planeado).toBe(aCentavos(45702900))
    expect(r.porMes[8].planeado).toBe(aCentavos(48302900))
  })

  it('suma por rubro lo que suman las inversiones y los gastos antes de iniciar', () => {
    const de = (rubro: string) => r.filas.find(f => f.rubro === rubro)!
    expect(de(SALARIOS).planeado).toBe(aCentavos(312750000))
    expect(de(EQUIPOS).planeado).toBe(aCentavos(60050000))
    expect(de(MUEBLES).planeado).toBe(aCentavos(51000000))
    expect(de(TECNICAS).planeado).toBe(aCentavos(10000000))
    expect(de(PUBLICIDAD).planeado).toBe(aCentavos(56200000))
  })

  it('calcula el peso de los rubros con tope como el formato (columna «Registrado»)', () => {
    const de = (rubro: string) => r.filas.find(f => f.rubro === rubro)!.tope
    expect(de(MUEBLES).usado).toBe(1004) // 10,04 %
    expect(de(ESTRUCTURALES).usado).toBe(236) // 2,36 %
    expect(de(TECNICAS).usado).toBe(197) // 1,97 %
    expect(de(TASAS).usado).toBe(59) // 0,59 %
    expect(de(MUEBLES).limite).toBe(1500)
    expect(de(MUEBLES).excedido).toBe(false)
  })

  it('los rubros sin tope no marcan exceso', () => {
    const f = r.filas.find(x => x.rubro === SALARIOS)!
    expect(f.tope.limite).toBeNull()
    expect(f.tope.excedido).toBe(false)
  })
})

describe('los topes', () => {
  it('marcan el exceso en cuanto el rubro pasa de su porcentaje', () => {
    const items: PlanItem[] = [
      { id: 'a', rubro: MUEBLES, mes: 1, monto: aCentavos(76200000) }, // 15,0 % de 508 M
      { id: 'b', rubro: SALARIOS, mes: 1, monto: aCentavos(431800000) }
    ]
    expect(calcularPlan(items, [], params, RUBROS).filas.find(f => f.rubro === MUEBLES)!.tope.excedido).toBe(
      false
    )
    items[0].monto += 1
    expect(calcularPlan(items, [], params, RUBROS).filas.find(f => f.rubro === MUEBLES)!.tope.excedido).toBe(
      true
    )
  })

  it('sin valor solicitado, el tope se mide contra el total del plan', () => {
    const sinValor = parametrosProyectoDe({ inicio: '2026-11' })
    const items: PlanItem[] = [
      { id: 'a', rubro: MUEBLES, mes: 1, monto: aCentavos(20) },
      { id: 'b', rubro: SALARIOS, mes: 1, monto: aCentavos(80) }
    ]
    const r = calcularPlan(items, [], sinValor, RUBROS)
    expect(r.hayValor).toBe(false)
    expect(r.cuadra).toBe(false)
    expect(r.filas.find(f => f.rubro === MUEBLES)!.tope.usado).toBe(2000)
    expect(r.filas.find(f => f.rubro === MUEBLES)!.tope.excedido).toBe(true)
  })

  it('avisan cuánto falta o sobra frente al valor solicitado', () => {
    const items = itemsDelFormato().slice(0, 9) // solo salarios: 312,75 M
    const r = calcularPlan(items, [], params, RUBROS)
    expect(r.cuadra).toBe(false)
    expect(r.diferencia).toBe(aCentavos(312750000 - 508000000))
  })
})

describe('lo ejecutado', () => {
  const gasto = (category: string, date: string, pesos: number) => ({
    type: 'Gasto',
    category,
    date,
    amount: aCentavos(pesos)
  })

  it('se reparte por rubro y por mes del plan', () => {
    const movs = [
      gasto(SALARIOS, '2026-11-30', 34750000),
      gasto(SALARIOS, '2026-12-30', 34000000),
      gasto(EQUIPOS, '2026-11-10', 20000000)
    ]
    const r = calcularPlan(itemsDelFormato(), movs, params, RUBROS)
    const sal = r.filas.find(f => f.rubro === SALARIOS)!
    expect(sal.ejecutado).toBe(aCentavos(68750000))
    expect(sal.meses[0].ejecutado).toBe(aCentavos(34750000))
    expect(sal.meses[1].ejecutado).toBe(aCentavos(34000000))
    expect(sal.restante).toBe(aCentavos(312750000 - 68750000))
    expect(r.totalEjecutado).toBe(aCentavos(88750000))
    expect(r.porMes[0].ejecutado).toBe(aCentavos(54750000))
  })

  it('solo cuentan los gastos: ni ingresos ni traslados', () => {
    const movs = [
      { type: 'Ingreso', category: SALARIOS, date: '2026-11-05', amount: aCentavos(5000000) },
      { type: 'Transferencia', category: SALARIOS, date: '2026-11-05', amount: aCentavos(5000000) },
      gasto(SALARIOS, '2026-11-05', 1000000)
    ]
    expect(calcularPlan([], movs, params, RUBROS).totalEjecutado).toBe(aCentavos(1000000))
  })

  it('los gastos de meses fuera del plan se anotan aparte, no se pierden ni se mezclan', () => {
    const movs = [gasto(SALARIOS, '2026-10-31', 700000), gasto(SALARIOS, '2027-08-01', 300000)]
    const r = calcularPlan(itemsDelFormato(), movs, params, RUBROS)
    expect(r.totalEjecutado).toBe(0)
    expect(r.ejecutadoFuera).toBe(aCentavos(1000000))
  })

  it('marca el rubro que gasta más de lo planeado', () => {
    const r = calcularPlan(itemsDelFormato(), [gasto(TASAS, '2026-12-10', 3500000)], params, RUBROS)
    const f = r.filas.find(x => x.rubro === TASAS)!
    expect(f.estado).toBe('excedido')
    expect(f.progreso).toBe(117)
    expect(f.restante).toBe(0)
  })

  it('distingue un rubro sin plan que ya gasta de uno vacío', () => {
    const r = calcularPlan([], [gasto(PERMISOS, '2026-11-02', 100000)], params, RUBROS)
    expect(r.filas.find(f => f.rubro === PERMISOS)!.estado).toBe('sin-plan')
    expect(r.filas.find(f => f.rubro === TASAS)!.estado).toBe('vacio')
  })

  it('una categoría que no es un rubro conocido aparece igualmente, al final', () => {
    const r = calcularPlan([], [gasto('Viáticos', '2026-11-02', 100000)], params, RUBROS)
    expect(r.filas.at(-1)!.rubro).toBe('Viáticos')
    expect(r.filas.at(-1)!.estado).toBe('sin-plan')
  })

  it('ignora lo planeado en meses que ya no existen', () => {
    const items: PlanItem[] = [
      { id: 'a', rubro: SALARIOS, mes: 10, monto: aCentavos(1000) },
      { id: 'b', rubro: SALARIOS, mes: 0, monto: aCentavos(1000) },
      { id: 'c', rubro: SALARIOS, mes: 1, monto: aCentavos(500) }
    ]
    expect(calcularPlan(items, [], params, RUBROS).totalPlaneado).toBe(aCentavos(500))
  })
})

describe('escribir una celda del plan', () => {
  it('cada celda tiene un identificador fijo y distinto', () => {
    expect(idDePlan(SALARIOS, 1)).toBe(idDePlan(SALARIOS, 1))
    expect(idDePlan(SALARIOS, 1)).not.toBe(idDePlan(SALARIOS, 2))
    const ids = new Set(RUBROS.map(r => ficha(r)))
    expect(ids.size).toBe(RUBROS.length)
  })

  it('hay que escribir una celda nueva solo si el importe es positivo', () => {
    expect(cambiaLaCelda([], SALARIOS, 3, aCentavos(100))).toBe(true)
    expect(cambiaLaCelda([], SALARIOS, 1, 0)).toBe(false)
    expect(cambiaLaCelda([], SALARIOS, 1, NaN)).toBe(false)
    expect(cambiaLaCelda([], SALARIOS, 1, -5)).toBe(false)
  })

  it('en una celda existente, escribir cero también es un cambio: nunca se borra', () => {
    const existente = { id: idDePlan(SALARIOS, 1), rubro: SALARIOS, mes: 1, monto: 500 }
    expect(cambiaLaCelda([existente], SALARIOS, 1, 900)).toBe(true)
    expect(cambiaLaCelda([existente], SALARIOS, 1, 0)).toBe(true)
  })

  it('no hay que escribir si el importe no cambia', () => {
    const existente = { id: idDePlan(SALARIOS, 1), rubro: SALARIOS, mes: 1, monto: 500 }
    expect(cambiaLaCelda([existente], SALARIOS, 1, 500)).toBe(false)
  })

  it('una celda borrada solo cambia si se le pone un importe', () => {
    const borrada = {
      id: idDePlan(SALARIOS, 1),
      rubro: SALARIOS,
      mes: 1,
      monto: 500,
      eliminadoEn: '2026-11-01T00:00:00.000Z'
    }
    expect(cambiaLaCelda([borrada], SALARIOS, 1, 700)).toBe(true)
    expect(cambiaLaCelda([borrada], SALARIOS, 1, 0)).toBe(false)
  })
})

describe('llenar el plan desde compras, mercadeo y trámites', () => {
  const fuente = (rubro: string, mes: number | undefined, pesos: number, origen = 'Compras') => ({
    rubro,
    mes,
    monto: aCentavos(pesos),
    origen
  })

  it('suma las fuentes por rubro y mes del plan', () => {
    const s = sugerenciasDelPlan(
      [
        fuente(MUEBLES, 1, 15000000),
        fuente(MUEBLES, 1, 100),
        fuente(MUEBLES, 2, 4500000),
        fuente(EQUIPOS, 1, 1)
      ],
      9
    )
    expect(s.get(MUEBLES)!.porMes[0]).toBe(aCentavos(15000100))
    expect(s.get(MUEBLES)!.porMes[1]).toBe(aCentavos(4500000))
    expect(s.get(EQUIPOS)!.porMes[0]).toBe(aCentavos(1))
    expect(s.get(MUEBLES)!.porMes).toHaveLength(9)
  })

  it('lo que no tiene mes, o lo tiene fuera del plan, queda aparte y no se reparte', () => {
    const s = sugerenciasDelPlan(
      [
        fuente(MUEBLES, undefined, 100),
        fuente(MUEBLES, 0, 200),
        fuente(MUEBLES, 10, 300),
        fuente(MUEBLES, 9, 400)
      ],
      9
    )
    const m = s.get(MUEBLES)!
    expect(m.sinMes).toBe(aCentavos(600))
    expect(m.porMes[8]).toBe(aCentavos(400))
    expect(m.porMes.reduce((a, b) => a + b, 0)).toBe(aCentavos(400))
  })

  it('ignora lo que vale cero', () => {
    expect(sugerenciasDelPlan([fuente(MUEBLES, 1, 0)], 9).size).toBe(0)
  })

  it('propone solo las celdas donde hay algo que poner', () => {
    const s = sugerenciasDelPlan([fuente(MUEBLES, 1, 100), fuente(MUEBLES, 3, 300)], 9)
    const cambios = cambiosDeRelleno([], s)
    expect(cambios.map(c => [c.mes, c.monto, c.sustituye])).toEqual([
      [1, aCentavos(100), false],
      [3, aCentavos(300), false]
    ])
  })

  it('avisa cuando pisaría un importe distinto que ya había', () => {
    const existente = { id: idDePlan(MUEBLES, 1), rubro: MUEBLES, mes: 1, monto: aCentavos(50) }
    const s = sugerenciasDelPlan([fuente(MUEBLES, 1, 100)], 9)
    const [c] = cambiosDeRelleno([existente], s)
    expect(c).toMatchObject({ mes: 1, actual: aCentavos(50), sustituye: true })
  })

  it('no propone nada si la celda ya tiene ese importe', () => {
    const existente = { id: idDePlan(MUEBLES, 1), rubro: MUEBLES, mes: 1, monto: aCentavos(100) }
    const s = sugerenciasDelPlan([fuente(MUEBLES, 1, 100)], 9)
    expect(cambiosDeRelleno([existente], s)).toEqual([])
  })

  it('una celda borrada no cuenta como importe que se pisa', () => {
    const borrada = {
      id: idDePlan(MUEBLES, 1),
      rubro: MUEBLES,
      mes: 1,
      monto: aCentavos(50),
      eliminadoEn: '2026-11-01T00:00:00.000Z'
    }
    const s = sugerenciasDelPlan([fuente(MUEBLES, 1, 100)], 9)
    expect(cambiosDeRelleno([borrada], s)[0]).toMatchObject({ actual: 0, sustituye: false })
  })

  it('con las compras del formato, llena el mes 1 de muebles con lo del formato', () => {
    const s = sugerenciasDelPlan(
      [
        fuente(MUEBLES, 1, 10500000),
        fuente(MUEBLES, 1, 4500000),
        ...Array.from({ length: 8 }, (_, i) => fuente(MUEBLES, i + 2, 4500000))
      ],
      9
    )
    expect(s.get(MUEBLES)!.porMes[0]).toBe(aCentavos(15000000))
    expect(s.get(MUEBLES)!.porMes.reduce((a, b) => a + b, 0)).toBe(aCentavos(51000000))
  })
})
