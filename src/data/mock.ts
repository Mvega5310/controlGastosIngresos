export type MovementType = 'Ingreso' | 'Gasto' | 'Transferencia'

export type Movement = {
  id: string; title: string; category: string; account: string; date: string;
  amount: number; type: MovementType
}

export type Account = {
  name: string; bank: string; kind: string; color: 'yellow' | 'purple' | 'blue' | 'green'
  /** Saldo de partida, antes de aplicar los movimientos registrados. */
  openingBalance: number
}

/**
 * Catálogo de cuentas. Es la única fuente de verdad: el formulario de alta y el
 * cálculo de saldos leen de aquí, de modo que no puedan desincronizarse.
 */
export const accounts: Account[] = [
  {name:'Cuenta principal',bank:'Bancolombia',kind:'Ahorros',color:'yellow',openingBalance:6850000},
  {name:'Cuenta de ahorros',bank:'Nu',kind:'Ahorros',color:'purple',openingBalance:3200000},
  {name:'Tarjeta crédito',bank:'Visa',kind:'Crédito',color:'blue',openingBalance:-840000},
  {name:'Efectivo',bank:'Caja',kind:'Disponible',color:'green',openingBalance:250000}
]

export const accountNames = accounts.map(a => a.name)

export const categories = ['Alimentación','Transporte','Vivienda','Salud','Entretenimiento','Trabajo','Otros']

export const initialMovements: Movement[] = [
  {id:'seed-1',title:'Salario',category:'Trabajo',account:'Cuenta principal',date:'2026-11-01',amount:4200000,type:'Ingreso'},
  {id:'seed-2',title:'Mercado',category:'Alimentación',account:'Cuenta principal',date:'2026-11-03',amount:285000,type:'Gasto'},
  {id:'seed-3',title:'Netflix',category:'Entretenimiento',account:'Tarjeta crédito',date:'2026-11-04',amount:32900,type:'Gasto'},
  {id:'seed-4',title:'Transporte',category:'Transporte',account:'Efectivo',date:'2026-11-05',amount:85000,type:'Gasto'},
  {id:'seed-5',title:'Freelance',category:'Trabajo',account:'Cuenta principal',date:'2026-11-07',amount:650000,type:'Ingreso'}
]

export const money = (value:number) => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(value)
