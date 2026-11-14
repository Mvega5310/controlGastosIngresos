import { Movement, money } from '../datos/catalogo'
import { Period, periodLabel, shiftPeriod, monthGrid, todayISO, inPeriod } from '../core/finanzas'

export function Calendario({
  movements,
  period,
  setPeriod
}: {
  movements: Movement[]
  period: Period
  setPeriod: (f: (p: Period) => Period) => void
}) {
  const celdas = monthGrid(period),
    hoy = todayISO()
  const porDia = new Map<string, Movement[]>()
  for (const m of movements) {
    const l = porDia.get(m.date) || []
    l.push(m)
    porDia.set(m.date, l)
  }
  const delMes = movements.filter(m => inPeriod(m, period)).sort((a, b) => a.date.localeCompare(b.date))
  const corto = (d: string) =>
    `${d.slice(8, 10)} ${new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { month: 'short' }).replace('.', '').toUpperCase()}`
  return (
    <div className="calendar-layout">
      <section className="panel calendar-panel">
        <div className="panel-heading">
          <div>
            <h2>{periodLabel(period)}</h2>
            <p>Los dias con un punto tienen movimientos registrados</p>
          </div>
          <div className="calendar-nav">
            <button
              className="btn-secondary"
              onClick={() => setPeriod(p => shiftPeriod(p, -1))}
              aria-label="Mes anterior"
            >
              ‹
            </button>{' '}
            <button
              className="btn-secondary"
              onClick={() => setPeriod(p => shiftPeriod(p, 1))}
              aria-label="Mes siguiente"
            >
              ›
            </button>
          </div>
        </div>
        <div className="calendar-grid">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
            <b className="weekday" key={d}>
              {d}
            </b>
          ))}
          {celdas.map(c => {
            const hay = c.inMonth ? porDia.get(c.date) : undefined
            return (
              <div
                key={c.date}
                className={`calendar-day ${c.date === hoy ? 'today' : ''} ${c.inMonth ? '' : 'muted'}`}
                title={hay ? `${hay.length} movimiento${hay.length > 1 ? 's' : ''}` : undefined}
                aria-current={c.date === hoy ? 'date' : undefined}
              >
                <span>{c.day}</span>
                {hay && (
                  <>
                    <i aria-hidden="true" />
                    {/* El punto no lo lee nadie que no lo vea: se dice con texto. */}
                    <span className="solo-lectores">
                      , {hay.length} movimiento{hay.length > 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            )
          })}
        </div>
        <div className="calendar-legend">
          <span>
            <i /> Dia con movimientos
          </span>
          <span>◍ Fecha actual</span>
        </div>
      </section>
      <section className="panel">
        <h2>Movimientos del mes</h2>
        <p className="muted-text">
          {delMes.length
            ? `${delMes.length} registrado${delMes.length > 1 ? 's' : ''} en ${periodLabel(period).toLowerCase()}`
            : 'Sin movimientos registrados en este mes'}
        </p>
        {delMes.map(m => (
          <div className="event-row" key={m.id}>
            <div className="event-date">{corto(m.date)}</div>
            <div>
              <b>{m.title}</b>
              <small>
                {m.category} · {m.account}
              </small>
            </div>
            <strong className={m.type === 'Ingreso' ? 'positive' : m.type === 'Gasto' ? 'negative' : ''}>
              {m.type === 'Ingreso' ? '+' : m.type === 'Gasto' ? '-' : ''}
              {money(m.amount)}
            </strong>
          </div>
        ))}
        {!delMes.length && (
          <div className="empty">Cambia de mes con las flechas o registra un movimiento.</div>
        )}
      </section>
    </div>
  )
}
