import { useMemo, useState } from 'react'
import { Megaphone, Wallet, FileWarning, Info } from 'lucide-react'
import { Account, Movement, money } from '../datos/catalogo'
import { newId } from '../core/finanzas'
import {
  AccionMercadeo,
  ESTADOS_ACCION,
  TIPOS_ACCION,
  gastoDeAccion,
  origenDeAccion,
  resumenMercadeo
} from '../core/mercadeo'
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
    etiqueta: 'Acción',
    tipo: 'texto',
    requerido: true,
    ayuda: 'Ej. Pauta digital en Meta Ads'
  },
  { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: TIPOS_ACCION },
  { nombre: 'costo', etiqueta: 'Costo del primer año en COP', tipo: 'dinero', min: 0, ancho: 'medio' },
  { nombre: 'estado', etiqueta: 'Estado', tipo: 'seleccion', opciones: ESTADOS_ACCION, ancho: 'medio' },
  {
    nombre: 'mes',
    etiqueta: 'Mes del plan',
    tipo: 'numero',
    min: 0,
    max: 120,
    ayuda: '1 = el primero; 0 = sin asignar',
    ancho: 'medio'
  },
  { nombre: 'fecha', etiqueta: 'Fecha en que se hizo', tipo: 'fecha', ancho: 'medio' },
  { nombre: 'descripcion', etiqueta: 'Descripción (opcional)', tipo: 'texto' },
  {
    nombre: 'evidencia',
    etiqueta: 'Evidencia (opcional)',
    tipo: 'texto',
    ayuda: 'Enlace, nombre del archivo o nota'
  }
]

export function Mercadeo({
  acciones,
  movimientos,
  agregarMovimientos,
  cuentas
}: {
  acciones: Coleccion<AccionMercadeo>
  movimientos: Movement[]
  agregarMovimientos: (m: Movement[]) => void
  cuentas: Account[]
}) {
  const ed = useEdicion<AccionMercadeo>()
  const [pagina, setPagina] = useState(1)
  const [registrando, setRegistrando] = useState<AccionMercadeo | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const r = useMemo(() => resumenMercadeo(acciones.items), [acciones.items])
  const lista = useMemo(
    () =>
      [...acciones.items].sort(
        (a, b) =>
          ESTADOS_ACCION.indexOf(b.estado) - ESTADOS_ACCION.indexOf(a.estado) ||
          a.nombre.localeCompare(b.nombre, 'es')
      ),
    [acciones.items]
  )
  const visibles = paginaDe(lista, pagina)
  const paginaActual = paginaValida(pagina, lista.length)

  const registrar = (datos: { fecha: string; valor: number; cuenta: string }) => {
    if (!registrando) return
    agregarMovimientos([gastoDeAccion(registrando, { id: newId(), ...datos })])
    setAviso(`Gasto de «${registrando.nombre}» registrado.`)
    setRegistrando(null)
  }

  return (
    <>
      <div className="stats-grid three">
        <StatCard
          label="Eventos de mercadeo"
          value={`${r.realizadas} de ${r.eventos}`}
          icon={<Megaphone size={19} />}
          note={r.enCurso ? `${r.enCurso} en curso` : 'realizados frente a los que exige el fondo'}
        />
        <StatCard
          label="Costo planeado"
          value={money(r.costo)}
          icon={<Wallet size={19} />}
          tone="purple"
          note={`${money(r.costoRealizado)} en lo realizado`}
        />
        <StatCard
          label="Sin evidencia"
          value={String(r.sinEvidencia)}
          icon={<FileWarning size={19} />}
          tone={r.sinEvidencia ? 'orange' : 'green'}
          note={r.sinEvidencia ? 'realizadas que el fondo pedirá probar' : 'todo lo realizado tiene prueba'}
        />
      </div>

      <p className="aviso-bloque info">
        <Info size={14} /> El fondo cuenta como «eventos de mercadeo» las acciones que describes aquí: cada
        una cuenta una vez. Guarda la evidencia de las que realices.
      </p>
      {aviso && <p className="aviso-bloque bueno">{aviso}</p>}

      <section className="panel full-panel">
        <Cabecera
          titulo="Acciones de mercadeo"
          nota="Estrategias de comunicación, de promoción y canales de distribución"
          accion="Nueva acción"
          onAccion={ed.nuevo}
        />
        {!acciones.items.length ? (
          <Vacio
            texto="Aún no hay acciones de mercadeo. Registra las que describiste en el proyecto."
            accion="Añadir la primera"
            onAccion={ed.nuevo}
          />
        ) : (
          <>
            {!cuentas.length && (
              <p className="aviso-bloque">Crea una cuenta en «Cuentas» para poder registrar los gastos.</p>
            )}
            <div className="simple-list">
              {visibles.map(a => {
                const registrada = hayGastoDe(movimientos, origenDeAccion(a.id))
                return (
                  <div className="simple-row" key={a.id}>
                    <div className="simple-bullet">{a.nombre.slice(0, 1).toUpperCase()}</div>
                    <div>
                      <b>{a.nombre}</b>
                      <small>
                        {a.tipo}
                        {a.mes ? ` · mes ${a.mes} del plan` : ''}
                        {a.fecha ? ` · ${a.fecha}` : ''}
                      </small>
                      {a.evidencia?.trim() ? (
                        <small>Evidencia: {a.evidencia}</small>
                      ) : (
                        a.estado === 'Realizada' && <small className="negative">Falta la evidencia</small>
                      )}
                    </div>
                    <strong>{money(a.costo)}</strong>
                    <span className={`status-pill ${a.estado === 'Planeada' ? 'warn' : ''}`}>{a.estado}</span>
                    <div className="row-actions">
                      {registrada ? (
                        <span className="nota-registrada">Gasto registrado</span>
                      ) : (
                        a.costo > 0 && (
                          <button
                            className="mini-btn"
                            disabled={!cuentas.length}
                            onClick={() => setRegistrando(a)}
                          >
                            Registrar gasto
                          </button>
                        )
                      )}
                      <Acciones
                        onEditar={() => ed.editar(a)}
                        onBorrar={() => acciones.eliminar(a.id)}
                        nombre={a.nombre}
                        que="acción"
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
        eyebrow="MERCADEO"
        titulo={ed.editando ? 'Editar acción' : 'Nueva acción'}
        campos={campos}
        valores={ed.editando}
        onCerrar={ed.cerrar}
        onGuardar={d =>
          ed.editando
            ? acciones.actualizar(ed.editando.id, d as Partial<AccionMercadeo>)
            : acciones.agregar(d as Omit<AccionMercadeo, 'id'>)
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
