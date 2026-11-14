import { useState } from 'react'
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react'
import { Account, Movement, money, coloresCuenta, tiposCuenta } from '../datos/catalogo'
import { accountBalance } from '../core/finanzas'
import FormModal, { Campo } from '../components/FormModal'
import { Confirmar } from '../components/Confirmar'

type ColeccionCuentas = {
  items: Account[]
  agregar: (datos: Omit<Account, 'id'>) => void
  actualizar: (id: string, cambios: Partial<Account>) => void
  eliminar: (id: string) => void
}

const campos: Campo[] = [
  {
    nombre: 'name',
    etiqueta: 'Nombre de la cuenta',
    tipo: 'texto',
    requerido: true,
    ayuda: 'Ej. Cuenta principal'
  },
  { nombre: 'bank', etiqueta: 'Entidad', tipo: 'texto', ayuda: 'Ej. Bancolombia', ancho: 'medio' },
  { nombre: 'kind', etiqueta: 'Tipo', tipo: 'seleccion', opciones: tiposCuenta, ancho: 'medio' },
  {
    nombre: 'openingBalance',
    etiqueta: 'Saldo de partida',
    tipo: 'dinero',
    ayuda: '0',
    ancho: 'medio'
  },
  { nombre: 'color', etiqueta: 'Color', tipo: 'seleccion', opciones: coloresCuenta, ancho: 'medio' }
]

export function Cuentas({
  movements,
  coleccion,
  onRenombrar
}: {
  movements: Movement[]
  coleccion: ColeccionCuentas
  onRenombrar: (anterior: string, nuevo: string) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<Account | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const cuentas = coleccion.items
  const nuevo = () => {
    setAviso(null)
    setEditando(null)
    setAbierto(true)
  }
  const editar = (c: Account) => {
    setAviso(null)
    setEditando(c)
    setAbierto(true)
  }

  /** Cuántos apuntes nombran esta cuenta, como origen o como destino. */
  const [porBorrar, setPorBorrar] = useState<Account | null>(null)

  const usos = (nombre: string) =>
    movements.filter(m => m.account === nombre || m.contraparte === nombre).length

  // Con movimientos dentro no se pregunta nada: no se puede, y se dice por qué.
  const pedirBorrado = (c: Account) => {
    const n = usos(c.name)
    if (n > 0) {
      setAviso(
        `«${c.name}» tiene ${n} movimiento${n > 1 ? 's' : ''}. Muévelos a otra cuenta o bórralos antes, ` +
          'o sus importes dejarían de contar en ningún saldo.'
      )
      return
    }
    setAviso(null)
    setPorBorrar(c)
  }

  const guardar = (d: Record<string, unknown>) => {
    const datos = {
      name: String(d.name || '').trim(),
      bank: String(d.bank || '').trim(),
      kind: String(d.kind || tiposCuenta[0]),
      color: String(d.color || coloresCuenta[0]),
      openingBalance: Number(d.openingBalance || 0)
    }
    if (editando) {
      onRenombrar(editando.name, datos.name)
      coleccion.actualizar(editando.id, datos)
    } else {
      coleccion.agregar(datos)
    }
  }

  return (
    <>
      <section className="panel full-panel sin-fondo">
        <div className="panel-heading seccion-head">
          <div>
            <h2>Tus cuentas</h2>
            <p>El saldo sale del saldo de partida más todo lo registrado en ella</p>
          </div>
          <button className="btn-primary" onClick={nuevo}>
            <Plus size={16} /> Nueva cuenta
          </button>
        </div>
      </section>

      {aviso && <p className="aviso-bloque">{aviso}</p>}

      {!cuentas.length ? (
        <div className="empty">
          <p>
            Todavía no tienes cuentas. Crea al menos una —tu cuenta del banco, el efectivo que llevas encima—
            y a partir de ahí podrás registrar movimientos.
          </p>
          <button className="btn-secondary" onClick={nuevo}>
            <Plus size={15} /> Crear la primera
          </button>
        </div>
      ) : (
        <div className="module-grid">
          {cuentas.map(c => {
            const saldo = accountBalance(c, movements)
            return (
              <section className="panel account-card" key={c.id}>
                <div className="account-card-top">
                  <div className={`bank-icon large ${c.color}`}>
                    {(c.bank || c.name).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="row-actions">
                    <button className="mini-btn" onClick={() => editar(c)} aria-label={`Editar ${c.name}`}>
                      <Pencil size={13} />
                    </button>
                    <button
                      className="mini-btn peligro"
                      onClick={() => pedirBorrado(c)}
                      aria-label={`Eliminar ${c.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p>
                  {c.bank || 'Sin entidad'} · {c.kind}
                </p>
                <h2>{c.name}</h2>
                <strong className={saldo < 0 ? 'negative' : ''}>{money(saldo)}</strong>
                <small>
                  Saldo actual · parte de {money(c.openingBalance)} · {usos(c.name)} movimiento
                  {usos(c.name) === 1 ? '' : 's'}
                </small>
              </section>
            )
          })}
          <button className="add-card" onClick={nuevo}>
            <Wallet />
            <b>Agregar cuenta</b>
            <span>Un banco, una tarjeta, el efectivo…</span>
          </button>
        </div>
      )}

      <FormModal
        abierto={abierto}
        eyebrow="CUENTA"
        titulo={editando ? 'Editar cuenta' : 'Nueva cuenta'}
        campos={campos}
        valores={editando}
        onCerrar={() => setAbierto(false)}
        onGuardar={guardar}
      />

      <Confirmar
        abierto={!!porBorrar}
        titulo={porBorrar ? `¿Borrar la cuenta «${porBorrar.name}»?` : ''}
        detalle="No tiene movimientos, así que no se pierde ningún importe. Dejará de aparecer en los formularios."
        onCancelar={() => setPorBorrar(null)}
        onConfirmar={() => {
          const c = porBorrar
          setPorBorrar(null)
          if (c) coleccion.eliminar(c.id)
        }}
      />
    </>
  )
}
