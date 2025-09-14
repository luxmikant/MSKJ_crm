import React from 'react'

export function Separator({ className = '' }: { className?: string }) {
  return <hr className={`border-0 border-t border-gray-200 ${className}`} />
}