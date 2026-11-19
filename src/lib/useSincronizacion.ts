import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { reconciliarTrasSync, sincronizarTodo } from '../core/motorSincronizacion'
import { Registro } from '../core/sincronizacion'
import {
  clienteSupabase,
  esEnlaceDeRecuperacion,
  haySincronizacion,
  leerResultadoDelEnlace,
  remotoSupabase,
  salir
} from '../datos/supabase'
import {
  COLECCIONES_SINCRONIZABLES,
  alEscribirLocal,
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
  /** Lo que ha subido y lo que ha bajado de nuevo desde que se abrió la aplicación. */
  resumen: { enviados: number; recibidos: number } | null
  error: string | null
  /** Lo que Supabase devolvió al volver del enlace del correo, si algo falló. */
  avisoEnlace: string | null
  descartarAviso: () => void
  /** Cierto al volver del enlace de «he olvidado la contraseña». */
  recuperandoClave: boolean
  terminarRecuperacion: () => void
  sincronizar: () => Promise<void>
  cerrarSesion: () => Promise<void>
}

/** Cada cuánto se sincroniza sola mientras la pestaña está abierta. */
const CADA = 2 * 60 * 1000

/**
 * Cuánto se espera, tras guardar algo, antes de subirlo. Es un plazo que fija el
 * primer cambio: no se reinicia con cada tecla ni cada campo, para que quien
 * escribe sin parar no deje de subir nunca, ni para que cada pulsación sea una
 * ronda con el servidor.
 */
const AL_GUARDAR = 3000
/** Si se guardó algo mientras subía otra cosa, se vuelve a subir pronto. */
const AL_REPETIR = 400

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
  const [resumen, setResumen] = useState<{ enviados: number; recibidos: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Se lee una sola vez, al arrancar: el fragmento de la dirección llega con
  // la primera carga y se limpia al leerlo.
  const [avisoEnlace, setAvisoEnlace] = useState<string | null>(() => leerResultadoDelEnlace())
  // El enlace de recuperación deja una sesión abierta igual que cualquier
  // otra; lo único que la distingue es este aviso del cliente. Sin mirarlo, la
  // persona volvería del correo «ya dentro» y sin pantalla donde escribir la
  // contraseña nueva, que es justo a lo que iba.
  const [recuperandoClave, setRecuperandoClave] = useState(() => esEnlaceDeRecuperacion())
  const enCurso = useRef(false)
  const repetir = useRef(false)

  useEffect(() => {
    if (!clienteSupabase) return
    let vivo = true
    clienteSupabase.auth.getSession().then(({ data }) => {
      if (!vivo) return
      setSesion(data.session)
      setEstado(data.session ? 'listo' : 'desconectado')
    })
    const { data } = clienteSupabase.auth.onAuthStateChange((evento, nueva) => {
      setSesion(nueva)
      setEstado(nueva ? 'listo' : 'desconectado')
      if (evento === 'PASSWORD_RECOVERY') setRecuperandoClave(true)
    })
    return () => {
      vivo = false
      data.subscription.unsubscribe()
    }
  }, [])

  const ejecutarRef = useRef<(rapida: boolean) => Promise<void>>(async () => {})
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  /** Pide una subida rápida dentro de `ms`. Si ya hay una pedida, esa vale. */
  const pedirSubida = useCallback((ms: number) => {
    if (temporizador.current !== undefined) return
    temporizador.current = setTimeout(() => {
      temporizador.current = undefined
      void ejecutarRef.current(true)
    }, ms)
  }, [])

  const cancelarSubida = useCallback(() => {
    if (temporizador.current === undefined) return
    clearTimeout(temporizador.current)
    temporizador.current = undefined
  }, [])

  /**
   * Una vuelta de sincronización.
   *
   * `rapida` es la que se lanza al guardar: solo recorre las colecciones con
   * algo pendiente, sin mirar las demás, y no enseña «sincronizando» para que
   * el icono no parpadee con cada guardado. La completa recorre todo.
   */
  const ejecutar = useCallback(
    async (rapida: boolean) => {
      if (!clienteSupabase || !sesion) return
      if (enCurso.current) {
        // Ya hay una vuelta en marcha: lo que se acaba de guardar no estaba en
        // ella, así que se pide otra en cuanto termine.
        if (rapida) repetir.current = true
        return
      }
      // Sin conexión no se intenta: cada guardado fallaría con un error. Al
      // volver la conexión, el evento `online` lanza una vuelta completa.
      if (rapida && navigator.onLine === false) return

      // Lo que hay guardado al empezar. Se necesita después para saber qué se
      // escribió mientras tanto.
      const alEmpezar: Record<string, { locales: Registro[]; pendientes: string[] }> = {}
      for (const [nombre, clave] of Object.entries(COLECCIONES_SINCRONIZABLES)) {
        const pendientes = leerPendientes(clave)
        if (rapida && !pendientes.length) continue
        alEmpezar[nombre] = { locales: leerLista<Registro>(clave, []), pendientes }
      }
      if (!Object.keys(alEmpezar).length) return

      enCurso.current = true
      if (!rapida) setEstado('sincronizando')
      setError(null)
      try {
        const remoto = remotoSupabase(clienteSupabase, sesion.user.id)
        const locales: Record<string, Registro[]> = {}
        const pendientes: Record<string, string[]> = {}
        for (const [nombre, foto] of Object.entries(alEmpezar)) {
          locales[nombre] = foto.locales
          pendientes[nombre] = foto.pendientes
        }

        const r = await sincronizarTodo(remoto, locales, { cortes: leerCortes(), pendientes })

        // Desde aquí, todo seguido y sin esperas: se lee lo que hay guardado
        // AHORA, se reconcilia con el resultado y se escribe. Si en lo que tardó
        // el servidor se guardó algo, se conserva en lugar de pisarlo.
        for (const nombre of Object.keys(alEmpezar)) {
          const clave = COLECCIONES_SINCRONIZABLES[nombre]
          const resultado = r.porColeccion[nombre]
          if (!resultado) continue
          const final = reconciliarTrasSync(
            alEmpezar[nombre],
            { locales: leerLista<Registro>(clave, []), pendientes: leerPendientes(clave) },
            { registros: resultado.registros, pendientes: r.pendientes[nombre] || [] }
          )
          escribirLista(clave, final.registros)
          escribirPendientes(clave, final.pendientes)
        }
        // Los cortes de las colecciones que no entraron en una vuelta rápida
        // se conservan tal cual: `r.cortes` parte de los guardados.
        escribirCortes(r.cortes)
        avisarCambioDatos()

        const fallos = Object.values(r.fallos)
        if (fallos.length) {
          setError(fallos[0])
          setEstado('error')
        } else {
          setUltima(new Date().toISOString())
          // Se acumula: si solo se enseñara la última vuelta, una segunda pulsación
          // de «Sincronizar ahora» (que sube 0 y baja 0) taparía la que sí subió.
          setResumen(previo => ({
            enviados: (previo?.enviados ?? 0) + r.enviados,
            recibidos: (previo?.recibidos ?? 0) + r.novedades
          }))
          setEstado('listo')
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        setEstado('error')
      } finally {
        enCurso.current = false
        if (repetir.current) {
          repetir.current = false
          pedirSubida(AL_REPETIR)
        }
      }
    },
    [sesion, pedirSubida]
  )
  ejecutarRef.current = ejecutar

  const sincronizar = useCallback(() => ejecutar(false), [ejecutar])

  // Al iniciar sesión, cada dos minutos mientras la pestaña esté abierta, al
  // volver a ella y al recuperar la conexión: una vuelta completa.
  // Además, poco después de guardar algo, y al ocultar la pestaña: una rápida.
  useEffect(() => {
    if (!sesion) return
    void ejecutar(false)
    const intervalo = setInterval(() => {
      void ejecutar(false)
    }, CADA)
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'visible') {
        void ejecutar(false)
      } else {
        // Se va a ocultar o cerrar: lo pendiente sale ya, sin esperar el plazo.
        // El navegador no garantiza que la petición termine, pero lo que no
        // salga queda en la cola local y sale la próxima vez que se abra.
        cancelarSubida()
        void ejecutar(true)
      }
    }
    const alVolverLaConexion = () => void ejecutar(false)
    const alSalir = () => {
      cancelarSubida()
      void ejecutar(true)
    }
    document.addEventListener('visibilitychange', alCambiarVisibilidad)
    window.addEventListener('online', alVolverLaConexion)
    window.addEventListener('pagehide', alSalir)
    const dejarDeEscuchar = alEscribirLocal(() => pedirSubida(AL_GUARDAR))
    return () => {
      clearInterval(intervalo)
      cancelarSubida()
      dejarDeEscuchar()
      document.removeEventListener('visibilitychange', alCambiarVisibilidad)
      window.removeEventListener('online', alVolverLaConexion)
      window.removeEventListener('pagehide', alSalir)
    }
  }, [sesion, ejecutar, pedirSubida, cancelarSubida])

  const cerrarSesion = useCallback(async () => {
    // Se intenta subir lo pendiente antes de irse, para no dejar nada atrás.
    await sincronizar().catch(() => {})
    await salir()
    limpiarDatosSincronizados()
    avisarCambioDatos()
    setUltima(null)
    setResumen(null)
    setRecuperandoClave(false)
  }, [sincronizar])

  return {
    estado,
    correo: sesion?.user?.email ?? null,
    ultima,
    resumen,
    error,
    avisoEnlace,
    descartarAviso: () => setAvisoEnlace(null),
    recuperandoClave,
    terminarRecuperacion: () => setRecuperandoClave(false),
    sincronizar,
    cerrarSesion
  }
}
