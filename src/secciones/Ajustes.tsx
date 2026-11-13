import { Sun, Moon } from 'lucide-react'

export function Ajustes({ dark, setDark }: { dark: boolean; setDark: (v: boolean) => void }) {
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
      <div className="setting-row">
        <div>
          <b>Datos de demostración</b>
          <small>Los movimientos se guardan en este navegador</small>
        </div>
        <span className="status-pill">Almacenamiento local</span>
      </div>
    </section>
  )
}
