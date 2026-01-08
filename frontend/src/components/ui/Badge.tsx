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
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
        {
          'bg-amber-100 text-amber-700': variant === 'amber',
          'bg-gray-100 text-gray-600': variant === 'gray',
          'bg-green-100 text-green-700': variant === 'green',
          'bg-red-100 text-red-700': variant === 'red',
          'bg-blue-100 text-blue-700': variant === 'blue',
          'bg-yellow-100 text-yellow-700': variant === 'yellow',
          'bg-purple-100 text-purple-700': variant === 'purple'
        },
        className
      )}
    >
      {children}
    </span>
  )
}
