/**
 * Motor de sincronización.
 *
 * No sabe qué hay al otro lado: habla con un `Remoto`, del que hay dos
 * implementaciones — una de mentira para las pruebas y la de Supabase. Eso
 * permite probar el comportamiento entero, conflictos y caídas de red
 * incluidos, sin depender de ningún servidor.
 *
 * Hay dos relojes en juego y conviene no mezclarlos:
 *
 * - `actualizadoEn` lo pone el dispositivo y sirve para decidir qué versión
 *   gana en un conflicto.
 * - `servidorEn` lo pone el servidor y sirve para saber qué ha cambiado allí
 *   desde la última vez.
 *
 * Comparar uno con otro es comparar relojes distintos, y con cualquier
 * desajuste se reenviarían cambios ya enviados o se perderían otros. Por eso
 * lo que falta por subir no se deduce de las marcas de tiempo, sino de una
 * lista explícita de pendientes que el almacén mantiene al escribir.
 */
import { Registro, fusionar } from './sincronizacion'

export type RespuestaRemota = {
  /** Lo que cambió en el servidor después de `desde`. */
  registros: Registro[]
  /** Hora del servidor, que será el corte de la próxima vuelta. */
  servidorEn: string
}

export interface Remoto {
  traer(coleccion: string, desde: string): Promise<RespuestaRemota>
  enviar(coleccion: string, registros: Registro[]): Promise<void>
}

export type ResultadoColeccion<T> = {
  registros: T[]
  corte: string
  /** Lo que sigue sin subir: vacío si todo fue bien. */
  pendientes: string[]
  enviados: number
  recibidos: number
}

/**
 * Sincroniza una colección.
 *
 * Primero se trae lo del servidor y se fusiona; solo después se sube lo que la
 * fusión dio por bueno. Al revés, un cambio local viejo pisaría en el servidor
 * uno remoto más reciente.
 *
 * Un pendiente que pierde la fusión deja de estarlo: su versión quedó
 * superada por otra más nueva, y subirlo revertiría el dato bueno.
 */
export async function sincronizarColeccion<T extends Registro>(
  remoto: Remoto, coleccion: string, locales: T[], corte: string, pendientes: string[]
): Promise<ResultadoColeccion<T>> {
  // El corte se toma antes de subir. Tomarlo después se saltaría lo que otro
  // dispositivo escribiera entre la bajada y la subida; así, como mucho, en la
  // vuelta siguiente vuelve lo que acabamos de subir, que es inofensivo porque
  // la fusión es idempotente.
  const { registros: remotos, servidorEn } = await remoto.traer(coleccion, corte)
  const fusionados = fusionar(locales, remotos as T[])

  const porId = new Map(locales.map(r => [r.id, r]))
  const aEnviar = fusionados.filter(f => pendientes.includes(f.id) && porId.get(f.id) === f)

  if (aEnviar.length) await remoto.enviar(coleccion, aEnviar)

  return {
    registros: fusionados,
    corte: servidorEn || corte,
    pendientes: [],
    enviados: aEnviar.length,
    recibidos: remotos.length
  }
}

export type EstadoSync = {
  /** Corte por colección, en hora del servidor. */
  cortes: Record<string, string>
  /** Identificadores escritos aquí que aún no se han subido, por colección. */
  pendientes: Record<string, string[]>
}

export type ResultadoSync = {
  porColeccion: Record<string, { registros: Registro[]; enviados: number; recibidos: number }>
  cortes: Record<string, string>
  pendientes: Record<string, string[]>
  enviados: number
  recibidos: number
  fallos: Record<string, string>
}

/**
 * Sincroniza varias colecciones.
 *
 * Si una falla, las demás siguen: más vale tener la mitad al día que nada. La
 * que falló conserva su corte y sus pendientes, así que la siguiente vuelta
 * recupera el retraso sin perder nada.
 */
export async function sincronizarTodo(
  remoto: Remoto,
  colecciones: Record<string, Registro[]>,
  estado: EstadoSync
): Promise<ResultadoSync> {
  const porColeccion: ResultadoSync['porColeccion'] = {}
  const cortes = { ...estado.cortes }
  const pendientes = { ...estado.pendientes }
  const fallos: Record<string, string> = {}
  let enviados = 0, recibidos = 0

  for (const [nombre, locales] of Object.entries(colecciones)) {
    try {
      const r = await sincronizarColeccion(
        remoto, nombre, locales, cortes[nombre] || '', pendientes[nombre] || []
      )
      porColeccion[nombre] = { registros: r.registros, enviados: r.enviados, recibidos: r.recibidos }
      cortes[nombre] = r.corte
      pendientes[nombre] = r.pendientes
      enviados += r.enviados
      recibidos += r.recibidos
    } catch (e) {
      fallos[nombre] = e instanceof Error ? e.message : String(e)
      porColeccion[nombre] = { registros: locales, enviados: 0, recibidos: 0 }
    }
  }

  return { porColeccion, cortes, pendientes, enviados, recibidos, fallos }
}
