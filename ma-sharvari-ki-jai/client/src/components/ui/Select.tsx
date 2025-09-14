import React, { useState } from 'react'

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
}

interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  onSelect?: (value: string) => void
}

interface SelectValueProps {
  placeholder?: string
}

const SelectContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}>({
  isOpen: false,
  setIsOpen: () => {}
})

export function Select({ value, onValueChange, children, className = '' }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div className={`relative ${className}`}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({ children, className = '' }: SelectTriggerProps) {
  const { isOpen, setIsOpen } = React.useContext(SelectContext)
  
  return (
    <button
      type="button"
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onClick={() => setIsOpen(!isOpen)}
    >
      {children}
      <svg className="h-4 w-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <polyline points="6,9 12,15 18,9" />
      </svg>
    </button>
  )
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value } = React.useContext(SelectContext)
  return <span>{value || placeholder}</span>
}

export function SelectContent({ children, className = '' }: SelectContentProps) {
  const { isOpen } = React.useContext(SelectContext)
  
  if (!isOpen) return null
  
  return (
    <div className={`absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg ${className}`}>
      {children}
    </div>
  )
}

export function SelectItem({ value, children, onSelect }: SelectItemProps) {
  const { onValueChange, setIsOpen } = React.useContext(SelectContext)
  
  const handleSelect = () => {
    onValueChange?.(value)
    onSelect?.(value)
    setIsOpen(false)
  }
  
  return (
    <div
      className="relative flex cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
      onClick={handleSelect}
    >
      {children}
    </div>
  )
}
