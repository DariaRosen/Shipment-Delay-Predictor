'use client'

import * as React from 'react'

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function Tooltip({ children, content, side = 'top' }: TooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const sideClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      {children}
      {isOpen && (
        <div
          className={`absolute z-50 ${sideClasses[side]} pointer-events-none`}
          role="tooltip"
        >
          <div className="rounded-md border border-teal-200 bg-white px-3 py-2 text-sm text-teal-900 shadow-lg max-w-xs">
            {content}
          </div>
          {/* Arrow */}
          <div
            className={`absolute ${
              side === 'top'
                ? 'top-full left-1/2 -translate-x-1/2 border-t-teal-200 border-l-transparent border-r-transparent border-b-transparent'
                : side === 'bottom'
                  ? 'bottom-full left-1/2 -translate-x-1/2 border-b-teal-200 border-l-transparent border-r-transparent border-t-transparent'
                  : side === 'left'
                    ? 'left-full top-1/2 -translate-y-1/2 border-l-teal-200 border-t-transparent border-b-transparent border-r-transparent'
                    : 'right-full top-1/2 -translate-y-1/2 border-r-teal-200 border-t-transparent border-b-transparent border-l-transparent'
            } border-4`}
          />
        </div>
      )}
    </div>
  )
}

export function TooltipTrigger({
  asChild,
  children,
}: {
  asChild?: boolean
  children: React.ReactNode
}) {
  return <>{children}</>
}

export function TooltipContent({
  children,
  side,
  className,
}: {
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}) {
  return <>{children}</>
}

