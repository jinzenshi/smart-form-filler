import { InputHTMLAttributes, forwardRef } from 'react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (props, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
        {...props}
      />
    )
  }
)

Checkbox.displayName = 'Checkbox'
