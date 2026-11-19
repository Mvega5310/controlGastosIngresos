import { describe, expect, it } from 'vitest'
import { aCentavos } from './dinero'
import {
  NO_FINANCIABLE,
  RUBROS_TRAMITE,
  Tramite,
  diasParaListo,
  esFinanciable,
  fechaEstimada,
  gastoDeTramite,
  origenDeTramite,
  resumenTramites
} from './tramites'
import { RUBROS } from '../datos/empresa'

const [PERMISOS, TASAS] = RUBROS_TRAMITE

const tramite = (
  nombre: string,
  rubro: string,
  pesos: number,
  dias: number,
  extra: Partial<Tramite> = {}
): Tramite => ({
  id: nombre,
  nombre,
  rubro,
  costo: aCentavos(pesos),
  dias,
  estado: 'Por iniciar',
  ...extra
})

/**
 * Los trámites de la sección 7 del formato del SENA (filas 207 a 212). El
 * formato suma 3.000.000 de permisos y marca la constitución legal como un rubro
 * no financiable, que asume el emprendedor.
 */
const delFormato: Tramite[] = [
  tramite('Constitución legal', NO_FINANCIABLE, 0, 14),
  tramite('Facturación electrónica', PERMISOS, 3000000, 14),
  tramite('Registro de bases de datos', PERMISOS, 0, 7),
  tramite('Política de datos', PERMISOS, 0, 14),
  tramite('Pasarela de pagos', PERMISOS, 0, 14),
  tramite('Registro de marca', TASAS, 0, 240)
]

describe('los rubros de trámite', () => {
  it('los financiables existen entre los rubros del fondo y el otro no', () => {
    expect(RUBROS).toContain(PERMISOS)
    expect(RUBROS).toContain(TASAS)
    expect(RUBROS).not.toContain(NO_FINANCIABLE)
  })

  it('distingue lo financiable de lo que asume el emprendedor', () => {
    expect(esFinanciable({ rubro: PERMISOS })).toBe(true)
    expect(esFinanciable({ rubro: NO_FINANCIABLE })).toBe(false)
  })
})

describe('los trámites del formato', () => {
  const r = resumenTramites(delFormato, '2026-11-19')

  it('suman 3.000.000 financiables, como el formato', () => {
    expect(r.cuantos).toBe(6)
    expect(r.costoFinanciable).toBe(aCentavos(3000000))
    expect(r.costoNoFinanciable).toBe(0)
  })

  it('el que más tarda es el registro de marca: 240 días', () => {
    expect(r.diasMayor).toBe(240)
    expect(r.porIniciar).toBe(6)
  })

  it('el costo de la constitución legal no entra a lo financiable', () => {
    const con = resumenTramites([tramite('Constitución', NO_FINANCIABLE, 1500000, 14)], '2026-11-19')
    expect(con.costoNoFinanciable).toBe(aCentavos(1500000))
    expect(con.costoFinanciable).toBe(0)
  })
})

describe('las fechas', () => {
  it('suma los días a la fecha de inicio', () => {
    expect(fechaEstimada('2026-01-01', 31)).toBe('2026-02-01')
    expect(fechaEstimada('2026-11-19', 14)).toBe('2026-12-03')
    expect(fechaEstimada('2026-11-19', 240)).toBe('2027-07-17')
  })

  it('cruza fin de mes, de año y año bisiesto', () => {
    expect(fechaEstimada('2026-12-30', 3)).toBe('2027-01-02')
    expect(fechaEstimada('2028-02-28', 2)).toBe('2028-03-01')
    expect(fechaEstimada('2027-02-28', 1)).toBe('2027-03-01')
  })

  it('sin fecha de inicio, o con una mal escrita, no hay fecha estimada', () => {
    expect(fechaEstimada(undefined, 10)).toBeNull()
    expect(fechaEstimada('', 10)).toBeNull()
    expect(fechaEstimada('19/11/2026', 10)).toBeNull()
    expect(fechaEstimada('2026-13-45', 10)).toBeNull()
  })

  it('cuenta los días que faltan, y es negativo si se pasó', () => {
    const t = tramite('x', PERMISOS, 0, 14, { estado: 'En trámite', inicio: '2026-11-19' })
    expect(diasParaListo(t, '2026-11-19')).toBe(14)
    expect(diasParaListo(t, '2026-12-03')).toBe(0)
    expect(diasParaListo(t, '2026-12-10')).toBe(-7)
  })

  it('un trámite listo, o sin inicio, no tiene días pendientes', () => {
    expect(
      diasParaListo(tramite('x', PERMISOS, 0, 14, { estado: 'Listo', inicio: '2026-01-01' }), '2026-11-19')
    ).toBeNull()
    expect(diasParaListo(tramite('x', PERMISOS, 0, 14), '2026-11-19')).toBeNull()
  })

  it('cuenta los atrasados: pasaron su fecha y no están listos', () => {
    const r = resumenTramites(
      [
        tramite('a', PERMISOS, 0, 10, { estado: 'En trámite', inicio: '2026-10-01' }),
        tramite('b', PERMISOS, 0, 10, { estado: 'Listo', inicio: '2026-10-01' }),
        tramite('c', PERMISOS, 0, 90, { estado: 'En trámite', inicio: '2026-10-01' })
      ],
      '2026-11-19'
    )
    expect(r.atrasados).toBe(1)
    expect(r.listos).toBe(1)
    expect(r.enTramite).toBe(2)
  })
})

describe('registrar un trámite como gasto', () => {
  it('un trámite financiable se gasta en su rubro, con su origen', () => {
    const t = delFormato[1]
    const g = gastoDeTramite(t, {
      id: 'm1',
      cuenta: 'Cuenta',
      fecha: '2026-12-01',
      valor: aCentavos(3000000)
    })
    expect(g).toMatchObject({ type: 'Gasto', category: PERMISOS, origen: origenDeTramite(t.id) })
  })

  it('la constitución legal no cae en un rubro del fondo', () => {
    const g = gastoDeTramite(delFormato[0], { id: 'm1', cuenta: 'Cuenta', fecha: '2026-12-01', valor: 1 })
    expect(g.category).toBe('Otros')
  })
})
