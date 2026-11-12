import { FormEvent, useState } from 'react'
import { X } from 'lucide-react'
import { Movement } from '../data/mock'
type Props={open:boolean;onClose:()=>void;onSave:(m:Omit<Movement,'id'>)=>void}
export default function Modal({open,onClose,onSave}:Props){
 const [title,setTitle]=useState('');const [amount,setAmount]=useState('');const [type,setType]=useState<'Ingreso'|'Gasto'|'Transferencia'>('Gasto');const [category,setCategory]=useState('Otros');const [account,setAccount]=useState('Cuenta principal');const [date,setDate]=useState(new Date().toISOString().slice(0,10))
 if(!open)return null
 const submit=(e:FormEvent)=>{e.preventDefault();if(!title.trim()||Number(amount)<=0)return;onSave({title,amount:Number(amount),type,category,account,date});setTitle('');setAmount('');onClose()}
 return <div className="modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><div className="modal-head"><div><span className="eyebrow">REGISTRO FINANCIERO</span><h2>Nuevo movimiento</h2></div><button className="icon-button" onClick={onClose}><X size={20}/></button></div><form onSubmit={submit}>
 <label>Tipo de movimiento</label><div className="type-switch">{(['Gasto','Ingreso','Transferencia'] as const).map(t=><button type="button" className={type===t?'selected':''} onClick={()=>setType(t)} key={t}>{t}</button>)}</div>
 <label>Descripción</label><input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej. Compra de mercado"/>
 <label>Valor en COP</label><input required type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0"/>
 <div className="form-grid"><div><label>Categoría</label><select value={category} onChange={e=>setCategory(e.target.value)}>{['Alimentación','Transporte','Vivienda','Salud','Entretenimiento','Trabajo','Otros'].map(x=><option>{x}</option>)}</select></div><div><label>Cuenta</label><select value={account} onChange={e=>setAccount(e.target.value)}>{['Cuenta principal','Tarjeta crédito','Efectivo','Ahorros'].map(x=><option>{x}</option>)}</select></div></div>
 <label>Fecha</label><input type="date" value={date} onChange={e=>setDate(e.target.value)}/>
 <div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" type="submit">Guardar movimiento</button></div>
 </form></div></div>
}