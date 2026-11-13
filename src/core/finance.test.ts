import { describe, expect, it } from 'vitest'
import {
  periodOf,
  periodKey,
  shiftPeriod,
  periodLabel,
  inPeriod,
  totalsFor,
  accountBalance,
  totalBalance,
  change,
  dailySeries,
  byDateDesc,
  monthGrid,
  todayISO,
  longDate
} from './finance'
import { Account, Movement } from '../data/mock'

const mov = (p: Partial<Movement>): Movement => ({
  id: 'x',
  title: 't',
  category: 'Otros',
  account: 'Cuenta principal',
  date: '2026-11-10',
  amount: 1000,
  type: 'Gasto',
  ...p
})

const NOV = { year: 2026, month: 11 }
const OCT = { year: 2026, month: 10 }

describe('periodos', () => {
  it('construye la clave con el mes a dos cifras', () => {
    expect(periodKey({ year: 2026, month: 3 })).toBe('2026-03')
    expect(periodKey(NOV)).toBe('2026-11')
  })

  it('cruza el fin de año en los dos sentidos', () => {
    expect(shiftPeriod({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftPeriod({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
    expect(shiftPeriod(NOV, -14)).toEqual({ year: 2025, month: 9 })
  })

  it('deshace un desplazamiento con el contrario', () => {
    for (const n of [-25, -7, -1, 0, 1, 7, 25]) {
      expect(shiftPeriod(shiftPeriod(NOV, n), -n)).toEqual(NOV)
    }
  })

  it('toma el periodo de una fecha y lo rotula', () => {
    expect(periodOf(new Date(2026, 10, 12))).toEqual(NOV)
    expect(periodLabel(NOV)).toBe('Noviembre de 2026')
  })

  it('decide la pertenencia por los 7 primeros caracteres de la fecha', () => {
    expect(inPeriod(mov({ date: '2026-11-01' }), NOV)).toBe(true)
    expect(inPeriod(mov({ date: '2026-11-30' }), NOV)).toBe(true)
    expect(inPeriod(mov({ date: '2026-10-31' }), NOV)).toBe(false)
    expect(inPeriod(mov({ date: '2027-11-10' }), NOV)).toBe(false)
  })
})

describe('totalsFor', () => {
  const movs = [
    mov({ id: '1', date: '2026-11-01', amount: 4200000, type: 'Ingreso' }),
    mov({ id: '2', date: '2026-11-03', amount: 285000, type: 'Gasto' }),
    mov({ id: '3', date: '2026-10-20', amount: 999999, type: 'Gasto' }),
    mov({ id: '4', date: '2026-11-05', amount: 500000, type: 'Transferencia' })
  ]

  it('suma solo lo del periodo pedido', () => {
    expect(totalsFor(movs, NOV)).toEqual({ income: 4200000, expense: 285000, net: 3915000 })
    expect(totalsFor(movs, OCT)).toEqual({ income: 0, expense: 999999, net: -999999 })
  })

  it('deja fuera las transferencias: no son ingreso ni gasto', () => {
    const conTransferencia = totalsFor(movs, NOV)
    const sinTransferencia = totalsFor(
      movs.filter(m => m.type !== 'Transferencia'),
      NOV
    )
    expect(conTransferencia).toEqual(sinTransferencia)
  })

  it('devuelve ceros en un periodo sin movimientos', () => {
    expect(totalsFor(movs, { year: 2024, month: 5 })).toEqual({ income: 0, expense: 0, net: 0 })
  })

  it('admite un neto negativo en vez de recortarlo a cero', () => {
    expect(totalsFor([mov({ amount: 50000, type: 'Gasto' })], NOV).net).toBe(-50000)
  })
})

describe('saldos', () => {
  const cuentas: Account[] = [
    { name: 'Cuenta principal', bank: 'B', kind: 'Ahorros', color: 'yellow', openingBalance: 6850000 },
    { name: 'Tarjeta crédito', bank: 'V', kind: 'Crédito', color: 'blue', openingBalance: -840000 }
  ]
  const movs = [
    mov({ id: '1', account: 'Cuenta principal', amount: 4200000, type: 'Ingreso' }),
    mov({ id: '2', account: 'Cuenta principal', amount: 285000, type: 'Gasto' }),
    mov({ id: '3', account: 'Tarjeta crédito', amount: 32900, type: 'Gasto' })
  ]

  it('parte del saldo inicial y aplica solo lo de esa cuenta', () => {
    expect(accountBalance(cuentas[0], movs)).toBe(6850000 + 4200000 - 285000)
    expect(accountBalance(cuentas[1], movs)).toBe(-840000 - 32900)
  })

  it('cuenta todo el historial, no solo un periodo', () => {
    const viejo = mov({
      id: '9',
      account: 'Cuenta principal',
      amount: 1000,
      type: 'Ingreso',
      date: '2020-01-01'
    })
    expect(accountBalance(cuentas[0], [...movs, viejo])).toBe(accountBalance(cuentas[0], movs) + 1000)
  })

  it('el balance total es exactamente la suma de los saldos', () => {
    expect(totalBalance(cuentas, movs)).toBe(
      accountBalance(cuentas[0], movs) + accountBalance(cuentas[1], movs)
    )
  })

  it('un movimiento de una cuenta desconocida no altera ningún saldo', () => {
    const huerfano = mov({ id: '8', account: 'Cuenta que no existe', amount: 777, type: 'Gasto' })
    expect(totalBalance(cuentas, [...movs, huerfano])).toBe(totalBalance(cuentas, movs))
  })
})

describe('change', () => {
  it('sin referencia previa no inventa un porcentaje', () => {
    expect(change(5000, 0)).toEqual({ text: 'sin datos', tone: 'neutral' })
    expect(change(0, 0)).toEqual({ text: 'sin cambios', tone: 'neutral' })
  })

  it('calcula el porcentaje sobre una base positiva', () => {
    expect(change(150, 100).text).toBe('↑ 50,0%')
    expect(change(80, 100).text).toBe('↓ 20,0%')
  })

  it('subir es bueno para los ingresos y malo para los gastos', () => {
    expect(change(150, 100, true).tone).toBe('positive')
    expect(change(150, 100, false).tone).toBe('negative')
    expect(change(80, 100, false).tone).toBe('positive')
  })

  it('sobre una base negativa da la diferencia en dinero, no un porcentaje absurdo', () => {
    const r = change(4447100, -100000, true)
    expect(r.text).not.toContain('%')
    expect(r.text.startsWith('↑')).toBe(true)
    expect(r.tone).toBe('positive')
  })

  it('no mueve nada cuando los dos valores coinciden', () => {
    expect(change(1234, 1234).text).toBe('sin cambios')
  })
})

describe('dailySeries', () => {
  it('da una celda por día del mes y acumula sin bajar nunca', () => {
    const serie = dailySeries(
      [
        mov({ id: '1', date: '2026-11-03', amount: 100, type: 'Ingreso' }),
        mov({ id: '2', date: '2026-11-10', amount: 40, type: 'Gasto' })
      ],
      NOV
    )
    expect(serie).toHaveLength(30)
    expect(serie[0]).toMatchObject({ income: 0, expense: 0 })
    expect(serie[2].income).toBe(100)
    expect(serie[29]).toMatchObject({ income: 100, expense: 40 })
    for (let i = 1; i < serie.length; i++) {
      expect(serie[i].income).toBeGreaterThanOrEqual(serie[i - 1].income)
      expect(serie[i].expense).toBeGreaterThanOrEqual(serie[i - 1].expense)
    }
  })

  it('usa la longitud real del mes, también en febrero bisiesto', () => {
    expect(dailySeries([], { year: 2028, month: 2 })).toHaveLength(29)
    expect(dailySeries([], { year: 2026, month: 2 })).toHaveLength(28)
  })
})

describe('monthGrid', () => {
  it('empieza en lunes y cubre el mes entero', () => {
    const celdas = monthGrid(NOV)
    expect(celdas.length % 7).toBe(0)
    const delMes = celdas.filter(c => c.inMonth)
    expect(delMes).toHaveLength(30)
    expect(delMes[0].date).toBe('2026-11-01')
    expect(delMes[29].date).toBe('2026-11-30')
  })

  it('usa seis semanas solo cuando el mes no cabe en cinco', () => {
    // Noviembre de 2026 empieza en domingo: necesita seis filas.
    expect(monthGrid(NOV)).toHaveLength(42)
    // Febrero de 2027 empieza en lunes y tiene 28 días: cabe justo en cuatro.
    expect(monthGrid({ year: 2027, month: 2 })).toHaveLength(35)
  })

  it('no repite ni se salta ningún día', () => {
    const fechas = monthGrid({ year: 2027, month: 3 }).map(c => c.date)
    expect(new Set(fechas).size).toBe(fechas.length)
  })
})

describe('orden y utilidades', () => {
  it('ordena de más reciente a más antiguo', () => {
    const lista = [
      mov({ id: 'a', date: '2026-11-01' }),
      mov({ id: 'b', date: '2026-11-20' }),
      mov({ id: 'c', date: '2026-10-05' })
    ]
    expect([...lista].sort(byDateDesc).map(m => m.id)).toEqual(['b', 'a', 'c'])
  })

  it('todayISO devuelve la fecha local en formato AAAA-MM-DD', () => {
    expect(todayISO(new Date(2026, 10, 2))).toBe('2026-11-02')
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('longDate escribe el día de la semana en mayúsculas', () => {
    expect(longDate(new Date(2026, 10, 12))).toContain('12')
    expect(longDate(new Date(2026, 10, 12))).toBe(longDate(new Date(2026, 10, 12)).toUpperCase())
  })
})
