import { useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  ArrowUpRight,
  PiggyBank,
  CarFront,
  ShieldCheck
} from 'lucide-react'
import { Movement, money } from '../datos/catalogo'
import { Inversion, Vehiculo, tiposInversion } from '../datos/entidades'
import {
  calcularInversiones,
  calcularVehiculos,
  resumenInversiones,
  gastoPorCategoria,
  Urgencia
} from '../core/planificacion'
import { Period, periodLabel, Totals } from '../core/finanzas'
import FormModal, { Campo } from '../components/FormModal'
import { Coleccion } from '../lib/useDatos'
import StatCard from '../components/StatCard'

const fechaLarga = (iso: string) =>
  iso
    ? new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : '—'

const textoVigencia = (dias: number) =>
  isNaN(dias)
    ? 'sin fecha'
    : dias < 0
      ? `vencido hace ${Math.abs(dias)} días`
      : dias === 0
        ? 'vence hoy'
        : `faltan ${dias} días`

const claseEstado = (e: Urgencia) => (e === 'vencido' ? 'bad' : e === 'proximo' ? 'warn' : '')

function Acciones({ onEditar, onBorrar }: { onEditar: () => void; onBorrar: () => void }) {
  return (
    <div className="row-actions">
      <button className="mini-btn" onClick={onEditar} aria-label="Editar">
        <Pencil size={13} />
      </button>
      <button className="mini-btn peligro" onClick={onBorrar} aria-label="Eliminar">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function Cabecera({
  titulo,
  nota,
  accion,
  onAccion
}: {
  titulo: string
  nota: string
  accion: string
  onAccion: () => void
}) {
  return (
    <div className="panel-heading seccion-head">
      <div>
        <h2>{titulo}</h2>
        <p>{nota}</p>
      </div>
      <button className="btn-primary" onClick={onAccion}>
        <Plus size={16} /> {accion}
      </button>
    </div>
  )
}

function Vacio({ texto, accion, onAccion }: { texto: string; accion: string; onAccion: () => void }) {
  return (
    <div className="empty">
      <p>{texto}</p>
      <button className="btn-secondary" onClick={onAccion}>
        <Plus size={15} /> {accion}
      </button>
    </div>
  )
}

function useEdicion<T extends { id: string }>() {
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<T | null>(null)
  return {
    abierto,
    editando,
    nuevo: () => {
      setEditando(null)
      setAbierto(true)
    },
    editar: (x: T) => {
      setEditando(x)
      setAbierto(true)
    },
    cerrar: () => setAbierto(false)
  }
}

// --- Inversiones ------------------------------------------------------------

const camposInversion: Campo[] = [
  { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, ayuda: 'Ej. CDT Bancolombia' },
  { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: tiposInversion },
  {
    nombre: 'invertido',
    etiqueta: 'Capital invertido',
    tipo: 'dinero',
    requerido: true,
    min: 1,
    ancho: 'medio'
  },
  { nombre: 'valorActual', etiqueta: 'Valor actual', tipo: 'dinero', requerido: true, min: 0, ancho: 'medio' }
]

export function Inversiones({ col }: { col: Coleccion<Inversion> }) {
  const ed = useEdicion<Inversion>()
  const filas = calcularInversiones(col.items)
  const r = resumenInversiones(filas)
  const signo = (n: number) => (n > 0 ? '+' : '')

  return (
    <>
      <div className="stats-grid three">
        <StatCard
          label="Valor del portafolio"
          value={money(r.valor)}
          icon={<TrendingUp size={19} />}
          note={`${col.items.length} activo${col.items.length === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Capital invertido"
          value={money(r.invertido)}
          icon={<PiggyBank size={19} />}
          tone="purple"
          note="lo que pusiste"
        />
        <StatCard
          label="Rendimiento"
          value={`${signo(r.rendimiento)}${money(r.rendimiento)}`}
          icon={<ArrowUpRight size={19} />}
          tone={r.rendimiento < 0 ? 'orange' : 'green'}
          change={{
            text: `${signo(r.porcentaje)}${String(r.porcentaje).replace('.', ',')}%`,
            tone: r.rendimiento < 0 ? 'negative' : r.rendimiento > 0 ? 'positive' : 'neutral'
          }}
          note="sobre lo invertido"
        />
      </div>
      <section className="panel full-panel">
        <Cabecera
          titulo="Detalle del portafolio"
          nota="Rendimiento calculado sobre el capital que registraste"
          accion="Registrar inversión"
          onAccion={ed.nuevo}
        />
        {!filas.length ? (
          <Vacio
            texto="No tienes inversiones registradas."
            accion="Registrar la primera"
            onAccion={ed.nuevo}
          />
        ) : (
          <div className="simple-list">
            {filas.map(i => (
              <div className="simple-row" key={i.id}>
                <div className="simple-bullet">{i.nombre.slice(0, 1).toUpperCase()}</div>
                <div>
                  <b>{i.nombre}</b>
                  <small>
                    {i.tipo} · invertido {money(i.invertido)}
                  </small>
                </div>
                <strong>{money(i.valorActual)}</strong>
                <span className={`status-pill ${i.rendimiento < 0 ? 'bad' : ''}`}>
                  {signo(i.rendimiento)}
                  {money(i.rendimiento)} · {signo(i.porcentajeRendimiento)}
                  {String(i.porcentajeRendimiento).replace('.', ',')}%
                </span>
                <Acciones onEditar={() => ed.editar(i)} onBorrar={() => col.eliminar(i.id)} />
              </div>
            ))}
          </div>
        )}
      </section>
      <FormModal
        abierto={ed.abierto}
        eyebrow="INVERSIÓN"
        titulo={ed.editando ? 'Editar inversión' : 'Registrar inversión'}
        campos={camposInversion}
        valores={ed.editando}
        onCerrar={ed.cerrar}
        onGuardar={d =>
          ed.editando
            ? col.actualizar(ed.editando.id, d as Partial<Inversion>)
            : col.agregar(d as Omit<Inversion, 'id'>)
        }
      />
    </>
  )
}

// --- Transporte -------------------------------------------------------------

const camposVehiculo: Campo[] = [
  { nombre: 'nombre', etiqueta: 'Vehículo', tipo: 'texto', requerido: true, ayuda: 'Ej. Automóvil' },
  { nombre: 'placa', etiqueta: 'Placa', tipo: 'texto', ayuda: 'ABC-123' },
  { nombre: 'soat', etiqueta: 'Vence el SOAT', tipo: 'fecha', ancho: 'medio' },
  { nombre: 'tecnomecanica', etiqueta: 'Vence la tecnomecánica', tipo: 'fecha', ancho: 'medio' }
]

export function Transporte({ col }: { col: Coleccion<Vehiculo> }) {
  const ed = useEdicion<Vehiculo>()
  const filas = calcularVehiculos(col.items)
  const alertas = filas.filter(v => v.soatEstado !== 'vigente' || v.tecnoEstado !== 'vigente').length

  return (
    <>
      <div className="stats-grid three">
        <StatCard
          label="Vehículos"
          value={String(filas.length)}
          icon={<CarFront size={19} />}
          note="registrados"
        />
        <StatCard
          label="Documentos por vencer"
          value={String(alertas)}
          icon={<ShieldCheck size={19} />}
          tone={alertas ? 'orange' : 'green'}
          note={alertas ? 'dentro de 30 días o vencidos' : 'todo al día'}
        />
        <StatCard
          label="Próximo vencimiento"
          value={
            filas.length
              ? fechaLarga([...filas.flatMap(v => [v.soat, v.tecnomecanica])].filter(Boolean).sort()[0])
              : '—'
          }
          icon={<ShieldCheck size={19} />}
          tone="purple"
          note="SOAT o tecnomecánica"
        />
      </div>
      <section className="panel full-panel sin-fondo">
        <Cabecera
          titulo="Tus vehículos"
          nota="Vigencia del SOAT y la tecnomecánica"
          accion="Agregar vehículo"
          onAccion={ed.nuevo}
        />
      </section>
      {!filas.length ? (
        <Vacio texto="No tienes vehículos registrados." accion="Agregar uno" onAccion={ed.nuevo} />
      ) : (
        <div className="module-grid">
          {filas.map(v => (
            <section className="panel account-card" key={v.id}>
              <div className="account-card-top">
                <div className="bank-icon large green">
                  <CarFront size={19} />
                </div>
                <Acciones onEditar={() => ed.editar(v)} onBorrar={() => col.eliminar(v.id)} />
              </div>
              <p>{v.placa || 'Sin placa'}</p>
              <h2>{v.nombre}</h2>
              <div className="doc-row">
                <span>SOAT</span>
                <b>{fechaLarga(v.soat)}</b>
                <span className={`status-pill ${claseEstado(v.soatEstado)}`}>
                  {textoVigencia(v.soatDias)}
                </span>
              </div>
              <div className="doc-row">
                <span>Tecnomecánica</span>
                <b>{fechaLarga(v.tecnomecanica)}</b>
                <span className={`status-pill ${claseEstado(v.tecnoEstado)}`}>
                  {textoVigencia(v.tecnoDias)}
                </span>
              </div>
            </section>
          ))}
        </div>
      )}
      <FormModal
        abierto={ed.abierto}
        eyebrow="VEHÍCULO"
        titulo={ed.editando ? 'Editar vehículo' : 'Agregar vehículo'}
        campos={camposVehiculo}
        valores={ed.editando}
        onCerrar={ed.cerrar}
        onGuardar={d =>
          ed.editando
            ? col.actualizar(ed.editando.id, d as Partial<Vehiculo>)
            : col.agregar(d as Omit<Vehiculo, 'id'>)
        }
      />
    </>
  )
}

// --- Reportes ---------------------------------------------------------------

export function Reportes({
  movimientos,
  totales,
  periodo
}: {
  movimientos: Movement[]
  totales: Totals
  periodo: Period
}) {
  const categorias = gastoPorCategoria(movimientos, periodo)
  const etiqueta = periodLabel(periodo).toLowerCase()

  return (
    <>
      <div className="stats-grid three">
        <StatCard
          label="Ingresos del periodo"
          value={money(totales.income)}
          icon={<ArrowUpRight size={19} />}
          note={etiqueta}
        />
        <StatCard
          label="Gastos del periodo"
          value={money(totales.expense)}
          icon={<ArrowUpRight size={19} />}
          tone="orange"
          note={etiqueta}
        />
        <StatCard
          label="Flujo neto"
          value={money(totales.net)}
          icon={<TrendingUp size={19} />}
          tone={totales.net < 0 ? 'orange' : 'green'}
          note={totales.net < 0 ? 'gastaste más de lo que entró' : 'te quedó a favor'}
        />
      </div>
      <section className="panel full-panel">
        <div className="panel-heading">
          <div>
            <h2>Gasto por categoría</h2>
            <p>Calculado con los movimientos de {etiqueta}</p>
          </div>
        </div>
        {!categorias.length ? (
          <div className="empty">
            <p>No hay gastos registrados en {etiqueta}.</p>
          </div>
        ) : (
          <div className="budget-list">
            {categorias.map(c => (
              <div className="budget-item" key={c.categoria}>
                <div>
                  <b>{c.categoria}</b>
                  <span>
                    {money(c.total)} <small>{c.porcentaje}% del gasto</small>
                  </span>
                </div>
                <div className="progress">
                  <i style={{ width: `${c.porcentaje}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
