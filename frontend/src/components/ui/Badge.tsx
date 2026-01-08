import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'amber' | 'gray' | 'green' | 'red' | 'blue' | 'yellow' | 'purple'
  className?: string
}

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'badge',
        {
          'badge-amber': variant === 'amber',
          'badge-gray': variant === 'gray',
          'badge-success': variant === 'green',
          'badge-failed': variant === 'red',
          'badge-info': variant === 'blue',
          'badge-pending': variant === 'yellow',
          'badge-purple': variant === 'purple'
        },
        className
      )}
    >
      {children}
    </span>
  )
}
