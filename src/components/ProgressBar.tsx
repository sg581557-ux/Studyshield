export function ProgressBar({ value, max = 100, className = '', color = 'bg-brand-500' }: {
  value: number
  max?: number
  className?: string
  color?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className={`h-2 bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden ${className}`}>
      <div className={`h-full ${color} rounded-full transition-all duration-500 ease-out`} style={{ width: `${pct}%` }} />
    </div>
  )
}
