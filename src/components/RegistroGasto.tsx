import { useMemo } from 'react'
import { Account } from '../datos/catalogo'
import FormModal, { Campo } from './FormModal'

export type DatosDeGasto = { fecha: string; valor: number; cuenta: string }

/**
 * Pregunta cuánto se pagó, cuándo y desde qué cuenta, para registrar el gasto
 * de una compra, una acción de mercadeo o un trámite.
 *
 * El importe llega rellenado con lo planeado: casi siempre es ese, y cuando no
 * lo es, lo que importa es lo que se pagó de verdad.
 */
export function RegistroGasto({
  abierto,
  titulo,
  valorInicial,
  cuentaInicial,
  cuentas,
  onGuardar,
  onCerrar
}: {
  abierto: boolean
  titulo: string
  /** En centavos. */
  valorInicial: number
  /** Cuenta que sale marcada: la de la suscripción, por ejemplo. Si no existe, la primera. */
  cuentaInicial?: string
  cuentas: Account[]
  onGuardar: (datos: DatosDeGasto) => void
  onCerrar: () => void
}) {
  const nombres = cuentas.map(c => c.name)
  const clave = nombres.join('|')
  // Estables: FormModal vuelve a cargar los valores cada vez que cambian.
  const campos: Campo[] = useMemo(
    () => [
      {
        nombre: 'valor',
        etiqueta: 'Valor pagado en COP',
        tipo: 'dinero',
        requerido: true,
        min: 1,
        ancho: 'medio'
      },
      { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, ancho: 'medio' },
      { nombre: 'cuenta', etiqueta: 'Pagado desde', tipo: 'seleccion', opciones: nombres }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- las cuentas se siguen por su clave
    [clave]
  )
  const valores = useMemo(
    () => ({
      valor: valorInicial,
      fecha: new Date().toISOString().slice(0, 10),
      cuenta: cuentaInicial && nombres.includes(cuentaInicial) ? cuentaInicial : (nombres[0] ?? '')
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- las cuentas se siguen por su clave
    [valorInicial, cuentaInicial, clave, abierto]
  )
  return (
    <FormModal
      abierto={abierto}
      eyebrow="GASTO"
      titulo={titulo}
      campos={campos}
      valores={valores}
      textoGuardar="Registrar el gasto"
      onCerrar={onCerrar}
      onGuardar={d => onGuardar({ fecha: String(d.fecha), valor: Number(d.valor), cuenta: String(d.cuenta) })}
    />
  )
}
