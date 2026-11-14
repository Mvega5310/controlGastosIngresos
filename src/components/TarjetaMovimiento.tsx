import { Trash2 } from 'lucide-react'
import { Movement, money } from '../datos/catalogo'
import { fmtDate } from '../lib/fechas'

/**
 * Un movimiento, en formato de tarjeta, para pantallas estrechas.
 *
 * La tabla de escritorio tiene cinco columnas y necesita ancho: en un teléfono
 * se cortaba por la derecha y obligaba a desplazarla de lado para ver el
 * importe. Aquí la misma información cae en tres líneas.
 *
 * Es solo presentación. No calcula nada: el importe llega ya en centavos y se
 * formatea con `money`, y borrar es una función que decide quien la usa, de modo
 * que la confirmación, y el borrado de los dos apuntes de un traslado, siguen
 * siendo los de la tabla.
 */
export function TarjetaMovimiento({ m, onEliminar }: { m: Movement; onEliminar?: (m: Movement) => void }) {
  const esTraslado = m.type === 'Transferencia'
  const origenDestino = esTraslado && !!m.contraparte

  // Un traslado mueve dinero entre cuentas propias: no es ni un ingreso ni un
  // gasto, así que ni lleva signo ni se pinta de verde o de rojo.
  const signo = m.type === 'Ingreso' ? '+' : m.type === 'Gasto' ? '-' : ''
  const tono = m.type === 'Ingreso' ? 'positive' : m.type === 'Gasto' ? 'negative' : ''

  return (
    <li className="tarjeta-mov">
      <div className="tm-superior">
        <span className={`movement-dot ${m.type.toLowerCase()}`} aria-hidden="true" />
        <b className="tm-titulo">{m.title}</b>
        <strong className={`tm-importe ${tono}`}>
          {signo}
          {money(m.amount)}
        </strong>
      </div>

      <div className="tm-medio">
        {origenDestino ? (
          <span className="traslado">
            {m.account} <i aria-label="hacia">→</i> {m.contraparte}
          </span>
        ) : (
          <span>
            {m.category} · {m.account}
          </span>
        )}
      </div>

      <div className="tm-pie">
        <span className="tm-fecha">{fmtDate(m.date)}</span>
        <span className={`tm-tipo ${m.type.toLowerCase()}`}>{m.type}</span>
        {onEliminar && (
          <button
            className="tm-borrar"
            onClick={() => onEliminar(m)}
            aria-label={`Eliminar ${m.title}`}
            type="button"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </li>
  )
}
