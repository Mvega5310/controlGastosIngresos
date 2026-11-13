import { Wallet, ArrowUpRight, ArrowDownRight, PiggyBank, ArrowRight, Plus, Sparkles } from 'lucide-react'
import { Suspense, lazy } from 'react'
import StatCard from '../components/StatCard'

const GraficaFlujo = lazy(() => import('../components/GraficaFlujo'))
import { TablaMovimientos } from './Movimientos'
import { Movement, money, accounts } from '../datos/catalogo'
import {
  Period,
  Totals,
  totalBalance,
  accountBalance,
  dailySeries,
  apuntesVisibles,
  byDateDesc,
  change,
  periodLabel
} from '../core/finanzas'

export function Panel({
  movements,
  totals,
  previous,
  period,
  onAdd,
  onGo
}: {
  movements: Movement[]
  totals: Totals
  previous: Totals
  period: Period
  onAdd: () => void
  onGo: (s: string) => void
}) {
  const balance = totalBalance(accounts, movements)
  const series = dailySeries(movements, period)
  const recent = apuntesVisibles(movements).sort(byDateDesc).slice(0, 5)
  return (
    <>
      <div className="stats-grid">
        <StatCard
          label="Balance total"
          value={money(balance)}
          icon={<Wallet size={19} />}
          note="suma de tus cuentas"
        />
        <StatCard
          label="Ingresos del mes"
          value={money(totals.income)}
          change={change(totals.income, previous.income, true)}
          icon={<ArrowDownRight size={19} />}
          tone="green"
        />
        <StatCard
          label="Gastos del mes"
          value={money(totals.expense)}
          change={change(totals.expense, previous.expense, false)}
          icon={<ArrowUpRight size={19} />}
          tone="orange"
        />
        <StatCard
          label="Ahorro del periodo"
          value={money(totals.net)}
          change={change(totals.net, previous.net, true)}
          icon={<PiggyBank size={19} />}
          tone="purple"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Flujo de efectivo</h2>
              <p>Acumulado de ingresos y gastos del periodo</p>
            </div>
            <span className="select-like">{periodLabel(period)}</span>
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-green" />
              Ingresos
            </span>
            <span>
              <i className="legend-yellow" />
              Gastos
            </span>
            <b>Acumulado del mes</b>
          </div>
          <div className="chart">
            <Suspense fallback={<div className="chart-cargando" aria-hidden="true" />}>
              <GraficaFlujo series={series} />
            </Suspense>
          </div>
        </section>
        <section className="panel accounts-panel">
          <div className="panel-heading">
            <div>
              <h2>Mis cuentas</h2>
              <p>Resumen de tus productos</p>
            </div>
            <button className="text-link" onClick={() => onGo('Cuentas')}>
              Ver todas <ArrowRight size={14} />
            </button>
          </div>
          {accounts.map(a => {
            const saldo = accountBalance(a, movements)
            return (
              <div className="account-row" key={a.name}>
                <div className={`bank-icon ${a.color}`}>{a.bank[0]}</div>
                <div className="account-info">
                  <b>{a.name}</b>
                  <small>
                    {a.bank} · {a.kind}
                  </small>
                </div>
                <strong className={saldo < 0 ? 'negative' : ''}>{money(saldo)}</strong>
              </div>
            )
          })}
          <button className="add-account" onClick={() => onGo('Cuentas')}>
            <Plus size={16} /> Gestionar cuentas
          </button>
        </section>
      </div>
      <div className="lower-grid">
        <section className="panel transactions-panel">
          <div className="panel-heading">
            <div>
              <h2>Movimientos recientes</h2>
              <p>Tu actividad financiera más reciente</p>
            </div>
            <button className="text-link" onClick={() => onGo('Movimientos')}>
              Ver movimientos <ArrowRight size={14} />
            </button>
          </div>
          <TablaMovimientos data={recent} />
        </section>
        <section className="panel upcoming-panel">
          <div className="panel-heading">
            <div>
              <h2>Próximos pagos</h2>
              <p>No pierdas de vista tus fechas</p>
            </div>
            <button className="text-link" onClick={() => onGo('Calendario')}>
              Ver calendario <ArrowRight size={14} />
            </button>
          </div>
          <div className="payment">
            <div className="payment-date">
              <b>15</b>
              <small>NOV</small>
            </div>
            <div className="payment-info">
              <b>Internet hogar</b>
              <small>Servicios · vence en 4 días</small>
            </div>
            <strong>{money(95000)}</strong>
          </div>
          <div className="payment">
            <div className="payment-date">
              <b>18</b>
              <small>NOV</small>
            </div>
            <div className="payment-info">
              <b>Tarjeta de crédito</b>
              <small>Deuda · vence en 7 días</small>
            </div>
            <strong>{money(420000)}</strong>
          </div>
          <div className="payment">
            <div className="payment-date">
              <b>22</b>
              <small>NOV</small>
            </div>
            <div className="payment-info">
              <b>Netflix</b>
              <small>Suscripción · vence en 11 días</small>
            </div>
            <strong>{money(32900)}</strong>
          </div>
        </section>
      </div>
      <div className="tip-banner">
        <div className="tip-icon">
          <Sparkles size={20} />
        </div>
        <div>
          <b>Un pequeño hábito, un gran cambio.</b>
          <p>Registra tus gastos diariamente para tener una visión más precisa de tus finanzas.</p>
        </div>
        <button onClick={onAdd}>
          Registrar gasto <ArrowRight size={15} />
        </button>
      </div>
    </>
  )
}
