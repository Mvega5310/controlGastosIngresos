import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { money } from '../core/dinero'
import { DailyPoint } from '../core/finanzas'

/**
 * Gráfica de flujo de efectivo.
 *
 * Vive en su propio módulo para poder cargarse aparte: la librería de
 * gráficas pesa más que todo el resto de la aplicación junta, y el panel
 * puede pintar sus cifras, sus cuentas y sus movimientos sin esperarla.
 */
export default function GraficaFlujo({ series }: { series: DailyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={series} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4CB873" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#4CB873" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F2C230" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#F2C230" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--line)" />
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--muted)', fontSize: 11 }}
        />
        <Tooltip
          // El nombre iba en blanco y el recuadro quedaba con dos puntos
          // sueltos delante de cada cifra, sin decir cuál era ingreso y cuál
          // gasto, que es justo lo que se mira al tocar la gráfica.
          formatter={(v: number, nombre) => [money(v), nombre]}
          separator=": "
          contentStyle={{
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            fontSize: 12
          }}
          labelStyle={{ color: 'var(--text)', fontWeight: 600, marginBottom: 2 }}
        />
        <Area
          type="monotone"
          dataKey="income"
          name="Ingresos"
          stroke="#299653"
          strokeWidth={2.5}
          fill="url(#incomeFill)"
        />
        <Area
          type="monotone"
          dataKey="expense"
          name="Gastos"
          stroke="#E4B62A"
          strokeWidth={2.5}
          fill="url(#expenseFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
