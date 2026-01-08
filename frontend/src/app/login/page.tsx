'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from './actions'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await loginAction(username, password)

      if (result.success) {
        // Cookies are now set server-side, redirect client-side
        router.push('/admin')
        router.refresh()
      } else {
        setError(result.error || '登录失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        {/* 左侧品牌区域 */}
        <div className="brand-section">
          <div className="brand-logo">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="8" width="32" height="36" rx="3" stroke="currentColor" strokeWidth="2.5" fill="none"/>
              <path d="M14 16h16M14 22h12M14 28h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="36" cy="36" r="8" fill="currentColor"/>
              <path d="M33 36h6M36 33v6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="brand-title">文档工坊</h1>
          <p className="brand-subtitle">智能填表 · 高效文档 · 优雅工作</p>

          <ul className="feature-list">
            <li>
              <span className="feature-icon">◆</span>
              DOCX 模板解析，完美还原格式
            </li>
            <li>
              <span className="feature-icon">◆</span>
              变量智能替换，精准匹配内容
            </li>
            <li>
              <span className="feature-icon">◆</span>
              一键生成文档，高效完成工作
            </li>
          </ul>
        </div>

        {/* 右侧登录卡片 */}
        <div className="login-section">
          <div className="login-card">
            <h2 className="login-heading">欢迎回来</h2>
            <p className="login-subheading">请登录以继续</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  placeholder="请输入用户名"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="请输入密码"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="login-btn"
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    <span>登录中...</span>
                  </>
                ) : (
                  <span>登入</span>
                )}
              </button>
            </form>

            <div className="token-login">
              <button className="token-btn">
                <span className="token-icon">◇</span>
                使用 Token 登录
              </button>
            </div>

            <p className="register-link">
              没有账户？<a href="#">免费注册</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
