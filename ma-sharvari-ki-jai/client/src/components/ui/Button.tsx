import React from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'gradient'
type Size = 'sm' | 'md' | 'lg'

const base = 'inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
const sizes: Record<Size, string> = {
  sm: 'px-2.5 py-1.5',
  md: 'px-3.5 py-2',
  lg: 'px-4.5 py-2.5 text-base',
}
const variants: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-300',
  outline: 'border border-gray-300 hover:bg-gray-50 text-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 focus:ring-gray-400',
  gradient: 'text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:ring-purple-500',
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant, size?: Size }) {
  return <button className={[base, sizes[size], variants[variant], className].join(' ')} {...props} />
}

export default Button
