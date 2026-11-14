/**
 * Avisos.
 *
 * La campana de la barra superior no muestra nada inventado: todo sale de los
 * mismos datos que ya se calculan en otras pantallas. Un cobro que llega, una
 * cuota que vence, un documento del vehículo caducado o un presupuesto que se
 * pasó de la raya.
 *
 * Módulo puro, para poder probar los límites sin montar la interfaz.
 */
import { Movement } from '../datos/catalogo'
import { Deuda, Presupuesto, Suscripcion, Vehiculo } from '../datos/entidades'
import { Period, periodKey, todayISO } from './finanzas'
import {
  calcularDeudas,
  calcularPresupuestos,
  calcularSuscripciones,
  calcularVehiculos,
  diasHasta
} from './planificacion'

/** `vencido` ya pasó, `pronto` está al caer, `atencion` conviene mirarlo. */
export type NivelAviso = 'vencido' | 'pronto' | 'atencion'

export type Aviso = {
  id: string
  titulo: string
  detalle: string
  nivel: NivelAviso
  /** A qué sección lleva al pulsarlo. */
  seccion: string
  /** Días que faltan; negativo si ya pasó. Ausente cuando no aplica. */
  dias?: number
}

/** Cuántos días antes empieza a avisarse de un cobro o una cuota. */
const DIAS_PAGO = 7
/** Los documentos del vehículo se renuevan con más margen. */
const DIAS_DOCUMENTO = 30

const cuandoSea = (dias: number) =>
  dias < 0
    ? `venció hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`
    : dias === 0
      ? 'vence hoy'
      : `en ${dias} día${dias === 1 ? '' : 's'}`

export type EntradaAvisos = {
  suscripciones: Suscripcion[]
  deudas: Deuda[]
  vehiculos: Vehiculo[]
  presupuestos: Presupuesto[]
  movimientos: Movement[]
  periodo: Period
}

export function calcularAvisos(entrada: EntradaAvisos, hoy = todayISO()): Aviso[] {
  const avisos: Aviso[] = []

  // Suscripciones activas que cobran pronto.
  for (const s of calcularSuscripciones(entrada.suscripciones, hoy)) {
    if (!s.activa || s.dias > DIAS_PAGO) continue
    avisos.push({
      // La fecha forma parte del identificador: el cobro del mes que viene es
      // otro aviso, no el mismo. Sin ella, dar por visto el de noviembre
      // callaría también el de diciembre.
      id: `sus-${s.id}-${s.proximoCobro}`,
      titulo: s.nombre,
      detalle: `Suscripción · ${cuandoSea(s.dias)}`,
      nivel: s.dias < 0 ? 'vencido' : 'pronto',
      seccion: 'Suscripciones',
      dias: s.dias
    })
  }

  // Cuotas de deuda próximas.
  for (const d of calcularDeudas(entrada.deudas, hoy)) {
    if (d.pendiente <= 0) continue
    const dias = diasHasta(d.proximoPago, hoy)
    if (dias > DIAS_PAGO) continue
    avisos.push({
      id: `deu-${d.id}-${d.proximoPago}`,
      titulo: d.nombre,
      detalle: `Cuota · ${cuandoSea(dias)}`,
      nivel: dias < 0 ? 'vencido' : 'pronto',
      seccion: 'Deudas',
      dias
    })
  }

  // Documentos del vehículo.
  for (const v of calcularVehiculos(entrada.vehiculos, hoy)) {
    const documentos: [string, number, string][] = [
      ['SOAT', v.soatDias, v.soat],
      ['Tecnomecánica', v.tecnoDias, v.tecnomecanica]
    ]
    for (const [nombre, dias, fecha] of documentos) {
      if (!fecha || isNaN(dias) || dias > DIAS_DOCUMENTO) continue
      avisos.push({
        id: `veh-${v.id}-${nombre}-${fecha}`,
        titulo: `${nombre} de ${v.nombre}`,
        detalle: cuandoSea(dias),
        nivel: dias < 0 ? 'vencido' : 'pronto',
        seccion: 'Transporte',
        dias
      })
    }
  }

  // Presupuestos excedidos o a punto.
  for (const p of calcularPresupuestos(entrada.presupuestos, entrada.movimientos, entrada.periodo)) {
    if (p.estado === 'ok') continue
    avisos.push({
      id: `pre-${p.id}-${periodKey(entrada.periodo)}`,
      titulo: p.categoria,
      detalle:
        p.estado === 'excedido'
          ? `Presupuesto excedido · ${p.progreso}% del límite`
          : `Presupuesto casi agotado · ${p.progreso}% del límite`,
      nivel: p.estado === 'excedido' ? 'vencido' : 'atencion',
      seccion: 'Presupuestos'
    })
  }

  // Lo vencido primero y, dentro de cada grupo, lo más inminente.
  const orden: Record<NivelAviso, number> = { vencido: 0, pronto: 1, atencion: 2 }
  return avisos.sort((a, b) => {
    if (orden[a.nivel] !== orden[b.nivel]) return orden[a.nivel] - orden[b.nivel]
    return (a.dias ?? 999) - (b.dias ?? 999)
  })
}

export type PagoProximo = {
  id: string
  nombre: string
  concepto: string
  fecha: string
  dias: number
  monto: number
}

/**
 * Los pagos que vienen, de suscripciones y cuotas de deuda.
 *
 * El panel los mostraba escritos a mano, de modo que una aplicación recién
 * abierta anunciaba tres pagos que nadie había registrado.
 */
export function proximosPagos(
  suscripciones: Suscripcion[],
  deudas: Deuda[],
  hoy = todayISO(),
  dentroDeDias = 45,
  cuantos = 4
): PagoProximo[] {
  const pagos: PagoProximo[] = []

  for (const s of calcularSuscripciones(suscripciones, hoy)) {
    if (!s.activa || s.dias > dentroDeDias) continue
    pagos.push({
      id: `sus-${s.id}`,
      nombre: s.nombre,
      concepto: 'Suscripción',
      fecha: s.proximoCobro,
      dias: s.dias,
      monto: s.monto
    })
  }

  for (const d of calcularDeudas(deudas, hoy)) {
    if (d.pendiente <= 0 || d.cuotaMensual <= 0) continue
    const dias = diasHasta(d.proximoPago, hoy)
    if (dias > dentroDeDias) continue
    pagos.push({
      id: `deu-${d.id}`,
      nombre: d.nombre,
      concepto: 'Deuda',
      fecha: d.proximoPago,
      dias,
      monto: d.cuotaMensual
    })
  }

  return pagos.sort((a, b) => a.dias - b.dias).slice(0, cuantos)
}

/**
 * Los avisos que todavía no se han mirado.
 *
 * La campana contaba todos los avisos pendientes, de modo que abrirla no
 * cambiaba nada: el número seguía ahí hasta que venciera el pago. Lo que se
 * espera de un número en una campana es que cuente lo nuevo.
 */
export const sinVer = (avisos: Aviso[], vistos: string[]): Aviso[] => {
  const yaVistos = new Set(vistos)
  return avisos.filter(a => !yaVistos.has(a.id))
}

/**
 * Olvida los avisos que ya no existen.
 *
 * Sin esto, la lista de vistos crecería para siempre con los cobros de todos
 * los meses pasados.
 */
export const podarVistos = (vistos: string[], avisos: Aviso[]): string[] => {
  const vivos = new Set(avisos.map(a => a.id))
  return vistos.filter(id => vivos.has(id))
}
