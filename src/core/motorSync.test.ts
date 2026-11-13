import { describe, expect, it } from 'vitest'
import { Remoto, sincronizarColeccion, sincronizarTodo } from './motorSync'
import { Registro } from './sincronizacion'

type Fila = Registro & { nombre: string }

const fila = (id: string, nombre: string, actualizadoEn: string, eliminadoEn?: string): Fila => ({
  id,
  nombre,
  actualizadoEn,
  ...(eliminadoEn ? { eliminadoEn } : {})
})

const ids = (rs: { id: string }[]) => rs.map(r => r.id).sort()

/**
 * Servidor de mentira.
 *
 * Guarda por colección y lleva su propio reloj, separado de las marcas que
 * traen los registros: así las pruebas reproducen el desajuste de relojes
 * que hay en la realidad entre un servidor y un teléfono.
 */
function servidorFalso(inicial: Record<string, Fila[]> = {}) {
  const datos: Record<string, { fila: Fila; servidorEn: string }[]> = {}
  let reloj = 0
  const marcaServidor = () => `S${String(++reloj).padStart(3, '0')}`
  for (const [k, v] of Object.entries(inicial)) {
    datos[k] = v.map(f => ({ fila: f, servidorEn: marcaServidor() }))
  }
  const envios: { coleccion: string; registros: Registro[] }[] = []
  let averiado: string | null = null

  const remoto: Remoto = {
    async traer(coleccion, desde) {
      if (averiado) throw new Error(averiado)
      const todos = datos[coleccion] || []
      return {
        registros: todos.filter(x => x.servidorEn > desde).map(x => x.fila),
        servidorEn: marcaServidor()
      }
    },
    async enviar(coleccion, registros) {
      if (averiado) throw new Error(averiado)
      envios.push({ coleccion, registros: [...registros] })
      const actuales = datos[coleccion] || (datos[coleccion] = [])
      for (const r of registros as Fila[]) {
        const i = actuales.findIndex(x => x.fila.id === r.id)
        // El servidor aplica el mismo criterio que el cliente.
        if (i < 0) actuales.push({ fila: r, servidorEn: marcaServidor() })
        else if ((r.actualizadoEn || '') >= (actuales[i].fila.actualizadoEn || '')) {
          actuales[i] = { fila: r, servidorEn: marcaServidor() }
        }
      }
    }
  }

  return {
    remoto,
    envios,
    contenido: (c: string) => (datos[c] || []).map(x => x.fila),
    romper: (m: string) => {
      averiado = m
    },
    arreglar: () => {
      averiado = null
    }
  }
}

describe('sincronizarColeccion', () => {
  it('sube lo local a un servidor vacío', async () => {
    const s = servidorFalso()
    const locales = [fila('a', 'Mercado', 'T2'), fila('b', 'Salario', 'T3')]
    const r = await sincronizarColeccion(s.remoto, 'movimientos', locales, '', ['a', 'b'])
    expect(r.enviados).toBe(2)
    expect(r.recibidos).toBe(0)
    expect(ids(s.contenido('movimientos'))).toEqual(['a', 'b'])
    expect(r.pendientes).toEqual([])
  })

  it('no sube lo que no está pendiente', async () => {
    const s = servidorFalso()
    const r = await sincronizarColeccion(s.remoto, 'movimientos', [fila('a', 'A', 'T1')], '', [])
    expect(r.enviados).toBe(0)
    expect(s.contenido('movimientos')).toHaveLength(0)
  })

  it('baja lo que solo está en el servidor', async () => {
    const s = servidorFalso({ movimientos: [fila('z', 'Del otro aparato', 'T5')] })
    const r = await sincronizarColeccion(s.remoto, 'movimientos', [] as Fila[], '', [])
    expect(r.recibidos).toBe(1)
    expect(ids(r.registros)).toEqual(['z'])
  })

  it('guarda la hora del servidor como corte, no la del dispositivo', async () => {
    const s = servidorFalso()
    const r = await sincronizarColeccion(s.remoto, 'movimientos', [] as Fila[], '', [])
    expect(r.corte).toMatch(/^S\d{3}$/)
  })

  it('en un conflicto se queda con la versión más reciente', async () => {
    const s = servidorFalso({ movimientos: [fila('a', 'remoto nuevo', 'T9')] })
    const r = await sincronizarColeccion(s.remoto, 'movimientos', [fila('a', 'local viejo', 'T1')], '', ['a'])
    expect(r.registros[0].nombre).toBe('remoto nuevo')
  })

  it('no sube un cambio local que perdió la fusión', async () => {
    // Subirlo revertiría en el servidor algo más nuevo que lo nuestro.
    const s = servidorFalso({ movimientos: [fila('a', 'remoto nuevo', 'T9')] })
    await sincronizarColeccion(s.remoto, 'movimientos', [fila('a', 'local viejo', 'T1')], '', ['a'])
    expect(s.envios).toHaveLength(0)
    expect(s.contenido('movimientos')[0].nombre).toBe('remoto nuevo')
  })

  it('sí sube el cambio local cuando es el más reciente', async () => {
    const s = servidorFalso({ movimientos: [fila('a', 'remoto viejo', 'T1')] })
    const r = await sincronizarColeccion(s.remoto, 'movimientos', [fila('a', 'local nuevo', 'T9')], '', ['a'])
    expect(r.enviados).toBe(1)
    expect(s.contenido('movimientos')[0].nombre).toBe('local nuevo')
  })

  it('propaga un borrado local al servidor', async () => {
    const s = servidorFalso({ movimientos: [fila('a', 'A', 'T1')] })
    await sincronizarColeccion(s.remoto, 'movimientos', [fila('a', 'A', 'T5', 'T5')], '', ['a'])
    expect(s.contenido('movimientos')[0].eliminadoEn).toBe('T5')
  })

  it('sincronizar dos veces seguidas no reenvía ni duplica', async () => {
    const s = servidorFalso()
    const una = await sincronizarColeccion(s.remoto, 'movimientos', [fila('a', 'A', 'T1')], '', ['a'])
    const dos = await sincronizarColeccion(s.remoto, 'movimientos', una.registros, una.corte, una.pendientes)
    expect(dos.enviados).toBe(0)
    expect(s.contenido('movimientos')).toHaveLength(1)
    expect(dos.registros).toHaveLength(1)
    expect(dos.registros[0].nombre).toBe('A')
  })

  it('el corte se toma antes de subir, así que vuelve el propio registro una vez', async () => {
    // Es deliberado: tomarlo después se saltaría lo que otro dispositivo
    // escribiera entre la bajada y la subida. Recibir de más es inofensivo
    // porque la fusión es idempotente; saltarse un cambio no lo sería.
    const s = servidorFalso()
    const una = await sincronizarColeccion(s.remoto, 'm', [fila('a', 'A', 'T1')], '', ['a'])
    const dos = await sincronizarColeccion(s.remoto, 'm', una.registros, una.corte, [])
    expect(dos.recibidos).toBe(1)
    expect(dos.registros).toHaveLength(1)
    const tres = await sincronizarColeccion(s.remoto, 'm', dos.registros, dos.corte, [])
    expect(tres.recibidos).toBe(0)
    expect(tres.registros).toHaveLength(1)
  })

  it('el corte del servidor no se confunde con las marcas del dispositivo', async () => {
    // Las marcas locales empiezan por T y las del servidor por S: si se
    // compararan entre sí, "T1" > "S001" haría reenviar siempre.
    const s = servidorFalso()
    const una = await sincronizarColeccion(s.remoto, 'm', [fila('a', 'A', 'T1')], '', ['a'])
    for (let i = 0; i < 5; i++) {
      const v = await sincronizarColeccion(s.remoto, 'm', una.registros, una.corte, [])
      expect(v.enviados).toBe(0)
    }
    expect(s.envios).toHaveLength(1)
  })
})

describe('dos dispositivos', () => {
  it('lo escrito en el móvil aparece en el PC', async () => {
    const s = servidorFalso()
    const movil = await sincronizarColeccion(s.remoto, 'm', [fila('m1', 'Desde el móvil', 'T2')], '', ['m1'])
    const pc = await sincronizarColeccion(s.remoto, 'm', [fila('p1', 'Desde el PC', 'T3')], '', ['p1'])
    expect(ids(pc.registros)).toEqual(['m1', 'p1'])

    const movil2 = await sincronizarColeccion(s.remoto, 'm', movil.registros, movil.corte, [])
    expect(ids(movil2.registros)).toEqual(['m1', 'p1'])
  })

  it('los dos acaban con el mismo contenido', async () => {
    const s = servidorFalso()
    let movil = await sincronizarColeccion(s.remoto, 'm', [fila('a', 'movil', 'T5')], '', ['a'])
    let pc = await sincronizarColeccion(s.remoto, 'm', [fila('a', 'pc', 'T1')], '', ['a'])
    movil = await sincronizarColeccion(s.remoto, 'm', movil.registros, movil.corte, [])
    pc = await sincronizarColeccion(s.remoto, 'm', pc.registros, pc.corte, [])
    expect(movil.registros[0].nombre).toBe('movil')
    expect(pc.registros[0].nombre).toBe('movil')
  })

  it('un borrado en un aparato desaparece en el otro', async () => {
    const s = servidorFalso()
    const movil = await sincronizarColeccion(s.remoto, 'm', [fila('a', 'A', 'T1')], '', ['a'])
    const pc = await sincronizarColeccion(s.remoto, 'm', [] as Fila[], '', [])
    expect(pc.registros).toHaveLength(1)

    await sincronizarColeccion(s.remoto, 'm', [fila('a', 'A', 'T7', 'T7')], movil.corte, ['a'])
    const pc2 = await sincronizarColeccion(s.remoto, 'm', pc.registros, pc.corte, [])
    expect(pc2.registros[0].eliminadoEn).toBe('T7')
  })
})

describe('sincronizarTodo', () => {
  const estado = (cortes = {}, pendientes = {}) => ({ cortes, pendientes })

  it('recorre todas las colecciones y suma lo subido', async () => {
    const s = servidorFalso()
    const r = await sincronizarTodo(
      s.remoto,
      {
        movimientos: [fila('a', 'A', 'T1')],
        presupuestos: [fila('b', 'B', 'T1'), fila('c', 'C', 'T1')]
      },
      estado({}, { movimientos: ['a'], presupuestos: ['b', 'c'] })
    )
    expect(r.enviados).toBe(3)
    expect(Object.keys(r.porColeccion).sort()).toEqual(['movimientos', 'presupuestos'])
    expect(r.fallos).toEqual({})
  })

  it('si una colección falla, las demás siguen', async () => {
    const s = servidorFalso()
    s.romper('sin conexión')
    const r = await sincronizarTodo(
      s.remoto,
      { movimientos: [fila('a', 'A', 'T1')] },
      estado({}, { movimientos: ['a'] })
    )
    expect(r.fallos.movimientos).toBe('sin conexión')
    expect(r.porColeccion.movimientos.registros).toHaveLength(1)
  })

  it('tras un fallo conserva los pendientes y la siguiente vuelta los sube', async () => {
    const s = servidorFalso()
    s.romper('sin conexión')
    const locales = [fila('a', 'A', 'T1')]
    const primera = await sincronizarTodo(
      s.remoto,
      { movimientos: locales },
      estado({}, { movimientos: ['a'] })
    )
    expect(primera.pendientes.movimientos).toEqual(['a'])

    s.arreglar()
    const segunda = await sincronizarTodo(
      s.remoto,
      { movimientos: locales },
      estado(primera.cortes, primera.pendientes)
    )
    expect(segunda.enviados).toBe(1)
    expect(segunda.pendientes.movimientos).toEqual([])
    expect(s.contenido('movimientos')).toHaveLength(1)
  })

  it('respeta los pendientes de cada colección por separado', async () => {
    const s = servidorFalso()
    const r = await sincronizarTodo(
      s.remoto,
      {
        movimientos: [fila('a', 'A', 'T1')],
        metas: [fila('b', 'B', 'T1')]
      },
      estado({}, { metas: ['b'] })
    )
    expect(r.porColeccion.movimientos.enviados).toBe(0)
    expect(r.porColeccion.metas.enviados).toBe(1)
  })
})
