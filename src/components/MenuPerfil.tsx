import { useEffect } from 'react'
import { Settings, Cloud, LogIn, LogOut, Trash2, KeyRound } from 'lucide-react'

/**
 * Menú del avatar de la barra superior.
 *
 * El avatar abría directamente el panel de cuenta, de modo que lo demás —los
 * ajustes, borrar los datos, salir— solo estaba al final de la barra lateral,
 * por debajo del pliegue. Aquí está todo lo que una persona busca cuando pulsa
 * su propia inicial.
 */
export function MenuPerfil({
  correo,
  onCerrar,
  onAjustes,
  onCuenta,
  onBorrarDatos,
  onCerrarSesion
}: {
  correo: string | null
  onCerrar: () => void
  onAjustes: () => void
  onCuenta: () => void
  onBorrarDatos: () => void
  onCerrarSesion: () => void
}) {
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPulsar)
    return () => document.removeEventListener('keydown', alPulsar)
  }, [onCerrar])

  const elegir = (accion: () => void) => () => {
    accion()
    onCerrar()
  }

  return (
    <>
      <div className="menu-fondo" onClick={onCerrar} />
      <div className="menu-perfil" role="menu" aria-label="Perfil">
        <div className="cabecera">
          <b>{correo ? 'Tu cuenta' : 'Sin cuenta'}</b>
          <small>{correo || 'Los datos solo están en este dispositivo'}</small>
        </div>
        <button role="menuitem" onClick={elegir(onAjustes)}>
          <Settings size={15} /> Ajustes
        </button>
        <button role="menuitem" onClick={elegir(onCuenta)}>
          {correo ? <Cloud size={15} /> : <LogIn size={15} />}
          {correo ? 'Cuenta y sincronización' : 'Entrar o crear cuenta'}
        </button>
        {correo && (
          <button role="menuitem" onClick={elegir(onCuenta)}>
            <KeyRound size={15} /> Cambiar la contraseña
          </button>
        )}
        <button role="menuitem" className="peligro" onClick={elegir(onBorrarDatos)}>
          <Trash2 size={15} /> Borrar todos mis datos
        </button>
        {correo && (
          <button role="menuitem" onClick={elegir(onCerrarSesion)}>
            <LogOut size={15} /> Cerrar sesión
          </button>
        )}
      </div>
    </>
  )
}
