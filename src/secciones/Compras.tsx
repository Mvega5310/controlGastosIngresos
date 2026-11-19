import { useMemo, useState } from 'react'
import { ShoppingCart, CheckCircle2, Clock, Info } from 'lucide-react'
import { Account, Movement, money } from '../datos/catalogo'
import { newId } from '../core/finanzas'
import {
  Compra,
  ESTADOS_COMPRA,
  gastoDeCompra,
  ordenarCompras,
  origenDeCompra,
  resumenCompras,
  totalDeCompra,
  valorEfectivo
} from '../core/compras'
import { hayGastoDe } from '../core/origenes'
import { paginaDe, paginaValida } from '../core/paginacion'
import { RUBROS } from '../datos/empresa'
import { Acciones } from '../components/Acciones'
import FormModal, { Campo } from '../components/FormModal'
import { Paginador } from '../components/Paginador'
import { RegistroGasto } from '../components/RegistroGasto'
import StatCard from '../components/StatCard'
import { Coleccion } from '../lib/useDatos'
import { useEdicion } from '../lib/useEdicion'
import { Cabecera, Vacio } from './Planificacion'

const campos: Campo[] = [
  {
    nombre: 'descripcion',
    etiqueta: 'Qué se compra',
    tipo: 'texto',
    requerido: true,
    ayuda: 'Ej. Portátil para el analista'
  },
  { nombre: 'rubro', etiqueta: 'Rubro del fondo', tipo: 'seleccion', opciones: RUBROS },
  {
    nombre: 'cantidad',
    etiqueta: 'Cantidad',
    tipo: 'numero',
    requerido: true,
    min: 1,
    ayuda: '1',
    ancho: 'medio'
  },
  {
    nombre: 'valorUnitario',
    etiqueta: 'Valor unitario en COP',
    tipo: 'dinero',
    requerido: true,
    min: 1,
    ancho: 'medio'
  },
  { nombre: 'estado', etiqueta: 'Estado', tipo: 'seleccion', opciones: ESTADOS_COMPRA, ancho: 'medio' },
  {
    nombre: 'mes',
    etiqueta: 'Mes del plan',
    tipo: 'numero',
    min: 0,
    max: 120,
    ayuda: '1 = el primero; 0 = sin asignar',
    ancho: 'medio'
  },
  { nombre: 'proveedor', etiqueta: 'Proveedor (opcional)', tipo: 'texto' }
]

export function Compras({
  compras,
  movimientos,
  agregarMovimientos,
  cuentas
}: {
  compras: Coleccion<Compra>
  movimientos: Movement[]
  agregarMovimientos: (m: Movement[]) => void
  cuentas: Account[]
}) {
  const ed = useEdicion<Compra>()
  const [estado, setEstado] = useState('Todas')
  const [pagina, setPagina] = useState(1)
  const [registrando, setRegistrando] = useState<Compra | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const r = useMemo(() => resumenCompras(compras.items), [compras.items])
  const lista = useMemo(
    () => ordenarCompras(compras.items).filter(c => estado === 'Todas' || c.estado === estado),
    [compras.items, estado]
  )
  const visibles = paginaDe(lista, pagina)
  const paginaActual = paginaValida(pagina, lista.length)

  const registrar = (datos: { fecha: string; valor: number; cuenta: string }) => {
    if (!registrando) return
    agregarMovimientos([gastoDeCompra(registrando, { id: newId(), ...datos })])
    compras.actualizar(registrando.id, {
      estado: 'Comprado',
      valorReal: datos.valor,
      fechaCompra: datos.fecha
    })
    setAviso(`Compra de «${registrando.descripcion}» registrada como gasto.`)
    setRegistrando(null)
  }

  return (
    <>
      <div className="stats-grid three">
        <StatCard
          label="Total planeado"
          value={money(r.planeado)}
          icon={<ShoppingCart size={19} />}
          note={`${r.cuantas} compra${r.cuantas === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Comprado"
          value={money(r.comprado)}
          icon={<CheckCircle2 size={19} />}
          tone="purple"
          note={`${r.planeado > 0 ? Math.round((r.comprado * 100) / r.planeado) : 0} % de lo planeado`}
        />
        <StatCard
          label="Por comprar"
          value={money(r.porComprar)}
          icon={<Clock size={19} />}
          tone="orange"
          note={r.porCotizar ? `${r.porCotizar} por cotizar` : 'todo cotizado'}
        />
      </div>

      {r.sinMes > 0 && (
        <p className="aviso-bloque info">
          <Info size={14} /> {r.sinMes} compra{r.sinMes === 1 ? '' : 's'} sin mes del plan: no se pueden
          repartir en el plan por mes. Asígnales el mes en que las harás.
        </p>
      )}
      {aviso && <p className="aviso-bloque bueno">{aviso}</p>}

      <section className="panel full-panel">
        <Cabecera
          titulo="Compras e inversiones"
          nota="Equipos, muebles, software y adecuaciones: lo que se planea, lo que se cotiza y lo que se compra"
          accion="Nueva compra"
          onAccion={ed.nuevo}
        />

        {!compras.items.length ? (
          <Vacio
            texto="Aún no hay compras. Registra lo que el proyecto necesita adquirir."
            accion="Añadir la primera"
            onAccion={ed.nuevo}
          />
        ) : (
          <>
            <div className="barra-pago">
              <label htmlFor="filtro-estado-compra">Ver</label>
              <select
                id="filtro-estado-compra"
                value={estado}
                onChange={e => {
                  setEstado(e.target.value)
                  setPagina(1)
                }}
              >
                <option>Todas</option>
                {ESTADOS_COMPRA.map(e => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </div>
            {!cuentas.length && (
              <p className="aviso-bloque">
                Crea una cuenta en «Cuentas» para poder registrar las compras como gasto.
              </p>
            )}

            {!lista.length ? (
              <div className="empty">
                <p>No hay compras en estado «{estado}».</p>
              </div>
            ) : (
              <div className="simple-list">
                {visibles.map(c => {
                  const registrada = hayGastoDe(movimientos, origenDeCompra(c.id))
                  return (
                    <div className="simple-row fila-compra" key={c.id}>
                      <div className="simple-bullet">{c.cantidad > 99 ? '99+' : `×${c.cantidad}`}</div>
                      <div>
                        <b>{c.descripcion}</b>
                        <small>
                          {c.rubro} · {c.cantidad} × {money(c.valorUnitario)}
                          {c.proveedor ? ` · ${c.proveedor}` : ''}
                          {c.mes ? ` · mes ${c.mes} del plan` : ''}
                        </small>
                        {c.estado === 'Comprado' && c.valorReal && c.valorReal !== totalDeCompra(c) && (
                          <small>
                            Pagado {money(valorEfectivo(c))} (planeado {money(totalDeCompra(c))})
                          </small>
                        )}
                      </div>
                      <strong>{money(valorEfectivo(c))}</strong>
                      <span className={`status-pill ${c.estado === 'Por cotizar' ? 'warn' : ''}`}>
                        {c.estado}
                      </span>
                      <div className="row-actions">
                        {registrada ? (
                          <span className="nota-registrada">Gasto registrado</span>
                        ) : (
                          <button
                            className="mini-btn"
                            disabled={!cuentas.length}
                            onClick={() => setRegistrando(c)}
                          >
                            {c.estado === 'Comprado' ? 'Registrar gasto' : 'Registrar compra'}
                          </button>
                        )}
                        <Acciones
                          onEditar={() => ed.editar(c)}
                          onBorrar={() => compras.eliminar(c.id)}
                          nombre={c.descripcion}
                          que="compra"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <Paginador pagina={paginaActual} cuantos={lista.length} onCambiar={setPagina} />
          </>
        )}
      </section>

      <FormModal
        abierto={ed.abierto}
        eyebrow="COMPRA"
        titulo={ed.editando ? 'Editar compra' : 'Nueva compra'}
        campos={campos}
        valores={ed.editando}
        onCerrar={ed.cerrar}
        onGuardar={d =>
          ed.editando
            ? compras.actualizar(ed.editando.id, d as Partial<Compra>)
            : compras.agregar(d as Omit<Compra, 'id'>)
        }
      />
      <RegistroGasto
        abierto={!!registrando}
        titulo={registrando ? `Registrar «${registrando.descripcion}»` : ''}
        valorInicial={registrando ? valorEfectivo(registrando) : 0}
        cuentas={cuentas}
        onGuardar={registrar}
        onCerrar={() => setRegistrando(null)}
      />
    </>
  )
}
