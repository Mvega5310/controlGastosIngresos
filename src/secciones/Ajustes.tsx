import { Sun, Moon, Cloud, CloudOff, TriangleAlert } from 'lucide-react'
import { Sincronizacion } from '../lib/useSincronizacion'

type Props = {
  dark: boolean
  setDark: (v: boolean) => void
  sync: Sincronizacion
  onAbrirCuenta: () => void
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

export function Ajustes({ dark, setDark, sync, onAbrirCuenta }: Props) {
  const datos = estadoDatos(sync)

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
    </section>
  )
}
