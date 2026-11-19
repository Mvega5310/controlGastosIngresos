/**
 * Avisos del espacio de la empresa.
 *
 * Igual que los personales, no muestran nada inventado: salen de lo que ya se
 * calcula en las pantallas del proyecto. Un trámite que se atrasa, un rubro que
 * pasa su tope o su plan, un plan que no suma lo solicitado, la nómina del mes
 * sin pagar, acciones de mercadeo sin evidencia.
 *
 * Módulo puro: sin navegador ni servidor.
 */
import { Aviso, NivelAviso } from './avisos'
import { Compra, resumenCompras } from './compras'
import { todayISO } from './finanzas'
import { AccionMercadeo, resumenMercadeo } from './mercadeo'
import { Cargo, ParametrosNomina, costoDeCargo, pagoRegistrado, ultimoDiaDe, verPorcentaje } from './nomina'
import { ResultadoPlan, ficha } from './plan'
import { diasHasta } from './planificacion'
import { Tramite, diasParaListo, fechaEstimada } from './tramites'
import { money } from '../datos/catalogo'

/** Cuántos días antes de la fecha estimada se avisa de un trámite. */
const DIAS_TRAMITE = 7
/** Cuántos días antes de fin de mes se avisa de la nómina sin pagar. */
const DIAS_NOMINA = 5

const cuandoSea = (dias: number) =>
  dias < 0
    ? `atrasado ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`
    : dias === 0
      ? 'debería estar listo hoy'
      : `listo estimado en ${dias} día${dias === 1 ? '' : 's'}`

export type EntradaAvisosEmpresa = {
  tramites: Tramite[]
  compras: Compra[]
  acciones: AccionMercadeo[]
  cargos: Cargo[]
  parametrosNomina: ParametrosNomina
  plan: ResultadoPlan
  movimientos: { origen?: string }[]
}

export function calcularAvisosEmpresa(entrada: EntradaAvisosEmpresa, hoy = todayISO()): Aviso[] {
  const avisos: Aviso[] = []
  const nuevo = (a: Aviso) => avisos.push(a)

  // Trámites que se atrasan o están al caer.
  for (const t of entrada.tramites) {
    const dias = diasParaListo(t, hoy)
    if (dias === null || dias > DIAS_TRAMITE) continue
    nuevo({
      // La fecha forma parte del identificador: si se reprograma, es otro aviso.
      id: `tra-${t.id}-${fechaEstimada(t.inicio, t.dias)}`,
      titulo: t.nombre,
      detalle: `Trámite · ${cuandoSea(dias)}`,
      nivel: dias < 0 ? 'vencido' : 'pronto',
      seccion: 'Trámites',
      dias
    })
  }

  // La nómina del mes, cuando se acerca el fin de mes y quedan cargos sin pagar.
  const mes = hoy.slice(0, 7)
  const faltanParaFinDeMes = diasHasta(ultimoDiaDe(mes), hoy)
  if (faltanParaFinDeMes <= DIAS_NOMINA) {
    const sinPagar = entrada.cargos.filter(
      c =>
        costoDeCargo(c, entrada.parametrosNomina).costoMensual > 0 &&
        !pagoRegistrado(entrada.movimientos, c.id, mes)
    )
    if (sinPagar.length) {
      nuevo({
        id: `nom-${mes}-${sinPagar.length}`,
        titulo: 'Nómina del mes sin registrar',
        detalle: `${sinPagar.length} cargo${sinPagar.length === 1 ? '' : 's'} sin pago registrado · fin de mes ${
          faltanParaFinDeMes === 0
            ? 'hoy'
            : `en ${faltanParaFinDeMes} día${faltanParaFinDeMes === 1 ? '' : 's'}`
        }`,
        nivel: 'pronto',
        seccion: 'Nómina',
        dias: faltanParaFinDeMes
      })
    }
  }

  // Rubros: los que pasaron su tope, los que ya gastaron más de lo planeado
  // y los que gastan sin tener plan.
  for (const f of entrada.plan.filas) {
    if (f.tope.excedido && f.tope.limite !== null) {
      nuevo({
        id: `top-${ficha(f.rubro)}`,
        titulo: f.rubro,
        detalle: `Pasa su tope · ${verPorcentaje(f.tope.usado)} del total, máximo ${verPorcentaje(f.tope.limite)}`,
        nivel: 'vencido',
        seccion: 'Plan'
      })
    }
    if (f.estado === 'excedido') {
      nuevo({
        id: `pas-${ficha(f.rubro)}`,
        titulo: f.rubro,
        detalle: `Gastado ${money(f.ejecutado)}, más de lo planeado (${money(f.planeado)})`,
        nivel: 'vencido',
        seccion: 'Plan'
      })
    } else if (f.estado === 'sin-plan') {
      nuevo({
        id: `sin-${ficha(f.rubro)}`,
        titulo: f.rubro,
        detalle: `Hay gastos (${money(f.ejecutado)}) y este rubro no tiene plan`,
        nivel: 'atencion',
        seccion: 'Plan'
      })
    }
  }

  // El plan debe sumar lo solicitado.
  const p = entrada.plan
  if (p.hayValor && !p.cuadra && p.totalPlaneado > 0) {
    nuevo({
      id: `cua-${p.diferencia}`,
      titulo: 'El plan no suma el valor solicitado',
      detalle: `${p.diferencia < 0 ? 'Faltan' : 'Sobran'} ${money(Math.abs(p.diferencia))} por repartir`,
      nivel: 'atencion',
      seccion: 'Plan'
    })
  }

  // Compras que no se pueden repartir en el plan.
  const compras = resumenCompras(entrada.compras)
  if (compras.sinMes > 0) {
    nuevo({
      id: `cmes-${compras.sinMes}`,
      titulo: 'Compras sin mes del plan',
      detalle: `${compras.sinMes} compra${compras.sinMes === 1 ? '' : 's'} sin mes asignado: no entran al plan`,
      nivel: 'atencion',
      seccion: 'Compras'
    })
  }

  // Lo realizado en mercadeo sin prueba.
  const mercadeo = resumenMercadeo(entrada.acciones)
  if (mercadeo.sinEvidencia > 0) {
    nuevo({
      id: `evi-${mercadeo.sinEvidencia}`,
      titulo: 'Mercadeo sin evidencia',
      detalle: `${mercadeo.sinEvidencia} acción${mercadeo.sinEvidencia === 1 ? '' : 'es'} realizada${
        mercadeo.sinEvidencia === 1 ? '' : 's'
      } sin prueba; el fondo la pedirá`,
      nivel: 'atencion',
      seccion: 'Mercadeo'
    })
  }

  // Lo vencido primero y, dentro de cada grupo, lo más inminente.
  const orden: Record<NivelAviso, number> = { vencido: 0, pronto: 1, atencion: 2 }
  return avisos.sort((a, b) => {
    if (orden[a.nivel] !== orden[b.nivel]) return orden[a.nivel] - orden[b.nivel]
    return (a.dias ?? 999) - (b.dias ?? 999)
  })
}
