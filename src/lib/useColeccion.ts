import { useCallback, useEffect, useMemo, useState } from 'react'
import { newId } from '../core/finance'
import { Registro, sellar, sellarBorrado, vivos } from '../core/sincronizacion'

/**
 * Colección guardada en el navegador, con alta, edición y baja.
 *
 * Cada escritura deja marca de tiempo y cada baja deja rastro, que es lo que
 * la sincronización entre dispositivos necesitará para saber qué versión es
 * la buena y para enterarse de lo que se borró en el otro aparato. Las vistas
 * solo ven los registros vivos.
 *
 * Los registros de ejemplo no se sellan a propósito: sin marca cuentan como
 * lo más antiguo posible, así que cualquier edición real les gana.
 */
export function useColeccion<T extends { id: string }>(clave: string, iniciales: T[]) {
  type Fila = T & Partial<Registro>

  const [todos, setTodos] = useState<Fila[]>(() => {
    try {
      const guardado = localStorage.getItem(clave)
      if (!guardado) return iniciales as Fila[]
      const leido = JSON.parse(guardado)
      return Array.isArray(leido) ? leido : (iniciales as Fila[])
    } catch { return iniciales as Fila[] }
  })

  useEffect(() => {
    try { localStorage.setItem(clave, JSON.stringify(todos)) } catch { /* modo privado */ }
  }, [clave, todos])

  /**
   * Identificadores escritos aquí que aún no se han subido. No se deduce de
   * las marcas de tiempo, porque el reloj del dispositivo y el del servidor
   * no son el mismo: se anota al escribir y se limpia al subir.
   */
  const clavePendientes = `${clave}:pendientes`
  const [pendientes, setPendientes] = useState<string[]>(() => {
    try {
      const leido = JSON.parse(localStorage.getItem(clavePendientes) || '[]')
      return Array.isArray(leido) ? leido : []
    } catch { return [] }
  })

  useEffect(() => {
    try { localStorage.setItem(clavePendientes, JSON.stringify(pendientes)) } catch { /* modo privado */ }
  }, [clavePendientes, pendientes])

  const anotar = useCallback((ids: string[]) => {
    setPendientes(previos => [...new Set([...previos, ...ids])])
  }, [])

  /** Tras subir con éxito: deja de estar pendiente. */
  const marcarSubidos = useCallback((ids: string[]) => {
    if (!ids.length) return
    const fuera = new Set(ids)
    setPendientes(previos => previos.filter(id => !fuera.has(id)))
  }, [])

  /** Lo que ven las vistas: sin los borrados. */
  const items = useMemo(() => vivos(todos) as T[], [todos])

  const agregar = useCallback((datos: Omit<T, 'id'>) => {
    const nuevo = sellar({ ...datos, id: newId() } as T)
    setTodos(previos => [...previos, nuevo])
    anotar([nuevo.id])
  }, [anotar])

  /** Alta de varios registros ya formados, como los dos apuntes de un traslado. */
  const agregarVarios = useCallback((registros: T[]) => {
    setTodos(previos => [...registros.map(r => sellar(r)), ...previos])
    anotar(registros.map(r => r.id))
  }, [anotar])

  const actualizar = useCallback((id: string, cambios: Partial<T>) => {
    setTodos(previos => previos.map(x => x.id === id ? sellar({ ...x, ...cambios }) : x))
    anotar([id])
  }, [anotar])

  const eliminar = useCallback((id: string) => {
    setTodos(previos => previos.map(x => x.id === id ? sellarBorrado({ ...x, actualizadoEn: x.actualizadoEn || '' }) : x))
    anotar([id])
  }, [anotar])

  const eliminarVarios = useCallback((ids: string[]) => {
    if (!ids.length) return
    const fuera = new Set(ids)
    setTodos(previos => previos.map(x =>
      fuera.has(x.id) ? sellarBorrado({ ...x, actualizadoEn: x.actualizadoEn || '' }) : x))
    anotar(ids)
  }, [anotar])

  return { items, todos, pendientes, agregar, agregarVarios, actualizar, eliminar, eliminarVarios, setTodos, marcarSubidos }
}
