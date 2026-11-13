import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { sincronizarTodo } from '../core/motorSincronizacion'
import { Registro } from '../core/sincronizacion'
import { clienteSupabase, haySincronizacion, remotoSupabase, salir } from '../datos/supabase'
import {
  COLECCIONES,
  avisarCambioDatos,
  escribirCortes,
  escribirLista,
  escribirPendientes,
  leerCortes,
  leerLista,
  leerPendientes,
  limpiarDatosSincronizados
} from './almacenLocal'

export type EstadoConexion = 'sin-configurar' | 'desconectado' | 'listo' | 'sincronizando' | 'error'

export type Sincronizacion = {
  estado: EstadoConexion
  correo: string | null
  ultima: string | null
  error: string | null
  sincronizar: () => Promise<void>
  cerrarSesion: () => Promise<void>
}

/** Cada cuánto se sincroniza sola mientras la pestaña está abierta. */
const CADA = 2 * 60 * 1000

/**
 * Mantiene la sesión y sincroniza.
 *
 * Sin credenciales configuradas, o sin sesión iniciada, la aplicación sigue
 * funcionando entera contra el almacenamiento del navegador: la cuenta añade
 * la sincronización, no es un requisito para usarla.
 */
export function useSincronizacion(): Sincronizacion {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [estado, setEstado] = useState<EstadoConexion>(
    haySincronizacion() ? 'desconectado' : 'sin-configurar'
  )
  const [ultima, setUltima] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const enCurso = useRef(false)

  useEffect(() => {
    if (!clienteSupabase) return
    let vivo = true
    clienteSupabase.auth.getSession().then(({ data }) => {
      if (!vivo) return
      setSesion(data.session)
      setEstado(data.session ? 'listo' : 'desconectado')
    })
    const { data } = clienteSupabase.auth.onAuthStateChange((_evento, nueva) => {
      setSesion(nueva)
      setEstado(nueva ? 'listo' : 'desconectado')
    })
    return () => {
      vivo = false
      data.subscription.unsubscribe()
    }
  }, [])

  const sincronizar = useCallback(async () => {
    if (!clienteSupabase || !sesion || enCurso.current) return
    enCurso.current = true
    setEstado('sincronizando')
    setError(null)
    try {
      const remoto = remotoSupabase(clienteSupabase, sesion.user.id)

      const locales: Record<string, Registro[]> = {}
      for (const [nombre, clave] of Object.entries(COLECCIONES)) {
        locales[nombre] = leerLista<Registro>(clave, [])
      }
      const pendientes: Record<string, string[]> = {}
      for (const [nombre, clave] of Object.entries(COLECCIONES)) {
        pendientes[nombre] = leerPendientes(clave)
      }

      const r = await sincronizarTodo(remoto, locales, { cortes: leerCortes(), pendientes })

      for (const [nombre, clave] of Object.entries(COLECCIONES)) {
        const resultado = r.porColeccion[nombre]
        if (resultado) escribirLista(clave, resultado.registros)
        escribirPendientes(clave, r.pendientes[nombre] || [])
      }
      escribirCortes(r.cortes)
      avisarCambioDatos()

      const fallos = Object.values(r.fallos)
      if (fallos.length) {
        setError(fallos[0])
        setEstado('error')
      } else {
        setUltima(new Date().toISOString())
        setEstado('listo')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setEstado('error')
    } finally {
      enCurso.current = false
    }
  }, [sesion])

  // Al iniciar sesión, y cada dos minutos mientras la pestaña esté abierta.
  useEffect(() => {
    if (!sesion) return
    void sincronizar()
    const intervalo = setInterval(() => {
      void sincronizar()
    }, CADA)
    const alVolver = () => {
      if (document.visibilityState === 'visible') void sincronizar()
    }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('online', alVolver)
    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('online', alVolver)
    }
  }, [sesion, sincronizar])

  const cerrarSesion = useCallback(async () => {
    // Se intenta subir lo pendiente antes de irse, para no dejar nada atrás.
    await sincronizar().catch(() => {})
    await salir()
    limpiarDatosSincronizados()
    avisarCambioDatos()
    setUltima(null)
  }, [sincronizar])

  return {
    estado,
    correo: sesion?.user?.email ?? null,
    ultima,
    error,
    sincronizar,
    cerrarSesion
  }
}
