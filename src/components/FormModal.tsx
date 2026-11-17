import { FormEvent, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { aCentavos, aPesos } from '../core/dinero'
import { useDialogo } from '../lib/useDialogo'

export type Campo = {
  nombre: string
  etiqueta: string
  /** 'dinero' se escribe y se muestra en pesos, pero se guarda en centavos. */
  tipo: 'texto' | 'numero' | 'fecha' | 'seleccion' | 'dinero'
  opciones?: readonly string[]
  requerido?: boolean
  min?: number
  max?: number
  ayuda?: string
  /** Dos campos 'medio' seguidos comparten fila. */
  ancho?: 'completo' | 'medio'
}

type Props = {
  abierto: boolean
  eyebrow: string
  titulo: string
  campos: Campo[]
  valores?: Record<string, unknown> | null
  textoGuardar?: string
  onGuardar: (datos: Record<string, unknown>) => void
  onCerrar: () => void
}

const vacio = (campos: Campo[]): Record<string, string> => {
  const salida: Record<string, string> = {}
  for (const c of campos) salida[c.nombre] = c.tipo === 'seleccion' ? String(c.opciones?.[0] ?? '') : ''
  return salida
}

/**
 * Formulario de alta y edición compartido por las secciones de planificación.
 * Antes cada botón "Agregar" abría un aviso; ahora todas usan este modal,
 * descrito por una lista de campos en vez de maquetado seis veces.
 */
export default function FormModal({
  abierto,
  eyebrow,
  titulo,
  campos,
  valores,
  textoGuardar,
  onGuardar,
  onCerrar
}: Props) {
  const [datos, setDatos] = useState<Record<string, string>>(() => vacio(campos))

  useEffect(() => {
    if (!abierto) return
    if (valores) {
      const cargado: Record<string, string> = {}
      for (const c of campos) {
        const v = valores[c.nombre]
        cargado[c.nombre] = v == null ? '' : c.tipo === 'dinero' ? String(aPesos(Number(v))) : String(v)
      }
      setDatos(cargado)
    } else {
      setDatos(vacio(campos))
    }
  }, [abierto, valores, campos])

  const ref = useDialogo(abierto, onCerrar)

  if (!abierto) return null

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    const salida: Record<string, unknown> = {}
    for (const c of campos) {
      const bruto = (datos[c.nombre] ?? '').trim()
      salida[c.nombre] =
        c.tipo === 'dinero' ? aCentavos(Number(bruto || 0)) : c.tipo === 'numero' ? Number(bruto || 0) : bruto
    }
    onGuardar(salida)
    onCerrar()
  }

  const fijar = (nombre: string, valor: string) => setDatos(p => ({ ...p, [nombre]: valor }))

  const control = (c: Campo) => {
    if (c.tipo === 'seleccion') {
      return (
        <select
          id={`campo-${c.nombre}`}
          value={datos[c.nombre] ?? ''}
          onChange={e => fijar(c.nombre, e.target.value)}
        >
          {(c.opciones ?? []).map(o => (
            <option key={o}>{o}</option>
          ))}
        </select>
      )
    }
    return (
      <input
        id={`campo-${c.nombre}`}
        type={c.tipo === 'numero' || c.tipo === 'dinero' ? 'number' : c.tipo === 'fecha' ? 'date' : 'text'}
        required={c.requerido}
        min={c.min}
        max={c.max}
        value={datos[c.nombre] ?? ''}
        onChange={e => fijar(c.nombre, e.target.value)}
        placeholder={c.ayuda}
      />
    )
  }

  // Agrupa los campos 'medio' consecutivos de dos en dos.
  const filas: Campo[][] = []
  for (const c of campos) {
    const ultima = filas[filas.length - 1]
    if (c.ancho === 'medio' && ultima && ultima.length === 1 && ultima[0].ancho === 'medio') ultima.push(c)
    else filas.push([c])
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div ref={ref} className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2>{titulo}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onCerrar} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={enviar}>
          {filas.map((fila, i) =>
            fila.length === 2 ? (
              <div className="form-grid" key={i}>
                {fila.map(c => (
                  <div key={c.nombre}>
                    <label htmlFor={`campo-${c.nombre}`}>{c.etiqueta}</label>
                    {control(c)}
                  </div>
                ))}
              </div>
            ) : (
              <div key={i}>
                <label htmlFor={`campo-${fila[0].nombre}`}>{fila[0].etiqueta}</label>
                {control(fila[0])}
              </div>
            )
          )}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onCerrar}>
              Cancelar
            </button>
            <button className="btn-primary" type="submit">
              {textoGuardar || 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
