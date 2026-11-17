import { useEffect, useRef } from 'react'
import {
  LucideIcon,
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CalendarDays,
  RefreshCw,
  CreditCard,
  Target,
  ChartNoAxesCombined,
  TrendingUp,
  CarFront,
  ChartPie,
  Settings,
  ChevronRight,
  X
} from 'lucide-react'
const icons: Record<string, LucideIcon> = {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CalendarDays,
  RefreshCw,
  CreditCard,
  Target,
  ChartNoAxesCombined,
  TrendingUp,
  CarFront,
  ChartPie,
  Settings
}
const groups = [
  {
    label: 'GENERAL',
    items: [
      ['Inicio', 'LayoutDashboard'],
      ['Movimientos', 'ArrowLeftRight'],
      ['Cuentas', 'Wallet'],
      ['Calendario', 'CalendarDays']
    ]
  },
  {
    label: 'PLANIFICACIÓN',
    items: [
      ['Suscripciones', 'RefreshCw'],
      ['Deudas', 'CreditCard'],
      ['Metas de ahorro', 'Target'],
      ['Presupuestos', 'ChartNoAxesCombined']
    ]
  },
  {
    label: 'PATRIMONIO',
    items: [
      ['Inversiones', 'TrendingUp'],
      ['Transporte', 'CarFront'],
      ['Reportes', 'ChartPie']
    ]
  },
  { label: 'CUENTA', items: [['Ajustes', 'Settings']] }
]
type Props = {
  active: string
  onNavigate: (s: string) => void
  open: boolean
  onClose: () => void
  /** Correo de la sesión, si la hay. Lo decide App, que es quien conoce la cuenta. */
  correo: string | null
  /** Secciones con algún aviso pendiente, para marcarlas con un punto. */
  seccionesConAviso: string[]
}

export default function Sidebar({ active, onNavigate, open, onClose, correo, seccionesConAviso }: Props) {
  const cierre = useRef<HTMLButtonElement>(null)
  // Al abrirse, el foco pasa al menú; el botón de cierre es el primer elemento
  // y es donde cae quien llega con teclado.
  useEffect(() => {
    if (open) cierre.current?.focus()
  }, [open])
  const irA = (s: string) => {
    onNavigate(s)
    onClose()
  }
  const iniciales = (correo || 'FC').slice(0, 2).toUpperCase()

  return (
    <>
      <div className={`sidebar-backdrop ${open ? 'show' : ''}`} onClick={onClose} />
      <aside id="menu-lateral" className={`sidebar ${open ? 'mobile-open' : ''}`} aria-label="Menú principal">
        <div className="brand">
          <div className="brand-mark">F</div>
          <div>
            <strong>FinControl</strong>
            <small>FINANZAS EN ORDEN</small>
          </div>
          <button ref={cierre} className="mobile-close" onClick={onClose} aria-label="Cerrar el menú">
            <X size={20} />
          </button>
        </div>
        <button className="workspace" onClick={() => irA('Ajustes')} title="Cuenta y preferencias">
          <span className="avatar">{iniciales}</span>
          <div>
            <b>{correo ? 'Tu cuenta' : 'Mi espacio'}</b>
            <small>{correo || 'Solo en este dispositivo'}</small>
          </div>
        </button>
        <nav>
          {groups.map(g => (
            <section key={g.label}>
              <p className="nav-label">{g.label}</p>
              {g.items.map(([name, icon]) => {
                const Icon = icons[icon]
                return (
                  <button
                    key={name}
                    className={`nav-item ${active === name ? 'active' : ''}`}
                    onClick={() => irA(name)}
                    aria-current={active === name ? 'page' : undefined}
                  >
                    <Icon size={18} />
                    <span>{name}</span>
                    {seccionesConAviso.includes(name) && <i className="nav-dot" />}
                  </button>
                )
              })}
            </section>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {/* Ajustes queda por debajo del pliegue en la lista de arriba; este
              botón está siempre a la vista, así que tiene que decir a dónde va. */}
          <button className="profile" onClick={() => irA('Ajustes')} title="Ir a Ajustes">
            <div className="avatar profile-avatar">{iniciales}</div>
            <div>
              <b>{correo ? correo.split('@')[0] : 'Sin cuenta'}</b>
              <small>{correo ? 'Ajustes y cuenta' : 'Entra para sincronizar'}</small>
            </div>
            <ChevronRight size={15} className="profile-ir" />
          </button>
        </div>
      </aside>
    </>
  )
}
