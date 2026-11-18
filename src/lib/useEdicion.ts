import { useState } from 'react'

/** Estado compartido por las cuatro secciones: qué modal está abierto y sobre qué registro. */
export function useEdicion<T extends { id: string }>() {
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<T | null>(null)
  const nuevo = () => {
    setEditando(null)
    setAbierto(true)
  }
  const editar = (x: T) => {
    setEditando(x)
    setAbierto(true)
  }
  const cerrar = () => setAbierto(false)
  return { abierto, editando, nuevo, editar, cerrar }
}
