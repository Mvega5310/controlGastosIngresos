/**
 * Costo de las personas del equipo.
 *
 * Calcula cuánto cuesta cada cargo al mes y en el periodo, con el factor
 * prestacional cuando el contrato lo lleva, y deja a la vista de dónde sale
 * cada peso. Módulo puro: sin navegador ni servidor.
 *
 * Dos reglas que conviene tener claras:
 *
 * - El factor es el del formato del SENA (53,76 % en total) y se aplica sobre
 *   el salario. Quien presta servicios por honorarios no genera prestaciones:
 *   su costo es lo que se le paga.
 * - El auxilio de transporte es de ley para quien tiene contrato laboral y
 *   gana hasta dos salarios mínimos. El formato no lo incluye, así que aquí es
 *   un interruptor: por defecto el costo coincide con el del formato y la
 *   diferencia se avisa en vez de sumarse a escondidas.
 *
 * Los importes son enteros en centavos y los porcentajes, enteros en puntos
 * base (850 = 8,5 %). Con decimales en coma flotante, 0,0833 × 3.200.000 ya no
 * da un entero exacto, y la suma de varios cargos se iría desviando.
 */

export const VINCULACIONES = [
  'Prestación de servicios',
  'Contrato laboral a término fijo',
  'Contrato laboral a término indefinido',
  'Contrato por obra o labor',
  'Jornal'
] as const

export type Vinculacion = (typeof VINCULACIONES)[number]

/** Todo contrato que no sea de prestación de servicios es laboral. */
export const esLaboral = (v: string) => v !== 'Prestación de servicios'

/** Si el factor prestacional se aplica según el contrato o se fuerza a mano. */
export const OPCIONES_FACTOR = ['Según el contrato', 'Sí', 'No'] as const
export type OpcionFactor = (typeof OPCIONES_FACTOR)[number]

export type Cargo = {
  id: string
  rol: string
  vinculacion: Vinculacion
  /** Asignación mensual, en centavos. */
  salario: number
  /** Meses que se necesita este cargo en el periodo que se calcula. */
  meses: number
  persona?: string
  funciones?: string
  factor?: OpcionFactor
}

/** Los porcentajes del factor, en puntos base. */
export type Componentes = {
  salud: number
  pension: number
  arl: number
  cesantias: number
  interesesCesantias: number
  prima: number
  vacaciones: number
  parafiscales: number
}

export type ClaveComponente = keyof Componentes

export const ETIQUETAS_COMPONENTES: Record<ClaveComponente, string> = {
  salud: 'Salud',
  pension: 'Pensión',
  arl: 'ARL',
  cesantias: 'Cesantías',
  interesesCesantias: 'Intereses de cesantías',
  prima: 'Prima de servicios',
  vacaciones: 'Vacaciones',
  parafiscales: 'Parafiscales'
}

/** Orden en que se muestran. */
export const ORDEN_COMPONENTES: readonly ClaveComponente[] = [
  'salud',
  'pension',
  'arl',
  'cesantias',
  'interesesCesantias',
  'prima',
  'vacaciones',
  'parafiscales'
]

/** El factor prestacional del formato: suma 53,76 %. */
export const FACTOR_DEL_FORMATO: Componentes = {
  salud: 850,
  pension: 1200,
  arl: 244,
  cesantias: 833,
  interesesCesantias: 100,
  prima: 833,
  vacaciones: 416,
  parafiscales: 900
}

export type ParametrosNomina = {
  /** Salario mínimo mensual vigente, en centavos. */
  smmlv: number
  /** Auxilio de transporte mensual, en centavos. */
  auxilioTransporte: number
  /** Sumar el auxilio de transporte al costo de quien tiene derecho. */
  incluirAuxilio: boolean
  factor: Componentes
}

/**
 * Valores de 2026: salario mínimo según la hoja «Topes Montos» del formato; el
 * auxilio de transporte hay que confirmarlo en el decreto vigente, por eso es
 * un parámetro editable y no una constante escondida.
 */
export const PARAMETROS_POR_DEFECTO: ParametrosNomina = {
  smmlv: 175090500,
  auxilioTransporte: 24909500,
  incluirAuxilio: false,
  factor: FACTOR_DEL_FORMATO
}

/** Quien gana hasta este múltiplo del mínimo tiene derecho al auxilio. */
export const TOPE_AUXILIO_EN_SMMLV = 2

const PUNTOS_BASE = 10000

/** Porcentaje en puntos base de un importe en centavos, redondeado. */
const parte = (centavos: number, puntos: number) => Math.round((centavos * puntos) / PUNTOS_BASE)

export const factorTotal = (f: Componentes) => ORDEN_COMPONENTES.reduce((s, k) => s + (f[k] || 0), 0)

/** 5376 -> "53,76 %". */
export const verPorcentaje = (puntosBase: number) =>
  `${(puntosBase / 100).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} %`

export const aplicaFactor = (c: Pick<Cargo, 'vinculacion' | 'factor'>) =>
  c.factor === 'Sí' ? true : c.factor === 'No' ? false : esLaboral(c.vinculacion)

/** Gana hasta dos mínimos y su contrato lleva prestaciones. */
export const tieneDerechoAuxilio = (c: Cargo, p: ParametrosNomina) =>
  aplicaFactor(c) && c.salario > 0 && c.salario <= TOPE_AUXILIO_EN_SMMLV * p.smmlv

export type Prestacion = { clave: ClaveComponente; etiqueta: string; porcentaje: number; monto: number }

export type CostoCargo = {
  salario: number
  /** Desglose del factor; vacío si el contrato no lleva prestaciones. */
  prestaciones: Prestacion[]
  totalPrestaciones: number
  /** Lo que se suma de auxilio, solo si el interruptor está activo y hay derecho. */
  auxilio: number
  /** Lo que sumaría el auxilio con sus prestaciones, esté o no incluido. Sirve para avisarlo. */
  auxilioPosible: number
  costoMensual: number
  meses: number
  costoPeriodo: number
}

/** Qué sumas del auxilio entran en la base de cada componente. */
const SOBRE_AUXILIO: readonly ClaveComponente[] = ['cesantias', 'interesesCesantias', 'prima']

/**
 * Costo de un cargo.
 *
 * Cada componente se calcula sobre el salario, salvo cesantías, sus intereses y
 * la prima, que por ley también cuentan el auxilio de transporte.
 */
export function costoDeCargo(c: Cargo, p: ParametrosNomina = PARAMETROS_POR_DEFECTO): CostoCargo {
  const salario = Math.max(0, c.salario || 0)
  const meses = Math.max(0, c.meses || 0)
  const lleva = aplicaFactor(c)
  const derecho = tieneDerechoAuxilio(c, p)

  const auxilio = derecho && p.incluirAuxilio ? p.auxilioTransporte : 0

  const prestaciones: Prestacion[] = lleva
    ? ORDEN_COMPONENTES.map(clave => {
        const porcentaje = p.factor[clave] || 0
        const base = salario + (SOBRE_AUXILIO.includes(clave) ? auxilio : 0)
        return { clave, etiqueta: ETIQUETAS_COMPONENTES[clave], porcentaje, monto: parte(base, porcentaje) }
      })
    : []
  const totalPrestaciones = prestaciones.reduce((s, x) => s + x.monto, 0)

  // Lo que añadiría el auxilio si se activara: él mismo y su parte de cesantías,
  // intereses y prima. Se calcula aparte para poder avisarlo sin activarlo.
  const auxilioPosible = derecho
    ? p.auxilioTransporte +
      SOBRE_AUXILIO.reduce((s, k) => s + parte(p.auxilioTransporte, p.factor[k] || 0), 0)
    : 0

  const costoMensual = salario + auxilio + totalPrestaciones
  return {
    salario,
    prestaciones,
    totalPrestaciones,
    auxilio,
    auxilioPosible,
    costoMensual,
    meses,
    costoPeriodo: costoMensual * meses
  }
}

export type ResumenNomina = {
  cargos: number
  salarios: number
  prestaciones: number
  costoMensual: number
  costoPeriodo: number
  /** Cargos con derecho a auxilio que hoy no se está sumando, y lo que costaría al mes. */
  sinAuxilio: { cargos: number; mensual: number }
}

export function resumenNomina(cargos: Cargo[], p: ParametrosNomina = PARAMETROS_POR_DEFECTO): ResumenNomina {
  const salida: ResumenNomina = {
    cargos: cargos.length,
    salarios: 0,
    prestaciones: 0,
    costoMensual: 0,
    costoPeriodo: 0,
    sinAuxilio: { cargos: 0, mensual: 0 }
  }
  for (const c of cargos) {
    const costo = costoDeCargo(c, p)
    salida.salarios += costo.salario
    salida.prestaciones += costo.totalPrestaciones
    salida.costoMensual += costo.costoMensual
    salida.costoPeriodo += costo.costoPeriodo
    if (!p.incluirAuxilio && costo.auxilioPosible > 0) {
      salida.sinAuxilio.cargos += 1
      salida.sinAuxilio.mensual += costo.auxilioPosible
    }
  }
  return salida
}

/** Mezcla lo guardado con los valores por defecto, por si falta algún campo. */
export function parametrosDe(guardado?: Partial<ParametrosNomina> | null): ParametrosNomina {
  return {
    ...PARAMETROS_POR_DEFECTO,
    ...(guardado || {}),
    factor: { ...FACTOR_DEL_FORMATO, ...(guardado?.factor || {}) }
  }
}

// --- Pago de cada mes --------------------------------------------------------

/** Marca con la que un movimiento dice de qué cargo y mes viene. */
export const origenDePago = (cargoId: string, mes: string) => `nomina:${cargoId}:${mes}`

export const pagoRegistrado = (movimientos: { origen?: string }[], cargoId: string, mes: string) =>
  movimientos.some(m => m.origen === origenDePago(cargoId, mes))

/** Último día del mes 'AAAA-MM', como 'AAAA-MM-DD'. */
export const ultimoDiaDe = (mes: string) => {
  const [anio, m] = mes.split('-').map(Number)
  const dia = new Date(anio, m, 0).getDate()
  return `${mes}-${String(dia).padStart(2, '0')}`
}
