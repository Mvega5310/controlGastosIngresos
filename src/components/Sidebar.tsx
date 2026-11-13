import { LucideIcon, LayoutDashboard, ArrowLeftRight, Wallet, CalendarDays, RefreshCw, CreditCard, Target, ChartNoAxesCombined, TrendingUp, CarFront, ChartPie, Settings, X } from 'lucide-react'
const icons:Record<string,LucideIcon> = {LayoutDashboard,ArrowLeftRight,Wallet,CalendarDays,RefreshCw,CreditCard,Target,ChartNoAxesCombined,TrendingUp,CarFront,ChartPie,Settings}
const groups = [
 {label:'GENERAL',items:[['Inicio','LayoutDashboard'],['Movimientos','ArrowLeftRight'],['Cuentas','Wallet'],['Calendario','CalendarDays']]},
 {label:'PLANIFICACIÓN',items:[['Suscripciones','RefreshCw'],['Deudas','CreditCard'],['Metas de ahorro','Target'],['Presupuestos','ChartNoAxesCombined']]},
 {label:'PATRIMONIO',items:[['Inversiones','TrendingUp'],['Transporte','CarFront'],['Reportes','ChartPie']]},
 {label:'CUENTA',items:[['Ajustes','Settings']]}
]
type Props={active:string;onNavigate:(s:string)=>void;open:boolean;onClose:()=>void}
export default function Sidebar({active,onNavigate,open,onClose}:Props){
 return <><div className={`sidebar-backdrop ${open?'show':''}`} onClick={onClose}/><aside className={`sidebar ${open?'mobile-open':''}`}>
  <div className="brand"><div className="brand-mark">F</div><div><strong>FinControl</strong><small>FINANZAS EN ORDEN</small></div><button className="mobile-close" onClick={onClose}><X size={19}/></button></div>
  <div className="workspace"><span className="avatar">FC</span><div><b>Mi espacio</b><small>Plan personal</small></div><span className="chevron">⌄</span></div>
  <nav>{groups.map(g=><section key={g.label}><p className="nav-label">{g.label}</p>{g.items.map(([name,icon])=>{const Icon=icons[icon];return <button key={name} className={`nav-item ${active===name?'active':''}`} onClick={()=>{onNavigate(name);onClose()}}><Icon size={18}/><span>{name}</span>{name==='Calendario'&&<i className="nav-dot"/>}</button>})}</section>)}</nav>
  <div className="sidebar-bottom"><div className="upgrade"><div className="upgrade-icon">✦</div><b>Haz más con FinControl</b><p>Desbloquea análisis y herramientas avanzadas.</p><button onClick={()=>onNavigate('Ajustes')}>Conocer Pro <span>→</span></button></div><div className="profile"><div className="avatar profile-avatar">US</div><div><b>Usuario</b><small>Cuenta personal</small></div><span>••‣</span></div></div>
 </aside></>
}