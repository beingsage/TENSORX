import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-[var(--outline-variant)] placeholder:text-[var(--on-surface-variant)] focus-visible:border-[var(--primary)] focus-visible:ring-[rgba(255,181,149,0.5)] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-24 w-full rounded-[var(--radius-md)] border bg-[var(--surface-container-low)] px-3 py-2 text-base text-[var(--on-surface)] shadow-none transition-[color,box-shadow,border-color] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
