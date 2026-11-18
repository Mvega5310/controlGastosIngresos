import { FormEvent, useMemo, useState } from 'react'
import { Users, Wallet, Percent, Settings2, CheckCircle2, Info } from 'lucide-react'
import { Account, Movement, money } from '../datos/catalogo'
import { aCentavos, aPesos } from '../core/dinero'
import { newId, Period, periodKey, periodLabel } from '../core/finanzas'
import {
  Cargo,
  ETIQUETAS_COMPONENTES,
  OPCIONES_FACTOR,
  ORDEN_COMPONENTES,
  ParametrosNomina,
  PARAMETROS_POR_DEFECTO,
  TOPE_AUXILIO_EN_SMMLV,
  VINCULACIONES,
  aplicaFactor,
  costoDeCargo,
  factorTotal,
  origenDePago,
  pagoRegistrado,
  resumenNomina,
  ultimoDiaDe,
  verPorcentaje
} from '../core/nomina'
import { RUBRO_NOMINA } from '../datos/empresa'
import { Acciones } from '../components/Acciones'
import FormModal, { Campo } from '../components/FormModal'
import StatCard from '../components/StatCard'
import { Coleccion } from '../lib/useDatos'
import { useEdicion } from '../lib/useEdicion'
import { Cabecera, Vacio } from './Planificacion'

const campos: Campo[] = [
  { nombre: 'rol', etiqueta: 'Cargo', tipo: 'texto', requerido: true, ayuda: 'Ej. Gerente financiera' },
  { nombre: 'persona', etiqueta: 'Persona (opcional)', tipo: 'texto', ayuda: 'Quién lo ocupa' },
  { nombre: 'vinculacion', etiqueta: 'Tipo de vinculación', tipo: 'seleccion', opciones: VINCULACIONES },
  {
    nombre: 'salario',
    etiqueta: 'Asignación mensual en COP',
    tipo: 'dinero',
    requerido: true,
    min: 1,
    ancho: 'medio'
  },
  {
    nombre: 'meses',
    etiqueta: 'Meses requeridos',
    tipo: 'numero',
    requerido: true,
    min: 1,
    max: 120,
    ayuda: '12',
    ancho: 'medio'
  },
  {
    nombre: 'factor',
    etiqueta: 'Factor prestacional',
    tipo: 'seleccion',
    opciones: OPCIONES_FACTOR,
    ayuda: 'Según el contrato: solo los contratos laborales lo llevan'
  },
  { nombre: 'funciones', etiqueta: 'Funciones (opcional)', tipo: 'texto' }
]

const iniciales = (texto: string) =>
  texto
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase() || '?'

export function Nomina({
  cargos,
  parametros,
  onGuardarParametros,
  movimientos,
  agregarMovimientos,
  cuentas,
  periodo
}: {
  cargos: Coleccion<Cargo>
  parametros: ParametrosNomina
  onGuardarParametros: (p: ParametrosNomina) => void
  movimientos: Movement[]
  agregarMovimientos: (m: Movement[]) => void
  cuentas: Account[]
  periodo: Period
}) {
  const ed = useEdicion<Cargo>()
  const [verParametros, setVerParametros] = useState(false)
  const [cuentaPago, setCuentaPago] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)

  const mes = periodKey(periodo)
  const resumen = useMemo(() => resumenNomina(cargos.items, parametros), [cargos.items, parametros])
  const filas = useMemo(
    () =>
      cargos.items
        .map(c => ({
          cargo: c,
          costo: costoDeCargo(c, parametros),
          pagado: pagoRegistrado(movimientos, c.id, mes)
        }))
        .sort((a, b) => b.costo.costoMensual - a.costo.costoMensual),
    [cargos.items, parametros, movimientos, mes]
  )
  const pendientes = filas.filter(f => !f.pagado && f.costo.costoMensual > 0)
  const cuenta = cuentas.some(c => c.name === cuentaPago) ? cuentaPago : (cuentas[0]?.name ?? '')

  const pagoDe = (c: Cargo, costoMensual: number): Movement => ({
    id: newId(),
    title: `Nómina · ${c.rol}`,
    category: RUBRO_NOMINA,
    account: cuenta,
    date: ultimoDiaDe(mes),
    amount: costoMensual,
    type: 'Gasto',
    origen: origenDePago(c.id, mes)
  })

  const registrar = (lista: typeof filas) => {
    if (!cuenta || !lista.length) return
    agregarMovimientos(lista.map(f => pagoDe(f.cargo, f.costo.costoMensual)))
    setAviso(
      lista.length === 1
        ? `Pago de «${lista[0].cargo.rol}» registrado en ${periodLabel(periodo).toLowerCase()}.`
        : `${lista.length} pagos registrados en ${periodLabel(periodo).toLowerCase()}.`
    )
  }

  return (
    <>
      <div className="stats-grid three">
        <StatCard
          label="Costo mensual del equipo"
          value={money(resumen.costoMensual)}
          icon={<Users size={19} />}
          note={`${resumen.cargos} cargo${resumen.cargos === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Costo en el periodo"
          value={money(resumen.costoPeriodo)}
          icon={<Wallet size={19} />}
          tone="purple"
          note="según los meses de cada cargo"
        />
        <StatCard
          label="Prestaciones al mes"
          value={money(resumen.prestaciones)}
          icon={<Percent size={19} />}
          tone="orange"
          note={`factor del ${verPorcentaje(factorTotal(parametros.factor))}`}
        />
      </div>

      {resumen.sinAuxilio.cargos > 0 && (
        <p className="aviso-bloque info">
          <Info size={14} />{' '}
          {resumen.sinAuxilio.cargos === 1
            ? '1 cargo laboral gana'
            : `${resumen.sinAuxilio.cargos} cargos laborales ganan`}{' '}
          hasta {TOPE_AUXILIO_EN_SMMLV} salarios mínimos y tiene{resumen.sinAuxilio.cargos === 1 ? '' : 'n'}{' '}
          derecho al auxilio de transporte, que el formato no incluye. Sumaría{' '}
          {money(resumen.sinAuxilio.mensual)} al mes. Puedes incluirlo en los parámetros.
        </p>
      )}

      <section className="panel full-panel">
        <Cabecera
          titulo="Equipo y costo"
          nota="El costo de cada cargo con su factor prestacional, y el pago de cada mes"
          accion="Nuevo cargo"
          onAccion={ed.nuevo}
        />

        {!filas.length ? (
          <Vacio
            texto="Aún no hay cargos. Registra el equipo del proyecto para calcular su costo."
            accion="Añadir el primero"
            onAccion={ed.nuevo}
          />
        ) : (
          <>
            <div className="barra-pago">
              <label htmlFor="cuenta-pago">Pagar desde</label>
              <select id="cuenta-pago" value={cuenta} onChange={e => setCuentaPago(e.target.value)}>
                {cuentas.map(c => (
                  <option key={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                className="btn-secondary"
                disabled={!cuenta || !pendientes.length}
                onClick={() => registrar(pendientes)}
              >
                <CheckCircle2 size={15} />{' '}
                {pendientes.length
                  ? `Registrar los ${pendientes.length} pagos de ${periodLabel(periodo).toLowerCase()}`
                  : 'Todo pagado este mes'}
              </button>
            </div>
            {!cuentas.length && (
              <p className="aviso-bloque">
                Crea una cuenta en «Cuentas» para poder registrar los pagos de nómina.
              </p>
            )}
            {aviso && <p className="aviso-bloque bueno">{aviso}</p>}

            <div className="simple-list">
              {filas.map(({ cargo: c, costo, pagado }) => (
                <div className="simple-row fila-cargo" key={c.id}>
                  <div className="simple-bullet">{iniciales(c.persona || c.rol)}</div>
                  <div>
                    <b>{c.rol}</b>
                    <small>
                      {c.vinculacion} · {c.meses} mes{c.meses === 1 ? '' : 'es'}
                      {c.persona ? ` · ${c.persona}` : ''}
                    </small>
                    <details className="desglose">
                      <summary>Ver cómo se calcula</summary>
                      <ul>
                        <li>
                          <span>Asignación</span>
                          <span>{money(costo.salario)}</span>
                        </li>
                        {costo.auxilio > 0 && (
                          <li>
                            <span>Auxilio de transporte</span>
                            <span>{money(costo.auxilio)}</span>
                          </li>
                        )}
                        {costo.prestaciones.map(p => (
                          <li key={p.clave}>
                            <span>
                              {p.etiqueta} · {verPorcentaje(p.porcentaje)}
                            </span>
                            <span>{money(p.monto)}</span>
                          </li>
                        ))}
                        {!aplicaFactor(c) && (
                          <li>
                            <span>
                              Sin prestaciones:{' '}
                              {c.factor === 'No' ? 'se indicó que no aplica' : 'el contrato no las lleva'}
                            </span>
                            <span />
                          </li>
                        )}
                        <li className="total">
                          <span>Costo mensual</span>
                          <span>{money(costo.costoMensual)}</span>
                        </li>
                        <li>
                          <span>
                            En {c.meses} mes{c.meses === 1 ? '' : 'es'}
                          </span>
                          <span>{money(costo.costoPeriodo)}</span>
                        </li>
                      </ul>
                    </details>
                  </div>
                  <strong>{money(costo.costoMensual)}</strong>
                  <span className={`status-pill ${pagado ? '' : 'warn'}`}>
                    {pagado ? 'Pagado' : 'Sin pagar'}
                  </span>
                  <div className="row-actions">
                    {!pagado && costo.costoMensual > 0 && (
                      <button
                        className="mini-btn"
                        disabled={!cuenta}
                        onClick={() => registrar([{ cargo: c, costo, pagado }])}
                      >
                        Registrar pago
                      </button>
                    )}
                    <Acciones
                      onEditar={() => ed.editar(c)}
                      onBorrar={() => cargos.eliminar(c.id)}
                      nombre={c.rol}
                      que="cargo"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="panel full-panel">
        <div className="panel-heading seccion-head">
          <div>
            <h2>Parámetros del cálculo</h2>
            <p>Salario mínimo, auxilio de transporte y porcentajes del factor prestacional</p>
          </div>
          <button
            className="btn-secondary"
            onClick={() => setVerParametros(v => !v)}
            aria-expanded={verParametros}
          >
            <Settings2 size={15} /> {verParametros ? 'Ocultar' : 'Ver y editar'}
          </button>
        </div>
        {verParametros && (
          <FormularioParametros
            actuales={parametros}
            onGuardar={p => {
              onGuardarParametros(p)
              setAviso('Parámetros guardados. El costo de cada cargo ya está recalculado.')
            }}
          />
        )}
      </section>

      <FormModal
        abierto={ed.abierto}
        eyebrow="EQUIPO"
        titulo={ed.editando ? 'Editar cargo' : 'Nuevo cargo'}
        campos={campos}
        valores={ed.editando}
        onCerrar={ed.cerrar}
        onGuardar={d =>
          ed.editando
            ? cargos.actualizar(ed.editando.id, d as Partial<Cargo>)
            : cargos.agregar(d as Omit<Cargo, 'id'>)
        }
      />
    </>
  )
}

/** Porcentaje en puntos base -> lo que se escribe: 850 -> "8.5". */
const aTexto = (puntosBase: number) => String(puntosBase / 100)
/** Lo que se escribe -> puntos base, acotado a 0-100 %. */
const aPuntos = (texto: string) => Math.min(10000, Math.max(0, Math.round((Number(texto) || 0) * 100)))

function FormularioParametros({
  actuales,
  onGuardar
}: {
  actuales: ParametrosNomina
  onGuardar: (p: ParametrosNomina) => void
}) {
  const [smmlv, setSmmlv] = useState(String(aPesos(actuales.smmlv)))
  const [auxilio, setAuxilio] = useState(String(aPesos(actuales.auxilioTransporte)))
  const [incluir, setIncluir] = useState(actuales.incluirAuxilio)
  const [pct, setPct] = useState<Record<string, string>>(() =>
    Object.fromEntries(ORDEN_COMPONENTES.map(k => [k, aTexto(actuales.factor[k])]))
  )

  const total = ORDEN_COMPONENTES.reduce((s, k) => s + aPuntos(pct[k]), 0)

  const guardar = (e: FormEvent) => {
    e.preventDefault()
    onGuardar({
      smmlv: aCentavos(Number(smmlv)),
      auxilioTransporte: aCentavos(Number(auxilio)),
      incluirAuxilio: incluir,
      factor: Object.fromEntries(
        ORDEN_COMPONENTES.map(k => [k, aPuntos(pct[k])])
      ) as ParametrosNomina['factor']
    })
  }

  const restablecer = () => {
    setSmmlv(String(aPesos(PARAMETROS_POR_DEFECTO.smmlv)))
    setAuxilio(String(aPesos(PARAMETROS_POR_DEFECTO.auxilioTransporte)))
    setIncluir(PARAMETROS_POR_DEFECTO.incluirAuxilio)
    setPct(Object.fromEntries(ORDEN_COMPONENTES.map(k => [k, aTexto(PARAMETROS_POR_DEFECTO.factor[k])])))
  }

  return (
    <form className="parametros-nomina" onSubmit={guardar}>
      <div className="form-grid">
        <div>
          <label htmlFor="par-smmlv">Salario mínimo mensual vigente (COP)</label>
          <input
            id="par-smmlv"
            type="number"
            min="1"
            required
            inputMode="numeric"
            value={smmlv}
            onChange={e => setSmmlv(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="par-auxilio">Auxilio de transporte mensual (COP)</label>
          <input
            id="par-auxilio"
            type="number"
            min="0"
            required
            inputMode="numeric"
            value={auxilio}
            onChange={e => setAuxilio(e.target.value)}
          />
        </div>
      </div>
      <p className="nota-par">
        El salario mínimo es el de la hoja «Topes Montos» del formato. Confirma el auxilio de transporte en el
        decreto vigente: es un valor que cambia cada año.
      </p>
      <label className="casilla">
        <input type="checkbox" checked={incluir} onChange={e => setIncluir(e.target.checked)} />
        <span>
          Incluir el auxilio de transporte en el costo de quien gana hasta {TOPE_AUXILIO_EN_SMMLV} salarios
          mínimos y tiene contrato laboral
        </span>
      </label>

      <h3>Factor prestacional</h3>
      <div className="rejilla-factor">
        {ORDEN_COMPONENTES.map(k => (
          <div key={k}>
            <label htmlFor={`par-${k}`}>{ETIQUETAS_COMPONENTES[k]} (%)</label>
            <input
              id={`par-${k}`}
              type="number"
              min="0"
              max="100"
              step="0.01"
              inputMode="decimal"
              value={pct[k]}
              onChange={e => setPct(p => ({ ...p, [k]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <p className="nota-par">
        Total del factor: <b>{verPorcentaje(total)}</b>. El formato del SENA usa 53,76 %.
      </p>

      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={restablecer}>
          Volver a los valores del formato
        </button>
        <button className="btn-primary" type="submit">
          Guardar parámetros
        </button>
      </div>
    </form>
  )
}
