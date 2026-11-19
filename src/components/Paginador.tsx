import { ChevronLeft, ChevronRight } from 'lucide-react'
import { POR_PAGINA, paginaValida, rangoVisible, totalPaginas } from '../core/paginacion'

/**
 * Controles de página para una lista. No pinta nada si cabe en una sola.
 * La sección de movimientos tiene los suyos desde antes; las secciones nuevas
 * usan este.
 */
export function Paginador({
  pagina,
  cuantos,
  onCambiar
}: {
  pagina: number
  cuantos: number
  onCambiar: (pagina: number) => void
}) {
  if (cuantos <= POR_PAGINA) return null
  const actual = paginaValida(pagina, cuantos)
  const paginas = totalPaginas(cuantos)
  const rango = rangoVisible(actual, cuantos)
  return (
    <div className="paginacion">
      <span>
        {rango.desde}–{rango.hasta} de {cuantos}
      </span>
      <div className="paginacion-botones">
        <button
          className="mini-btn boton-pagina"
          onClick={() => onCambiar(paginaValida(actual - 1, cuantos))}
          disabled={actual <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft size={15} />
        </button>
        <b>
          {actual} / {paginas}
        </b>
        <button
          className="mini-btn boton-pagina"
          onClick={() => onCambiar(paginaValida(actual + 1, cuantos))}
          disabled={actual >= paginas}
          aria-label="Página siguiente"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}
