import { useEffect, useMemo, useState } from 'react'
import {
  LucideIcon,
  Menu,
  Plus,
  Search,
  Sun,
  Moon,
  MoreHorizontal,
  CalendarDays,
  LayoutDashboard,
  ArrowLeftRight
} from 'lucide-react'
import Sidebar from './components/Sidebar'
import Modal from './components/Modal'
import { useDatos } from './lib/useDatos'
import { useSincronizacion } from './lib/useSincronizacion'
import { BotonCuenta, PanelCuenta } from './components/Cuenta'
import { BotonAvisos, PanelAvisos } from './components/Avisos'
import { MenuPerfil } from './components/MenuPerfil'
import { calcularAvisos, podarVistos, proximosPagos, sinVer } from './core/avisos'
import { Presupuestos, Suscripciones, Deudas, Metas } from './secciones/Planificacion'
import { Inversiones, Transporte, Reportes } from './secciones/Patrimonio'
import { Movement } from './datos/catalogo'
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
} from './core/finanzas'

import { Panel } from './secciones/Panel'
import { Movimientos } from './secciones/Movimientos'
import { Cuentas } from './secciones/Cuentas'
import { Calendario } from './secciones/Calendario'
import { Ajustes } from './secciones/Ajustes'

function App() {
  const sync = useSincronizacion()
  // Si venimos de un enlace de correo que falló, se abre el panel: si no, la
  // persona se queda mirando una pantalla normal sin saber qué pasó.
  const [panelCuenta, setPanelCuenta] = useState(() => Boolean(sync.avisoEnlace))
  // Al volver del enlace de «he olvidado la contraseña» hay que abrir el panel
  // sí o sí: si no, la persona vuelve del correo a una pantalla normal, ya
  // dentro, y sin dónde escribir la contraseña nueva.
  useEffect(() => {
    if (sync.recuperandoClave) setPanelCuenta(true)
  }, [sync.recuperandoClave])
  const [panelAvisos, setPanelAvisos] = useState(false)
  const [menuPerfil, setMenuPerfil] = useState(false)
  // Qué avisos se han mirado ya, para que la campana cuente lo nuevo en vez
  // de repetir un número que no bajaba hasta que venciera el pago.
  const [avisosVistos, setAvisosVistos] = useState<string[]>(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem('fc-avisos-vistos') || '[]')
      return Array.isArray(guardado) ? guardado : []
    } catch {
      return []
    }
  })
  // Qué venía buscando quien llega a Ajustes, para llevarle hasta ahí.
  const [focoAjustes, setFocoAjustes] = useState<string | null>(null)
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
  const datos = useDatos()
  const movs = datos.movimientos
  const movements = movs.items
  const cuentas = datos.cuentas.items
  useEffect(() => {
    try {
      localStorage.setItem('fc-theme', dark ? 'dark' : 'light')
    } catch {
      /* modo privado */
    }
  }, [dark])
  const totals = useMemo(() => totalsFor(movements, period), [movements, period])
  const previous = useMemo(() => totalsFor(movements, shiftPeriod(period, -1)), [movements, period])
  // Al renombrar una cuenta hay que arrastrar los movimientos que la nombran,
  // o se quedan huérfanos y dejan de sumar en ningún saldo.
  const renombrarCuenta = (anterior: string, nuevo: string) => {
    if (!anterior || anterior === nuevo) return
    for (const m of movs.items) {
      if (m.account === anterior) movs.actualizar(m.id, { account: nuevo } as Partial<Movement>)
      else if (m.contraparte === anterior) movs.actualizar(m.id, { contraparte: nuevo } as Partial<Movement>)
    }
  }

  const addMovement = (m: NuevoMovimiento) => movs.agregarVarios(crearApuntes(m))
  const eliminarMovimiento = (id: string) => movs.eliminarVarios(idsAEliminar(movements, id))
  const filtered = apuntesVisibles(movements)
    .sort(byDateDesc)
    .filter(
      m =>
        (filter === 'Todos' || m.type === filter) &&
        `${m.title} ${m.category} ${m.account}`.toLowerCase().includes(query.toLowerCase())
    )
  const avisos = useMemo(
    () =>
      calcularAvisos({
        suscripciones: datos.suscripciones.items,
        deudas: datos.deudas.items,
        vehiculos: datos.vehiculos.items,
        presupuestos: datos.presupuestos.items,
        movimientos: movements,
        periodo: period
      }),
    [
      datos.suscripciones.items,
      datos.deudas.items,
      datos.vehiculos.items,
      datos.presupuestos.items,
      movements,
      period
    ]
  )

  const nuevos = useMemo(() => sinVer(avisos, avisosVistos), [avisos, avisosVistos])

  // Abrir el panel da por vistos los que hay en ese momento. Se guardan ya
  // podados: si no, la lista crecería con los cobros de todos los meses.
  const marcarVistos = () => {
    const vistos = podarVistos([...new Set([...avisosVistos, ...avisos.map(a => a.id)])], avisos)
    setAvisosVistos(vistos)
    try {
      localStorage.setItem('fc-avisos-vistos', JSON.stringify(vistos))
    } catch {
      /* modo privado */
    }
  }

  const pagos = useMemo(
    () => proximosPagos(datos.suscripciones.items, datos.deudas.items),
    [datos.suscripciones.items, datos.deudas.items]
  )

  const go = (s: string) => setActive(s)
  return (
    <div className={`app ${dark ? 'dark' : ''}`}>
      <Sidebar
        active={active}
        onNavigate={go}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        correo={sync.correo}
        seccionesConAviso={[...new Set(avisos.map(a => a.seccion))]}
      />
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
            <BotonAvisos
              avisos={avisos}
              nuevos={nuevos}
              abierto={panelAvisos}
              onAlternar={() => {
                if (!panelAvisos) marcarVistos()
                setPanelAvisos(v => !v)
                setMenuPerfil(false)
              }}
            />
            <button
              className="top-avatar"
              onClick={() => {
                setMenuPerfil(v => !v)
                setPanelAvisos(false)
              }}
              title={sync.correo ? `Conectado como ${sync.correo}` : 'Cuenta y ajustes'}
              aria-label="Perfil y ajustes"
              aria-expanded={menuPerfil}
            >
              {(sync.correo || 'FC').slice(0, 2).toUpperCase()}
            </button>
            {menuPerfil && (
              <MenuPerfil
                correo={sync.correo}
                onCerrar={() => setMenuPerfil(false)}
                onAjustes={() => go('Ajustes')}
                onCuenta={() => setPanelCuenta(true)}
                onBorrarDatos={() => {
                  go('Ajustes')
                  setFocoAjustes('datos')
                }}
                onCerrarSesion={() => {
                  void sync.cerrarSesion()
                }}
              />
            )}
            <PanelAvisos
              avisos={avisos}
              abierto={panelAvisos}
              onCerrar={() => setPanelAvisos(false)}
              onIr={go}
            />
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
              cuentas={cuentas}
              pagos={pagos}
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
            <Cuentas movements={movements} coleccion={datos.cuentas} onRenombrar={renombrarCuenta} />
          ) : active === 'Calendario' ? (
            <Calendario movements={movements} period={period} setPeriod={setPeriod} />
          ) : active === 'Suscripciones' ? (
            <Suscripciones col={datos.suscripciones} cuentas={cuentas} />
          ) : active === 'Deudas' ? (
            <Deudas col={datos.deudas} />
          ) : active === 'Metas de ahorro' ? (
            <Metas col={datos.metas} />
          ) : active === 'Presupuestos' ? (
            <Presupuestos col={datos.presupuestos} movimientos={movements} periodo={period} />
          ) : active === 'Inversiones' ? (
            <Inversiones col={datos.inversiones} />
          ) : active === 'Transporte' ? (
            <Transporte col={datos.vehiculos} />
          ) : active === 'Reportes' ? (
            <Reportes movimientos={movements} totales={totals} periodo={period} />
          ) : (
            <Ajustes
              dark={dark}
              setDark={setDark}
              sync={sync}
              onAbrirCuenta={() => setPanelCuenta(true)}
              foco={focoAjustes}
              onFocoAtendido={() => setFocoAjustes(null)}
            />
          )}
          <footer className="footer">
            <span>© 2026 FinControl. Tus finanzas, bajo control.</span>
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
      <Modal open={modal} onClose={() => setModal(false)} onSave={addMovement} cuentas={cuentas} />
      <PanelCuenta sync={sync} abierto={panelCuenta} onCerrar={() => setPanelCuenta(false)} />
    </div>
  )
}

export default App
