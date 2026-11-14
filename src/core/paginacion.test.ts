import { describe, expect, it } from 'vitest'
import { POR_PAGINA, paginaDe, paginaValida, rangoVisible, totalPaginas } from './paginacion'

const lista = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

describe('cuántas páginas hay', () => {
  it('una lista vacía sigue teniendo una página', () => {
    // Si devolviera cero, los controles dirían "página 1 de 0".
    expect(totalPaginas(0)).toBe(1)
  })

  it('justo diez caben en una', () => {
    expect(totalPaginas(10)).toBe(1)
  })

  it('once ya necesitan dos', () => {
    expect(totalPaginas(11)).toBe(2)
  })

  it('treinta y siete caben en cuatro', () => {
    expect(totalPaginas(37)).toBe(4)
  })
})

describe('encerrar el número de página', () => {
  it('no deja bajar de la primera', () => {
    expect(paginaValida(0, 50)).toBe(1)
    expect(paginaValida(-7, 50)).toBe(1)
  })

  it('no deja pasar de la última', () => {
    expect(paginaValida(99, 37)).toBe(4)
  })

  it('al filtrar, la página en la que estabas deja de existir y se vuelve a la última', () => {
    // Estando en la cuatro y dejando dos resultados, sin esto la tabla saldría
    // vacía y parecería que la búsqueda no encontró nada.
    expect(paginaValida(4, 2)).toBe(1)
  })

  it('aguanta una entrada que no es un número', () => {
    expect(paginaValida(NaN, 50)).toBe(1)
    expect(paginaValida(2.7, 50)).toBe(2)
  })
})

describe('el trozo que se enseña', () => {
  it('la primera página trae las diez primeras', () => {
    expect(paginaDe(lista(37), 1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('la última trae solo lo que queda', () => {
    expect(paginaDe(lista(37), 4)).toEqual([31, 32, 33, 34, 35, 36, 37])
  })

  it('pedir más allá del final devuelve la última, no una vacía', () => {
    expect(paginaDe(lista(37), 9)).toEqual([31, 32, 33, 34, 35, 36, 37])
  })

  it('una lista vacía no rompe', () => {
    expect(paginaDe([], 1)).toEqual([])
  })

  it('con diez o menos no se pierde nada', () => {
    expect(paginaDe(lista(POR_PAGINA), 1)).toHaveLength(POR_PAGINA)
  })

  it('entre todas las páginas está la lista entera, sin repetir', () => {
    const todo = lista(37)
    const juntas = [1, 2, 3, 4].flatMap(p => paginaDe(todo, p))
    expect(juntas).toEqual(todo)
  })
})

describe('el rango que se escribe', () => {
  it('cuenta desde uno, no desde cero', () => {
    expect(rangoVisible(1, 37)).toEqual({ desde: 1, hasta: 10 })
  })

  it('la segunda empieza donde acaba la primera', () => {
    expect(rangoVisible(2, 37)).toEqual({ desde: 11, hasta: 20 })
  })

  it('la última no promete más de lo que hay', () => {
    expect(rangoVisible(4, 37)).toEqual({ desde: 31, hasta: 37 })
  })

  it('sin nada que enseñar no inventa un rango', () => {
    expect(rangoVisible(1, 0)).toEqual({ desde: 0, hasta: 0 })
  })
})
