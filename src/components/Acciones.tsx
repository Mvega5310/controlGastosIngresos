import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Confirmar } from './Confirmar'

/**
 * Editar y borrar una fila.
 *
 * Estaba copiado igual en Planificación y en Patrimonio, así que la pregunta
 * de confirmación habría que haberla añadido dos veces y recordar las dos cada
 * vez que cambie. Vive aquí una sola vez.
 */
export function Acciones({
  onEditar,
  onBorrar,
  nombre,
  que = 'registro'
}: {
  onEditar: () => void
  onBorrar: () => void
  /** Lo que se borra, para que la pregunta diga cuál es. */
  nombre?: string
  /** Cómo se llama a esto: «suscripción», «deuda», «movimiento»… */
  que?: string
}) {
  const [preguntando, setPreguntando] = useState(false)

  return (
    <div className="row-actions">
      <button className="mini-btn" onClick={onEditar} aria-label={`Editar ${nombre || que}`}>
        <Pencil size={13} />
      </button>
      <button
        className="mini-btn peligro"
        onClick={() => setPreguntando(true)}
        aria-label={`Eliminar ${nombre || que}`}
      >
        <Trash2 size={13} />
      </button>
      <Confirmar
        abierto={preguntando}
        titulo={nombre ? `¿Borrar «${nombre}»?` : `¿Borrar este ${que}?`}
        detalle={`Se quita de aquí y de tus demás dispositivos la próxima vez que sincronicen.`}
        onCancelar={() => setPreguntando(false)}
        onConfirmar={() => {
          setPreguntando(false)
          onBorrar()
        }}
      />
    </div>
  )
}
