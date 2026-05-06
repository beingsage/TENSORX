import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-[var(--on-surface-variant)] selection:bg-[var(--primary)] selection:text-[var(--on-primary)] border-[var(--outline-variant)] h-11 w-full min-w-0 rounded-[var(--radius-md)] border bg-[var(--surface-container-low)] px-3 py-2 text-base text-[var(--on-surface)] shadow-none transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-[var(--primary)] focus-visible:ring-[3px] focus-visible:ring-[rgba(255,181,149,0.5)]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
