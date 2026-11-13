import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { newId } from '../core/finance'
import { Registro, sellar, sellarBorrado, vivos } from '../core/sincronizacion'
import { alCambiarDatos, escribirLista, escribirPendientes, leerLista, leerPendientes } from './almacenLocal'

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
 */
/** Marca un registro como dado de baja. Puro, y fuera del hook para que las
 *  funciones que lo usan no cambien en cada render. */
const darDeBaja = <T extends { id: string } & Partial<Registro>>(x: T): T =>
  sellarBorrado({ ...x, actualizadoEn: x.actualizadoEn || '' })

export function useColeccion<T extends { id: string }>(clave: string, iniciales: T[]) {
  type Fila = T & Partial<Registro>

  const [todos, setTodos] = useState<Fila[]>(() => leerLista<Fila>(clave, iniciales as Fila[]))
  const [pendientes, setPendientes] = useState<string[]>(() => leerPendientes(clave))

  // La primera escritura no debe pisar lo leído, ni marcar nada como pendiente
  // solo por haberse montado el componente.
  const montado = useRef(false)
  useEffect(() => {
    if (!montado.current) {
      montado.current = true
      return
    }
    escribirLista(clave, todos)
  }, [clave, todos])

  useEffect(() => {
    escribirPendientes(clave, pendientes)
  }, [clave, pendientes])

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

  const anotar = useCallback((ids: string[]) => {
    setPendientes(previos => [...new Set([...previos, ...ids])])
  }, [])

  const agregar = useCallback(
    (datos: Omit<T, 'id'>) => {
      const nuevo = sellar({ ...datos, id: newId() } as T)
      setTodos(previos => [...previos, nuevo])
      anotar([nuevo.id])
    },
    [anotar]
  )

  /** Alta de varios registros ya formados, como los dos apuntes de un traslado. */
  const agregarVarios = useCallback(
    (registros: T[]) => {
      setTodos(previos => [...registros.map(r => sellar(r)), ...previos])
      anotar(registros.map(r => r.id))
    },
    [anotar]
  )

  const actualizar = useCallback(
    (id: string, cambios: Partial<T>) => {
      setTodos(previos => previos.map(x => (x.id === id ? sellar({ ...x, ...cambios }) : x)))
      anotar([id])
    },
    [anotar]
  )

  const eliminar = useCallback(
    (id: string) => {
      setTodos(previos => previos.map(x => (x.id === id ? darDeBaja(x) : x)))
      anotar([id])
    },
    [anotar]
  )

  const eliminarVarios = useCallback(
    (ids: string[]) => {
      if (!ids.length) return
      const fuera = new Set(ids)
      setTodos(previos => previos.map(x => (fuera.has(x.id) ? darDeBaja(x) : x)))
      anotar(ids)
    },
    [anotar]
  )

  return { items, todos, pendientes, agregar, agregarVarios, actualizar, eliminar, eliminarVarios }
}
