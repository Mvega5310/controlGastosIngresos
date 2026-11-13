/**
 * Base de la sincronización entre dispositivos.
 *
 * Módulo puro: no habla con ningún servidor ni con el navegador. Define qué
 * necesita un registro para poder sincronizarse y cómo se fusionan dos
 * versiones del mismo dato, que es la parte que hay que acertar antes de
 * elegir dónde se guarda.
 *
 * El criterio es "gana la última escritura" (last-write-wins), comparando la
 * marca de tiempo de cada registro. Es suficiente para un uso personal, donde
 * la misma persona edita desde su móvil y su PC y los cambios simultáneos
 * sobre el mismo registro son raros. No vale para edición concurrente entre
 * varias personas: eso pediría otro modelo.
 */

/** Lo que todo registro necesita para poder viajar entre dispositivos. */
export type Registro = {
  id: string
  /** Marca ISO de la última escritura. Decide quién gana en una fusión. */
  actualizadoEn: string
  /**
   * Marca ISO del borrado. Un registro borrado no se elimina de golpe: se
   * marca, para que el otro dispositivo se entere de que desapareció. Si se
   * borrara sin dejar rastro, el otro lo volvería a subir como si fuera nuevo.
   */
  eliminadoEn?: string
}

export const ahora = () => new Date().toISOString()

/** Pone o renueva la marca de tiempo de un registro. */
export const sellar = <T extends { id: string }>(registro: T, momento = ahora()): T & Registro => ({
  ...registro,
  actualizadoEn: momento
})

/** Marca un registro como borrado sin quitarlo todavía. */
export const sellarBorrado = <T extends Registro>(registro: T, momento = ahora()): T => ({
  ...registro,
  actualizadoEn: momento,
  eliminadoEn: momento
})

export const estaBorrado = (r: Partial<Registro>) => Boolean(r.eliminadoEn)

/** Lo que se muestra: todo menos lo borrado. */
export const vivos = <T extends Partial<Registro>>(registros: T[]) => registros.filter(r => !estaBorrado(r))

/**
 * Un registro sin marca de tiempo viene de una versión anterior de la
 * aplicación. Se trata como el más antiguo posible, para que cualquier
 * versión con marca le gane.
 */
const marca = (r: Partial<Registro>) => r.actualizadoEn || ''

/**
 * Fusiona lo que hay en este dispositivo con lo que llega del servidor.
 *
 * Por cada identificador se queda la versión escrita más tarde. Ante un
 * empate exacto gana la remota, para que todos los dispositivos converjan al
 * mismo resultado en vez de que cada uno conserve el suyo.
 */
export const fusionar = <T extends Registro>(locales: T[], remotos: T[]): T[] => {
  const porId = new Map<string, T>()
  for (const r of locales) porId.set(r.id, r)
  for (const r of remotos) {
    const local = porId.get(r.id)
    if (!local || marca(r) >= marca(local)) porId.set(r.id, r)
  }
  return [...porId.values()]
}

/**
 * Quita definitivamente las marcas de borrado ya viejas.
 *
 * Una vez que todos los dispositivos se han enterado del borrado, la marca
 * solo ocupa sitio. Se conserva un margen amplio por si alguno lleva tiempo
 * sin conectarse.
 */
export const purgar = <T extends Registro>(registros: T[], antesDe: string) =>
  registros.filter(r => !(estaBorrado(r) && (r.eliminadoEn || '') < antesDe))

/** Resta días a una marca ISO, para calcular el corte de la purga. */
export const retroceder = (dias: number, desde = ahora()) =>
  new Date(new Date(desde).getTime() - dias * 86400000).toISOString()
