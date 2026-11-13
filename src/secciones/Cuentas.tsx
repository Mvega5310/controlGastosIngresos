import { ArrowRight, Plus } from 'lucide-react'
import { Movement, money, accounts } from '../data/mock'
import { accountBalance } from '../core/finance'

export function Cuentas({ movements }: { movements: Movement[] }) {
  return (
    <div className="module-grid">
      {accounts.map(a => (
        <section className="panel account-card" key={a.name}>
          <div className="account-card-top">
            <div className={`bank-icon large ${a.color}`}>{a.bank[0]}</div>
            <span className="status-pill">{a.kind}</span>
          </div>
          <p>{a.bank}</p>
          <h2>{a.name}</h2>
          <strong className={accountBalance(a, movements) < 0 ? 'negative' : ''}>
            {money(accountBalance(a, movements))}
          </strong>
          <small>Saldo actual</small>
          <button className="text-link">
            Ver detalles <ArrowRight size={14} />
          </button>
        </section>
      ))}
      <button
        className="add-card"
        onClick={() => alert('Conexión bancaria: disponible en una próxima etapa.')}
      >
        <Plus />
        <b>Agregar cuenta</b>
        <span>Registra una cuenta o producto financiero</span>
      </button>
    </div>
  )
}
