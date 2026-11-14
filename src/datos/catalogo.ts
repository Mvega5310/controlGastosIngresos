import { aCentavos } from '../core/dinero'
export { money } from '../core/dinero'

export type MovementType = 'Ingreso' | 'Gasto' | 'Transferencia'

export type Movement = {
  id: string
  title: string
  category: string
  account: string
  date: string
  amount: number
  type: MovementType
  /** Transferencias: ata los dos apuntes de un mismo traslado. */
  transferId?: string
  /** Transferencias: si este apunte saca dinero de `account` o lo mete. */
  flujo?: 'sale' | 'entra'
  /** Transferencias: la otra cuenta del traslado. */
  contraparte?: string
}

export type Account = {
  id: string
  name: string
  bank: string
  kind: string
  color: string
  /** Saldo de partida, antes de aplicar los movimientos registrados. */
  openingBalance: number
}

export const coloresCuenta = ['yellow', 'purple', 'blue', 'green'] as const

export const tiposCuenta = ['Ahorros', 'Corriente', 'Crédito', 'Disponible', 'Inversión', 'Otra']

export const categories = [
  'Alimentación',
  'Transporte',
  'Vivienda',
  'Salud',
  'Entretenimiento',
  'Trabajo',
  'Otros'
]

/**
 * Datos de ejemplo.
 *
 * No se cargan solos. Antes sí lo hacían, y el resultado era que cualquier
 * navegador —y cualquier cuenta nueva— aparecía con cuentas y movimientos que
 * no eran suyos. Ahora se cargan únicamente si alguien lo pide desde Ajustes,
 * para ver cómo queda la aplicación con datos dentro.
 */
export const cuentasDeEjemplo: Omit<Account, 'id'>[] = [
  {
    name: 'Cuenta principal',
    bank: 'Bancolombia',
    kind: 'Ahorros',
    color: 'yellow',
    openingBalance: aCentavos(6850000)
  },
  {
    name: 'Cuenta de ahorros',
    bank: 'Nu',
    kind: 'Ahorros',
    color: 'purple',
    openingBalance: aCentavos(3200000)
  },
  {
    name: 'Tarjeta crédito',
    bank: 'Visa',
    kind: 'Crédito',
    color: 'blue',
    openingBalance: aCentavos(-840000)
  },
  { name: 'Efectivo', bank: 'Caja', kind: 'Disponible', color: 'green', openingBalance: aCentavos(250000) }
]

export const movimientosDeEjemplo: Omit<Movement, 'id'>[] = [
  {
    title: 'Salario',
    category: 'Trabajo',
    account: 'Cuenta principal',
    date: '2026-11-01',
    amount: aCentavos(4200000),
    type: 'Ingreso'
  },
  {
    title: 'Mercado',
    category: 'Alimentación',
    account: 'Cuenta principal',
    date: '2026-11-03',
    amount: aCentavos(285000),
    type: 'Gasto'
  },
  {
    title: 'Netflix',
    category: 'Entretenimiento',
    account: 'Tarjeta crédito',
    date: '2026-11-04',
    amount: aCentavos(32900),
    type: 'Gasto'
  },
  {
    title: 'Transporte',
    category: 'Transporte',
    account: 'Efectivo',
    date: '2026-11-05',
    amount: aCentavos(85000),
    type: 'Gasto'
  },
  {
    title: 'Freelance',
    category: 'Trabajo',
    account: 'Cuenta principal',
    date: '2026-11-07',
    amount: aCentavos(650000),
    type: 'Ingreso'
  }
]
