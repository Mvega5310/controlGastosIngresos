import { FormEvent, useEffect, useRef, useState } from 'react'
import { X, CloudOff, Cloud, RefreshCw, TriangleAlert, LogOut, Eye, EyeOff, KeyRound } from 'lucide-react'
import {
  entrar,
  entrarConGoogle,
  pedirEnlace,
  proveedoresExternos,
  registrarse,
  reenviarConfirmacion,
  recuperarContrasena,
  cambiarContrasena,
  haySincronizacion
} from '../datos/supabase'
import { MotivoAcceso } from '../datos/mensajesAcceso'
import { Sincronizacion } from '../lib/useSincronizacion'
import { useDialogo } from '../lib/useDialogo'

const hora = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
    : null

/** Botón de la barra superior: dice de un vistazo si los datos viajan o no. */
export function BotonCuenta({ sync, onAbrir }: { sync: Sincronizacion; onAbrir: () => void }) {
  const { estado } = sync
  const icono =
    estado === 'sincronizando' ? (
      <RefreshCw size={17} className="girando" />
    ) : estado === 'error' ? (
      <TriangleAlert size={17} />
    ) : estado === 'listo' ? (
      <Cloud size={17} />
    ) : (
      <CloudOff size={17} />
    )
  const titulo =
    estado === 'sin-configurar'
      ? 'Solo en este dispositivo'
      : estado === 'desconectado'
        ? 'Sin cuenta: los datos solo están aquí'
        : estado === 'sincronizando'
          ? 'Sincronizando…'
          : estado === 'error'
            ? 'No se pudo sincronizar'
            : `Sincronizado${hora(sync.ultima) ? ` a las ${hora(sync.ultima)}` : ''}`

  return (
    <button
      className={`icon-button estado-sync ${estado}`}
      onClick={onAbrir}
      title={titulo}
      aria-label={titulo}
    >
      {icono}
    </button>
  )
}

/** La G de Google, para que el botón se reconozca de un vistazo. */
const MarcaGoogle = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.3z"
    />
    <path
      fill="#34A853"
      d="M24 46c6 0 11-2 14.5-5.2l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.3v5.7C7.8 41.1 15.3 46 24 46z"
    />
    <path
      fill="#FBBC05"
      d="M11.7 28.3c-.4-1.3-.7-2.7-.7-4.3s.3-3 .7-4.3v-5.7H4.3A22 22 0 0 0 2 24c0 3.6.9 6.9 2.3 9.9l7.4-5.6z"
    />
    <path
      fill="#EA4335"
      d="M24 10.6c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C35 4.1 30 2 24 2 15.3 2 7.8 6.9 4.3 14.1l7.4 5.7c1.7-5.3 6.6-9.2 12.3-9.2z"
    />
  </svg>
)

/**
 * Campo de contraseña con interruptor para verla.
 *
 * Escribir a ciegas una contraseña que no se usa a diario es la forma más
 * rápida de acabar mirando «el correo o la contraseña no son correctos» sin
 * haberse equivocado de contraseña, sino de tecla.
 */
function CampoClave({
  id,
  valor,
  onCambiar,
  etiqueta,
  autocompletar,
  placeholder
}: {
  id: string
  valor: string
  onCambiar: (v: string) => void
  etiqueta: string
  autocompletar: string
  placeholder?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <>
      <label htmlFor={id}>{etiqueta}</label>
      <div className="campo-clave">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          required
          minLength={6}
          autoComplete={autocompletar}
          value={valor}
          onChange={e => onCambiar(e.target.value)}
          placeholder={placeholder || 'Al menos 6 caracteres'}
        />
        <button
          type="button"
          className="ver-clave"
          onClick={() => setVisible(v => !v)}
          aria-pressed={visible}
          aria-label={visible ? 'Ocultar la contraseña' : 'Ver la contraseña'}
          title={visible ? 'Ocultar la contraseña' : 'Ver la contraseña'}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </>
  )
}

type Modo = 'entrar' | 'crear' | 'recuperar'
type Aviso = { texto: string; bueno: boolean } | null

/** Panel de cuenta: acceso, recuperación, estado y salida. */
export function PanelCuenta({
  sync,
  abierto,
  onCerrar
}: {
  sync: Sincronizacion
  abierto: boolean
  onCerrar: () => void
}) {
  const [modo, setModo] = useState<Modo>('entrar')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [claveNueva, setClaveNueva] = useState('')
  const [claveRepetida, setClaveRepetida] = useState('')
  // Dentro de «entrar»: el enlace es lo primero que se ofrece, porque no
  // obliga a recordar nada.
  const [conClave, setConClave] = useState(false)
  const [enlaceEnviado, setEnlaceEnviado] = useState(false)
  const [aviso, setAviso] = useState<Aviso>(null)
  const [motivo, setMotivo] = useState<MotivoAcceso | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [cambiando, setCambiando] = useState(false)
  const [externos, setExternos] = useState<string[]>([])
  // Escape cierra por el mismo camino que el botón de cerrar, que además limpia
  // los avisos pendientes. `cerrarRef` evita declarar `cerrar` antes de usarlo.
  const cerrarRef = useRef<() => void>(() => {})
  const dialogo = useDialogo(abierto, () => cerrarRef.current())

  // Se pregunta al abrir, no al compilar: el botón de Google aparece solo si
  // el proyecto lo tiene encendido de verdad.
  useEffect(() => {
    if (!abierto || !haySincronizacion()) return
    let vivo = true
    void proveedoresExternos().then(p => {
      if (vivo) setExternos(p)
    })
    return () => {
      vivo = false
    }
  }, [abierto])

  if (!abierto) return null

  const limpiarAviso = () => {
    setAviso(null)
    setMotivo(null)
  }

  const irA = (m: Modo) => {
    setModo(m)
    setEnlaceEnviado(false)
    limpiarAviso()
  }

  const fallo = (mensaje: string, m?: MotivoAcceso) => {
    setAviso({ texto: mensaje, bueno: false })
    if (m) setMotivo(m)
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    limpiarAviso()
    const pidiendoEnlace = modo === 'entrar' && !conClave
    const r = pidiendoEnlace
      ? await pedirEnlace(correo)
      : modo === 'entrar'
        ? await entrar(correo, contrasena)
        : modo === 'crear'
          ? await registrarse(correo, contrasena)
          : await recuperarContrasena(correo)
    setEnviando(false)

    if (!r.ok) {
      fallo(r.mensaje, r.motivo)
      return
    }

    setContrasena('')
    if (pidiendoEnlace) {
      setEnlaceEnviado(true)
      return
    }
    // Al entrar bien no hay nada más que decir: se cierra y se ve la
    // aplicación ya sincronizando.
    if (modo === 'entrar' && !r.aviso) {
      onCerrar()
      return
    }
    if (r.aviso) setAviso({ texto: r.aviso, bueno: true })
  }

  const otroEnlace = async () => {
    setReenviando(true)
    limpiarAviso()
    const r = await pedirEnlace(correo)
    setReenviando(false)
    setAviso(
      r.ok
        ? { texto: 'Enviado. Abre el último que te llegue: los anteriores dejan de valer.', bueno: true }
        : { texto: r.mensaje, bueno: false }
    )
  }

  const guardarClaveNueva = async (e: FormEvent) => {
    e.preventDefault()
    if (claveNueva !== claveRepetida) {
      fallo('Las dos contraseñas no coinciden.')
      return
    }
    setEnviando(true)
    limpiarAviso()
    const r = await cambiarContrasena(claveNueva)
    setEnviando(false)
    if (!r.ok) {
      fallo(r.mensaje, r.motivo)
      return
    }
    setClaveNueva('')
    setClaveRepetida('')
    setCambiando(false)
    sync.terminarRecuperacion()
    setAviso({ texto: r.aviso || 'Contraseña cambiada.', bueno: true })
  }

  const cerrar = () => {
    limpiarAviso()
    sync.descartarAviso()
    sync.terminarRecuperacion()
    setCambiando(false)
    onCerrar()
  }
  cerrarRef.current = cerrar

  // El aviso del enlace del correo manda mientras no haya uno más reciente.
  const aMostrar: Aviso = aviso || (sync.avisoEnlace ? { texto: sync.avisoEnlace, bueno: false } : null)
  const ofrecerReenvio = !!sync.avisoEnlace || motivo === 'sin-confirmar' || motivo === 'enlace-caducado'
  // Al volver del enlace de recuperación hay sesión abierta, pero lo que toca
  // es escribir la contraseña nueva, no ver el estado de la sincronización.
  const poniendoClave = sync.recuperandoClave || cambiando
  const pidiendoEnlace = modo === 'entrar' && !conClave

  const bloqueAviso = aMostrar && (
    <p className={aMostrar.bueno ? 'aviso-bloque bueno' : 'aviso-campo'}>{aMostrar.texto}</p>
  )

  const titulo = poniendoClave
    ? 'Elige una contraseña nueva'
    : enlaceEnviado
      ? 'Mira tu correo'
      : sync.correo
        ? 'Tu cuenta'
        : 'Sincronizar entre dispositivos'

  return (
    <div
      className="modal-overlay"
      onMouseDown={e => {
        if (e.target === e.currentTarget) cerrar()
      }}
    >
      <div ref={dialogo} className="modal modal-estrecho" role="dialog" aria-modal="true" aria-label="Cuenta">
        <div className="modal-head">
          <div>
            <span className="eyebrow">CUENTA</span>
            <h2>{titulo}</h2>
          </div>
          <button className="icon-button" onClick={cerrar} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {!haySincronizacion() ? (
          <div className="nota-cuenta">
            <p>
              <b>La sincronización no está configurada todavía.</b>
            </p>
            <p>
              FinControl funciona igual, pero tus datos viven solo en este navegador: no viajan a tu móvil ni
              a tu PC.
            </p>
          </div>
        ) : poniendoClave ? (
          <form onSubmit={guardarClaveNueva}>
            <div className="nota-cuenta">
              <p>
                Escríbela dos veces para no quedarte fuera por una errata. Puedes pulsar el ojo para verla
                mientras la escribes.
              </p>
            </div>
            <CampoClave
              id="clave-nueva"
              etiqueta="Contraseña nueva"
              autocompletar="new-password"
              valor={claveNueva}
              onCambiar={setClaveNueva}
            />
            <CampoClave
              id="clave-repetida"
              etiqueta="Repítela"
              autocompletar="new-password"
              valor={claveRepetida}
              onCambiar={setClaveRepetida}
              placeholder="La misma otra vez"
            />
            {bloqueAviso}
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setCambiando(false)
                  sync.terminarRecuperacion()
                  limpiarAviso()
                }}
              >
                Cancelar
              </button>
              <button className="btn-primary" type="submit" disabled={enviando}>
                {enviando ? 'Un momento…' : 'Guardar contraseña'}
              </button>
            </div>
          </form>
        ) : sync.correo ? (
          <>
            <div className="setting-row">
              <div>
                <b>Sesión iniciada</b>
                <small>{sync.correo}</small>
              </div>
              <span className={`status-pill ${sync.estado === 'error' ? 'bad' : ''}`}>
                {sync.estado === 'sincronizando'
                  ? 'Sincronizando…'
                  : sync.estado === 'error'
                    ? 'Con problemas'
                    : hora(sync.ultima)
                      ? `Al día · ${hora(sync.ultima)}`
                      : 'Al día'}
              </span>
            </div>
            {sync.error && <p className="aviso-campo">{sync.error}</p>}
            {bloqueAviso}
            <div className="nota-cuenta">
              <p>
                Tus datos se guardan en este dispositivo y se sincronizan con tu cuenta. Puedes seguir
                registrando movimientos sin conexión: se subirán cuando vuelvas a tenerla.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary ancho"
              onClick={() => {
                setCambiando(true)
                limpiarAviso()
              }}
            >
              <KeyRound size={15} /> Cambiar la contraseña
            </button>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  void sync.cerrarSesion()
                  cerrar()
                }}
              >
                <LogOut size={15} /> Cerrar sesión
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  void sync.sincronizar()
                }}
                disabled={sync.estado === 'sincronizando'}
              >
                <RefreshCw size={15} /> Sincronizar ahora
              </button>
            </div>
          </>
        ) : enlaceEnviado ? (
          // No hay nada que teclear: al abrir el enlace, el cliente de
          // Supabase deja la sesión puesta y la aplicación se entera sola.
          <>
            <div className="nota-cuenta">
              <p>
                Enviamos un enlace de acceso a <b>{correo.trim().toLowerCase()}</b>.
              </p>
              <p>Ábrelo y entrarás sin más. Si no aparece, mira en correo no deseado.</p>
            </div>
            {bloqueAviso}
            <div className="enlaces-cuenta doble">
              <button
                type="button"
                className="enlace"
                onClick={() => {
                  setEnlaceEnviado(false)
                  limpiarAviso()
                }}
              >
                Usar otro correo
              </button>
              <button type="button" className="enlace" onClick={otroEnlace} disabled={reenviando}>
                {reenviando ? 'Enviando…' : 'Enviar otro enlace'}
              </button>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={cerrar}>
                Cerrar
              </button>
            </div>
          </>
        ) : (
          <>
            {modo === 'recuperar' ? (
              <div className="nota-cuenta">
                <p>
                  <b>¿Se te olvidó la contraseña?</b>
                </p>
                <p>
                  Dinos tu correo y te enviamos un enlace para poner una nueva. Ábrelo en este mismo
                  dispositivo.
                </p>
              </div>
            ) : (
              <div className="type-switch" role="tablist">
                <button
                  type="button"
                  className={modo === 'entrar' ? 'selected' : ''}
                  onClick={() => irA('entrar')}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  className={modo === 'crear' ? 'selected' : ''}
                  onClick={() => irA('crear')}
                >
                  Crear cuenta
                </button>
              </div>
            )}

            {externos.includes('google') && modo !== 'recuperar' && (
              <>
                <button
                  type="button"
                  className="boton-google"
                  onClick={async () => {
                    limpiarAviso()
                    const r = await entrarConGoogle()
                    if (!r.ok) fallo(r.mensaje, r.motivo)
                  }}
                >
                  <MarcaGoogle /> Continuar con Google
                </button>
                <div className="separador-o">
                  <span>o con tu correo</span>
                </div>
              </>
            )}

            <form onSubmit={enviar}>
              <label htmlFor="cuenta-correo">Correo</label>
              <input
                id="cuenta-correo"
                type="email"
                required
                autoComplete="email"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
              />
              {!pidiendoEnlace && modo !== 'recuperar' && (
                <CampoClave
                  id="cuenta-clave"
                  etiqueta="Contraseña"
                  autocompletar={modo === 'entrar' ? 'current-password' : 'new-password'}
                  valor={contrasena}
                  onCambiar={setContrasena}
                />
              )}
              {pidiendoEnlace && (
                <p className="pista-campo">
                  Te mandamos un enlace al correo. Lo abres y entras, sin contraseña que recordar.
                </p>
              )}
              {bloqueAviso}
              {ofrecerReenvio && (
                <button
                  type="button"
                  className="btn-secondary ancho"
                  disabled={reenviando || !correo.trim()}
                  onClick={async () => {
                    setReenviando(true)
                    const r = await reenviarConfirmacion(correo)
                    setReenviando(false)
                    sync.descartarAviso()
                    setMotivo(null)
                    setAviso(
                      r.ok
                        ? { texto: r.aviso || 'Correo enviado.', bueno: true }
                        : { texto: r.mensaje, bueno: false }
                    )
                  }}
                >
                  {reenviando ? 'Enviando…' : 'Enviarme otra vez el correo de confirmación'}
                </button>
              )}

              {/* En «crear cuenta» no se ofrece recuperar nada: no hay todavía
                  ninguna contraseña que se haya podido olvidar. */}
              {modo === 'entrar' && (
                <div className="enlaces-cuenta doble">
                  <button
                    type="button"
                    className="enlace"
                    onClick={() => {
                      setConClave(c => !c)
                      limpiarAviso()
                    }}
                  >
                    {conClave ? 'Entrar con un enlace' : 'Entrar con mi contraseña'}
                  </button>
                  {conClave && (
                    <button type="button" className="enlace" onClick={() => irA('recuperar')}>
                      He olvidado la contraseña
                    </button>
                  )}
                </div>
              )}
              {modo === 'recuperar' && (
                <div className="enlaces-cuenta">
                  <button type="button" className="enlace" onClick={() => irA('entrar')}>
                    Volver a entrar
                  </button>
                </div>
              )}

              <div className="nota-cuenta">
                <p>
                  Lo que ya tienes guardado en este navegador se subirá a tu cuenta en la primera
                  sincronización, así que no pierdes nada al entrar.
                </p>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={cerrar}>
                  Cancelar
                </button>
                <button className="btn-primary" type="submit" disabled={enviando}>
                  {enviando
                    ? 'Un momento…'
                    : pidiendoEnlace
                      ? 'Enviarme un enlace'
                      : modo === 'entrar'
                        ? 'Entrar'
                        : modo === 'crear'
                          ? 'Crear cuenta'
                          : 'Enviarme el enlace'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
