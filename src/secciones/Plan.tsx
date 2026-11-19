import { FormEvent, useMemo, useState } from 'react'
import { ClipboardList, Wallet, TrendingDown, Settings2, Info, TriangleAlert, Link2 } from 'lucide-react'
import { Movement, money } from '../datos/catalogo'
import { aCentavos, aPesos } from '../core/dinero'
import { verPorcentaje } from '../core/nomina'
import {
  FilaRubro,
  FuentePlan,
  ParametrosProyecto,
  PlanItem,
  SugerenciaRubro,
  calcularPlan,
  cambiaLaCelda,
  cambiosDeRelleno,
  claveDeMes,
  idDePlan,
  mesesDelPlan,
  sugerenciasDelPlan
} from '../core/plan'
import { Registro } from '../core/sincronizacion'
import { RUBROS } from '../datos/empresa'
import { Confirmar } from '../components/Confirmar'
import StatCard from '../components/StatCard'

/** Lo que Plan necesita de la colección del plan: leer las celdas y escribir una. */
type ColeccionPlan = {
  items: PlanItem[]
  todos: (PlanItem & Partial<Registro>)[]
  fijar: (id: string, datos: Omit<PlanItem, 'id'>) => void
}

/** '2026-11' -> 'nov 2026'. */
const etiquetaMes = (clave: string) => {
  const [anio, mes] = clave.split('-').map(Number)
  return new Date(anio, mes - 1, 1)
    .toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
    .replace('.', '')
}

export function Plan({
  plan,
  parametros,
  onGuardarParametros,
  movimientos,
  fuentes
}: {
  plan: ColeccionPlan
  parametros: ParametrosProyecto
  onGuardarParametros: (p: ParametrosProyecto) => void
  movimientos: Movement[]
  /** Lo que dicen las compras, el mercadeo y los trámites: sirve para llenar el plan. */
  fuentes: FuentePlan[]
}) {
  // Sin valor solicitado todavía, lo primero que hay que hacer es ponerlo.
  const [editando, setEditando] = useState(parametros.valorSolicitado === 0)
  const [aviso, setAviso] = useState<string | null>(null)

  const r = useMemo(
    () => calcularPlan(plan.items, movimientos, parametros, RUBROS),
    [plan.items, movimientos, parametros]
  )
  const mesActual = claveDeMes(new Date())
  const meses = useMemo(
    () => mesesDelPlan(parametros.inicio, parametros.meses),
    [parametros.inicio, parametros.meses]
  )
  const excedidos = r.filas.filter(f => f.tope.excedido)
  const sinPlan = r.filas.filter(f => f.estado === 'sin-plan')
  const porEjecutar = Math.max(0, r.totalPlaneado - r.totalEjecutado)

  const sugerencias = useMemo(
    () => sugerenciasDelPlan(fuentes, parametros.meses),
    [fuentes, parametros.meses]
  )
  const cambios = useMemo(() => cambiosDeRelleno(plan.todos, sugerencias), [plan.todos, sugerencias])
  const sinMes = [...sugerencias.values()].reduce((s, x) => s + x.sinMes, 0)
  const porOrigen = useMemo(() => {
    const total = new Map<string, number>()
    for (const f of fuentes) total.set(f.origen, (total.get(f.origen) ?? 0) + (f.monto || 0))
    return [...total].filter(([, monto]) => monto > 0)
  }, [fuentes])
  const [confirmando, setConfirmando] = useState(false)

  const rellenar = () => {
    for (const c of cambios)
      plan.fijar(idDePlan(c.rubro, c.mes), { rubro: c.rubro, mes: c.mes, monto: c.monto })
    setAviso(`Plan completado: ${cambios.length} casilla${cambios.length === 1 ? '' : 's'} desde las listas.`)
    setConfirmando(false)
  }

  const escribir = (rubro: string, mes: number, centavos: number) => {
    if (!cambiaLaCelda(plan.todos, rubro, mes, centavos)) return
    plan.fijar(idDePlan(rubro, mes), { rubro, mes, monto: Math.max(0, Math.round(centavos)) })
  }

  return (
    <>
      <div className="stats-grid three">
        <StatCard
          label="Plan total"
          value={money(r.totalPlaneado)}
          icon={<ClipboardList size={19} />}
          note={
            !r.hayValor
              ? 'define el valor solicitado'
              : r.cuadra
                ? 'corresponde al valor solicitado'
                : `${r.diferencia < 0 ? 'faltan' : 'sobran'} ${money(Math.abs(r.diferencia))}`
          }
        />
        <StatCard
          label="Ejecutado"
          value={money(r.totalEjecutado)}
          icon={<Wallet size={19} />}
          tone="purple"
          note={`${r.totalPlaneado > 0 ? Math.round((r.totalEjecutado * 100) / r.totalPlaneado) : 0} % del plan`}
        />
        <StatCard
          label="Por ejecutar"
          value={money(porEjecutar)}
          icon={<TrendingDown size={19} />}
          tone="orange"
          note={`en ${parametros.meses} mes${parametros.meses === 1 ? '' : 'es'}`}
        />
      </div>

      {r.hayValor && (
        <p className={`aviso-bloque ${r.cuadra ? 'bueno' : 'info'}`}>
          <Info size={14} />{' '}
          {r.cuadra
            ? 'El plan suma exactamente el valor solicitado.'
            : `El plan suma ${money(r.totalPlaneado)} y el valor solicitado es ${money(parametros.valorSolicitado)}: ${
                r.diferencia < 0 ? 'faltan' : 'sobran'
              } ${money(Math.abs(r.diferencia))} por repartir. El formato exige que coincidan.`}
        </p>
      )}
      {excedidos.length > 0 && (
        <p className="aviso-bloque">
          <TriangleAlert size={14} /> Por encima de su tope:{' '}
          {excedidos
            .map(
              f =>
                `${f.rubro} (${verPorcentaje(f.tope.usado)} de un máximo de ${verPorcentaje(f.tope.limite ?? 0)})`
            )
            .join('; ')}
          .
        </p>
      )}
      {sinPlan.length > 0 && (
        <p className="aviso-bloque">
          <TriangleAlert size={14} /> Hay gastos en rubros sin plan: {sinPlan.map(f => f.rubro).join('; ')}.
        </p>
      )}
      {r.ejecutadoFuera > 0 && (
        <p className="aviso-bloque info">
          <Info size={14} /> Hay {money(r.ejecutadoFuera)} en gastos de meses fuera del plan (antes de{' '}
          {etiquetaMes(meses[0])} o después de {etiquetaMes(meses[meses.length - 1])}). No cuentan en esta
          pantalla.
        </p>
      )}
      {aviso && <p className="aviso-bloque bueno">{aviso}</p>}

      <section className="panel full-panel compacto">
        <div className="panel-heading seccion-head">
          <div>
            <h2>Datos del proyecto</h2>
            <p>
              {parametros.valorSolicitado > 0
                ? `${money(parametros.valorSolicitado)} · ${parametros.meses} meses desde ${etiquetaMes(parametros.inicio)}`
                : 'Valor solicitado, mes de inicio y duración del plan'}
            </p>
          </div>
          <button className="btn-secondary" onClick={() => setEditando(v => !v)} aria-expanded={editando}>
            <Settings2 size={15} /> {editando ? 'Ocultar' : 'Editar'}
          </button>
        </div>
        {editando && (
          <FormularioProyecto
            actuales={parametros}
            onGuardar={p => {
              onGuardarParametros(p)
              setAviso('Datos del proyecto guardados.')
              setEditando(false)
            }}
          />
        )}
      </section>

      <section className="panel full-panel compacto">
        <div className="panel-heading seccion-head">
          <div>
            <h2>Plan por rubro</h2>
            <p>Lo planeado cada mes, frente a lo gastado. Escribe el importe y pasa al siguiente campo.</p>
          </div>
        </div>
        {porOrigen.length > 0 && (
          <div className="relleno-plan">
            <p>
              <Link2 size={14} /> Según tus listas:{' '}
              {porOrigen.map(([origen, monto]) => `${origen} ${money(monto)}`).join(' · ')}
              {sinMes > 0 && ` · ${money(sinMes)} sin mes del plan, que no se puede repartir`}.
            </p>
            <button
              className="btn-secondary"
              disabled={cambios.length === 0}
              onClick={() => (cambios.some(c => c.sustituye) ? setConfirmando(true) : rellenar())}
            >
              {cambios.length === 0
                ? 'El plan ya refleja las listas'
                : `Completar ${cambios.length} casilla${cambios.length === 1 ? '' : 's'} desde las listas`}
            </button>
          </div>
        )}
        <div className="rubros-plan">
          {r.filas.map(f => (
            <RubroPlan
              key={f.rubro}
              fila={f}
              sugerencia={sugerencias.get(f.rubro)}
              onEscribir={(mes, c) => escribir(f.rubro, mes, c)}
            />
          ))}
        </div>
      </section>

      <Confirmar
        abierto={confirmando}
        titulo="¿Cambiar importes que ya escribiste?"
        detalle={`${cambios.filter(c => c.sustituye).length} casilla${
          cambios.filter(c => c.sustituye).length === 1 ? '' : 's'
        } ya tienen un importe distinto y se sustituirán por lo que suman tus listas. Las demás casillas no se tocan.`}
        textoConfirmar="Sí, completar"
        onCancelar={() => setConfirmando(false)}
        onConfirmar={rellenar}
      />

      <section className="panel full-panel compacto">
        <div className="panel-heading seccion-head">
          <div>
            <h2>Mes a mes</h2>
            <p>El total de todos los rubros</p>
          </div>
        </div>
        <div className="meses-plan">
          {r.porMes.map(m => {
            const dif = m.planeado - m.ejecutado
            return (
              <div className={`mes-plan ${m.mes === mesActual ? 'actual' : ''}`} key={m.mes}>
                <b>
                  {etiquetaMes(m.mes)}
                  {m.mes === mesActual && <em> · este mes</em>}
                </b>
                <span>
                  <small>Planeado</small>
                  <strong>{money(m.planeado)}</strong>
                </span>
                <span>
                  <small>Gastado</small>
                  <strong>{money(m.ejecutado)}</strong>
                </span>
                <span>
                  <small>{dif >= 0 ? 'Queda' : 'Se pasó'}</small>
                  <strong className={dif < 0 ? 'negative' : ''}>{money(Math.abs(dif))}</strong>
                </span>
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}

function RubroPlan({
  fila: f,
  sugerencia,
  onEscribir
}: {
  fila: FilaRubro
  sugerencia?: SugerenciaRubro
  onEscribir: (mes: number, centavos: number) => void
}) {
  const pastilla =
    f.estado === 'excedido'
      ? { texto: 'Pasó el plan', clase: 'bad' }
      : f.estado === 'sin-plan'
        ? { texto: 'Sin plan', clase: 'warn' }
        : f.estado === 'en-curso'
          ? { texto: `${f.progreso} %`, clase: '' }
          : null

  return (
    <details className={`rubro-plan ${f.estado === 'vacio' ? 'vacio' : ''}`}>
      <summary>
        <span className="rubro-nombre">
          <b>{f.rubro}</b>
          <small>
            {f.planeado > 0 || f.ejecutado > 0
              ? `${money(f.ejecutado)} de ${money(f.planeado)}`
              : 'Sin importes todavía'}
            {f.tope.limite !== null && (
              <>
                {' · '}
                <span className={f.tope.excedido ? 'negative' : ''}>
                  tope {verPorcentaje(f.tope.limite)}, plan {verPorcentaje(f.tope.usado)}
                </span>
              </>
            )}
          </small>
        </span>
        {pastilla && <span className={`status-pill ${pastilla.clase}`}>{pastilla.texto}</span>}
        {f.planeado > 0 && (
          <span className="progress rubro-barra" aria-hidden="true">
            <i
              className={f.estado === 'excedido' ? 'excedido' : ''}
              style={{ width: `${Math.min(100, f.progreso)}%` }}
            />
          </span>
        )}
      </summary>
      <div className="celdas-plan">
        {f.meses.map((m, i) => (
          <label key={m.mes} className="celda-plan">
            <span>
              Mes {i + 1} · {etiquetaMes(m.mes)}
            </span>
            <Celda
              key={m.planeado}
              valor={m.planeado}
              etiqueta={`${f.rubro}, mes ${i + 1}, importe planeado`}
              onEscribir={c => onEscribir(i + 1, c)}
            />
            {m.ejecutado > 0 && (
              <small className={m.ejecutado > m.planeado ? 'negative' : ''}>
                gastado {money(m.ejecutado)}
              </small>
            )}
            {(sugerencia?.porMes[i] ?? 0) > 0 && sugerencia!.porMes[i] !== m.planeado && (
              <small className="sugerencia">en tus listas {money(sugerencia!.porMes[i])}</small>
            )}
          </label>
        ))}
        {(sugerencia?.sinMes ?? 0) > 0 && (
          <p className="nota-par celdas-nota">
            Hay {money(sugerencia!.sinMes)} de este rubro en tus listas sin un mes del plan asignado.
          </p>
        )}
      </div>
    </details>
  )
}

const enPesos = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

/**
 * Campo de pesos enteros: con puntos de mil al leerlo ($ 508.000.000 se lee de
 * un vistazo; 508000000, no) y en cifras mientras se escribe, para que el cursor
 * no salte. `type="number"` no puede formatear, por eso es texto con teclado
 * numérico.
 */
function CampoPesos({
  id,
  valor,
  etiqueta,
  ayuda,
  onCambio,
  onSalir
}: {
  id?: string
  /** Solo cifras, sin puntos. */
  valor: string
  etiqueta?: string
  ayuda?: string
  onCambio: (cifras: string) => void
  onSalir?: () => void
}) {
  const [enfocado, setEnfocado] = useState(false)
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={ayuda ?? '0'}
      aria-label={etiqueta}
      value={enfocado || !valor ? valor : enPesos.format(Number(valor))}
      onFocus={e => {
        setEnfocado(true)
        e.currentTarget.select()
      }}
      onChange={e => onCambio(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''))}
      onBlur={() => {
        setEnfocado(false)
        onSalir?.()
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
    />
  )
}

/**
 * Importe de una celda. Se escribe al salir del campo, no en cada tecla: cada
 * escritura es una sincronización pendiente, y un número de nueve cifras serían
 * nueve. Quien la usa le pone como clave el valor guardado, de modo que si este
 * cambia desde fuera (otro dispositivo) el campo se vuelve a pintar con el nuevo.
 */
function Celda({
  valor,
  etiqueta,
  onEscribir
}: {
  valor: number
  etiqueta: string
  onEscribir: (centavos: number) => void
}) {
  const [cifras, setCifras] = useState(valor > 0 ? String(Math.round(aPesos(valor))) : '')
  return (
    <CampoPesos
      valor={cifras}
      etiqueta={etiqueta}
      onCambio={setCifras}
      onSalir={() => onEscribir(aCentavos(Number(cifras) || 0))}
    />
  )
}

function FormularioProyecto({
  actuales,
  onGuardar
}: {
  actuales: ParametrosProyecto
  onGuardar: (p: ParametrosProyecto) => void
}) {
  const [valor, setValor] = useState(
    actuales.valorSolicitado > 0 ? String(aPesos(actuales.valorSolicitado)) : ''
  )
  const [inicio, setInicio] = useState(actuales.inicio)
  const [meses, setMeses] = useState(String(actuales.meses))

  const guardar = (e: FormEvent) => {
    e.preventDefault()
    onGuardar({
      ...actuales,
      valorSolicitado: aCentavos(Number(valor) || 0),
      inicio,
      meses: Math.min(120, Math.max(1, Math.round(Number(meses) || 1)))
    })
  }

  return (
    <form className="form-proyecto" onSubmit={guardar}>
      <div>
        <label htmlFor="pro-valor">Valor solicitado al fondo (COP)</label>
        <CampoPesos id="pro-valor" valor={valor} ayuda="508.000.000" onCambio={setValor} />
      </div>
      <div className="form-grid">
        <div>
          <label htmlFor="pro-inicio">Mes en que empieza</label>
          <input
            id="pro-inicio"
            type="month"
            required
            pattern="\d{4}-\d{2}"
            placeholder="AAAA-MM"
            value={inicio}
            onChange={e => setInicio(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="pro-meses">Meses del plan</label>
          <input
            id="pro-meses"
            type="number"
            min="1"
            max="120"
            required
            inputMode="numeric"
            value={meses}
            onChange={e => setMeses(e.target.value)}
          />
        </div>
      </div>
      <p className="nota-par">
        El formato reparte el valor solicitado en 9 meses. Si cambias el mes de inicio, lo gastado se vuelve a
        repartir entre los nuevos meses.
      </p>
      <div className="modal-actions">
        <button className="btn-primary" type="submit">
          Guardar
        </button>
      </div>
    </form>
  )
}
