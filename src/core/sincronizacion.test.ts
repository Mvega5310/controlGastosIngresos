import { describe, expect, it } from 'vitest'
import {
  sellar, sellarBorrado, estaBorrado, vivos, fusionar,
  cambiosDesde, purgar, retroceder, Registro
} from './sincronizacion'

type Fila = Registro & { nombre: string }

const fila = (id: string, nombre: string, actualizadoEn: string, eliminadoEn?: string): Fila =>
  ({ id, nombre, actualizadoEn, ...(eliminadoEn ? { eliminadoEn } : {}) })

const T1 = '2026-11-12T10:00:00.000Z'
const T2 = '2026-11-12T11:00:00.000Z'
const T3 = '2026-11-12T12:00:00.000Z'

describe('sellado', () => {
  it('pone la marca de tiempo sin tocar el resto', () => {
    const r = sellar({ id: 'a', nombre: 'Mercado' }, T1)
    expect(r).toEqual({ id: 'a', nombre: 'Mercado', actualizadoEn: T1 })
  })

  it('renueva la marca al volver a sellar', () => {
    expect(sellar(sellar({ id: 'a' }, T1), T2).actualizadoEn).toBe(T2)
  })

  it('un borrado se marca, no se hace desaparecer', () => {
    const r = sellarBorrado(fila('a', 'x', T1), T2)
    expect(r.eliminadoEn).toBe(T2)
    expect(r.actualizadoEn).toBe(T2)
    expect(r.nombre).toBe('x')
    expect(estaBorrado(r)).toBe(true)
  })

  it('vivos deja fuera lo borrado y conserva el orden', () => {
    const lista = [fila('a', 'A', T1), fila('b', 'B', T1, T2), fila('c', 'C', T1)]
    expect(vivos(lista).map(r => r.id)).toEqual(['a', 'c'])
  })
})

describe('fusionar', () => {
  it('se queda con la versión escrita más tarde', () => {
    const local = [fila('a', 'viejo', T1)]
    const remoto = [fila('a', 'nuevo', T2)]
    expect(fusionar(local, remoto)[0].nombre).toBe('nuevo')
    expect(fusionar(remoto, local)[0].nombre).toBe('nuevo')
  })

  it('conserva lo que solo existe en un lado', () => {
    const r = fusionar([fila('a', 'A', T1)], [fila('b', 'B', T1)])
    expect(r.map(x => x.id).sort()).toEqual(['a', 'b'])
  })

  it('ante un empate exacto gana el remoto, para que todos converjan', () => {
    const r = fusionar([fila('a', 'local', T1)], [fila('a', 'remoto', T1)])
    expect(r[0].nombre).toBe('remoto')
  })

  it('propaga un borrado remoto más reciente que la edición local', () => {
    const r = fusionar([fila('a', 'editado aquí', T1)], [fila('a', 'A', T2, T2)])
    expect(estaBorrado(r[0])).toBe(true)
  })

  it('una edición posterior al borrado resucita el registro', () => {
    const r = fusionar([fila('a', 'reescrito', T3)], [fila('a', 'A', T2, T2)])
    expect(estaBorrado(r[0])).toBe(false)
    expect(r[0].nombre).toBe('reescrito')
  })

  it('un registro sin marca pierde contra cualquiera que la tenga', () => {
    const sinMarca = { id: 'a', nombre: 'de una versión vieja' } as Fila
    expect(fusionar([sinMarca], [fila('a', 'con marca', T1)])[0].nombre).toBe('con marca')
    expect(fusionar([fila('a', 'con marca', T1)], [sinMarca])[0].nombre).toBe('con marca')
  })

  it('es idempotente: fusionar dos veces da lo mismo', () => {
    const local = [fila('a', 'A', T1), fila('b', 'B', T2)]
    const remoto = [fila('b', 'B2', T3), fila('c', 'C', T1)]
    const una = fusionar(local, remoto)
    expect(fusionar(una, remoto)).toEqual(una)
  })

  it('los dos dispositivos llegan al mismo resultado', () => {
    const deA = [fila('a', 'A', T1), fila('b', 'B-movil', T3)]
    const deB = [fila('a', 'A2', T2), fila('b', 'B-pc', T1)]
    const enA = fusionar(deA, deB).sort((x, y) => x.id.localeCompare(y.id))
    const enB = fusionar(deB, deA).sort((x, y) => x.id.localeCompare(y.id))
    // Cada uno fusiona poniendo lo del otro como remoto; deben coincidir.
    expect(enA.map(r => r.nombre)).toEqual(['A2', 'B-movil'])
    expect(enB.map(r => r.nombre)).toEqual(['A2', 'B-movil'])
  })

  it('sin nada que fusionar devuelve lo que había', () => {
    expect(fusionar([], [])).toEqual([])
    expect(fusionar([fila('a', 'A', T1)], [])).toHaveLength(1)
  })
})

describe('cambiosDesde', () => {
  it('solo lo escrito después del corte', () => {
    const lista = [fila('a', 'A', T1), fila('b', 'B', T2), fila('c', 'C', T3)]
    expect(cambiosDesde(lista, T1).map(r => r.id)).toEqual(['b', 'c'])
  })

  it('incluye los borrados, que también hay que enviar', () => {
    const lista = [fila('a', 'A', T2, T2)]
    expect(cambiosDesde(lista, T1)).toHaveLength(1)
  })

  it('sin corte previo manda todo', () => {
    const lista = [fila('a', 'A', T1), fila('b', 'B', T2)]
    expect(cambiosDesde(lista, '')).toHaveLength(2)
  })
})

describe('purgar', () => {
  it('quita las marcas de borrado antiguas', () => {
    const lista = [fila('a', 'A', T1), fila('b', 'B', T1, T1), fila('c', 'C', T3, T3)]
    expect(purgar(lista, T2).map(r => r.id)).toEqual(['a', 'c'])
  })

  it('nunca toca un registro vivo, por viejo que sea', () => {
    const lista = [fila('a', 'A', '2020-01-01T00:00:00.000Z')]
    expect(purgar(lista, T3)).toHaveLength(1)
  })

  it('retroceder calcula el corte en días', () => {
    expect(retroceder(30, '2026-11-12T00:00:00.000Z')).toBe('2026-10-13T00:00:00.000Z')
    expect(retroceder(1, '2026-01-01T00:00:00.000Z')).toBe('2025-12-31T00:00:00.000Z')
  })
})
