import { beforeEach, describe, expect, it } from 'vitest'
import { migrar } from './migracion'

/** localStorage de mentira, porque las pruebas corren fuera del navegador. */
const almacen = (() => {
  let datos: Record<string, string> = {}
  return {
    getItem: (k: string) => (k in datos ? datos[k] : null),
    setItem: (k: string, v: string) => {
      datos[k] = String(v)
    },
    removeItem: (k: string) => {
      delete datos[k]
    },
    clear: () => {
      datos = {}
    },
    todo: () => datos
  }
})()

beforeEach(() => {
  almacen.clear()
  ;(globalThis as unknown as { localStorage: unknown }).localStorage = almacen
})

const leer = (clave: string) => JSON.parse(almacen.getItem(clave) || '[]')

describe('de pesos a centavos', () => {
  it('multiplica por cien los importes guardados en la versión anterior', () => {
    almacen.setItem(
      'fc-movements',
      JSON.stringify([
        { id: '1', title: 'Mercado', amount: 285000, type: 'Gasto' },
        { id: '2', title: 'Salario', amount: 4200000, type: 'Ingreso' }
      ])
    )
    migrar()
    expect(leer('fc-movements').map((m: { amount: number }) => m.amount)).toEqual([28500000, 420000000])
  })

  it('migra todos los campos de dinero de cada colección', () => {
    almacen.setItem(
      'fc-deudas',
      JSON.stringify([{ id: 'd', montoTotal: 2400000, pagado: 980000, cuotaMensual: 420000, diaPago: 18 }])
    )
    migrar()
    const [deuda] = leer('fc-deudas')
    expect(deuda).toMatchObject({ montoTotal: 240000000, pagado: 98000000, cuotaMensual: 42000000 })
  })

  it('no toca los campos que no son dinero', () => {
    almacen.setItem(
      'fc-suscripciones',
      JSON.stringify([{ id: 's', nombre: 'Netflix', monto: 32900, diaCobro: 22, activa: true }])
    )
    migrar()
    const [sub] = leer('fc-suscripciones')
    expect(sub.monto).toBe(3290000)
    expect(sub.diaCobro).toBe(22)
    expect(sub.nombre).toBe('Netflix')
    expect(sub.activa).toBe(true)
  })

  it('deja constancia de la versión aplicada', () => {
    migrar()
    expect(almacen.getItem('fc-version')).toBe('2')
  })
})

describe('no se repite', () => {
  it('ejecutarla dos veces no vuelve a multiplicar', () => {
    almacen.setItem('fc-movements', JSON.stringify([{ id: '1', amount: 285000 }]))
    migrar()
    migrar()
    migrar()
    expect(leer('fc-movements')[0].amount).toBe(28500000)
  })

  it('un navegador ya en la versión actual no se toca', () => {
    almacen.setItem('fc-version', '2')
    almacen.setItem('fc-movements', JSON.stringify([{ id: '1', amount: 28500000 }]))
    migrar()
    expect(leer('fc-movements')[0].amount).toBe(28500000)
  })
})

describe('casos raros', () => {
  it('un navegador sin datos queda marcado sin crear nada', () => {
    migrar()
    expect(almacen.getItem('fc-version')).toBe('2')
    expect(almacen.getItem('fc-movements')).toBeNull()
  })

  it('un contenido corrupto no rompe el arranque ni se pierde', () => {
    almacen.setItem('fc-movements', 'esto no es JSON')
    expect(() => migrar()).not.toThrow()
    expect(almacen.getItem('fc-movements')).toBe('esto no es JSON')
  })

  it('un importe que no es número se deja como está', () => {
    almacen.setItem('fc-metas', JSON.stringify([{ id: 'm', objetivo: 'mucho', ahorrado: 1000 }]))
    migrar()
    const [meta] = leer('fc-metas')
    expect(meta.objetivo).toBe('mucho')
    expect(meta.ahorrado).toBe(100000)
  })

  it('sin almacenamiento disponible no lanza', () => {
    ;(globalThis as unknown as { localStorage: unknown }).localStorage = {
      getItem() {
        throw new Error('bloqueado')
      },
      setItem() {
        throw new Error('bloqueado')
      }
    }
    expect(() => migrar()).not.toThrow()
  })
})
