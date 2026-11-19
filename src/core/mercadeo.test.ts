import { describe, expect, it } from 'vitest'
import { aCentavos } from './dinero'
import { AccionMercadeo, RUBRO_MERCADEO, gastoDeAccion, origenDeAccion, resumenMercadeo } from './mercadeo'
import { RUBROS } from '../datos/empresa'

const accion = (
  nombre: string,
  tipo: AccionMercadeo['tipo'],
  pesos: number,
  extra: Partial<AccionMercadeo> = {}
): AccionMercadeo => ({
  id: nombre,
  nombre,
  tipo,
  costo: aCentavos(pesos),
  estado: 'Planeada',
  ...extra
})

/**
 * Las acciones de la sección 8 del formato del SENA (filas 223 a 239). El
 * formato cuenta 7 «eventos de mercadeo» y 56.200.000 de publicidad en el año 1.
 */
const delFormato: AccionMercadeo[] = [
  accion('Pauta digital', 'Estrategia de comunicación', 31000000),
  accion('Contenido y producción', 'Estrategia de comunicación', 7000000),
  accion('Incentivos del piloto', 'Estrategia de comunicación', 14200000),
  accion('Activación local', 'Estrategia de promoción', 4000000),
  accion('Demostración con alianzas', 'Estrategia de promoción', 0),
  accion('Referidos', 'Estrategia de promoción', 0),
  accion('Alianza con ferreterías', 'Canal de distribución', 0)
]

describe('el rubro de mercadeo', () => {
  it('existe entre los rubros del fondo', () => {
    expect(RUBROS).toContain(RUBRO_MERCADEO)
  })
})

describe('las acciones del formato', () => {
  const r = resumenMercadeo(delFormato)

  it('son 7 eventos de mercadeo, como cuenta el formato', () => {
    expect(r.eventos).toBe(7)
    expect(r.planeadas).toBe(7)
    expect(r.realizadas).toBe(0)
  })

  it('cuestan 56.200.000 en el año 1', () => {
    expect(r.costo).toBe(aCentavos(56200000))
    expect(r.costoRealizado).toBe(0)
  })
})

describe('el avance', () => {
  it('cuenta realizadas y en curso aparte de las planeadas', () => {
    const r = resumenMercadeo([
      accion('a', 'Estrategia de comunicación', 100, { estado: 'Realizada', evidencia: 'enlace' }),
      accion('b', 'Estrategia de comunicación', 200, { estado: 'En curso' }),
      accion('c', 'Estrategia de promoción', 300)
    ])
    expect(r).toMatchObject({ eventos: 3, realizadas: 1, enCurso: 1, planeadas: 1 })
    expect(r.costoRealizado).toBe(aCentavos(100))
    expect(r.costo).toBe(aCentavos(600))
  })

  it('avisa de las realizadas sin evidencia, que el fondo pedirá', () => {
    const r = resumenMercadeo([
      accion('a', 'Estrategia de comunicación', 1, { estado: 'Realizada' }),
      accion('b', 'Estrategia de comunicación', 1, { estado: 'Realizada', evidencia: '  ' }),
      accion('c', 'Estrategia de comunicación', 1, { estado: 'Realizada', evidencia: 'foto.jpg' }),
      accion('d', 'Estrategia de comunicación', 1)
    ])
    expect(r.sinEvidencia).toBe(2)
  })

  it('sin acciones, todo en cero', () => {
    expect(resumenMercadeo([])).toEqual({
      eventos: 0,
      realizadas: 0,
      enCurso: 0,
      planeadas: 0,
      costo: 0,
      costoRealizado: 0,
      sinEvidencia: 0
    })
  })
})

describe('registrar una acción como gasto', () => {
  it('crea un gasto en publicidad y comunicación, con su origen', () => {
    const a = delFormato[0]
    const g = gastoDeAccion(a, {
      id: 'm1',
      cuenta: 'Cuenta',
      fecha: '2026-12-01',
      valor: aCentavos(31000000)
    })
    expect(g).toMatchObject({
      type: 'Gasto',
      category: RUBRO_MERCADEO,
      amount: aCentavos(31000000),
      origen: origenDeAccion(a.id)
    })
  })
})
