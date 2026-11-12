import { FormEvent, useState } from 'react'
import { X } from 'lucide-react'
import { Movement, categories, accountNames } from '../data/mock'
import { aCentavos } from '../core/dinero'
type Props={open:boolean;onClose:()=>void;onSave:(m:Omit<Movement,'id'>&{cuentaDestino?:string})=>void}
export default function Modal({open,onClose,onSave}:Props){
 const [title,setTitle]=useState('');const [amount,setAmount]=useState('');const [type,setType]=useState<'Ingreso'|'Gasto'|'Transferencia'>('Gasto');const [category,setCategory]=useState('Otros');const [account,setAccount]=useState(accountNames[0]);const [cuentaDestino,setCuentaDestino]=useState(accountNames[1]||accountNames[0]);const [date,setDate]=useState(new Date().toISOString().slice(0,10))
 if(!open)return null
 const submit=(e:FormEvent)=>{e.preventDefault();if(!title.trim()||Number(amount)<=0)return;onSave({title,amount:aCentavos(Number(amount)),type,category,account,date,cuentaDestino:type==='Transferencia'?cuentaDestino:undefined});setTitle('');setAmount('');onClose()}
 return <div className="modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><div className="modal-head"><div><span className="eyebrow">REGISTRO FINANCIERO</span><h2>Nuevo movimiento</h2></div><button className="icon-button" onClick={onClose}><X size={20}/></button></div><form onSubmit={submit}>
 <label>Tipo de movimiento</label><div className="type-switch">{(['Gasto','Ingreso','Transferencia'] as const).map(t=><button type="button" className={type===t?'selected':''} onClick={()=>setType(t)} key={t}>{t}</button>)}</div>
 <label>Descripción</label><input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej. Compra de mercado"/>
 <label>Valor en COP</label><input required type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0"/>
 <div className="form-grid"><div><label>Categoría</label><select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(x=><option key={x}>{x}</option>)}</select></div><div><label>{type==='Transferencia'?'Cuenta de origen':'Cuenta'}</label><select value={account} onChange={e=>setAccount(e.target.value)}>{accountNames.map(x=><option key={x}>{x}</option>)}</select></div></div>
 {type==='Transferencia'&&<><label>Cuenta de destino</label><select value={cuentaDestino} onChange={e=>setCuentaDestino(e.target.value)}>{accountNames.map(x=><option key={x}>{x}</option>)}</select>{cuentaDestino===account&&<small className="aviso-campo">Elige una cuenta distinta de la de origen; si no, no se registra ningún traslado.</small>}</>}
 <label>Fecha</label><input type="date" value={date} onChange={e=>setDate(e.target.value)}/>
 <div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" type="submit">Guardar movimiento</button></div>
 </form></div></div>
}