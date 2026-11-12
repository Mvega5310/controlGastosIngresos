/**
 * Cálculos financieros de FinControl.
 *
 * Módulo puro: no toca el DOM, React ni localStorage. Todo lo que la interfaz
 * muestre como cifra debe salir de aquí, para que no vuelvan a aparecer
 * números escritos a mano en las vistas.
 */
import { Account, Movement, money } from '../data/mock'

/** Un mes concreto. `month` va de 1 a 12. */
export type Period = { year: number; month: number }

export const periodOf = (date: Date): Period => ({ year: date.getFullYear(), month: date.getMonth() + 1 })

/** Clave 'AAAA-MM', que coincide con los 7 primeros caracteres de Movement.date. */
export const periodKey = (p: Period) => `${p.year}-${String(p.month).padStart(2, '0')}`

/** Desplaza el periodo n meses (negativo hacia atrás), cruzando años correctamente. */
export const shiftPeriod = (p: Period, months: number): Period => {
  const index = p.year * 12 + (p.month - 1) + months
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

/** 'Noviembre 2026' */
export const periodLabel = (p: Period) => {
  const text = new Date(p.year, p.month - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** 'Miércoles, 12 de noviembre de 2026', en mayúsculas para el encabezado. */
export const longDate = (date: Date) =>
  date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()

export const inPeriod = (m: Movement, p: Period) => m.date.slice(0, 7) === periodKey(p)

export type Totals = { income: number; expense: number; net: number }

/**
 * Ingresos y gastos del periodo indicado.
 * Las transferencias quedan fuera a propósito: mueven dinero entre cuentas
 * propias, no son ingreso ni gasto del patrimonio.
 */
export const totalsFor = (movements: Movement[], p: Period): Totals => {
  let income = 0, expense = 0
  for (const m of movements) {
    if (!inPeriod(m, p)) continue
    if (m.type === 'Ingreso') income += m.amount
    else if (m.type === 'Gasto') expense += m.amount
  }
  return { income, expense, net: income - expense }
}

/** Saldo actual de una cuenta: su saldo de partida más todo lo registrado en ella. */
export const accountBalance = (account: Account, movements: Movement[]) => {
  let balance = account.openingBalance
  for (const m of movements) {
    if (m.account !== account.name) continue
    if (m.type === 'Ingreso') balance += m.amount
    else if (m.type === 'Gasto') balance -= m.amount
  }
  return balance
}

/** Balance total = suma de los saldos actuales de todas las cuentas. */
export const totalBalance = (accounts: Account[], movements: Movement[]) =>
  accounts.reduce((sum, a) => sum + accountBalance(a, movements), 0)

export type Trend = 'positive' | 'negative' | 'neutral'
export type Change = { text: string; tone: Trend }

/**
 * Variación porcentual frente al periodo anterior.
 *
 * `higherIsBetter` decide el color: subir ingresos es bueno, subir gastos no.
 * Sin referencia previa no se inventa un porcentaje; se dice que no la hay.
 */
export const change = (current: number, previous: number, higherIsBetter = true): Change => {
  if (previous === 0) return { text: current === 0 ? 'sin cambios' : 'sin datos', tone: 'neutral' }
  const delta = current - previous
  if (delta === 0) return { text: 'sin cambios', tone: 'neutral' }
  const rising = delta > 0
  const tone: Trend = rising === higherIsBetter ? 'positive' : 'negative'
  const arrow = rising ? '↑' : '↓'
  // Un porcentaje solo es interpretable sobre una base positiva: comparar contra
  // un mes en negativo produce cifras disparatadas (un +4547 % que no dice nada).
  // En ese caso se muestra la diferencia en dinero, que sí se entiende.
  if (previous < 0) return { text: `${arrow} ${money(Math.abs(delta))}`, tone }
  const percent = Math.round((delta / previous) * 1000) / 10
  if (percent === 0) return { text: `${arrow} ${money(Math.abs(delta))}`, tone }
  return { text: `${arrow} ${Math.abs(percent).toFixed(1).replace('.', ',')}%`, tone }
}

export type DailyPoint = { day: string; income: number; expense: number }

/**
 * Serie diaria acumulada del periodo, para la gráfica de flujo de efectivo.
 * Acumulada porque la pregunta útil es «cuánto llevo este mes», no «cuánto
 * gasté el martes».
 */
export const dailySeries = (movements: Movement[], p: Period): DailyPoint[] => {
  const daysInMonth = new Date(p.year, p.month, 0).getDate()
  const income = new Array(daysInMonth + 1).fill(0)
  const expense = new Array(daysInMonth + 1).fill(0)
  for (const m of movements) {
    if (!inPeriod(m, p)) continue
    const day = Number(m.date.slice(8, 10))
    if (!(day >= 1 && day <= daysInMonth)) continue
    if (m.type === 'Ingreso') income[day] += m.amount
    else if (m.type === 'Gasto') expense[day] += m.amount
  }
  const label = new Date(p.year, p.month - 1, 1).toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')
  const points: DailyPoint[] = []
  let accIncome = 0, accExpense = 0
  for (let day = 1; day <= daysInMonth; day++) {
    accIncome += income[day]
    accExpense += expense[day]
    points.push({ day: `${String(day).padStart(2, '0')} ${label}`, income: accIncome, expense: accExpense })
  }
  return points
}

/** Más recientes primero; a igualdad de fecha, el último registrado va antes. */
export const byDateDesc = (a: Movement, b: Movement) =>
  a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `m-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
