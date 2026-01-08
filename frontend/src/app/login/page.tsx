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
    <div className="login-page">
      <style jsx global>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-8);
        }

        .login-card {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border-light);
          padding: var(--space-10);
          max-width: 420px;
          width: 100%;
          position: relative;
        }

        .login-title {
          font-family: var(--font-display);
          font-size: var(--text-3xl);
          font-weight: var(--font-semibold);
          color: var(--text-primary);
          margin: 0 0 var(--space-2);
          text-align: center;
        }

        .login-subtitle {
          font-size: var(--text-sm);
          color: var(--text-muted);
          text-align: center;
          margin: 0 0 var(--space-8);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .form-group {
          margin-bottom: var(--space-6);
        }

        .form-label {
          display: block;
          font-size: var(--text-sm);
          font-weight: var(--font-semibold);
          color: var(--text-primary);
          margin-bottom: var(--space-2);
        }

        .form-input {
          width: 100%;
          padding: var(--space-4) var(--space-4);
          border: 2px solid var(--border-light);
          border-radius: var(--radius-md);
          font-size: var(--text-base);
          font-family: var(--font-body);
          background: var(--bg-card);
          color: var(--text-primary);
          transition: all var(--transition-fast);
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--color-amber-600);
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
        }

        .form-input::placeholder {
          color: var(--text-muted);
          font-style: italic;
        }

        .submit-btn {
          width: 100%;
          padding: var(--space-4) var(--space-6);
          background: linear-gradient(135deg, var(--color-amber-600) 0%, var(--color-amber-700) 100%);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          font-weight: var(--font-semibold);
          cursor: pointer;
          transition: all var(--transition-base);
          margin-top: var(--space-4);
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(217, 119, 6, 0.4);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .error-message {
          background: var(--color-error-bg);
          color: var(--color-error);
          padding: var(--space-4);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          margin-bottom: var(--space-6);
          text-align: center;
        }

        .hint {
          margin-top: var(--space-8);
          padding-top: var(--space-6);
          border-top: 1px solid var(--border-light);
          text-align: center;
        }

        .hint-text {
          font-size: var(--text-sm);
          color: var(--text-muted);
          line-height: var(--leading-relaxed);
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: var(--space-2);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .login-card {
            padding: var(--space-8);
          }

          .login-title {
            font-size: var(--text-2xl);
          }
        }
      `}</style>

      <div className="login-card">
        <h1 className="login-title">智能填表助手</h1>
        <p className="login-subtitle">AI 驱动的文档自动化系统</p>

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
            className="submit-btn"
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                <span>登录中...</span>
              </>
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
  )
}
