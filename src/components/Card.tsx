import type { ReactNode } from 'react'

export function Card({ children, className = '', glass = false, onClick }: { children: ReactNode; className?: string; glass?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick}
      className={`${glass ? 'glass' : 'bg-white dark:bg-neutral-900'} border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-sm ${className} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between p-5 pb-3">
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 pt-0 ${className}`}>{children}</div>
}
