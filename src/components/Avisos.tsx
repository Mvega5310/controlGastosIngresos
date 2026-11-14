import { useEffect } from 'react'
import { Bell, TriangleAlert, Clock3, Target, CheckCheck } from 'lucide-react'
import { Aviso } from '../core/avisos'

const icono = (a: Aviso) =>
  a.nivel === 'vencido' ? (
    <TriangleAlert size={15} />
  ) : a.nivel === 'pronto' ? (
    <Clock3 size={15} />
  ) : (
    <Target size={15} />
  )

/**
 * Campana con el número de avisos sin mirar.
 *
 * Contaba todos los pendientes, así que abrirla no cambiaba nada: el número
 * seguía ahí hasta que venciera el pago, y parecía atascado. Ahora cuenta lo
 * que todavía no se ha visto; la lista de dentro los sigue enseñando todos,
 * porque seguir pendientes es justo lo que son.
 */
export function BotonAvisos({
  avisos,
  nuevos,
  abierto,
  onAlternar
}: {
  avisos: Aviso[]
  nuevos: Aviso[]
  abierto: boolean
  onAlternar: () => void
}) {
  const urgentes = nuevos.filter(a => a.nivel === 'vencido').length
  const titulo = nuevos.length
    ? `${nuevos.length} aviso${nuevos.length === 1 ? '' : 's'} sin mirar${urgentes ? `, ${urgentes} vencido${urgentes === 1 ? '' : 's'}` : ''}`
    : avisos.length
      ? `${avisos.length} aviso${avisos.length === 1 ? '' : 's'}, ya vistos`
      : 'No hay avisos'

  return (
    <button
      className={`icon-button notification ${abierto ? 'activo' : ''}`}
      onClick={onAlternar}
      title={titulo}
      aria-label={titulo}
      aria-expanded={abierto}
    >
      <Bell size={19} />
      {nuevos.length > 0 && (
        <i className={urgentes ? 'urgente' : ''}>{nuevos.length > 9 ? '9+' : nuevos.length}</i>
      )}
    </button>
  )
}

/** Lista desplegable con los avisos; cada uno lleva a su sección. */
export function PanelAvisos({
  avisos,
  abierto,
  onCerrar,
  onIr
}: {
  avisos: Aviso[]
  abierto: boolean
  onCerrar: () => void
  onIr: (seccion: string) => void
}) {
  // Escape cierra el panel, como cualquier menú flotante.
  useEffect(() => {
    if (!abierto) return
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPulsar)
    return () => document.removeEventListener('keydown', alPulsar)
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <>
      <div className="avisos-fondo" onClick={onCerrar} />
      <div className="avisos-panel" role="dialog" aria-label="Avisos">
        <div className="avisos-cabecera">
          <b>Avisos</b>
          <span>{avisos.length ? `${avisos.length} en total` : 'Nada pendiente'}</span>
        </div>

        {!avisos.length ? (
          <div className="avisos-vacio">
            <CheckCheck size={20} />
            <p>Nada que mirar ahora mismo.</p>
            <small>
              Aquí aparecerán los cobros que se acercan, las cuotas, los documentos del vehículo por vencer y
              los presupuestos pasados de la raya.
            </small>
          </div>
        ) : (
          <ul className="avisos-lista">
            {avisos.map(a => (
              <li key={a.id}>
                <button
                  onClick={() => {
                    onIr(a.seccion)
                    onCerrar()
                  }}
                >
                  <span className={`aviso-icono ${a.nivel}`}>{icono(a)}</span>
                  <span className="aviso-texto">
                    <b>{a.titulo}</b>
                    <small>{a.detalle}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
