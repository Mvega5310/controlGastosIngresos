/**
 * Cargar y borrar datos, desde Ajustes.
 *
 * Los ejemplos ya no se cargan solos. Antes sí, y el resultado era que
 * cualquier navegador —y cualquier cuenta recién creada— aparecía con cuentas
 * y movimientos que no eran suyos, de modo que iniciar sesión no cambiaba
 * nada de lo que se veía.
 */
import { newId } from '../core/finanzas'
import { Registro, fijarRegistro, sellar, sellarBorrado } from '../core/sincronizacion'
import { PlanItem, ParametrosProyecto, cambiaLaCelda, idDePlan, parametrosProyectoDe } from '../core/plan'
import { ID_PARAMETROS_PROYECTO, RUBROS } from './empresa'
import { NO_FINANCIABLE } from '../core/tramites'
import { Espacio } from '../core/espacios'
import { aCentavos } from '../core/dinero'
import {
  COLECCIONES,
  COLECCIONES_EMPRESA,
  avisarCambioDatos,
  avisarEscrituraLocal,
  coleccionesDe,
  escribirLista,
  escribirPendientes,
  leerLista,
  leerPendientes
} from '../lib/almacenLocal'
import { cuentasDeEjemplo, movimientosDeEjemplo } from './catalogo'
import {
  deudasDeEjemplo,
  inversionesDeEjemplo,
  metasDeEjemplo,
  presupuestosDeEjemplo,
  suscripcionesDeEjemplo,
  vehiculosDeEjemplo
} from './entidades'

/** Añade identificador y marca de tiempo a cada fila de ejemplo. */
const conIdentidad = (filas: object[]) => filas.map(f => sellar({ ...f, id: newId() }))

/** Suma lo nuevo a lo que ya está pendiente de subir. */
const anotarPendientes = (clave: string, ids: string[]) =>
  escribirPendientes(clave, [...new Set([...leerPendientes(clave), ...ids])])

const escribirAnexando = (clave: string, filas: object[]) => {
  const nuevos = conIdentidad(filas)
  const previos = leerLista<Registro>(clave, [])
  escribirLista(clave, [...previos, ...nuevos])
  anotarPendientes(
    clave,
    nuevos.map(n => n.id)
  )
}

/**
 * Carga un juego de datos de ejemplo, añadiéndolo a lo que ya haya. Sirve para
 * ver cómo queda la aplicación llena sin tener que teclear veinte registros.
 */
export function cargarEjemplos(espacio: Espacio = 'personal') {
  if (espacio === 'empresa') {
    cargarEjemplosDeEmpresa()
    return
  }
  escribirAnexando(COLECCIONES.cuentas, cuentasDeEjemplo)
  escribirAnexando(COLECCIONES.movimientos, movimientosDeEjemplo)
  escribirAnexando(COLECCIONES.suscripciones, suscripcionesDeEjemplo)
  escribirAnexando(COLECCIONES.deudas, deudasDeEjemplo)
  escribirAnexando(COLECCIONES.metas, metasDeEjemplo)
  escribirAnexando(COLECCIONES.presupuestos, presupuestosDeEjemplo)
  escribirAnexando(COLECCIONES.inversiones, inversionesDeEjemplo)
  escribirAnexando(COLECCIONES.vehiculos, vehiculosDeEjemplo)
  avisarCambioDatos()
  avisarEscrituraLocal()
}

/**
 * Un plan de muestra: tres rubros en tres meses. Las celdas tienen identificador
 * fijo, así que pulsar «Cargar ejemplos» dos veces no las duplica.
 */
function cargarPlanDeEjemplo() {
  const [salarios, equipos, publicidad] = [RUBROS[0], RUBROS[1], RUBROS[9]]
  const celdas: [string, number, number][] = [
    [salarios, 1, 12000000],
    [salarios, 2, 12000000],
    [salarios, 3, 12000000],
    [equipos, 1, 18000000],
    [publicidad, 1, 2000000],
    [publicidad, 2, 3000000],
    [publicidad, 3, 4000000]
  ]
  const previas = leerLista<Registro>(COLECCIONES_EMPRESA.plan, [])
  let filas = previas as unknown as (PlanItem & Partial<Registro>)[]
  const nuevos: string[] = []
  for (const [rubro, mes, pesos] of celdas) {
    if (!cambiaLaCelda(filas, rubro, mes, aCentavos(pesos))) continue
    const id = idDePlan(rubro, mes)
    filas = fijarRegistro<PlanItem>(filas, id, { rubro, mes, monto: aCentavos(pesos) })
    nuevos.push(id)
  }
  escribirLista(COLECCIONES_EMPRESA.plan, filas)
  anotarPendientes(COLECCIONES_EMPRESA.plan, nuevos)
  const proyecto = leerLista<Registro>(COLECCIONES_EMPRESA.parametros, [])
  if (!proyecto.some(p => p.id === ID_PARAMETROS_PROYECTO && !p.eliminadoEn)) {
    escribirLista(
      COLECCIONES_EMPRESA.parametros,
      fijarRegistro<Registro & ParametrosProyecto>(
        proyecto as unknown as (Registro & ParametrosProyecto)[],
        ID_PARAMETROS_PROYECTO,
        parametrosProyectoDe({ valorSolicitado: aCentavos(100000000), meses: 3 }) as unknown as Omit<
          Registro & ParametrosProyecto,
          'id'
        >
      )
    )
    anotarPendientes(COLECCIONES_EMPRESA.parametros, [ID_PARAMETROS_PROYECTO])
  }
}

/** Muestra mínima del espacio de la empresa: genérica, para que no se confunda con datos reales. */
function cargarEjemplosDeEmpresa() {
  escribirAnexando(COLECCIONES_EMPRESA.cuentas, [
    {
      name: 'Cuenta del proyecto',
      bank: 'Bancolombia',
      kind: 'Corriente',
      color: 'blue',
      openingBalance: aCentavos(50000000)
    }
  ])
  cargarPlanDeEjemplo()
  escribirAnexando(COLECCIONES_EMPRESA.compras, [
    {
      descripcion: 'Portátil para el analista',
      rubro: RUBROS[1],
      cantidad: 1,
      valorUnitario: aCentavos(3500000),
      estado: 'Cotizado',
      mes: 1
    },
    {
      descripcion: 'Monitor de 27 pulgadas',
      rubro: RUBROS[1],
      cantidad: 2,
      valorUnitario: aCentavos(1800000),
      estado: 'Por cotizar',
      mes: 1
    },
    {
      descripcion: 'Escritorios y sillas',
      rubro: RUBROS[2],
      cantidad: 4,
      valorUnitario: aCentavos(1500000),
      estado: 'Por cotizar',
      mes: 2
    }
  ])
  escribirAnexando(COLECCIONES_EMPRESA.mercadeo, [
    {
      nombre: 'Pauta digital',
      tipo: 'Estrategia de comunicación',
      costo: aCentavos(2000000),
      estado: 'Planeada',
      mes: 1
    },
    {
      nombre: 'Contenido en video',
      tipo: 'Estrategia de comunicación',
      costo: aCentavos(3000000),
      estado: 'Planeada',
      mes: 2
    },
    {
      nombre: 'Activación local',
      tipo: 'Estrategia de promoción',
      costo: aCentavos(1000000),
      estado: 'En curso',
      mes: 3
    }
  ])
  escribirAnexando(COLECCIONES_EMPRESA.tramites, [
    {
      nombre: 'Facturación electrónica',
      rubro: RUBROS[6],
      costo: aCentavos(3000000),
      dias: 14,
      estado: 'Por iniciar',
      mes: 1
    },
    {
      nombre: 'Constitución legal',
      rubro: NO_FINANCIABLE,
      costo: aCentavos(1500000),
      dias: 14,
      estado: 'En trámite',
      inicio: new Date().toISOString().slice(0, 10)
    }
  ])
  escribirAnexando(COLECCIONES_EMPRESA.cargos, [
    {
      rol: 'Gerente general',
      vinculacion: 'Prestación de servicios',
      salario: aCentavos(6000000),
      meses: 12
    },
    {
      rol: 'Analista de operaciones',
      vinculacion: 'Contrato laboral a término fijo',
      salario: aCentavos(2500000),
      meses: 12
    },
    {
      rol: 'Auxiliar de mercadeo',
      vinculacion: 'Contrato laboral a término fijo',
      salario: aCentavos(3200000),
      meses: 12
    }
  ])
  avisarCambioDatos()
  avisarEscrituraLocal()
}

/**
 * Borra todo lo de un espacio, y solo de ese: el otro no se toca.
 *
 * Los registros no se quitan de golpe: se marcan como borrados y se dejan
 * pendientes de subir. Si se borraran sin dejar rastro, la siguiente
 * sincronización se los volvería a bajar del servidor y parecería que la
 * aplicación ignora lo que se le pide.
 */
export function borrarTodosLosDatos(espacio: Espacio = 'personal') {
  for (const clave of Object.values(coleccionesDe(espacio))) {
    const filas = leerLista<Registro>(clave, [])
    const vivos = filas.filter(f => !f.eliminadoEn)
    if (!vivos.length) continue
    escribirLista(
      clave,
      filas.map(f => (f.eliminadoEn ? f : sellarBorrado(f)))
    )
    anotarPendientes(
      clave,
      vivos.map(f => f.id)
    )
  }
  avisarCambioDatos()
  avisarEscrituraLocal()
}

/** Cuántos registros vivos hay en total, para saber si la aplicación está vacía. */
export function contarDatos(espacio: Espacio = 'personal'): number {
  let total = 0
  for (const clave of Object.values(coleccionesDe(espacio))) {
    total += leerLista<Registro>(clave, []).filter(f => !f.eliminadoEn).length
  }
  return total
}
