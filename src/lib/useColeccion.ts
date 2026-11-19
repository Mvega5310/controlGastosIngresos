import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { newId } from '../core/finanzas'
import { Registro, fijarRegistro, sellar, sellarBorrado, vivos } from '../core/sincronizacion'
import {
  alCambiarDatos,
  avisarEscrituraLocal,
  escribirLista,
  escribirPendientes,
  leerLista,
  leerPendientes
} from './almacenLocal'

/**
 * Colección guardada en el navegador, con alta, edición y baja.
 *
 * Cada escritura deja marca de tiempo y cada baja deja rastro, que es lo que
 * la sincronización necesita para saber qué versión es la buena y para
 * enterarse de lo que se borró en el otro aparato. Las vistas solo ven los
 * registros vivos.
 *
 * Los registros de ejemplo no se sellan a propósito: sin marca cuentan como lo
 * más antiguo posible, así que cualquier edición real les gana.
 *
 * **El almacenamiento manda, el estado de React es su reflejo.** Cada operación
 * parte de lo que hay guardado, lo cambia y lo escribe en el acto, antes de
 * devolver el control. Antes la escritura se hacía en un efecto, un instante
 * después de pintar: en ese instante una sincronización podía leer el
 * almacenamiento sin el cambio recién hecho, o escribir encima de él.
 */
/** Marca un registro como dado de baja. Puro, y fuera del hook para que las
 *  funciones que lo usan no cambien en cada render. */
const darDeBaja = <T extends { id: string } & Partial<Registro>>(x: T): T =>
  sellarBorrado({ ...x, actualizadoEn: x.actualizadoEn || '' })

export function useColeccion<T extends { id: string }>(clave: string, iniciales: T[] = []) {
  type Fila = T & Partial<Registro>

  const [todos, setTodos] = useState<Fila[]>(() => leerLista<Fila>(clave, iniciales as Fila[]))
  const [pendientes, setPendientes] = useState<string[]>(() => leerPendientes(clave))

  // Las semillas no cambian durante la vida del componente, pero el efecto no
  // debe volver a suscribirse si llegara otra referencia del mismo array.
  const semillas = useRef(iniciales)
  semillas.current = iniciales

  /** Cuando la sincronización reescribe el almacenamiento, se vuelve a leer. */
  useEffect(
    () =>
      alCambiarDatos(() => {
        setTodos(leerLista<Fila>(clave, semillas.current as Fila[]))
        setPendientes(leerPendientes(clave))
      }),
    [clave]
  )

  /** Lo que ven las vistas: sin los borrados. */
  const items = useMemo(() => vivos(todos) as T[], [todos])

  /**
   * Aplica un cambio a lo guardado y lo deja escrito, junto con la marca de
   * pendiente de los registros tocados. Síncrono de principio a fin.
   */
  const escribir = useCallback(
    (cambiar: (guardados: Fila[]) => Fila[], ids: string[]) => {
      const nuevos = cambiar(leerLista<Fila>(clave, semillas.current as Fila[]))
      const pend = [...new Set([...leerPendientes(clave), ...ids])]
      escribirLista(clave, nuevos)
      escribirPendientes(clave, pend)
      setTodos(nuevos)
      setPendientes(pend)
      avisarEscrituraLocal()
    },
    [clave]
  )

  const agregar = useCallback(
    (datos: Omit<T, 'id'>) => {
      const nuevo = sellar({ ...datos, id: newId() } as T)
      escribir(guardados => [...guardados, nuevo], [nuevo.id])
    },
    [escribir]
  )

  /** Alta de varios registros ya formados, como los dos apuntes de un traslado. */
  const agregarVarios = useCallback(
    (registros: T[]) => {
      const nuevos = registros.map(r => sellar(r))
      escribir(
        guardados => [...nuevos, ...guardados],
        registros.map(r => r.id)
      )
    },
    [escribir]
  )

  const actualizar = useCallback(
    (id: string, cambios: Partial<T>) => {
      escribir(guardados => guardados.map(x => (x.id === id ? sellar({ ...x, ...cambios }) : x)), [id])
    },
    [escribir]
  )

  /**
   * Escribe un registro de identificador fijo: lo crea, o actualiza el que haya
   * aunque esté borrado. Ver `fijarRegistro`.
   */
  const fijar = useCallback(
    (id: string, datos: Omit<T, 'id'>) => {
      escribir(guardados => fijarRegistro<T>(guardados, id, datos) as Fila[], [id])
    },
    [escribir]
  )

  const eliminar = useCallback(
    (id: string) => {
      escribir(guardados => guardados.map(x => (x.id === id ? darDeBaja(x) : x)), [id])
    },
    [escribir]
  )

  const eliminarVarios = useCallback(
    (ids: string[]) => {
      if (!ids.length) return
      const fuera = new Set(ids)
      escribir(guardados => guardados.map(x => (fuera.has(x.id) ? darDeBaja(x) : x)), ids)
    },
    [escribir]
  )

  return { items, todos, pendientes, agregar, agregarVarios, actualizar, fijar, eliminar, eliminarVarios }
}
