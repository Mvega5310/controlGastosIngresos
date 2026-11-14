import { describe, expect, it } from 'vitest'
import { explicarError } from './mensajesAcceso'

describe('mensajes del enlace del correo', () => {
  // La descripción real que devuelve Supabase al volver de un enlace caducado.
  const DEL_ENLACE = 'otp_expired Email link is invalid or has expired'

  it('un enlace caducado habla del enlace, no del correo', () => {
    const r = explicarError(DEL_ENLACE)
    expect(r).toContain('enlace')
    expect(r).not.toContain('no es válido')
  })

  it('gana sobre la regla del correo aunque compartan palabras', () => {
    // Contiene "email" e "is invalid", igual que el correo no válido: si el
    // orden se invirtiera, este caso mostraría un motivo que no es.
    expect(DEL_ENLACE.toLowerCase()).toContain('email')
    expect(DEL_ENLACE.toLowerCase()).toContain('is invalid')
    expect(explicarError(DEL_ENLACE)).toContain('caducó')
  })

  it('un acceso denegado sin más detalle también habla del enlace', () => {
    expect(explicarError('access_denied')).toContain('enlace')
  })
})

describe('mensajes de acceso', () => {
  const casos: [string, string][] = [
    ['Invalid login credentials', 'contraseña'],
    ['Email not confirmed', 'confirmar'],
    ['User already registered', 'ya tiene cuenta'],
    ['Password should be at least 6 characters', 'demasiado corta'],
    ['Email address "a@example.com" is invalid', 'no es válido'],
    ['Signups not allowed for this instance', 'cerrado'],
    ['User not found', 'ninguna cuenta'],
    ['For security purposes, you can only request this after 51 seconds', 'Espera un minuto'],
    ['Failed to fetch', 'conexión']
  ]

  it.each(casos)('traduce %s', (entrada, esperado) => {
    expect(explicarError(entrada)).toContain(esperado)
  })

  it('un mensaje desconocido se deja tal cual, sin inventar un motivo', () => {
    expect(explicarError('Something nobody foresaw')).toBe('Something nobody foresaw')
  })

  it('no distingue mayúsculas', () => {
    expect(explicarError('INVALID LOGIN CREDENTIALS')).toContain('contraseña')
  })
})
