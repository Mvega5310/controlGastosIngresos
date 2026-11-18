/**
 * Espacios de trabajo.
 *
 * La misma aplicación guarda dos juegos de datos que nunca se mezclan: el
 * personal de siempre y el de la empresa. Cada uno tiene sus propias cuentas,
 * movimientos y demás, y cambiar de espacio es cambiar de juego de datos, no
 * de filtro: una suma del espacio de la empresa no puede arrastrar un gasto
 * personal por equivocación.
 *
 * Módulo puro, sin navegador ni servidor.
 */

export type Espacio = 'personal' | 'empresa'

export const ESPACIOS: readonly Espacio[] = ['personal', 'empresa']

export const ETIQUETA_ESPACIO: Record<Espacio, string> = {
  personal: 'Personal',
  empresa: 'Empresa'
}

export const esEspacio = (valor: unknown): valor is Espacio => valor === 'personal' || valor === 'empresa'

/**
 * Nombre con el que viaja una colección al servidor.
 *
 * El espacio personal conserva los nombres de siempre: así lo que ya está
 * guardado en la cuenta no se mueve ni se duplica, y las versiones anteriores
 * de la aplicación siguen viendo exactamente lo mismo que antes. Lo de la
 * empresa lleva prefijo, de modo que una versión que no lo conozca simplemente
 * no lo trae.
 */
export const nombreRemoto = (espacio: Espacio, nombre: string) =>
  espacio === 'personal' ? nombre : `${espacio}:${nombre}`
