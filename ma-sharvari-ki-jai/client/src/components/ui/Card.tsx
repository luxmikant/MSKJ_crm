import React from 'react'

export function Card({ children, className = '', glass = false }: { children: React.ReactNode, className?: string, glass?: boolean }) {
  const base = glass
    ? 'bg-white/60 dark:bg-gray-800/40 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-md'
    : 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm'
  return <div className={[base, 'rounded-xl', className].join(' ')}>{children}</div>
}

export function CardHeader({ title, actions }: { title: string, actions?: React.ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  )
}

export function CardBody({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={["p-4", className].join(' ')}>{children}</div>
}

export default Card

// Alias to align with alternate import style used in landing page snippet
export const CardContent = CardBody
