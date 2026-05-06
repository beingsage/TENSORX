import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] border border-transparent px-6 py-3 text-sm font-medium transition-all duration-150 ease-[var(--ease-standard)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-[var(--outline)] focus-visible:ring-[3px] focus-visible:ring-[rgba(255,181,149,0.5)] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-[var(--primary)] text-[var(--on-primary)] hover:brightness-[1.08]',
        destructive:
          'border-[var(--error)] bg-[var(--error-container)] text-[var(--on-error-container)] hover:brightness-[1.08] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        outline:
          'border-[var(--outline)] bg-transparent text-[var(--primary)] shadow-none hover:bg-[var(--surface-container-high)] hover:text-[var(--primary)]',
        secondary:
          'border-[var(--outline-variant)] bg-[var(--surface-container-high)] text-[var(--on-surface)] hover:border-[var(--outline)]',
        ghost:
          'border-[var(--outline)] bg-transparent text-[var(--primary)] hover:bg-[var(--surface-container-high)] hover:text-[var(--primary)]',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-6 py-3 has-[>svg]:px-5',
        sm: 'h-9 gap-1.5 px-4 py-2 has-[>svg]:px-3',
        lg: 'h-12 px-8 py-3 has-[>svg]:px-6',
        icon: 'size-11 rounded-[var(--radius-md)] bg-[var(--surface-container-high)] p-0 text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]',
        'icon-sm': 'size-8 rounded-[var(--radius-md)] bg-[var(--surface-container-high)] p-0 text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]',
        'icon-lg': 'size-12 rounded-[var(--radius-md)] bg-[var(--surface-container-high)] p-0 text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
