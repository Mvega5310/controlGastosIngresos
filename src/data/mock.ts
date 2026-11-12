export type Movement = {
  id: number; title: string; category: string; account: string; date: string;
  amount: number; type: 'Ingreso' | 'Gasto' | 'Transferencia'
}
export const initialMovements: Movement[] = [
  {id:1,title:'Salario',category:'Trabajo',account:'Cuenta principal',date:'2026-11-01',amount:4200000,type:'Ingreso'},
  {id:2,title:'Mercado',category:'Alimentación',account:'Cuenta principal',date:'2026-11-03',amount:285000,type:'Gasto'},
  {id:3,title:'Netflix',category:'Entretenimiento',account:'Tarjeta crédito',date:'2026-11-04',amount:32900,type:'Gasto'},
  {id:4,title:'Transporte',category:'Movilidad',account:'Efectivo',date:'2026-11-05',amount:85000,type:'Gasto'},
  {id:5,title:'Freelance',category:'Trabajo',account:'Cuenta principal',date:'2026-11-07',amount:650000,type:'Ingreso'}
]
export const navGroups = [
  {label:'GENERAL',items:[['Inicio','LayoutDashboard'],['Movimientos','ArrowLeftRight'],['Cuentas','Wallet'],['Calendario','CalendarDays']]},
  {label:'PLANIFICACIÓN',items:[['Suscripciones','RefreshCw'],['Deudas','CreditCard'],['Metas de ahorro','Target'],['Presupuestos','ChartNoAxesCombined']]},
  {label:'PATRIMONIO',items:[['Inversiones','TrendingUp'],['Transporte','CarFront'],['Reportes','ChartPie']]},
  {label:'CUENTA',items:[['Ajustes','Settings']]}
] as const
export const money = (value:number) => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(value)
