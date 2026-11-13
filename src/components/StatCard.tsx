import { ReactNode } from 'react'
import { Change } from '../core/finance'
type Props = { label: string; value: string; change?: Change; icon: ReactNode; tone?: string; note?: string }
export default function StatCard({ label, value, change, icon, tone = 'green', note }: Props) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>{icon}</span>
      </div>
      <strong className="stat-value">{value}</strong>
      <div className="stat-foot">
        {change && <span className={change.tone}>{change.text}</span>}
        <span>{note || 'vs. mes anterior'}</span>
      </div>
    </article>
  )
}
