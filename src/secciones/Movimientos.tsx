import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, Filter, Plus, Trash2 } from 'lucide-react'
import { Movement, money } from '../datos/catalogo'
import { fmtDate } from '../lib/fechas'
import { POR_PAGINA, paginaDe, paginaValida, rangoVisible, totalPaginas } from '../core/paginacion'
import { Confirmar } from '../components/Confirmar'

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
      <table>
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
              className="mini-btn"
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
              className="mini-btn"
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
  return (
    <section className="panel full-panel">
      <div className="toolbar">
        <div className="search-input">
          <Search size={17} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar movimiento..." />
        </div>
        <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option>Todos</option>
          <option>Ingreso</option>
          <option>Gasto</option>
          <option>Transferencia</option>
        </select>
        <button className="btn-secondary" onClick={() => setFilter('Todos')}>
          <Filter size={16} /> Limpiar filtros
        </button>
        <button className="btn-primary" onClick={onAdd}>
          <Plus size={16} /> Nuevo
        </button>
      </div>
      <TablaMovimientos data={data} onEliminar={onEliminar} paginada />
    </section>
  )
}
