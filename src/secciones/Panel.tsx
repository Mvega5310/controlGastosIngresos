import { Wallet, ArrowUpRight, ArrowDownRight, PiggyBank, ArrowRight, Plus, Sparkles } from 'lucide-react'
import { Suspense, lazy } from 'react'
import StatCard from '../components/StatCard'

const GraficaFlujo = lazy(() => import('../components/GraficaFlujo'))
import { TablaMovimientos } from './Movimientos'
import { Account, Movement, money } from '../datos/catalogo'
import { PagoProximo } from '../core/avisos'
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

/** Mes abreviado y en mayúsculas, como lo muestra la tarjeta de fecha. */
const mesCorto = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { month: 'short' }).replace('.', '').toUpperCase()

export function Panel({
  cuentas,
  pagos,
  movements,
  totals,
  previous,
  period,
  onAdd,
  onGo
}: {
  cuentas: Account[]
  pagos: PagoProximo[]
  movements: Movement[]
  totals: Totals
  previous: Totals
  period: Period
  onAdd: () => void
  onGo: (s: string) => void
}) {
  const balance = totalBalance(cuentas, movements)
  const series = dailySeries(movements, period)
  const recent = apuntesVisibles(movements).sort(byDateDesc).slice(0, 5)
  return (
    // Un envoltorio solo para poder reordenar las secciones en el móvil con CSS:
    // en escritorio no cambia nada, y en pantalla estrecha el orden pasa a ser el
    // de lectura (balance, pagos que vienen, flujo, cuentas, recientes).
    <div className="panel-flujo">
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
          {/* Un balance en cero con movimientos encima no se entiende solo: el
              saldo sale de las cuentas, y hubo una época en la que no se
              guardaban, así que los datos de entonces llegan sin ninguna. */}
          {!cuentas.length && (
            <p className="panel-vacio">
              {movements.length
                ? `Aún no has creado ninguna cuenta, pero tienes ${movements.length} movimiento${
                    movements.length === 1 ? '' : 's'
                  } registrados. Por eso el balance total sale en cero: el saldo se calcula a partir de las cuentas. Crea las tuyas, o empieza de cero desde Ajustes.`
                : 'Aún no has creado ninguna cuenta. Sin cuentas no hay saldos que mostrar.'}
            </p>
          )}
          {cuentas.map(a => {
            const saldo = accountBalance(a, movements)
            return (
              <div className="account-row" key={a.id}>
                <div className={`bank-icon ${a.color}`}>{(a.bank || a.name)[0]}</div>
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
        <section className={`panel upcoming-panel ${pagos.length ? '' : 'sin-pagos'}`}>
          <div className="panel-heading">
            <div>
              <h2>Próximos pagos</h2>
              <p>No pierdas de vista tus fechas</p>
            </div>
            <button className="text-link" onClick={() => onGo('Calendario')}>
              Ver calendario <ArrowRight size={14} />
            </button>
          </div>
          {!pagos.length && (
            <p className="panel-vacio">
              No hay pagos a la vista. Aquí aparecerán tus suscripciones y las cuotas de tus deudas.
            </p>
          )}
          {pagos.map(p => (
            <div className="payment" key={p.id}>
              <div className="payment-date">
                <b>{p.fecha.slice(8, 10)}</b>
                <small>{mesCorto(p.fecha)}</small>
              </div>
              <div className="payment-info">
                <b>{p.nombre}</b>
                <small>
                  {p.concepto} ·{' '}
                  {p.dias < 0
                    ? `venció hace ${Math.abs(p.dias)} d`
                    : p.dias === 0
                      ? 'vence hoy'
                      : `vence en ${p.dias} día${p.dias === 1 ? '' : 's'}`}
                </small>
              </div>
              <strong>{money(p.monto)}</strong>
            </div>
          ))}
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
    </div>
  )
}
