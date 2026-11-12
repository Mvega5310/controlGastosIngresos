import { FormEvent, useState } from 'react'
import { X, CloudOff, Cloud, RefreshCw, TriangleAlert, LogOut } from 'lucide-react'
import { entrar, registrarse, haySincronizacion } from '../datos/supabase'
import { Sincronizacion } from '../lib/useSincronizacion'

const hora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }) : null

/** Botón de la barra superior: dice de un vistazo si los datos viajan o no. */
export function BotonCuenta({ sync, onAbrir }: { sync: Sincronizacion; onAbrir: () => void }) {
  const { estado } = sync
  const icono = estado === 'sincronizando' ? <RefreshCw size={17} className="girando" />
    : estado === 'error' ? <TriangleAlert size={17} />
    : estado === 'listo' ? <Cloud size={17} />
    : <CloudOff size={17} />
  const titulo = estado === 'sin-configurar' ? 'Solo en este dispositivo'
    : estado === 'desconectado' ? 'Sin cuenta: los datos solo están aquí'
    : estado === 'sincronizando' ? 'Sincronizando…'
    : estado === 'error' ? 'No se pudo sincronizar'
    : `Sincronizado${hora(sync.ultima) ? ` a las ${hora(sync.ultima)}` : ''}`

  return <button className={`icon-button estado-sync ${estado}`} onClick={onAbrir} title={titulo} aria-label={titulo}>
    {icono}
  </button>
}

/** Panel de cuenta: acceso cuando no hay sesión, estado y salida cuando la hay. */
export function PanelCuenta({ sync, abierto, onCerrar }: { sync: Sincronizacion; abierto: boolean; onCerrar: () => void }) {
  const [modo, setModo] = useState<'entrar' | 'crear'>('entrar')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!abierto) return null

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setAviso(null)
    const r = modo === 'entrar' ? await entrar(correo, contrasena) : await registrarse(correo, contrasena)
    setEnviando(false)
    if (!r.ok) { setAviso(r.mensaje); return }
    setContrasena('')
    if (modo === 'crear') setAviso('Cuenta creada. Si te pedimos confirmar el correo, revisa tu bandeja de entrada.')
    else onCerrar()
  }

  const cerrar = () => { setAviso(null); onCerrar() }

  return <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) cerrar() }}>
    <div className="modal modal-estrecho" role="dialog" aria-modal="true" aria-label="Cuenta">
      <div className="modal-head">
        <div>
          <span className="eyebrow">CUENTA</span>
          <h2>{sync.correo ? 'Tu cuenta' : 'Sincronizar entre dispositivos'}</h2>
        </div>
        <button className="icon-button" onClick={cerrar} aria-label="Cerrar"><X size={20} /></button>
      </div>

      {!haySincronizacion() ? (
        <div className="nota-cuenta">
          <p><b>La sincronización no está configurada todavía.</b></p>
          <p>FinControl funciona igual, pero tus datos viven solo en este navegador: no viajan a tu móvil ni a tu PC.</p>
        </div>
      ) : sync.correo ? (
        <>
          <div className="setting-row">
            <div><b>Sesión iniciada</b><small>{sync.correo}</small></div>
            <span className={`status-pill ${sync.estado === 'error' ? 'bad' : ''}`}>
              {sync.estado === 'sincronizando' ? 'Sincronizando…'
                : sync.estado === 'error' ? 'Con problemas'
                : hora(sync.ultima) ? `Al día · ${hora(sync.ultima)}` : 'Al día'}
            </span>
          </div>
          {sync.error && <p className="aviso-campo">{sync.error}</p>}
          <div className="nota-cuenta">
            <p>Tus datos se guardan en este dispositivo y se sincronizan con tu cuenta. Puedes seguir
              registrando movimientos sin conexión: se subirán cuando vuelvas a tenerla.</p>
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => { void sync.cerrarSesion(); cerrar() }}>
              <LogOut size={15} /> Cerrar sesión
            </button>
            <button className="btn-primary" onClick={() => { void sync.sincronizar() }} disabled={sync.estado === 'sincronizando'}>
              <RefreshCw size={15} /> Sincronizar ahora
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="type-switch" role="tablist">
            <button type="button" className={modo === 'entrar' ? 'selected' : ''}
              onClick={() => { setModo('entrar'); setAviso(null) }}>Entrar</button>
            <button type="button" className={modo === 'crear' ? 'selected' : ''}
              onClick={() => { setModo('crear'); setAviso(null) }}>Crear cuenta</button>
          </div>
          <form onSubmit={enviar}>
            <label htmlFor="cuenta-correo">Correo</label>
            <input id="cuenta-correo" type="email" required autoComplete="email"
              value={correo} onChange={e => setCorreo(e.target.value)} placeholder="tucorreo@ejemplo.com" />
            <label htmlFor="cuenta-clave">Contraseña</label>
            <input id="cuenta-clave" type="password" required minLength={6}
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              value={contrasena} onChange={e => setContrasena(e.target.value)} placeholder="Al menos 6 caracteres" />
            {aviso && <p className="aviso-campo">{aviso}</p>}
            <div className="nota-cuenta">
              <p>Lo que ya tienes guardado en este navegador se subirá a tu cuenta en la primera
                sincronización, así que no pierdes nada al entrar.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={cerrar}>Cancelar</button>
              <button className="btn-primary" type="submit" disabled={enviando}>
                {enviando ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  </div>
}
