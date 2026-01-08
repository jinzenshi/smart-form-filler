import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">FillForm</h1>
        <p className="text-gray-600 mb-4">表单填写助手</p>
        <Link
          href="/admin"
          className="inline-block px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
        >
          进入管理后台
        </Link>
      </div>
    </div>
  )
}
