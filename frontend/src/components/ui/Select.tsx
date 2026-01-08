import { SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'px-3 py-2 border border-gray-200 rounded-md text-sm bg-white',
          'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent',
          'disabled:bg-gray-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
    )
  }
)

Select.displayName = 'Select'
