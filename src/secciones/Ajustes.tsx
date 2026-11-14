import { useEffect, useRef, useState } from 'react'
import { Sun, Moon, Cloud, CloudOff, TriangleAlert, Trash2, Sparkles } from 'lucide-react'
import { borrarTodosLosDatos, cargarEjemplos, contarDatos } from '../datos/ejemplos'
import { Sincronizacion } from '../lib/useSincronizacion'

type Props = {
  dark: boolean
  setDark: (v: boolean) => void
  sync: Sincronizacion
  onAbrirCuenta: () => void
  /** Cuando se llega buscando algo concreto, se lleva la vista hasta ahí. */
  foco?: string | null
  onFocoAtendido?: () => void
}

/** Describe dónde viven los datos ahora mismo, sin prometer de más. */
function estadoDatos(sync: Sincronizacion) {
  switch (sync.estado) {
    case 'sin-configurar':
      return {
        icono: <CloudOff size={15} />,
        titulo: 'Solo en este dispositivo',
        detalle: 'La sincronización no está configurada en esta instalación.',
        pastilla: 'Almacenamiento local',
        clase: ''
      }
    case 'desconectado':
      return {
        icono: <CloudOff size={15} />,
        titulo: 'Solo en este dispositivo',
        detalle: 'Entra con tu cuenta para que tus datos viajen al móvil y al PC.',
        pastilla: 'Sin cuenta',
        clase: ''
      }
    case 'error':
      return {
        icono: <TriangleAlert size={15} />,
        titulo: 'No se pudo sincronizar',
        detalle: sync.error || 'Se reintentará solo. Tus datos siguen guardados aquí.',
        pastilla: 'Con problemas',
        clase: 'bad'
      }
    default:
      return {
        icono: <Cloud size={15} />,
        titulo: sync.estado === 'sincronizando' ? 'Sincronizando…' : 'Sincronizado',
        detalle: sync.correo ? `Conectado como ${sync.correo}` : 'Tus datos viajan entre tus dispositivos.',
        pastilla: sync.estado === 'sincronizando' ? 'En curso' : 'Al día',
        clase: ''
      }
  }
}

export function Ajustes({ dark, setDark, sync, onAbrirCuenta, foco, onFocoAtendido }: Props) {
  const datos = estadoDatos(sync)
  const [confirmando, setConfirmando] = useState(false)
  const [hecho, setHecho] = useState<string | null>(null)
  const zona = useRef<HTMLDivElement>(null)
  const registros = contarDatos()

  // Al venir del menú «borrar todos mis datos», la sección queda al final de
  // una página larga: sin esto habría que buscarla a ojo.
  useEffect(() => {
    if (foco !== 'datos') return
    zona.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    onFocoAtendido?.()
  }, [foco, onFocoAtendido])

  return (
    <section className="panel settings-panel">
      <h2>Preferencias</h2>
      <p>Configura la experiencia de FinControl.</p>

      <div className="setting-row">
        <div>
          <b>Apariencia</b>
          <small>Alterna entre tema claro y oscuro</small>
        </div>
        <button className="btn-secondary" onClick={() => setDark(!dark)}>
          {dark ? <Sun size={16} /> : <Moon size={16} />} {dark ? 'Modo claro' : 'Modo oscuro'}
        </button>
      </div>

      <div className="setting-row">
        <div>
          <b>Dónde están tus datos</b>
          <small>{datos.detalle}</small>
        </div>
        <span className={`status-pill ${datos.clase}`}>{datos.pastilla}</span>
        <button className="btn-secondary" onClick={onAbrirCuenta}>
          {datos.icono} {sync.correo ? 'Gestionar cuenta' : 'Sincronizar'}
        </button>
      </div>

      <div className="setting-row">
        <div>
          <b>Moneda principal</b>
          <small>Moneda para visualizar los saldos</small>
        </div>
        <strong>COP · Peso colombiano</strong>
      </div>

      <div className="setting-row">
        <div>
          <b>Idioma</b>
          <small>Idioma de la aplicación</small>
        </div>
        <strong>Español</strong>
      </div>

      <h2 className="settings-subtitulo">Tus datos</h2>
      <p>
        {registros > 0
          ? `Tienes ${registros} registro${registros === 1 ? '' : 's'} guardados.`
          : 'Todavía no has guardado nada.'}
      </p>

      <div className="setting-row">
        <div>
          <b>Cargar datos de ejemplo</b>
          <small>Añade cuentas y movimientos de muestra para ver la aplicación llena</small>
        </div>
        <button
          className="btn-secondary"
          onClick={() => {
            cargarEjemplos()
            setHecho('Datos de ejemplo cargados. Puedes borrarlos cuando quieras desde aquí mismo.')
            setConfirmando(false)
          }}
        >
          <Sparkles size={15} /> Cargar ejemplos
        </button>
      </div>

      <div className="zona-datos" ref={zona}>
        <div className="setting-row">
          <div>
            <b>Borrar todos mis datos</b>
            <small>
              {sync.correo
                ? 'Se borran aquí y en tu cuenta, en todos tus dispositivos. No se puede deshacer.'
                : 'Se borra todo lo guardado en este navegador. No se puede deshacer.'}
            </small>
          </div>
          {confirmando ? (
            <div className="row-actions">
              <button className="btn-secondary" onClick={() => setConfirmando(false)}>
                Cancelar
              </button>
              <button
                className="btn-primary peligro-fuerte"
                onClick={() => {
                  borrarTodosLosDatos()
                  setConfirmando(false)
                  setHecho('Listo, está todo vacío. Empieza creando una cuenta.')
                }}
              >
                Sí, borrar todo
              </button>
            </div>
          ) : (
            // El botón se deshabilitaba al no haber registros, y entonces era
            // justo cuando se buscaba, para comprobar que no quedaba nada.
            <button
              className="btn-secondary peligro"
              onClick={() =>
                registros
                  ? setConfirmando(true)
                  : setHecho('No hay nada que borrar: esta cuenta ya está vacía.')
              }
            >
              <Trash2 size={15} /> Borrar todo
            </button>
          )}
        </div>
      </div>

      {hecho && <p className="aviso-bloque bueno">{hecho}</p>}
    </section>
  )
}
