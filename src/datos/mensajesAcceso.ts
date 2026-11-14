/**
 * Traduce los errores de acceso de Supabase.
 *
 * Llegan en inglés y en su jerga; aquí se convierten en algo que una persona
 * pueda leer y sobre lo que pueda actuar. Módulo propio y puro, sin depender
 * de Supabase, para poder probar el orden de las comprobaciones: varios
 * mensajes comparten palabras y el primero que coincide es el que gana.
 */
export const explicarError = (mensaje: string): string => {
  const m = mensaje.toLowerCase()

  // Lo que devuelve el enlace del correo va primero: su descripción es
  // "Email link is invalid or has expired", que contiene a la vez "email" e
  // "is invalid". Si se comprobara después de la regla del correo no válido,
  // esa la capturaría y mostraría un motivo que no tiene nada que ver.
  if (m.includes('otp_expired') || (m.includes('expired') && m.includes('link')))
    return 'El enlace del correo caducó o ya se había usado. Pide uno nuevo desde aquí.'
  if (m.includes('access_denied')) return 'El enlace del correo no sirvió. Pide uno nuevo desde aquí.'

  if (m.includes('invalid login')) return 'El correo o la contraseña no son correctos.'
  if (m.includes('email not confirmed')) return 'Falta confirmar el correo. Revisa tu bandeja de entrada.'
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Ese correo ya tiene cuenta. Entra con tu contraseña.'
  if (m.includes('password should be at least'))
    return 'La contraseña es demasiado corta: usa al menos 6 caracteres.'
  if (m.includes('weak password')) return 'La contraseña es demasiado débil. Mézclala con números o símbolos.'
  // La de Supabase es: Email address "x@y" is invalid
  if (m.includes('email address') && m.includes('is invalid'))
    return 'Ese correo no es válido. Usa una dirección real: el servidor rechaza los dominios de ejemplo y los desechables.'
  if (m.includes('signups not allowed') || m.includes('signup is disabled'))
    return 'El registro de cuentas nuevas está cerrado en este proyecto.'
  if (m.includes('user not found')) return 'No hay ninguna cuenta con ese correo.'
  if (m.includes('for security purposes')) return 'Espera un minuto antes de pedir otro correo.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Demasiados intentos seguidos. Espera un momento.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'No hay conexión con el servidor.'
  return mensaje
}
