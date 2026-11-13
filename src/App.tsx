import { useEffect, useMemo, useState } from 'react'
import {
  LucideIcon,
  Menu,
  Plus,
  Bell,
  Search,
  Sun,
  Moon,
  MoreHorizontal,
  CalendarDays,
  CircleHelp,
  LayoutDashboard,
  ArrowLeftRight
} from 'lucide-react'
import Sidebar from './components/Sidebar'
import Modal from './components/Modal'
import { useColeccion } from './lib/useColeccion'
import { useSincronizacion } from './lib/useSincronizacion'
import { BotonCuenta, PanelCuenta } from './components/Cuenta'
import { Presupuestos, Suscripciones, Deudas, Metas } from './secciones/Planificacion'
import { Inversiones, Transporte, Reportes } from './secciones/Patrimonio'
import { initialMovements, Movement } from './data/mock'
import {
  Period,
  periodOf,
  periodLabel,
  shiftPeriod,
  longDate,
  totalsFor,
  byDateDesc,
  crearApuntes,
  idsAEliminar,
  apuntesVisibles,
  NuevoMovimiento
} from './core/finance'

import { Panel } from './secciones/Panel'
import { Movimientos } from './secciones/Movimientos'
import { Cuentas } from './secciones/Cuentas'
import { Calendario } from './secciones/Calendario'
import { Ajustes } from './secciones/Ajustes'

function App() {
  const sync = useSincronizacion()
  const [panelCuenta, setPanelCuenta] = useState(false)
  const [period, setPeriod] = useState<Period>(() => periodOf(new Date()))
  const [active, setActive] = useState('Inicio'),
    [dark, setDark] = useState(() => {
      try {
        const v = localStorage.getItem('fc-theme')
        if (v) return v === 'dark'
        return window.matchMedia('(prefers-color-scheme: dark)').matches
      } catch {
        return false
      }
    }),
    [sidebarOpen, setSidebarOpen] = useState(false),
    [modal, setModal] = useState(false),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState('Todos')
  const movs = useColeccion<Movement>('fc-movements', initialMovements)
  const movements = movs.items
  useEffect(() => {
    try {
      localStorage.setItem('fc-theme', dark ? 'dark' : 'light')
    } catch {
      /* modo privado */
    }
  }, [dark])
  const totals = useMemo(() => totalsFor(movements, period), [movements, period])
  const previous = useMemo(() => totalsFor(movements, shiftPeriod(period, -1)), [movements, period])
  const addMovement = (m: NuevoMovimiento) => movs.agregarVarios(crearApuntes(m))
  const eliminarMovimiento = (id: string) => movs.eliminarVarios(idsAEliminar(movements, id))
  const filtered = apuntesVisibles(movements)
    .sort(byDateDesc)
    .filter(
      m =>
        (filter === 'Todos' || m.type === filter) &&
        `${m.title} ${m.category} ${m.account}`.toLowerCase().includes(query.toLowerCase())
    )
  const go = (s: string) => setActive(s)
  return (
    <div className={`app ${dark ? 'dark' : ''}`}>
      <Sidebar active={active} onNavigate={go} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-area">
        <header className="topbar">
          <div className="top-left">
            <button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)}>
              <Menu />
            </button>
            <div className="breadcrumb">
              Mi espacio <span>/</span> <b>{active}</b>
            </div>
          </div>
          <div className="top-actions">
            <button className="icon-button search-button" onClick={() => go('Movimientos')}>
              <Search size={19} />
            </button>
            <BotonCuenta sync={sync} onAbrir={() => setPanelCuenta(true)} />
            <button className="icon-button" onClick={() => setDark(!dark)} title="Cambiar tema">
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button className="icon-button notification">
              <Bell size={19} />
              <i />
            </button>
            <div className="top-avatar">US</div>
          </div>
        </header>
        <div className="content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">{longDate(new Date())}</div>
              <h1>{active === 'Inicio' ? '¡Hola! Este es tu resumen financiero.' : active}</h1>
              <p className="subtitle">
                {active === 'Inicio'
                  ? 'Aquí tienes una visión clara de cómo se mueve tu dinero.'
                  : `Gestiona y consulta tu información de ${active.toLowerCase()}.`}
              </p>
            </div>
            <div className="welcome-actions">
              <div className="period-picker">
                <button
                  className="btn-secondary"
                  onClick={() => setPeriod(p => shiftPeriod(p, -1))}
                  aria-label="Mes anterior"
                >
                  ‹
                </button>
                <span className="period-current">
                  <CalendarDays size={16} /> {periodLabel(period)}
                </span>
                <button
                  className="btn-secondary"
                  onClick={() => setPeriod(p => shiftPeriod(p, 1))}
                  aria-label="Mes siguiente"
                >
                  ›
                </button>
              </div>
              <button className="btn-primary" onClick={() => setModal(true)}>
                <Plus size={17} /> Nuevo movimiento
              </button>
            </div>
          </div>
          {active === 'Inicio' ? (
            <Panel
              movements={movements}
              totals={totals}
              previous={previous}
              period={period}
              onAdd={() => setModal(true)}
              onGo={go}
            />
          ) : active === 'Movimientos' ? (
            <Movimientos
              data={filtered}
              query={query}
              setQuery={setQuery}
              filter={filter}
              setFilter={setFilter}
              onAdd={() => setModal(true)}
              onEliminar={eliminarMovimiento}
            />
          ) : active === 'Cuentas' ? (
            <Cuentas movements={movements} />
          ) : active === 'Calendario' ? (
            <Calendario movements={movements} period={period} setPeriod={setPeriod} />
          ) : active === 'Suscripciones' ? (
            <Suscripciones />
          ) : active === 'Deudas' ? (
            <Deudas />
          ) : active === 'Metas de ahorro' ? (
            <Metas />
          ) : active === 'Presupuestos' ? (
            <Presupuestos movimientos={movements} periodo={period} />
          ) : active === 'Inversiones' ? (
            <Inversiones />
          ) : active === 'Transporte' ? (
            <Transporte />
          ) : active === 'Reportes' ? (
            <Reportes movimientos={movements} totales={totals} periodo={period} />
          ) : (
            <Ajustes dark={dark} setDark={setDark} />
          )}
          <footer className="footer">
            <span>© 2026 FinControl. Tus finanzas, bajo control.</span>
            <span>
              <CircleHelp size={14} /> Centro de ayuda
            </span>
          </footer>
        </div>
      </main>
      <nav className="mobile-nav">
        {(
          [
            ['Inicio', LayoutDashboard],
            ['Movimientos', ArrowLeftRight],
            ['+', Plus],
            ['Calendario', CalendarDays],
            ['Más', MoreHorizontal]
          ] as [string, LucideIcon][]
        ).map(([n, I]) => (
          <button
            className={active === n ? 'selected' : ''}
            onClick={() => (n === '+' ? setModal(true) : n === 'Más' ? go('Ajustes') : go(n))}
            key={n}
          >
            {<I size={20} />}
            <small>{n === '+' ? '' : n}</small>
          </button>
        ))}
      </nav>
      <Modal open={modal} onClose={() => setModal(false)} onSave={addMovement} />
      <PanelCuenta sync={sync} abierto={panelCuenta} onCerrar={() => setPanelCuenta(false)} />
    </div>
  )
}

export default App
