import { describe, expect, it } from 'vitest'
import { aCentavos } from './dinero'
import { nombreRemoto, esEspacio } from './espacios'
import {
  Cargo,
  FACTOR_DEL_FORMATO,
  PARAMETROS_POR_DEFECTO,
  aplicaFactor,
  costoDeCargo,
  factorTotal,
  origenDePago,
  pagoRegistrado,
  parametrosDe,
  resumenNomina,
  tieneDerechoAuxilio,
  ultimoDiaDe,
  verPorcentaje
} from './nomina'

const cargo = (salarioPesos: number, extra: Partial<Cargo> = {}): Cargo => ({
  id: 'c' + salarioPesos,
  rol: 'Rol',
  vinculacion: 'Contrato laboral a término fijo',
  salario: aCentavos(salarioPesos),
  meses: 12,
  ...extra
})

const prestador = (salarioPesos: number) => cargo(salarioPesos, { vinculacion: 'Prestación de servicios' })

/**
 * Los siete cargos del formato del SENA, con las cifras que el propio formato
 * calcula en la hoja «Proyecto» (filas 414 a 424). Si estas pruebas fallan, el
 * costo que muestra la aplicación ya no coincide con el del proyecto presentado.
 */
const equipoDelFormato = [
  prestador(7000000),
  prestador(6000000),
  prestador(6000000),
  prestador(3800000),
  prestador(3800000),
  cargo(3200000),
  cargo(2500000)
]

describe('el factor prestacional del formato', () => {
  it('suma 53,76 %', () => {
    expect(factorTotal(FACTOR_DEL_FORMATO)).toBe(5376)
    expect(verPorcentaje(5376)).toBe('53,76 %')
    expect(verPorcentaje(850)).toBe('8,5 %')
  })

  it('un empleado de 3.200.000 cuesta 4.920.320 al mes, como en el formato', () => {
    const c = costoDeCargo(cargo(3200000))
    expect(c.costoMensual).toBe(aCentavos(4920320))
    expect(c.totalPrestaciones).toBe(aCentavos(1720320))
  })

  it('un empleado de 2.500.000 cuesta 3.844.000 al mes, como en el formato', () => {
    expect(costoDeCargo(cargo(2500000)).costoMensual).toBe(aCentavos(3844000))
  })

  it('quien presta servicios cuesta lo que se le paga, sin prestaciones', () => {
    const c = costoDeCargo(prestador(7000000))
    expect(c.costoMensual).toBe(aCentavos(7000000))
    expect(c.prestaciones).toEqual([])
    expect(c.totalPrestaciones).toBe(0)
  })

  it('el desglose suma exactamente el total de prestaciones', () => {
    const c = costoDeCargo(cargo(3200000))
    expect(c.prestaciones.reduce((s, x) => s + x.monto, 0)).toBe(c.totalPrestaciones)
    expect(c.prestaciones).toHaveLength(8)
    expect(c.prestaciones.find(x => x.clave === 'pension')?.monto).toBe(aCentavos(384000))
  })
})

describe('el equipo completo del formato', () => {
  const r = resumenNomina(equipoDelFormato)

  it('cuesta 35.364.320 al mes, la cifra de la celda AK424', () => {
    expect(r.costoMensual).toBe(aCentavos(35364320))
  })

  it('cuesta 424.371.840 en 12 meses, la cifra del año 1 del modelo financiero', () => {
    expect(r.costoPeriodo).toBe(aCentavos(424371840))
  })

  it('separa salarios y prestaciones', () => {
    expect(r.cargos).toBe(7)
    expect(r.salarios).toBe(aCentavos(32300000))
    expect(r.prestaciones).toBe(aCentavos(3064320))
    expect(r.salarios + r.prestaciones).toBe(r.costoMensual)
  })
})

describe('cuándo se aplica el factor', () => {
  it('según el contrato por defecto', () => {
    expect(aplicaFactor({ vinculacion: 'Prestación de servicios' })).toBe(false)
    expect(aplicaFactor({ vinculacion: 'Contrato laboral a término fijo' })).toBe(true)
    expect(aplicaFactor({ vinculacion: 'Contrato por obra o labor' })).toBe(true)
    expect(aplicaFactor({ vinculacion: 'Jornal' })).toBe(true)
  })

  it('se puede forzar en cualquier sentido', () => {
    expect(aplicaFactor({ vinculacion: 'Prestación de servicios', factor: 'Sí' })).toBe(true)
    expect(aplicaFactor({ vinculacion: 'Contrato laboral a término fijo', factor: 'No' })).toBe(false)
    expect(aplicaFactor({ vinculacion: 'Jornal', factor: 'Según el contrato' })).toBe(true)
  })

  it('con factor forzado a No, el contrato laboral cuesta solo su salario', () => {
    expect(costoDeCargo(cargo(3200000, { factor: 'No' })).costoMensual).toBe(aCentavos(3200000))
  })
})

describe('meses y periodo', () => {
  it('multiplica el costo mensual por los meses requeridos', () => {
    const c = costoDeCargo(cargo(2500000, { meses: 9 }))
    expect(c.costoPeriodo).toBe(aCentavos(3844000) * 9)
  })

  it('sin meses no cuesta nada en el periodo', () => {
    expect(costoDeCargo(cargo(2500000, { meses: 0 })).costoPeriodo).toBe(0)
  })

  it('un salario negativo o vacío no produce un costo negativo', () => {
    expect(costoDeCargo(cargo(-100)).costoMensual).toBe(0)
    expect(costoDeCargo({ ...cargo(0), salario: NaN }).costoMensual).toBe(0)
  })
})

describe('el auxilio de transporte', () => {
  const minimo = PARAMETROS_POR_DEFECTO.smmlv

  it('lo tiene quien es laboral y gana hasta dos mínimos', () => {
    expect(tieneDerechoAuxilio(cargo(3200000), PARAMETROS_POR_DEFECTO)).toBe(true)
    expect(tieneDerechoAuxilio({ ...cargo(0), salario: minimo * 2 }, PARAMETROS_POR_DEFECTO)).toBe(true)
  })

  it('no lo tiene quien gana más de dos mínimos', () => {
    expect(tieneDerechoAuxilio({ ...cargo(0), salario: minimo * 2 + 1 }, PARAMETROS_POR_DEFECTO)).toBe(false)
    expect(tieneDerechoAuxilio(cargo(4000000), PARAMETROS_POR_DEFECTO)).toBe(false)
  })

  it('no lo tiene quien presta servicios', () => {
    expect(tieneDerechoAuxilio(prestador(2000000), PARAMETROS_POR_DEFECTO)).toBe(false)
  })

  it('apagado, el costo coincide con el del formato y el auxilio solo se avisa', () => {
    const c = costoDeCargo(cargo(3200000))
    expect(c.auxilio).toBe(0)
    expect(c.auxilioPosible).toBeGreaterThan(0)
    expect(c.costoMensual).toBe(aCentavos(4920320))
  })

  it('encendido, suma el auxilio y sus cesantías, intereses y prima', () => {
    const p = { ...PARAMETROS_POR_DEFECTO, incluirAuxilio: true }
    const sin = costoDeCargo(cargo(3200000), PARAMETROS_POR_DEFECTO)
    const con = costoDeCargo(cargo(3200000), p)
    const aux = p.auxilioTransporte
    // Cesantías 8,33 %, intereses 1 % y prima 8,33 % también sobre el auxilio.
    const extra = Math.round((aux * 833) / 10000) * 2 + Math.round((aux * 100) / 10000)
    expect(con.auxilio).toBe(aux)
    expect(con.costoMensual - sin.costoMensual).toBe(aux + extra)
    // Y es justo lo que se avisaba que costaría.
    expect(con.costoMensual - sin.costoMensual).toBe(sin.auxilioPosible)
  })

  it('encendido, no cambia el costo de quien no tiene derecho', () => {
    const p = { ...PARAMETROS_POR_DEFECTO, incluirAuxilio: true }
    expect(costoDeCargo(cargo(4000000), p).costoMensual).toBe(costoDeCargo(cargo(4000000)).costoMensual)
    expect(costoDeCargo(prestador(2000000), p).costoMensual).toBe(aCentavos(2000000))
  })

  it('el resumen avisa de los cargos con derecho mientras no se incluya', () => {
    const r = resumenNomina(equipoDelFormato)
    expect(r.sinAuxilio.cargos).toBe(2)
    expect(r.sinAuxilio.mensual).toBeGreaterThan(0)
    const incluido = resumenNomina(equipoDelFormato, { ...PARAMETROS_POR_DEFECTO, incluirAuxilio: true })
    expect(incluido.sinAuxilio).toEqual({ cargos: 0, mensual: 0 })
    expect(incluido.costoMensual - r.costoMensual).toBe(r.sinAuxilio.mensual)
  })
})

describe('parámetros guardados', () => {
  it('sin nada guardado, usa los del formato', () => {
    expect(parametrosDe(null)).toEqual(PARAMETROS_POR_DEFECTO)
    expect(parametrosDe(undefined)).toEqual(PARAMETROS_POR_DEFECTO)
  })

  it('completa lo que falte sin perder lo guardado', () => {
    const p = parametrosDe({ incluirAuxilio: true, factor: { ...FACTOR_DEL_FORMATO, arl: 522 } })
    expect(p.incluirAuxilio).toBe(true)
    expect(p.factor.arl).toBe(522)
    expect(p.factor.salud).toBe(850)
    expect(p.smmlv).toBe(PARAMETROS_POR_DEFECTO.smmlv)
  })

  it('cambiar un porcentaje cambia el costo', () => {
    const p = parametrosDe({ factor: { ...FACTOR_DEL_FORMATO, salud: 0, parafiscales: 400 } })
    expect(costoDeCargo(cargo(3200000), p).costoMensual).toBeLessThan(aCentavos(4920320))
  })
})

describe('el pago de cada mes', () => {
  it('reconoce un pago ya registrado y no confunde cargo ni mes', () => {
    const movimientos = [{ origen: origenDePago('a', '2026-11') }]
    expect(pagoRegistrado(movimientos, 'a', '2026-11')).toBe(true)
    expect(pagoRegistrado(movimientos, 'a', '2026-12')).toBe(false)
    expect(pagoRegistrado(movimientos, 'b', '2026-11')).toBe(false)
    expect(pagoRegistrado([{}], 'a', '2026-11')).toBe(false)
  })

  it('el pago cae el último día del mes', () => {
    expect(ultimoDiaDe('2026-11')).toBe('2026-11-30')
    expect(ultimoDiaDe('2026-12')).toBe('2026-12-31')
    expect(ultimoDiaDe('2028-02')).toBe('2028-02-29')
    expect(ultimoDiaDe('2027-02')).toBe('2027-02-28')
  })
})

describe('espacios', () => {
  it('el espacio personal conserva los nombres de siempre', () => {
    expect(nombreRemoto('personal', 'movimientos')).toBe('movimientos')
  })

  it('el de la empresa lleva prefijo y no choca con el personal', () => {
    expect(nombreRemoto('empresa', 'movimientos')).toBe('empresa:movimientos')
    expect(nombreRemoto('empresa', 'cuentas')).not.toBe(nombreRemoto('personal', 'cuentas'))
  })

  it('solo reconoce los espacios que existen', () => {
    expect(esEspacio('empresa')).toBe(true)
    expect(esEspacio('personal')).toBe(true)
    expect(esEspacio('otro')).toBe(false)
    expect(esEspacio(null)).toBe(false)
  })
})
