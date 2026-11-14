/**
 * Entidades de planificación: lo que hasta ahora estaba escrito a mano dentro
 * de las vistas. Cada una tiene su tipo, su clave de almacenamiento y unos
 * registros de ejemplo que se cargan la primera vez, igual que los movimientos.
 *
 * Los importes se guardan en centavos, como el resto de la aplicación: los
 * literales de abajo están en pesos y `aCentavos` los convierte.
 */

import { aCentavos } from '../core/dinero'

export type Suscripcion = {
  id: string
  nombre: string
  monto: number
  diaCobro: number
  categoria: string
  cuenta: string
  activa: boolean
}

export type Deuda = {
  id: string
  nombre: string
  entidad: string
  montoTotal: number
  pagado: number
  cuotaMensual: number
  diaPago: number
}

export type Meta = {
  id: string
  nombre: string
  objetivo: number
  ahorrado: number
  fechaLimite: string
}

export type Presupuesto = {
  id: string
  categoria: string
  limite: number
}

export type Inversion = {
  id: string
  nombre: string
  tipo: string
  invertido: number
  valorActual: number
}

export type Vehiculo = {
  id: string
  nombre: string
  placa: string
  soat: string
  tecnomecanica: string
}

export const tiposInversion = ['Renta fija', 'Renta variable', 'Fondo', 'Liquidez', 'Cripto', 'Otro']

/** Claves de localStorage. Cambiarlas descarta lo guardado, así que no se tocan. */
export const CLAVES = {
  cuentas: 'fc-cuentas',
  suscripciones: 'fc-suscripciones',
  deudas: 'fc-deudas',
  metas: 'fc-metas',
  presupuestos: 'fc-presupuestos',
  inversiones: 'fc-inversiones',
  vehiculos: 'fc-vehiculos'
} as const

export const suscripcionesDeEjemplo: Omit<Suscripcion, 'id'>[] = [
  {
    nombre: 'Netflix',
    monto: aCentavos(32900),
    diaCobro: 22,
    categoria: 'Entretenimiento',
    cuenta: 'Tarjeta crédito',
    activa: true
  },
  {
    nombre: 'Spotify',
    monto: aCentavos(20900),
    diaCobro: 25,
    categoria: 'Entretenimiento',
    cuenta: 'Tarjeta crédito',
    activa: true
  },
  {
    nombre: 'iCloud',
    monto: aCentavos(3900),
    diaCobro: 28,
    categoria: 'Otros',
    cuenta: 'Tarjeta crédito',
    activa: true
  },
  {
    nombre: 'Internet hogar',
    monto: aCentavos(95000),
    diaCobro: 15,
    categoria: 'Vivienda',
    cuenta: 'Cuenta principal',
    activa: true
  }
]

export const deudasDeEjemplo: Omit<Deuda, 'id'>[] = [
  {
    nombre: 'Tarjeta de crédito',
    entidad: 'Visa',
    montoTotal: aCentavos(2400000),
    pagado: aCentavos(0),
    cuotaMensual: aCentavos(420000),
    diaPago: 18
  },
  {
    nombre: 'Crédito de libre inversión',
    entidad: 'Bancolombia',
    montoTotal: aCentavos(2450000),
    pagado: aCentavos(980000),
    cuotaMensual: aCentavos(200000),
    diaPago: 5
  }
]

export const metasDeEjemplo: Omit<Meta, 'id'>[] = [
  {
    nombre: 'Fondo de emergencia',
    objetivo: aCentavos(5000000),
    ahorrado: aCentavos(3500000),
    fechaLimite: '2027-06-30'
  },
  { nombre: 'Viaje', objetivo: aCentavos(4000000), ahorrado: aCentavos(1200000), fechaLimite: '2027-12-15' },
  {
    nombre: 'Nuevo computador',
    objetivo: aCentavos(3500000),
    ahorrado: aCentavos(2800000),
    fechaLimite: '2027-03-31'
  }
]

export const presupuestosDeEjemplo: Omit<Presupuesto, 'id'>[] = [
  { categoria: 'Alimentación', limite: aCentavos(600000) },
  { categoria: 'Transporte', limite: aCentavos(300000) },
  { categoria: 'Entretenimiento', limite: aCentavos(150000) },
  { categoria: 'Vivienda', limite: aCentavos(900000) },
  { categoria: 'Salud', limite: aCentavos(250000) }
]

export const inversionesDeEjemplo: Omit<Inversion, 'id'>[] = [
  { nombre: 'CDT', tipo: 'Renta fija', invertido: aCentavos(3000000), valorActual: aCentavos(3180000) },
  {
    nombre: 'Fondo de inversión',
    tipo: 'Fondo',
    invertido: aCentavos(2450000),
    valorActual: aCentavos(2610000)
  },
  {
    nombre: 'Acciones',
    tipo: 'Renta variable',
    invertido: aCentavos(1800000),
    valorActual: aCentavos(1660000)
  },
  {
    nombre: 'Cuenta remunerada',
    tipo: 'Liquidez',
    invertido: aCentavos(1200000),
    valorActual: aCentavos(1240000)
  }
]

export const vehiculosDeEjemplo: Omit<Vehiculo, 'id'>[] = [
  { nombre: 'Automóvil', placa: 'ABC-123', soat: '2027-02-12', tecnomecanica: '2027-03-20' },
  { nombre: 'Motocicleta', placa: 'XYZ-89D', soat: '2027-01-05', tecnomecanica: '2027-04-10' }
]
