import { useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  CreditCard,
  Target,
  Wallet,
  ArrowUpRight,
  CalendarClock
} from 'lucide-react'
import { Movement, money, categories, accountNames } from '../datos/catalogo'
import {
  CLAVES,
  Deuda,
  Meta,
  Presupuesto,
  Suscripcion,
  deudasIniciales,
  metasIniciales,
  presupuestosIniciales,
  suscripcionesIniciales
} from '../datos/entidades'
import {
  calcularDeudas,
  calcularMetas,
  calcularPresupuestos,
  calcularSuscripciones,
  cuotasDelMes,
  gastoMensualSuscripciones,
  totalDeuda,
  porcentaje,
  diasHasta
} from '../core/planificacion'
import { Period, periodLabel } from '../core/finanzas'
import { useColeccion } from '../lib/useColeccion'
import FormModal, { Campo } from '../components/FormModal'
import StatCard from '../components/StatCard'

const fechaCorta = (iso: string) =>
  iso ? new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—'

const enDias = (d: number) =>
  isNaN(d) ? '' : d < 0 ? `vencido hace ${Math.abs(d)} d` : d === 0 ? 'hoy' : `en ${d} d`

/** Cabecera común: título, explicación y el botón de alta. */
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

/** Estado compartido por las cuatro secciones: qué modal está abierto y sobre qué registro. */
function useEdicion<T extends { id: string }>() {
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

// --- Presupuestos -----------------------------------------------------------

const camposPresupuesto: Campo[] = [
  { nombre: 'categoria', etiqueta: 'Categoría', tipo: 'seleccion', opciones: categories },
  { nombre: 'limite', etiqueta: 'Límite mensual en COP', tipo: 'dinero', requerido: true, min: 1, ayuda: '0' }
]

export function Presupuestos({ movimientos, periodo }: { movimientos: Movement[]; periodo: Period }) {
  const col = useColeccion<Presupuesto>(CLAVES.presupuestos, presupuestosIniciales)
  const ed = useEdicion<Presupuesto>()
  const filas = calcularPresupuestos(col.items, movimientos, periodo)
  const limite = filas.reduce((s, f) => s + f.limite, 0)
  const gastado = filas.reduce((s, f) => s + f.gastado, 0)
  const excedidos = filas.filter(f => f.estado === 'excedido').length

  return (
    <>
      <div className="stats-grid three">
        <StatCard
          label="Presupuestado"
          value={money(limite)}
          icon={<Wallet size={19} />}
          note={periodLabel(periodo)}
        />
        <StatCard
          label="Gastado del presupuesto"
          value={money(gastado)}
          icon={<ArrowUpRight size={19} />}
          tone="orange"
          note={`${porcentaje(gastado, limite)}% del total`}
        />
        <StatCard
          label="Categorías excedidas"
          value={String(excedidos)}
          icon={<Target size={19} />}
          tone={excedidos ? 'orange' : 'green'}
          note={excedidos ? 'revisa esas categorías' : 'todo dentro del límite'}
        />
      </div>
      <section className="panel full-panel">
        <Cabecera
          titulo="Límite por categoría"
          nota={`Límite por categoría frente al gasto real de ${periodLabel(periodo).toLowerCase()}`}
          accion="Nuevo presupuesto"
          onAccion={ed.nuevo}
        />
        {!filas.length ? (
          <Vacio
            texto="Aún no has fijado ningún límite por categoría."
            accion="Fijar el primero"
            onAccion={ed.nuevo}
          />
        ) : (
          <div className="budget-list">
            {filas.map(f => (
              <div className="budget-item" key={f.id}>
                <div>
                  <b>{f.categoria}</b>
                  <span>
                    {money(f.gastado)} <small>de {money(f.limite)}</small>
                  </span>
                </div>
                <div className="progress">
                  <i className={f.estado} style={{ width: `${Math.min(100, f.progreso)}%` }} />
                </div>
                <div className="budget-foot">
                  <small className={f.estado === 'excedido' ? 'negative' : ''}>
                    {f.estado === 'excedido'
                      ? `Excedido en ${money(f.gastado - f.limite)}`
                      : `Quedan ${money(f.restante)} · ${f.progreso}% usado`}
                  </small>
                  <Acciones onEditar={() => ed.editar(f)} onBorrar={() => col.eliminar(f.id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <FormModal
        abierto={ed.abierto}
        eyebrow="PRESUPUESTO"
        titulo={ed.editando ? 'Editar presupuesto' : 'Nuevo presupuesto'}
        campos={camposPresupuesto}
        valores={ed.editando}
        onCerrar={ed.cerrar}
        onGuardar={d => {
          if (ed.editando) {
            col.actualizar(ed.editando.id, d as Partial<Presupuesto>)
            return
          }
          // Una categoría no puede tener dos presupuestos: competirían por el mismo
          // gasto y las dos barras mentirían. Si ya existe, se ajusta su límite.
          const existente = col.items.find(p => p.categoria === d.categoria)
          if (existente) col.actualizar(existente.id, { limite: Number(d.limite) })
          else col.agregar(d as Omit<Presupuesto, 'id'>)
        }}
      />
    </>
  )
}

// --- Suscripciones ----------------------------------------------------------

const camposSuscripcion: Campo[] = [
  { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, ayuda: 'Ej. Netflix' },
  { nombre: 'monto', etiqueta: 'Valor en COP', tipo: 'dinero', requerido: true, min: 1, ancho: 'medio' },
  {
    nombre: 'diaCobro',
    etiqueta: 'Día de cobro',
    tipo: 'numero',
    requerido: true,
    min: 1,
    max: 31,
    ancho: 'medio'
  },
  { nombre: 'categoria', etiqueta: 'Categoría', tipo: 'seleccion', opciones: categories, ancho: 'medio' },
  { nombre: 'cuenta', etiqueta: 'Cuenta', tipo: 'seleccion', opciones: accountNames, ancho: 'medio' }
]

export function Suscripciones() {
  const col = useColeccion<Suscripcion>(CLAVES.suscripciones, suscripcionesIniciales)
  const ed = useEdicion<Suscripcion>()
  const filas = calcularSuscripciones(col.items)
  const mensual = gastoMensualSuscripciones(col.items)
  const activas = col.items.filter(s => s.activa).length

  return (
    <>
      <div className="stats-grid three">
        <StatCard
          label="Gasto mensual"
          value={money(mensual)}
          icon={<RefreshCw size={19} />}
          note="suscripciones activas"
        />
        <StatCard
          label="Al año"
          value={money(mensual * 12)}
          icon={<CalendarClock size={19} />}
          tone="purple"
          note="si todo sigue igual"
        />
        <StatCard
          label="Activas"
          value={String(activas)}
          icon={<Target size={19} />}
          note={`de ${col.items.length} registradas`}
        />
      </div>
      <section className="panel full-panel">
        <Cabecera
          titulo="Cobros programados"
          nota="Ordenados por el próximo cobro"
          accion="Nueva suscripción"
          onAccion={ed.nuevo}
        />
        {!filas.length ? (
          <Vacio
            texto="No tienes suscripciones registradas."
            accion="Registrar la primera"
            onAccion={ed.nuevo}
          />
        ) : (
          <div className="simple-list">
            {filas.map(s => (
              <div className={`simple-row ${s.activa ? '' : 'inactiva'}`} key={s.id}>
                <div className="simple-bullet">{s.nombre.slice(0, 1).toUpperCase()}</div>
                <div>
                  <b>{s.nombre}</b>
                  <small>
                    {s.categoria} · {s.cuenta} · cobra el {s.diaCobro}
                  </small>
                </div>
                <strong>{money(s.monto)}</strong>
                <span className={`status-pill ${s.dias <= 3 ? 'warn' : ''}`}>
                  {s.activa ? `${fechaCorta(s.proximoCobro)} · ${enDias(s.dias)}` : 'Pausada'}
                </span>
                <div className="row-actions">
                  <button className="mini-btn" onClick={() => col.actualizar(s.id, { activa: !s.activa })}>
                    {s.activa ? 'Pausar' : 'Activar'}
                  </button>
                  <Acciones onEditar={() => ed.editar(s)} onBorrar={() => col.eliminar(s.id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <FormModal
        abierto={ed.abierto}
        eyebrow="SUSCRIPCIÓN"
        titulo={ed.editando ? 'Editar suscripción' : 'Nueva suscripción'}
        campos={camposSuscripcion}
        valores={ed.editando}
        onCerrar={ed.cerrar}
        onGuardar={d =>
          ed.editando
            ? col.actualizar(ed.editando.id, d as Partial<Suscripcion>)
            : col.agregar({ ...(d as Omit<Suscripcion, 'id' | 'activa'>), activa: true })
        }
      />
    </>
  )
}

// --- Deudas -----------------------------------------------------------------

const camposDeuda: Campo[] = [
  { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, ayuda: 'Ej. Tarjeta de crédito' },
  { nombre: 'entidad', etiqueta: 'Entidad', tipo: 'texto', ayuda: 'Ej. Bancolombia' },
  { nombre: 'montoTotal', etiqueta: 'Monto total', tipo: 'dinero', requerido: true, min: 1, ancho: 'medio' },
  { nombre: 'pagado', etiqueta: 'Ya pagado', tipo: 'dinero', min: 0, ancho: 'medio' },
  { nombre: 'cuotaMensual', etiqueta: 'Cuota mensual', tipo: 'dinero', min: 0, ancho: 'medio' },
  { nombre: 'diaPago', etiqueta: 'Día de pago', tipo: 'numero', min: 1, max: 31, ancho: 'medio' }
]

export function Deudas() {
  const col = useColeccion<Deuda>(CLAVES.deudas, deudasIniciales)
  const ed = useEdicion<Deuda>()
  const filas = calcularDeudas(col.items)
  const pendiente = totalDeuda(filas)
  const cuotas = cuotasDelMes(col.items)
  const proxima = filas.map(f => f.proximoPago).sort()[0]
  const diasProxima = proxima ? diasHasta(proxima) : NaN

  return (
    <>
      <div className="stats-grid three">
        <StatCard
          label="Deuda pendiente"
          value={money(pendiente)}
          icon={<CreditCard size={19} />}
          note="suma de lo que falta"
        />
        <StatCard
          label="Cuotas del mes"
          value={money(cuotas)}
          icon={<CalendarClock size={19} />}
          tone="orange"
          note="si pagas todas"
        />
        <StatCard
          label="Próximo vencimiento"
          value={proxima ? fechaCorta(proxima) : '—'}
          icon={<Target size={19} />}
          tone="purple"
          note={proxima ? enDias(diasProxima) : 'sin deudas'}
        />
      </div>
      <section className="panel full-panel">
        <Cabecera
          titulo="Detalle por deuda"
          nota="Cuánto llevas pagado de cada una"
          accion="Registrar deuda"
          onAccion={ed.nuevo}
        />
        {!filas.length ? (
          <Vacio
            texto="No tienes deudas registradas. Buena señal."
            accion="Registrar una"
            onAccion={ed.nuevo}
          />
        ) : (
          <div className="budget-list">
            {filas.map(d => (
              <div className="budget-item" key={d.id}>
                <div>
                  <b>
                    {d.nombre} <small>{d.entidad}</small>
                  </b>
                  <span>
                    {money(d.pendiente)} <small>pendiente de {money(d.montoTotal)}</small>
                  </span>
                </div>
                <div className="progress">
                  <i style={{ width: `${Math.min(100, d.progreso)}%` }} />
                </div>
                <div className="budget-foot">
                  <small>
                    {d.progreso}% pagado · cuota {money(d.cuotaMensual)} el {d.diaPago}
                    {d.cuotasRestantes > 0 && ` · faltan ${d.cuotasRestantes} cuotas`}
                  </small>
                  <Acciones onEditar={() => ed.editar(d)} onBorrar={() => col.eliminar(d.id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <FormModal
        abierto={ed.abierto}
        eyebrow="DEUDA"
        titulo={ed.editando ? 'Editar deuda' : 'Registrar deuda'}
        campos={camposDeuda}
        valores={ed.editando}
        onCerrar={ed.cerrar}
        onGuardar={d =>
          ed.editando
            ? col.actualizar(ed.editando.id, d as Partial<Deuda>)
            : col.agregar(d as Omit<Deuda, 'id'>)
        }
      />
    </>
  )
}

// --- Metas de ahorro --------------------------------------------------------

const camposMeta: Campo[] = [
  {
    nombre: 'nombre',
    etiqueta: 'Nombre de la meta',
    tipo: 'texto',
    requerido: true,
    ayuda: 'Ej. Fondo de emergencia'
  },
  {
    nombre: 'objetivo',
    etiqueta: 'Objetivo en COP',
    tipo: 'dinero',
    requerido: true,
    min: 1,
    ancho: 'medio'
  },
  { nombre: 'ahorrado', etiqueta: 'Ya ahorrado', tipo: 'dinero', min: 0, ancho: 'medio' },
  { nombre: 'fechaLimite', etiqueta: 'Fecha límite', tipo: 'fecha' }
]

export function Metas() {
  const col = useColeccion<Meta>(CLAVES.metas, metasIniciales)
  const ed = useEdicion<Meta>()
  const filas = calcularMetas(col.items)

  return (
    <>
      <section className="panel full-panel sin-fondo">
        <Cabecera
          titulo="Tus objetivos"
          nota="Cuánto llevas de cada uno"
          accion="Nueva meta"
          onAccion={ed.nuevo}
        />
      </section>
      {!filas.length ? (
        <Vacio texto="Todavía no te has puesto ninguna meta." accion="Crear la primera" onAccion={ed.nuevo} />
      ) : (
        <div className="goal-grid">
          {filas.map(m => (
            <section className="panel goal-card" key={m.id}>
              <div className="goal-top">
                <div className="goal-symbol">
                  <Target />
                </div>
                <Acciones onEditar={() => ed.editar(m)} onBorrar={() => col.eliminar(m.id)} />
              </div>
              <h2>{m.nombre}</h2>
              <p>
                {m.fechaLimite
                  ? `Para el ${fechaCorta(m.fechaLimite)} · ${enDias(m.dias)}`
                  : 'Sin fecha límite'}
              </p>
              <div className="goal-values">
                <b>{money(m.ahorrado)}</b>
                <span>de {money(m.objetivo)}</span>
              </div>
              <div className="progress">
                <i style={{ width: `${Math.min(100, m.progreso)}%` }} />
              </div>
              <small>
                {m.progreso}% completado{m.falta > 0 ? ` · faltan ${money(m.falta)}` : ' · meta cumplida'}
              </small>
            </section>
          ))}
        </div>
      )}
      <FormModal
        abierto={ed.abierto}
        eyebrow="META DE AHORRO"
        titulo={ed.editando ? 'Editar meta' : 'Nueva meta'}
        campos={camposMeta}
        valores={ed.editando}
        onCerrar={ed.cerrar}
        onGuardar={d =>
          ed.editando
            ? col.actualizar(ed.editando.id, d as Partial<Meta>)
            : col.agregar(d as Omit<Meta, 'id'>)
        }
      />
    </>
  )
}
