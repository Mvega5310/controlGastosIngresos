import { FormEvent, useEffect, useState } from 'react'
import { X, Wallet } from 'lucide-react'
import { Account, Movement, categories } from '../datos/catalogo'
import { aCentavos } from '../core/dinero'
import { useDialogo } from '../lib/useDialogo'
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

  // El formulario empieza de cero cada vez que se abre. Antes conservaba lo de
  // la última vez —la categoría, el tipo, la fecha, y la descripción si se
  // había cancelado— y al volver a abrirlo parecía que había algo a medio
  // escribir que no era de esta vez.
  //
  // Las cuentas son datos de la persona, así que no existen hasta que las
  // crea; se elige la primera, porque sin cuenta el movimiento se guardaría
  // sin mover ningún saldo.
  useEffect(() => {
    if (!open) return
    setTitle('')
    setAmount('')
    setType('Gasto')
    setCategory('Otros')
    setDate(new Date().toISOString().slice(0, 10))
    setAccount(accountNames[0] ?? '')
    setCuentaDestino(accountNames[1] ?? accountNames[0] ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- accountNames se sigue por clavesCuentas
  }, [open, clavesCuentas])

  const ref = useDialogo(open, onClose)

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
    onClose()
  }
  return (
    <div
      className="modal-overlay"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={ref} className="modal" role="dialog" aria-modal="true" aria-label="Nuevo movimiento">
        <div className="modal-head">
          <div>
            <span className="eyebrow">REGISTRO FINANCIERO</span>
            <h2>Nuevo movimiento</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar">
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
            <label id="mov-tipo-etiqueta">Tipo de movimiento</label>
            <div className="type-switch" role="group" aria-labelledby="mov-tipo-etiqueta">
              {(['Gasto', 'Ingreso', 'Transferencia'] as const).map(t => (
                <button
                  type="button"
                  className={type === t ? 'selected' : ''}
                  aria-pressed={type === t}
                  onClick={() => setType(t)}
                  key={t}
                >
                  {t}
                </button>
              ))}
            </div>
            <label htmlFor="mov-titulo">Descripción</label>
            <input
              id="mov-titulo"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej. Compra de mercado"
            />
            <label htmlFor="mov-valor">Valor en COP</label>
            <input
              id="mov-valor"
              required
              type="number"
              min="1"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
            />
            <div className="form-grid">
              <div>
                <label htmlFor="mov-categoria">Categoría</label>
                <select id="mov-categoria" value={category} onChange={e => setCategory(e.target.value)}>
                  {categories.map(x => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="mov-cuenta">{type === 'Transferencia' ? 'Cuenta de origen' : 'Cuenta'}</label>
                <select id="mov-cuenta" value={account} onChange={e => setAccount(e.target.value)}>
                  {accountNames.map(x => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
            </div>
            {type === 'Transferencia' && (
              <>
                <label htmlFor="mov-destino">Cuenta de destino</label>
                <select
                  id="mov-destino"
                  value={cuentaDestino}
                  onChange={e => setCuentaDestino(e.target.value)}
                >
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
            <label htmlFor="mov-fecha">Fecha</label>
            <input id="mov-fecha" type="date" value={date} onChange={e => setDate(e.target.value)} />
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
