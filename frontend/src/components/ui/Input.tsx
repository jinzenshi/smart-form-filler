import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'px-3 py-2 border border-gray-200 rounded-md text-sm',
          'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent',
          'placeholder:text-gray-400',
          'disabled:bg-gray-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
