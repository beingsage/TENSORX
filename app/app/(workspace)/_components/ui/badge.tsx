import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'tag inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:border-[var(--outline)] focus-visible:ring-[3px] focus-visible:ring-[rgba(255,181,149,0.5)] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow,border-color,background]',
  {
    variants: {
      variant: {
        default:
          'border-[var(--outline-variant)] bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] [a&]:hover:border-[var(--outline)]',
        secondary:
          'tag-confidence',
        destructive:
          'tag-risk focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        outline:
          'border-[var(--outline-variant)] bg-transparent text-[var(--on-surface-variant)] [a&]:hover:bg-[var(--surface-container-high)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
