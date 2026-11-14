import { describe, expect, it } from 'vitest'
import {
  explicarError,
  interpretarRegistro,
  motivoDeError,
  proveedoresDe,
  tipoDelEnlace
} from './mensajesAcceso'

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

describe('mensajes nuevos', () => {
  const casos: [string, string][] = [
    ['New password should be different from the old password.', 'distinta'],
    ['Auth session missing!', 'ya no vale'],
    ['Email rate limit exceeded', 'límite'],
    ['Weak password: too short', 'débil']
  ]

  it.each(casos)('traduce %s', (entrada, esperado) => {
    expect(explicarError(entrada)).toContain(esperado)
  })

  it('el límite de correos no se confunde con el de intentos', () => {
    // Los dos contienen "rate limit"; el del correo da una salida concreta.
    expect(explicarError('Email rate limit exceeded')).toContain('Supabase')
    expect(explicarError('Request rate limit reached')).toContain('Espera un momento')
  })

  it('al no acordarse de la contraseña, se ofrece recuperarla', () => {
    expect(explicarError('Invalid login credentials')).toContain('He olvidado la contraseña')
  })
})

describe('motivo del error', () => {
  const casos: [string, string][] = [
    ['Email not confirmed', 'sin-confirmar'],
    ['otp_expired Email link is invalid or has expired', 'enlace-caducado'],
    ['Auth session missing!', 'enlace-caducado'],
    ['User already registered', 'ya-existe'],
    ['Invalid login credentials', 'credenciales'],
    ['Something else entirely', 'otro']
  ]

  it.each(casos)('%s es %s', (entrada, esperado) => {
    expect(motivoDeError(entrada)).toBe(esperado)
  })
})

describe('interpretar un registro', () => {
  // Esto es lo que devuelve Supabase cuando el correo ya tiene cuenta: un
  // usuario sin identidades, sin error y sin haber cambiado nada.
  const yaExiste = { user: { identities: [] }, session: null }

  it('un correo que ya tiene cuenta no es un alta', () => {
    const r = interpretarRegistro(yaExiste)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.motivo).toBe('ya-existe')
    expect(r.mensaje).toContain('ya tiene cuenta')
  })

  it('y dice que la contraseña escrita no se ha guardado', () => {
    const r = interpretarRegistro(yaExiste)
    expect(r.ok).toBe(false)
    if (r.ok) return
    // Lo que desconcierta es creer que la contraseña recién escrita ya vale.
    expect(r.mensaje).toContain('ni se ha cambiado la contraseña')
  })

  it('un alta con sesión entra directamente', () => {
    const r = interpretarRegistro({ user: { identities: [{}] }, session: { access_token: 'x' } })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.aviso).toContain('Ya estás dentro')
  })

  it('un alta sin sesión manda a confirmar el correo', () => {
    const r = interpretarRegistro({ user: { identities: [{}] }, session: null })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.aviso).toContain('confirmarla')
  })

  it('aguanta una respuesta vacía sin dar un alta por buena a ciegas', () => {
    const r = interpretarRegistro(null)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.aviso).toContain('correo')
  })

  it('sin identidades declaradas no se da por hecho que exista', () => {
    // Clientes antiguos no devuelven el campo: ausente no es lo mismo que vacío.
    const r = interpretarRegistro({ user: {}, session: null })
    expect(r.ok).toBe(true)
  })
})

describe('tipo del enlace del correo', () => {
  it('reconoce el de recuperar la contraseña', () => {
    expect(tipoDelEnlace('#access_token=abc&type=recovery&expires_in=3600')).toBe('recovery')
  })

  it('distingue el de confirmar el alta', () => {
    expect(tipoDelEnlace('#access_token=abc&type=signup')).toBe('signup')
  })

  it('una carga normal no es ningún enlace', () => {
    expect(tipoDelEnlace('')).toBeNull()
    expect(tipoDelEnlace('#')).toBeNull()
    expect(tipoDelEnlace('#error=access_denied&error_code=otp_expired')).toBeNull()
  })
})

describe('proveedores externos', () => {
  it('saca los que están encendidos', () => {
    expect(proveedoresDe({ external: { google: true, github: false, apple: true } })).toEqual([
      'google',
      'apple'
    ])
  })

  it('deja fuera correo y teléfono, que no son botones de otro sitio', () => {
    expect(proveedoresDe({ external: { email: true, phone: true, google: true } })).toEqual(['google'])
  })

  it('sin nada encendido no ofrece ninguno', () => {
    expect(proveedoresDe({ external: { google: false } })).toEqual([])
  })

  it('una respuesta rara no rompe ni inventa proveedores', () => {
    expect(proveedoresDe(null)).toEqual([])
    expect(proveedoresDe({})).toEqual([])
    expect(proveedoresDe('vaya')).toEqual([])
  })
})
