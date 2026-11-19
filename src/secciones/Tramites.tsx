import { useMemo, useState } from 'react'
import { FileCheck, Timer, Wallet, Info, TriangleAlert } from 'lucide-react'
import { Account, Movement, money } from '../datos/catalogo'
import { newId } from '../core/finanzas'
import {
  ESTADOS_TRAMITE,
  NO_FINANCIABLE,
  RUBROS_TRAMITE,
  Tramite,
  diasParaListo,
  esFinanciable,
  fechaEstimada,
  gastoDeTramite,
  origenDeTramite,
  resumenTramites
} from '../core/tramites'
import { hayGastoDe } from '../core/origenes'
import { paginaDe, paginaValida } from '../core/paginacion'
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
    nombre: 'nombre',
    etiqueta: 'Trámite',
    tipo: 'texto',
    requerido: true,
    ayuda: 'Ej. Registro de marca ante la SIC'
  },
  { nombre: 'rubro', etiqueta: 'Rubro', tipo: 'seleccion', opciones: RUBROS_TRAMITE },
  { nombre: 'costo', etiqueta: 'Costo en COP', tipo: 'dinero', min: 0, ancho: 'medio' },
  {
    nombre: 'dias',
    etiqueta: 'Días que toma',
    tipo: 'numero',
    min: 0,
    max: 3650,
    ayuda: '14',
    ancho: 'medio'
  },
  { nombre: 'estado', etiqueta: 'Estado', tipo: 'seleccion', opciones: ESTADOS_TRAMITE, ancho: 'medio' },
  { nombre: 'inicio', etiqueta: 'Fecha de inicio', tipo: 'fecha', ancho: 'medio' },
  {
    nombre: 'mes',
    etiqueta: 'Mes del plan en que se paga',
    tipo: 'numero',
    min: 0,
    max: 120,
    ayuda: '1 = el primero; 0 = sin asignar'
  },
  { nombre: 'descripcion', etiqueta: 'Descripción (opcional)', tipo: 'texto' }
]

const fechaCorta = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

export function Tramites({
  tramites,
  movimientos,
  agregarMovimientos,
  cuentas
}: {
  tramites: Coleccion<Tramite>
  movimientos: Movement[]
  agregarMovimientos: (m: Movement[]) => void
  cuentas: Account[]
}) {
  const ed = useEdicion<Tramite>()
  const [pagina, setPagina] = useState(1)
  const [registrando, setRegistrando] = useState<Tramite | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const hoy = new Date().toISOString().slice(0, 10)
  const r = useMemo(() => resumenTramites(tramites.items, hoy), [tramites.items, hoy])
  const lista = useMemo(
    () =>
      [...tramites.items].sort(
        (a, b) =>
          ESTADOS_TRAMITE.indexOf(a.estado) - ESTADOS_TRAMITE.indexOf(b.estado) ||
          a.nombre.localeCompare(b.nombre, 'es')
      ),
    [tramites.items]
  )
  const visibles = paginaDe(lista, pagina)
  const paginaActual = paginaValida(pagina, lista.length)

  const registrar = (datos: { fecha: string; valor: number; cuenta: string }) => {
    if (!registrando) return
    agregarMovimientos([gastoDeTramite(registrando, { id: newId(), ...datos })])
    setAviso(`Gasto de «${registrando.nombre}» registrado.`)
    setRegistrando(null)
  }

  return (
    <>
      <div className="stats-grid three">
        <StatCard
          label="Costo financiable"
          value={money(r.costoFinanciable)}
          icon={<Wallet size={19} />}
          note={
            r.costoNoFinanciable ? `${money(r.costoNoFinanciable)} lo asume el emprendedor` : 'entra al plan'
          }
        />
        <StatCard
          label="Listos"
          value={`${r.listos} de ${r.cuantos}`}
          icon={<FileCheck size={19} />}
          tone="purple"
          note={r.enTramite ? `${r.enTramite} en trámite` : 'trámites del proyecto'}
        />
        <StatCard
          label="El más largo"
          value={`${r.diasMayor} días`}
          icon={<Timer size={19} />}
          tone="orange"
          note="empieza por ese"
        />
      </div>

      {r.atrasados > 0 && (
        <p className="aviso-bloque">
          <TriangleAlert size={14} /> {r.atrasados} trámite{r.atrasados === 1 ? '' : 's'} pasó su fecha
          estimada sin estar listo.
        </p>
      )}
      <p className="aviso-bloque info">
        <Info size={14} /> La constitución legal de la empresa es un rubro no financiable: lo asume el
        emprendedor y no entra al plan que se pide al fondo.
      </p>
      {aviso && <p className="aviso-bloque bueno">{aviso}</p>}

      <section className="panel full-panel">
        <Cabecera
          titulo="Permisos, licencias y registros"
          nota="Cada trámite con su costo, el tiempo que toma y la fecha en que debería estar listo"
          accion="Nuevo trámite"
          onAccion={ed.nuevo}
        />
        {!tramites.items.length ? (
          <Vacio
            texto="Aún no hay trámites. Registra los permisos y licencias que necesita el proyecto."
            accion="Añadir el primero"
            onAccion={ed.nuevo}
          />
        ) : (
          <>
            {!cuentas.length && (
              <p className="aviso-bloque">Crea una cuenta en «Cuentas» para poder registrar los gastos.</p>
            )}
            <div className="simple-list">
              {visibles.map(t => {
                const registrado = hayGastoDe(movimientos, origenDeTramite(t.id))
                const estimada = fechaEstimada(t.inicio, t.dias)
                const faltan = diasParaListo(t, hoy)
                return (
                  <div className="simple-row" key={t.id}>
                    <div className="simple-bullet">{t.dias > 99 ? '99+' : `${t.dias}d`}</div>
                    <div>
                      <b>{t.nombre}</b>
                      <small>
                        {esFinanciable(t) ? t.rubro : NO_FINANCIABLE}
                        {t.mes ? ` · mes ${t.mes} del plan` : ''}
                      </small>
                      <small className={faltan !== null && faltan < 0 ? 'negative' : ''}>
                        {t.estado === 'Listo'
                          ? 'Listo'
                          : estimada
                            ? `Listo estimado el ${fechaCorta(estimada)}${
                                faltan !== null
                                  ? faltan < 0
                                    ? ` · atrasado ${Math.abs(faltan)} d`
                                    : faltan === 0
                                      ? ' · hoy'
                                      : ` · en ${faltan} d`
                                  : ''
                              }`
                            : 'Sin fecha de inicio'}
                      </small>
                    </div>
                    <strong>{money(t.costo)}</strong>
                    <span className={`status-pill ${t.estado === 'Por iniciar' ? 'warn' : ''}`}>
                      {t.estado}
                    </span>
                    <div className="row-actions">
                      {registrado ? (
                        <span className="nota-registrada">Gasto registrado</span>
                      ) : (
                        t.costo > 0 && (
                          <button
                            className="mini-btn"
                            disabled={!cuentas.length}
                            onClick={() => setRegistrando(t)}
                          >
                            Registrar gasto
                          </button>
                        )
                      )}
                      <Acciones
                        onEditar={() => ed.editar(t)}
                        onBorrar={() => tramites.eliminar(t.id)}
                        nombre={t.nombre}
                        que="trámite"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <Paginador pagina={paginaActual} cuantos={lista.length} onCambiar={setPagina} />
          </>
        )}
      </section>

      <FormModal
        abierto={ed.abierto}
        eyebrow="TRÁMITE"
        titulo={ed.editando ? 'Editar trámite' : 'Nuevo trámite'}
        campos={campos}
        valores={ed.editando}
        onCerrar={ed.cerrar}
        onGuardar={d =>
          ed.editando
            ? tramites.actualizar(ed.editando.id, d as Partial<Tramite>)
            : tramites.agregar(d as Omit<Tramite, 'id'>)
        }
      />
      <RegistroGasto
        abierto={!!registrando}
        titulo={registrando ? `Registrar «${registrando.nombre}»` : ''}
        valorInicial={registrando?.costo ?? 0}
        cuentas={cuentas}
        onGuardar={registrar}
        onCerrar={() => setRegistrando(null)}
      />
    </>
  )
}
