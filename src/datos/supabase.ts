/**
 * Conexión con Supabase: acceso de usuario y el `Remoto` que usa el motor de
 * sincronización.
 *
 * Si no hay credenciales configuradas, `clienteSupabase` es null y la
 * aplicación funciona exactamente como hasta ahora: todo local, sin cuenta y
 * sin sincronizar. Nada de esto es obligatorio para usarla.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Remoto, RespuestaRemota } from '../core/motorSync'
import { Registro } from '../core/sincronizacion'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const CLAVE = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * La clave anónima está pensada para vivir en el navegador: no da acceso a
 * nada por sí sola, porque las políticas de la base de datos atan cada fila a
 * su usuario. La clave de servicio, en cambio, nunca debe aparecer aquí.
 */
export const clienteSupabase: SupabaseClient | null =
  URL && CLAVE ? createClient(URL, CLAVE, { auth: { persistSession: true, autoRefreshToken: true } }) : null

export const haySincronizacion = () => clienteSupabase !== null

const TABLA = 'registros'

/** Fila tal y como viaja a la base de datos. */
type Fila = {
  usuario_id: string
  coleccion: string
  id: string
  datos: Record<string, unknown>
  actualizado_en: string
  eliminado_en: string | null
}

const aRegistro = (fila: Fila): Registro =>
  ({ ...(fila.datos as object), id: fila.id, actualizadoEn: fila.actualizado_en,
     ...(fila.eliminado_en ? { eliminadoEn: fila.eliminado_en } : {}) } as Registro)

const aFila = (usuarioId: string, coleccion: string, r: Registro): Fila => ({
  usuario_id: usuarioId,
  coleccion,
  id: r.id,
  datos: r as unknown as Record<string, unknown>,
  actualizado_en: r.actualizadoEn || '',
  eliminado_en: r.eliminadoEn || null
})

/** Implementación de `Remoto` contra Supabase. */
export function remotoSupabase(cliente: SupabaseClient, usuarioId: string): Remoto {
  return {
    async traer(coleccion, desde): Promise<RespuestaRemota> {
      let consulta = cliente.from(TABLA).select('*').eq('coleccion', coleccion)
      if (desde) consulta = consulta.gt('servidor_en', desde)
      const { data, error } = await consulta
      if (error) throw new Error(error.message)

      const { data: ahora, error: errorHora } = await cliente.rpc('ahora_servidor')
      if (errorHora) throw new Error(errorHora.message)

      return {
        registros: (data as Fila[]).map(aRegistro),
        servidorEn: String(ahora)
      }
    },

    async enviar(coleccion, registros) {
      if (!registros.length) return
      const filas = registros.map(r => aFila(usuarioId, coleccion, r))
      // onConflict por la clave primaria: una segunda subida del mismo
      // registro lo actualiza en vez de fallar.
      const { error } = await cliente.from(TABLA).upsert(filas, { onConflict: 'usuario_id,coleccion,id' })
      if (error) throw new Error(error.message)
    }
  }
}

// --- Acceso -----------------------------------------------------------------

export type ResultadoAcceso = { ok: true } | { ok: false; mensaje: string }

/**
 * Traduce los errores de Supabase, que llegan en inglés y en su jerga, a algo
 * que una persona pueda leer y actuar en consecuencia.
 */
const explicar = (mensaje: string): string => {
  const m = mensaje.toLowerCase()
  if (m.includes('invalid login')) return 'El correo o la contraseña no son correctos.'
  if (m.includes('email not confirmed')) return 'Falta confirmar el correo. Revisa tu bandeja de entrada.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ese correo ya tiene cuenta. Entra con tu contraseña.'
  if (m.includes('password should be at least')) return 'La contraseña es demasiado corta: usa al menos 6 caracteres.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos seguidos. Espera un momento.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'No hay conexión con el servidor.'
  if (m.includes('is invalid') && m.includes('email')) return 'Ese correo no es válido. Usa una dirección real: el servidor rechaza los dominios de ejemplo y los desechables.'
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'El registro de cuentas nuevas está cerrado en este proyecto.'
  if (m.includes('user not found')) return 'No hay ninguna cuenta con ese correo.'
  if (m.includes('weak password')) return 'La contraseña es demasiado débil. Mézclala con números o símbolos.'
  return mensaje
}

export async function entrar(correo: string, contrasena: string): Promise<ResultadoAcceso> {
  if (!clienteSupabase) return { ok: false, mensaje: 'La sincronización no está configurada.' }
  const { error } = await clienteSupabase.auth.signInWithPassword({ email: correo.trim(), password: contrasena })
  return error ? { ok: false, mensaje: explicar(error.message) } : { ok: true }
}

export async function registrarse(correo: string, contrasena: string): Promise<ResultadoAcceso> {
  if (!clienteSupabase) return { ok: false, mensaje: 'La sincronización no está configurada.' }
  const { error } = await clienteSupabase.auth.signUp({ email: correo.trim(), password: contrasena })
  return error ? { ok: false, mensaje: explicar(error.message) } : { ok: true }
}

export async function salir() {
  await clienteSupabase?.auth.signOut()
}
