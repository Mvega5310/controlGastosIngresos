import { describe, expect, it } from 'vitest'
import { aCentavos, aPesos, money, CENTAVOS } from './dinero'

describe('conversión', () => {
  it('pasa de pesos a centavos y vuelve sin perder nada', () => {
    for (const pesos of [0, 1, 999, 32900, 285000, 4200000]) {
      expect(aPesos(aCentavos(pesos))).toBe(pesos)
    }
  })

  it('guarda siempre enteros, también con decimales de entrada', () => {
    expect(aCentavos(1234.56)).toBe(123456)
    expect(Number.isInteger(aCentavos(0.1))).toBe(true)
    expect(Number.isInteger(aCentavos(99.999))).toBe(true)
  })

  it('tolera entradas que no son números', () => {
    expect(aCentavos(NaN)).toBe(0)
    expect(aCentavos(undefined as unknown as number)).toBe(0)
    expect(aPesos(undefined as unknown as number)).toBe(0)
  })

  it('admite importes negativos, como un saldo de tarjeta', () => {
    expect(aCentavos(-840000)).toBe(-84000000)
    expect(aPesos(-84000000)).toBe(-840000)
  })
})

describe('por qué enteros y no coma flotante', () => {
  it('sumar céntimos en coma flotante se desvía; en enteros no', () => {
    // El caso clásico: 0,1 + 0,2 !== 0,3.
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(aCentavos(0.1) + aCentavos(0.2)).toBe(aCentavos(0.3))
  })

  it('cien sumas seguidas dan el total exacto', () => {
    let enteros = 0
    let flotantes = 0
    for (let i = 0; i < 100; i++) {
      enteros += aCentavos(0.07)
      flotantes += 0.07
    }
    expect(enteros).toBe(700)
    expect(aPesos(enteros)).toBe(7)
    expect(flotantes).not.toBe(7)
  })
})

describe('formato', () => {
  it('muestra pesos a partir de centavos, sin decimales', () => {
    expect(money(aCentavos(285000))).toContain('285.000')
    expect(money(aCentavos(285000))).not.toContain(',')
    expect(money(0)).toContain('0')
  })

  it('un importe negativo se muestra como negativo', () => {
    expect(money(aCentavos(-840000))).toContain('-')
  })

  it('CENTAVOS es el factor que usan las dos conversiones', () => {
    expect(aCentavos(1)).toBe(CENTAVOS)
  })
})
