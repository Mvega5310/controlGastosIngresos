import { describe, expect, it } from 'vitest'
import { crearApuntes, quitarMovimiento, apuntesVisibles, accountBalance, totalBalance, totalsFor } from './finance'
import { aCentavos } from './dinero'
import { Account, Movement } from '../data/mock'

const cuentas: Account[] = [
  { name: 'Cuenta principal', bank: 'B', kind: 'Ahorros', color: 'yellow', openingBalance: aCentavos(1000000) },
  { name: 'Ahorros', bank: 'N', kind: 'Ahorros', color: 'purple', openingBalance: aCentavos(500000) }
]

const alta = (extra: Partial<Movement> & { cuentaDestino?: string } = {}) => crearApuntes({
  title: 'Traslado', category: 'Otros', account: 'Cuenta principal',
  date: '2026-11-12', amount: aCentavos(200000), type: 'Transferencia',
  cuentaDestino: 'Ahorros', ...extra
})

describe('crearApuntes', () => {
  it('un ingreso o un gasto es un solo apunte', () => {
    const uno = crearApuntes({
      title: 'Salario', category: 'Trabajo', account: 'Cuenta principal',
      date: '2026-11-01', amount: aCentavos(4200000), type: 'Ingreso'
    })
    expect(uno).toHaveLength(1)
    expect(uno[0].transferId).toBeUndefined()
    expect(uno[0].id).toBeTruthy()
  })

  it('una transferencia son dos apuntes atados por el mismo identificador', () => {
    const apuntes = alta()
    expect(apuntes).toHaveLength(2)
    expect(apuntes[0].transferId).toBe(apuntes[1].transferId)
    expect(apuntes[0].id).not.toBe(apuntes[1].id)
  })

  it('la salida sale del origen y la entrada entra en el destino', () => {
    const [salida, entrada] = alta()
    expect(salida).toMatchObject({ flujo: 'sale', account: 'Cuenta principal', contraparte: 'Ahorros' })
    expect(entrada).toMatchObject({ flujo: 'entra', account: 'Ahorros', contraparte: 'Cuenta principal' })
    expect(salida.amount).toBe(entrada.amount)
  })

  it('sin destino, o hacia la misma cuenta, no inventa un traslado', () => {
    expect(alta({ cuentaDestino: '' })).toHaveLength(1)
    expect(alta({ cuentaDestino: '   ' })).toHaveLength(1)
    expect(alta({ cuentaDestino: 'Cuenta principal' })).toHaveLength(1)
    expect(alta({ cuentaDestino: 'Cuenta principal' })[0].flujo).toBeUndefined()
  })
})

describe('efecto sobre los saldos', () => {
  const movimientos = alta()

  it('baja el saldo del origen y sube el del destino en el mismo importe', () => {
    expect(accountBalance(cuentas[0], movimientos)).toBe(aCentavos(1000000) - aCentavos(200000))
    expect(accountBalance(cuentas[1], movimientos)).toBe(aCentavos(500000) + aCentavos(200000))
  })

  it('el balance total no se mueve: el dinero cambia de sitio, no aparece ni desaparece', () => {
    expect(totalBalance(cuentas, movimientos)).toBe(totalBalance(cuentas, []))
  })

  it('no cuenta como ingreso ni como gasto del periodo', () => {
    expect(totalsFor(movimientos, { year: 2026, month: 11 })).toEqual({ income: 0, expense: 0, net: 0 })
  })

  it('un apunte antiguo de transferencia, sin flujo, no altera ningún saldo', () => {
    const viejo: Movement = {
      id: 'legado', title: 'Antiguo', category: 'Otros', account: 'Cuenta principal',
      date: '2026-11-01', amount: aCentavos(999999), type: 'Transferencia'
    }
    expect(accountBalance(cuentas[0], [viejo])).toBe(cuentas[0].openingBalance)
  })
})

describe('quitarMovimiento', () => {
  it('borra los dos apuntes de una transferencia, se pida el que se pida', () => {
    const movimientos = alta()
    expect(quitarMovimiento(movimientos, movimientos[0].id)).toHaveLength(0)
    expect(quitarMovimiento(movimientos, movimientos[1].id)).toHaveLength(0)
  })

  it('nunca deja medio traslado, que crearía o destruiría dinero', () => {
    const movimientos = alta()
    const despues = quitarMovimiento(movimientos, movimientos[0].id)
    expect(totalBalance(cuentas, despues)).toBe(totalBalance(cuentas, []))
    expect(despues.some(m => m.transferId)).toBe(false)
  })

  it('borra solo el apunte pedido cuando no es una transferencia', () => {
    const gasto = crearApuntes({
      title: 'Mercado', category: 'Alimentación', account: 'Cuenta principal',
      date: '2026-11-03', amount: aCentavos(285000), type: 'Gasto'
    })
    const lista = [...gasto, ...alta()]
    const despues = quitarMovimiento(lista, gasto[0].id)
    expect(despues).toHaveLength(2)
    expect(despues.every(m => m.transferId)).toBe(true)
  })

  it('un identificador que no existe deja la lista igual', () => {
    const movimientos = alta()
    expect(quitarMovimiento(movimientos, 'no-existe')).toBe(movimientos)
  })
})

describe('apuntesVisibles', () => {
  it('de cada transferencia muestra solo la salida, que ya nombra las dos cuentas', () => {
    const visibles = apuntesVisibles(alta())
    expect(visibles).toHaveLength(1)
    expect(visibles[0].flujo).toBe('sale')
    expect(visibles[0].contraparte).toBe('Ahorros')
  })

  it('no esconde ingresos, gastos ni apuntes antiguos sin flujo', () => {
    const otros: Movement[] = [
      { id: 'a', title: 'I', category: 'Trabajo', account: 'Cuenta principal', date: '2026-11-01', amount: 1, type: 'Ingreso' },
      { id: 'b', title: 'G', category: 'Otros', account: 'Cuenta principal', date: '2026-11-02', amount: 1, type: 'Gasto' },
      { id: 'c', title: 'T', category: 'Otros', account: 'Cuenta principal', date: '2026-11-03', amount: 1, type: 'Transferencia' }
    ]
    expect(apuntesVisibles(otros)).toHaveLength(3)
  })
})
