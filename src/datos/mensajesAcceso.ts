/**
 * Interpreta lo que responde Supabase al entrar, registrarse o recuperar la
 * contraseña.
 *
 * Los errores llegan en inglés y en su jerga; aquí se convierten en algo que
 * una persona pueda leer y sobre lo que pueda actuar. Y hay respuestas que no
 * son errores pero tampoco significan lo que parecen: un registro sobre un
 * correo que ya tiene cuenta devuelve «ok» sin haber creado nada.
 *
 * Módulo propio y puro, sin depender de Supabase, para poder probar el orden
 * de las comprobaciones: varios mensajes comparten palabras y el primero que
 * coincide es el que gana.
 */

/** Por qué no se pudo entrar, cuando saberlo cambia lo que ofrecemos hacer. */
export type MotivoAcceso = 'sin-confirmar' | 'ya-existe' | 'credenciales' | 'enlace-caducado' | 'otro'

export type ResultadoAcceso =
  | { ok: true; aviso?: string }
  | { ok: false; mensaje: string; motivo: MotivoAcceso }

export const explicarError = (mensaje: string): string => {
  const m = mensaje.toLowerCase()

  // Lo que devuelve el enlace del correo va primero: su descripción es
  // "Email link is invalid or has expired", que contiene a la vez "email" e
  // "is invalid". Si se comprobara después de la regla del correo no válido,
  // esa la capturaría y mostraría un motivo que no tiene nada que ver.
  if (m.includes('otp_expired') || (m.includes('expired') && m.includes('link')))
    return 'El enlace del correo caducó o ya se había usado. Pide uno nuevo desde aquí.'
  if (m.includes('access_denied')) return 'El enlace del correo no sirvió. Pide uno nuevo desde aquí.'

  if (m.includes('invalid login'))
    return 'El correo o la contraseña no son correctos. Si no te acuerdas, usa «He olvidado la contraseña».'
  if (m.includes('email not confirmed'))
    return 'Falta confirmar el correo. Busca el mensaje que te enviamos, o pide otro aquí abajo.'
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Ese correo ya tiene cuenta. Entra con tu contraseña.'
  if (m.includes('should be different') || m.includes('same as the old'))
    return 'La contraseña nueva tiene que ser distinta de la anterior.'
  if (m.includes('password should be at least'))
    return 'La contraseña es demasiado corta: usa al menos 6 caracteres.'
  if (m.includes('weak password')) return 'La contraseña es demasiado débil. Mézclala con números o símbolos.'
  // La de Supabase es: Email address "x@y" is invalid
  if (m.includes('email address') && m.includes('is invalid'))
    return 'Ese correo no es válido. Usa una dirección real: el servidor rechaza los dominios de ejemplo y los desechables.'
  if (m.includes('signups not allowed') || m.includes('signup is disabled'))
    return 'El registro de cuentas nuevas está cerrado en este proyecto.'
  if (m.includes('user not found')) return 'No hay ninguna cuenta con ese correo.'
  // Sin sesión no se puede cambiar la contraseña: el enlace de recuperación es
  // justamente lo que la crea, así que si falta es que caducó.
  if (m.includes('auth session missing') || m.includes('session_not_found'))
    return 'El enlace para cambiar la contraseña ya no vale. Pide otro y ábrelo cuanto antes.'
  if (m.includes('for security purposes')) return 'Espera un minuto antes de pedir otro correo.'
  if (m.includes('email rate limit'))
    return 'El servidor de correo llegó a su límite por ahora. Espera una hora, o desactiva la confirmación por correo en Supabase.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Demasiados intentos seguidos. Espera un momento.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'No hay conexión con el servidor.'
  return mensaje
}

/** Qué motivo hay detrás de un error al entrar, para saber qué ofrecer después. */
export const motivoDeError = (mensaje: string): MotivoAcceso => {
  const m = mensaje.toLowerCase()
  if (m.includes('email not confirmed')) return 'sin-confirmar'
  if (m.includes('otp_expired') || m.includes('access_denied') || m.includes('auth session missing'))
    return 'enlace-caducado'
  if (m.includes('already registered') || m.includes('already been registered')) return 'ya-existe'
  if (m.includes('invalid login')) return 'credenciales'
  return 'otro'
}

/**
 * Qué formas de entrar tiene encendidas el proyecto.
 *
 * Mostrar un botón de Google que el proyecto no tiene configurado solo lleva a
 * una pantalla de error de Google; se pregunta y se enseña lo que hay.
 */
export const proveedoresDe = (ajustes: unknown): string[] => {
  const externos = (ajustes as { external?: Record<string, unknown> } | null)?.external
  if (!externos || typeof externos !== 'object') return []
  return Object.entries(externos)
    .filter(([nombre, encendido]) => encendido === true && nombre !== 'email' && nombre !== 'phone')
    .map(([nombre]) => nombre)
}

/** La forma de la respuesta de `signUp` que nos importa. */
export type RespuestaRegistro = {
  user?: { identities?: unknown[] | null } | null
  session?: unknown | null
}

/**
 * Qué pasó de verdad en un registro.
 *
 * Supabase no dice «ese correo ya tiene cuenta»: respondería a cualquiera que
 * probase direcciones ajenas si existen o no. En su lugar devuelve un usuario
 * falso, sin identidades, y no cambia nada. Si eso se toma por un alta buena,
 * se anuncia una cuenta creada que no existe y luego la contraseña recién
 * escrita no sirve para entrar, que es exactamente lo que desconcierta.
 */
export function interpretarRegistro(data: RespuestaRegistro | null | undefined): ResultadoAcceso {
  const identidades = data?.user?.identities
  if (Array.isArray(identidades) && identidades.length === 0)
    return {
      ok: false,
      motivo: 'ya-existe',
      mensaje:
        'Ese correo ya tiene cuenta, así que no se ha creado ninguna ni se ha cambiado la contraseña. Entra con la que pusiste, o usa «He olvidado la contraseña».'
    }

  if (data?.session) return { ok: true, aviso: 'Cuenta creada. Ya estás dentro.' }

  return {
    ok: true,
    aviso:
      'Cuenta creada. Te enviamos un correo para confirmarla: ábrelo y vuelve aquí. Hasta entonces no podrás entrar.'
  }
}

/**
 * Para qué venía el enlace del correo, leído del fragmento de la dirección.
 *
 * El cliente de Supabase también lo avisa, pero lo hace cuando termina de
 * hablar con el servidor y después de un salto al siguiente ciclo. Si ese
 * aviso llegara antes de que la aplicación se suscribe, la persona volvería de
 * «he olvidado la contraseña» ya dentro y sin dónde escribir la nueva. Leer el
 * fragmento no depende de ese orden.
 */
export const tipoDelEnlace = (fragmento: string): string | null => {
  const bruto = fragmento.replace(/^#/, '')
  if (!bruto) return null
  return new URLSearchParams(bruto).get('type')
}
