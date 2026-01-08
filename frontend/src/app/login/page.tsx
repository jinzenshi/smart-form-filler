'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function setAuthCookie(token: string, username: string) {
  document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`
  document.cookie = `username=${username}; path=/; max-age=${60 * 60 * 24 * 7}`
}

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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()

      if (data.success && data.token) {
        setAuthCookie(data.token, data.username || username)
        router.push('/admin')
        router.refresh()
      } else {
        setError(data.message || '登录失败，请检查用户名和密码')
      }
    } catch {
      setError('网络错误，请检查后端服务')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* 页面装饰 */}
      <style jsx global>{`
        :root {
          --color-paper: #faf8f5;
          --color-paper-dark: #f5f1eb;
          --color-ink: #1a1a1a;
          --color-ink-light: #4a4a4a;
          --color-ink-muted: #8a8a8a;
          --color-accent: #c9a227;
          --color-accent-light: #d4b445;
          --color-accent-dark: #b08d1e;
          --color-border: #e5ddd0;
          --color-border-dark: #d4c9b8;
          --color-success: #2d6a4f;
          --color-error: #b91c1c;
          --shadow-lg: 0 8px 40px rgba(26, 26, 26, 0.12);
          --transition-fast: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          --transition-smooth: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        body {
          margin: 0;
          background: var(--color-paper);
          min-height: 100vh;
          color: var(--color-ink);
          line-height: 1.6;
          display: flex;
          align-items: center;
          justify-content: center;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          background-blend-mode: soft-light;
          background-repeat: repeat;
          background-size: 200px 200px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        }

        .page-decoration {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .decoration-circle {
          position: absolute;
          border-radius: 50%;
          opacity: 0.03;
        }

        .decoration-circle-1 {
          width: 600px;
          height: 600px;
          background: var(--color-ink);
          top: -200px;
          right: -100px;
        }

        .decoration-circle-2 {
          width: 400px;
          height: 400px;
          background: var(--color-accent);
          bottom: -100px;
          left: -100px;
        }

        .login-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          padding: 40px;
        }

        .login-card {
          background: white;
          border-radius: 4px;
          padding: 50px 45px;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--color-border);
          position: relative;
        }

        .login-card::before {
          content: '';
          position: absolute;
          top: 8px;
          left: 8px;
          right: 8px;
          bottom: 8px;
          border: 1px solid var(--color-border);
          border-radius: 2px;
          pointer-events: none;
        }

        .page-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 32px;
          font-weight: 600;
          color: var(--color-ink);
          margin: 0 0 8px;
          text-align: center;
        }

        .page-subtitle {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: var(--color-ink-muted);
          margin: 0 0 40px;
          text-align: center;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .form-group {
          margin-bottom: 25px;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 12px;
          color: var(--color-ink);
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .form-label .icon {
          color: var(--color-accent);
        }

        .form-input {
          width: 100%;
          padding: 16px 18px;
          border: 1px solid var(--color-border);
          border-radius: 2px;
          font-size: 15px;
          color: var(--color-ink);
          font-family: 'Inter', sans-serif;
          transition: all var(--transition-fast);
          background: linear-gradient(135deg, #faf8f5 0%, #f5f1eb 100%);
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--color-accent);
          background: white;
          box-shadow: 0 0 0 3px rgba(201, 162, 39, 0.08);
        }

        .form-input::placeholder {
          color: var(--color-ink-muted);
          font-style: italic;
        }

        .submit-btn {
          width: 100%;
          padding: 18px 30px;
          background: var(--color-ink);
          color: white;
          border: none;
          border-radius: 2px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all var(--transition-smooth);
          position: relative;
          overflow: hidden;
          margin-top: 15px;
        }

        .submit-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #c9a227 0%, #d4b445 50%, #c9a227 100%);
          opacity: 0;
          transition: opacity var(--transition-smooth);
        }

        .submit-btn span {
          position: relative;
          z-index: 1;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(26, 26, 26, 0.25);
        }

        .submit-btn:hover::before {
          opacity: 1;
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .message {
          margin-top: 20px;
          padding: 14px 18px;
          border-radius: 2px;
          text-align: center;
          font-size: 14px;
          display: none;
        }

        .message.error {
          background: rgba(185, 28, 28, 0.08);
          color: var(--color-error);
          border: 1px solid rgba(185, 28, 28, 0.2);
          display: block;
        }

        .message.success {
          background: rgba(45, 106, 79, 0.08);
          color: var(--color-success);
          border: 1px solid rgba(45, 106, 79, 0.2);
          display: block;
        }

        .hint {
          margin-top: 35px;
          padding-top: 25px;
          border-top: 1px solid var(--color-border);
          text-align: center;
        }

        .hint-text {
          font-size: 13px;
          color: var(--color-ink-muted);
          line-height: 1.7;
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 10px;
          vertical-align: middle;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .login-container {
            padding: 20px;
          }

          .login-card {
            padding: 35px 25px;
          }

          .page-title {
            font-size: 26px;
          }
        }
      `}</style>

      {/* 页面装饰 */}
      <div className="page-decoration">
        <div className="decoration-circle decoration-circle-1"></div>
        <div className="decoration-circle decoration-circle-2"></div>
      </div>

      <div className="login-container">
        <div className="login-card">
          <h1 className="page-title">智能填表助手</h1>
          <p className="page-subtitle">AI 驱动的文档自动化系统</p>

          {error && <div className="message error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                <span className="icon">◆</span>用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                placeholder="请输入用户名（≥3字符）"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="icon">◆</span>密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="请输入密码（≥3字符）"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="submit-btn"
            >
              {loading ? (
                <><span className="spinner"></span><span>登录中...</span></>
              ) : (
                <span>登录</span>
              )}
            </button>
          </form>

          <div className="hint">
            <p className="hint-text">
              请使用管理员提供的账号登录<br />
              支持临时账号和 Token 登录方式
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
