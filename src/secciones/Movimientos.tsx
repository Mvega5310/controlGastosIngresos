import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, Filter, Plus, Trash2 } from 'lucide-react'
import { Movement, money } from '../datos/catalogo'
import { fmtDate } from '../lib/fechas'
import { POR_PAGINA, paginaDe, paginaValida, rangoVisible, totalPaginas } from '../core/paginacion'
import { Confirmar } from '../components/Confirmar'
import { TarjetaMovimiento } from '../components/TarjetaMovimiento'

export function TablaMovimientos({
  data,
  onEliminar,
  paginada = false
}: {
  data: Movement[]
  onEliminar?: (id: string) => void
  /** El panel enseña solo los últimos; la sección entera sí pagina. */
  paginada?: boolean
}) {
  const [pagina, setPagina] = useState(1)
  const [porBorrar, setPorBorrar] = useState<Movement | null>(null)

  // Al buscar o filtrar, la página en la que estabas puede dejar de existir.
  useEffect(() => {
    setPagina(p => paginaValida(p, data.length))
  }, [data.length])

  const visibles = paginada ? paginaDe(data, pagina) : data
  const paginas = totalPaginas(data.length)
  const rango = rangoVisible(pagina, data.length)

  return (
    <div className="table-wrap">
      {/* Dos representaciones de los mismos datos. El CSS enseña una u otra
          según el ancho; el filtrado, la página, el borrado y su confirmación
          son los mismos para las dos. */}
      <ul className="lista-movil">
        {visibles.map(m => (
          <TarjetaMovimiento key={m.id} m={m} onEliminar={onEliminar ? setPorBorrar : undefined} />
        ))}
      </ul>
      <table className="tabla-escritorio">
        <thead>
          <tr>
            <th>DESCRIPCIÓN</th>
            <th>CATEGORÍA</th>
            <th>FECHA</th>
            <th>CUENTA</th>
            <th className="right">VALOR</th>
            {onEliminar && <th aria-label="Acciones" />}
          </tr>
        </thead>
        <tbody>
          {visibles.map(m => {
            const traslado = m.type === 'Transferencia' && !!m.contraparte
            return (
              <tr key={m.id}>
                <td>
                  <div className="movement-name">
                    <span className={`movement-dot ${m.type.toLowerCase()}`} />
                    <b>{m.title}</b>
                  </div>
                </td>
                <td>{m.category}</td>
                <td>{fmtDate(m.date)}</td>
                <td>
                  {traslado ? (
                    <span className="traslado">
                      {m.account} <i>→</i> {m.contraparte}
                    </span>
                  ) : (
                    m.account
                  )}
                </td>
                <td
                  className={`right amount ${m.type === 'Ingreso' ? 'positive' : m.type === 'Gasto' ? 'negative' : ''}`}
                >
                  {m.type === 'Ingreso' ? '+' : m.type === 'Gasto' ? '-' : ''}
                  {money(m.amount)}
                </td>
                {onEliminar && (
                  <td className="right">
                    <button
                      className="mini-btn peligro"
                      onClick={() => setPorBorrar(m)}
                      aria-label={`Eliminar ${m.title}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
      {!data.length && (
        <div className="empty">
          <p>No hay movimientos para mostrar.</p>
        </div>
      )}
      {paginada && data.length > POR_PAGINA && (
        <div className="paginacion">
          <span>
            {rango.desde}–{rango.hasta} de {data.length}
          </span>
          <div className="paginacion-botones">
            <button
              className="mini-btn boton-pagina"
              onClick={() => setPagina(p => paginaValida(p - 1, data.length))}
              disabled={pagina <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft size={15} />
            </button>
            <b>
              {paginaValida(pagina, data.length)} / {paginas}
            </b>
            <button
              className="mini-btn boton-pagina"
              onClick={() => setPagina(p => paginaValida(p + 1, data.length))}
              disabled={pagina >= paginas}
              aria-label="Página siguiente"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
      <Confirmar
        abierto={!!porBorrar}
        titulo={porBorrar ? `¿Borrar «${porBorrar.title}»?` : ''}
        detalle={
          porBorrar?.type === 'Transferencia'
            ? 'Es un traslado entre cuentas: se borran los dos apuntes, el de salida y el de entrada.'
            : 'El importe dejará de contar en el saldo de su cuenta.'
        }
        onCancelar={() => setPorBorrar(null)}
        onConfirmar={() => {
          const m = porBorrar
          setPorBorrar(null)
          if (m) onEliminar?.(m.id)
        }}
      />
    </div>
  )
}

export function Movimientos({
  data,
  query,
  setQuery,
  filter,
  setFilter,
  onAdd,
  onEliminar
}: {
  data: Movement[]
  query: string
  setQuery: (s: string) => void
  filter: string
  setFilter: (s: string) => void
  onAdd: () => void
  onEliminar: (id: string) => void
}) {
  const hayFiltros = filter !== 'Todos' || query.trim() !== ''
  const limpiar = () => {
    setFilter('Todos')
    setQuery('')
  }
  return (
    <section className="panel full-panel">
      <div className="toolbar">
        <div className="search-input">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar movimiento..."
            aria-label="Buscar movimiento"
          />
        </div>
        <select
          className="filter-select"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          aria-label="Filtrar por tipo de movimiento"
        >
          <option>Todos</option>
          <option>Ingreso</option>
          <option>Gasto</option>
          <option>Transferencia</option>
        </select>
        {/* Solo aparece cuando hay algo que limpiar. Y limpia las dos cosas:
            antes solo restablecía el tipo y dejaba la búsqueda puesta, de modo
            que «limpiar» no devolvía la lista entera. */}
        {hayFiltros && (
          <button className="btn-secondary" onClick={limpiar}>
            <Filter size={16} aria-hidden="true" /> Limpiar filtros
          </button>
        )}
        <button className="btn-primary boton-nuevo" onClick={onAdd}>
          <Plus size={16} aria-hidden="true" /> Nuevo
        </button>
      </div>
      <TablaMovimientos data={data} onEliminar={onEliminar} paginada />
    </section>
  )
}
