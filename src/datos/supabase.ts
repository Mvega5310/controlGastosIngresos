/**
 * Conexión con Supabase: acceso de usuario y el `Remoto` que usa el motor de
 * sincronización.
 *
 * Si no hay credenciales configuradas, `clienteSupabase` es null y la
 * aplicación funciona exactamente como hasta ahora: todo local, sin cuenta y
 * sin sincronizar. Nada de esto es obligatorio para usarla.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Remoto, RespuestaRemota } from '../core/motorSincronizacion'
import { Registro } from '../core/sincronizacion'
import { explicarError } from './mensajesAcceso'

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
  ({
    ...(fila.datos as object),
    id: fila.id,
    actualizadoEn: fila.actualizado_en,
    ...(fila.eliminado_en ? { eliminadoEn: fila.eliminado_en } : {})
  }) as Registro

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

export async function entrar(correo: string, contrasena: string): Promise<ResultadoAcceso> {
  if (!clienteSupabase) return { ok: false, mensaje: 'La sincronización no está configurada.' }
  const { error } = await clienteSupabase.auth.signInWithPassword({
    email: correo.trim(),
    password: contrasena
  })
  return error ? { ok: false, mensaje: explicarError(error.message) } : { ok: true }
}

/**
 * A dónde debe volver el enlace del correo.
 *
 * Sin esto, Supabase usa el "Site URL" del panel, que por defecto es
 * http://localhost:3000 — y el enlace acaba en lo que sea que tengas
 * escuchando en ese puerto, no en esta aplicación. Esta dirección tiene que
 * estar además en la lista de "Redirect URLs" del proyecto, o Supabase la
 * ignora y vuelve al Site URL.
 */
const destinoDelEnlace = () => `${window.location.origin}/`

export async function registrarse(correo: string, contrasena: string): Promise<ResultadoAcceso> {
  if (!clienteSupabase) return { ok: false, mensaje: 'La sincronización no está configurada.' }
  const { error } = await clienteSupabase.auth.signUp({
    email: correo.trim(),
    password: contrasena,
    options: { emailRedirectTo: destinoDelEnlace() }
  })
  return error ? { ok: false, mensaje: explicarError(error.message) } : { ok: true }
}

/** Vuelve a enviar el correo de confirmación, para cuando el enlace caducó. */
export async function reenviarConfirmacion(correo: string): Promise<ResultadoAcceso> {
  if (!clienteSupabase) return { ok: false, mensaje: 'La sincronización no está configurada.' }
  const { error } = await clienteSupabase.auth.resend({
    type: 'signup',
    email: correo.trim(),
    options: { emailRedirectTo: destinoDelEnlace() }
  })
  return error ? { ok: false, mensaje: explicarError(error.message) } : { ok: true }
}

/**
 * Lee el resultado que Supabase deja en la dirección al volver del correo.
 *
 * Cuando sale bien, el cliente consume el fragmento por su cuenta y aquí no
 * queda nada. Cuando sale mal llega un `#error=...` que, si nadie lo mira,
 * deja a la persona delante de una pantalla normal sin saber qué pasó.
 * Devuelve el mensaje y limpia la dirección, para que no reaparezca al
 * recargar.
 */
export function leerResultadoDelEnlace(): string | null {
  if (typeof window === 'undefined') return null
  const bruto = window.location.hash.replace(/^#/, '')
  if (!bruto.includes('error')) return null
  const partes = new URLSearchParams(bruto)
  const codigo = partes.get('error_code') || ''
  const descripcion = partes.get('error_description') || partes.get('error') || ''
  history.replaceState(null, '', window.location.pathname + window.location.search)
  return explicarError(`${codigo} ${descripcion}`.trim())
}

export async function salir() {
  await clienteSupabase?.auth.signOut()
}
