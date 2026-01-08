import { cn } from '@/lib/utils'

interface Column<T> {
  key: string
  label: string
  width?: string
  render?: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
}

export function DataTable<T extends { id?: number }>({ data, columns, onRowClick }: DataTableProps<T>) {
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((item, index) => (
            <tr
              key={item.id ?? index}
              onClick={() => onRowClick?.(item)}
              className={cn(
                'hover:bg-amber-50 transition-colors',
                onRowClick && 'cursor-pointer'
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm">
                  {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key]?.toString() ?? '-'}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                暂无数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
