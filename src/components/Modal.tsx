import { FormEvent, useEffect, useState } from 'react'
import { X, Wallet } from 'lucide-react'
import { Account, Movement, categories } from '../datos/catalogo'
import { aCentavos } from '../core/dinero'
type Props = {
  open: boolean
  onClose: () => void
  onSave: (m: Omit<Movement, 'id'> & { cuentaDestino?: string }) => void
  cuentas: Account[]
}
export default function Modal({ open, onClose, onSave, cuentas }: Props) {
  const accountNames = cuentas.map(c => c.name)
  // Clave estable: lo que importa es qué cuentas hay, no la identidad del array.
  const clavesCuentas = accountNames.join('|')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'Ingreso' | 'Gasto' | 'Transferencia'>('Gasto')
  const [category, setCategory] = useState('Otros')
  const [account, setAccount] = useState('')
  const [cuentaDestino, setCuentaDestino] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  // Las cuentas son datos de la persona, así que no existen hasta que las crea.
  // Al abrir el formulario se eligen las primeras disponibles; sin esto el
  // movimiento se guardaría sin cuenta y no movería ningún saldo.
  useEffect(() => {
    if (!open) return
    setAccount(a => (a && accountNames.includes(a) ? a : (accountNames[0] ?? '')))
    setCuentaDestino(d => (d && accountNames.includes(d) ? d : (accountNames[1] ?? accountNames[0] ?? '')))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- accountNames se sigue por clavesCuentas
  }, [open, clavesCuentas])

  if (!open) return null
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || Number(amount) <= 0 || !account) return
    onSave({
      title,
      amount: aCentavos(Number(amount)),
      type,
      category,
      account,
      date,
      cuentaDestino: type === 'Transferencia' ? cuentaDestino : undefined
    })
    setTitle('')
    setAmount('')
    onClose()
  }
  return (
    <div
      className="modal-overlay"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <div>
            <span className="eyebrow">REGISTRO FINANCIERO</span>
            <h2>Nuevo movimiento</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {!cuentas.length ? (
          <div className="sin-cuentas">
            <Wallet size={22} />
            <p>Primero necesitas una cuenta.</p>
            <small>
              Un movimiento tiene que entrar o salir de algún sitio. Crea tu cuenta del banco, una tarjeta o
              el efectivo que llevas encima, y vuelve aquí.
            </small>
            <button className="btn-primary" onClick={onClose}>
              Entendido
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label>Tipo de movimiento</label>
            <div className="type-switch">
              {(['Gasto', 'Ingreso', 'Transferencia'] as const).map(t => (
                <button
                  type="button"
                  className={type === t ? 'selected' : ''}
                  onClick={() => setType(t)}
                  key={t}
                >
                  {t}
                </button>
              ))}
            </div>
            <label>Descripción</label>
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej. Compra de mercado"
            />
            <label>Valor en COP</label>
            <input
              required
              type="number"
              min="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
            />
            <div className="form-grid">
              <div>
                <label>Categoría</label>
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  {categories.map(x => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>{type === 'Transferencia' ? 'Cuenta de origen' : 'Cuenta'}</label>
                <select value={account} onChange={e => setAccount(e.target.value)}>
                  {accountNames.map(x => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
            </div>
            {type === 'Transferencia' && (
              <>
                <label>Cuenta de destino</label>
                <select value={cuentaDestino} onChange={e => setCuentaDestino(e.target.value)}>
                  {accountNames.map(x => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                {cuentaDestino === account && (
                  <small className="aviso-campo">
                    Elige una cuenta distinta de la de origen; si no, no se registra ningún traslado.
                  </small>
                )}
              </>
            )}
            <label>Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button className="btn-primary" type="submit">
                Guardar movimiento
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
