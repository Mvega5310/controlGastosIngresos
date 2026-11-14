import { TriangleAlert } from 'lucide-react'
import { useDialogo } from '../lib/useDialogo'

/**
 * Preguntar antes de borrar.
 *
 * Borrar era inmediato: un toque en la papelera y el movimiento desaparecía.
 * En el móvil, donde la papelera queda a milímetros del resto de la fila, eso
 * ocurre por accidente más de una vez, y aquí no hay deshacer: la baja se
 * sincroniza y se lleva el registro de todos los dispositivos.
 */
export function Confirmar({
  abierto,
  titulo,
  detalle,
  textoConfirmar = 'Sí, borrar',
  onConfirmar,
  onCancelar
}: {
  abierto: boolean
  titulo: string
  detalle?: string
  textoConfirmar?: string
  onConfirmar: () => void
  onCancelar: () => void
}) {
  const ref = useDialogo(abierto, onCancelar)

  if (!abierto) return null

  return (
    <div
      className="modal-overlay"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onCancelar()
      }}
    >
      <div
        ref={ref}
        className="modal modal-estrecho"
        role="alertdialog"
        aria-modal="true"
        aria-label={titulo}
      >
        <div className="confirmar">
          <span className="confirmar-icono">
            <TriangleAlert size={20} />
          </span>
          <h2>{titulo}</h2>
          {detalle && <p>{detalle}</p>}
          <p className="confirmar-nota">Esto no se puede deshacer.</p>
        </div>
        <div className="modal-actions">
          {/* El botón que no borra va primero y se queda con el foco: el que
              borra no debe ser el que se pulsa sin mirar. */}
          <button type="button" className="btn-secondary" onClick={onCancelar} autoFocus>
            Cancelar
          </button>
          <button type="button" className="btn-primary peligro-fuerte" onClick={onConfirmar}>
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
