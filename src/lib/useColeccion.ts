import { useCallback, useEffect, useState } from 'react'
import { newId } from '../core/finance'

/**
 * Colección guardada en el navegador, con alta, edición y baja.
 *
 * Es el mismo patrón que ya usaban los movimientos, extraído para que las seis
 * secciones nuevas no repitan la lectura y escritura de localStorage. Cuando
 * llegue la sincronización en la nube, se sustituye aquí y las vistas no cambian.
 */
export function useColeccion<T extends { id: string }>(clave: string, iniciales: T[]) {
  const [items, setItems] = useState<T[]>(() => {
    try {
      const guardado = localStorage.getItem(clave)
      if (!guardado) return iniciales
      const leido = JSON.parse(guardado)
      return Array.isArray(leido) ? leido : iniciales
    } catch { return iniciales }
  })

  useEffect(() => {
    try { localStorage.setItem(clave, JSON.stringify(items)) } catch { /* modo privado */ }
  }, [clave, items])

  const agregar = useCallback((datos: Omit<T, 'id'>) => {
    setItems(previos => [...previos, { ...datos, id: newId() } as T])
  }, [])

  const actualizar = useCallback((id: string, cambios: Partial<T>) => {
    setItems(previos => previos.map(x => x.id === id ? { ...x, ...cambios } : x))
  }, [])

  const eliminar = useCallback((id: string) => {
    setItems(previos => previos.filter(x => x.id !== id))
  }, [])

  return { items, agregar, actualizar, eliminar }
}
