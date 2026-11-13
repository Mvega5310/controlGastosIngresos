import { Search, Filter, Plus, Trash2 } from 'lucide-react'
import { Movement, money } from '../data/mock'
import { fmtDate } from '../lib/fechas'

export function TablaMovimientos({
  data,
  onEliminar
}: {
  data: Movement[]
  onEliminar?: (id: string) => void
}) {
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
          {data.map(m => {
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
                      onClick={() => onEliminar(m.id)}
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
      <TablaMovimientos data={data} onEliminar={onEliminar} />
    </section>
  )
}
