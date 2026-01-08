import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="home-card">
        <h1 className="home-title">智能填表助手</h1>
        <p className="home-subtitle">AI 驱动的文档自动化系统</p>
        <Link
          href="/admin"
          className="home-link"
        >
          进入管理后台
        </Link>
      </div>
    </div>
  )
}
