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
  const irA = (s: string) => {
    onNavigate(s)
    onClose()
  }
  const iniciales = (correo || 'FC').slice(0, 2).toUpperCase()

  return (
    <>
      <div className={`sidebar-backdrop ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'mobile-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">F</div>
          <div>
            <strong>FinControl</strong>
            <small>FINANZAS EN ORDEN</small>
          </div>
          <button className="mobile-close" onClick={onClose}>
            <X size={19} />
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
          <button className="profile" onClick={() => irA('Ajustes')}>
            <div className="avatar profile-avatar">{iniciales}</div>
            <div>
              <b>{correo ? correo.split('@')[0] : 'Sin cuenta'}</b>
              <small>{correo ? 'Sesión iniciada' : 'Entra para sincronizar'}</small>
            </div>
          </button>
        </div>
      </aside>
    </>
  )
}
