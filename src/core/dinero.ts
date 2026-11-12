/**
 * Dinero.
 *
 * Todos los importes se guardan como **enteros en centavos**, nunca en coma
 * flotante. Es la regla estándar en aplicaciones financieras: 0,1 + 0,2 no da
 * 0,3 en coma flotante, y una aplicación que suma cientos de movimientos
 * acaba arrastrando ese error hasta descuadrar un saldo.
 *
 * La interfaz habla en pesos: el usuario escribe 95.000 y ve "$ 95.000". La
 * conversión ocurre solo en los bordes — al leer un formulario y al dar
 * formato — y jamás en medio de un cálculo.
 */

/** Centavos en una unidad de la moneda. */
export const CENTAVOS = 100

/** Pesos que escribe una persona -> centavos que se guardan. */
export const aCentavos = (pesos: number) => Math.round((Number(pesos) || 0) * CENTAVOS)

/** Centavos guardados -> pesos, para mostrarlos en un campo de formulario. */
export const aPesos = (centavos: number) => (Number(centavos) || 0) / CENTAVOS

const formato = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
})

/** Da formato a un importe en centavos: money(28500000) -> "$ 285.000". */
export const money = (centavos: number) => formato.format(aPesos(centavos))
