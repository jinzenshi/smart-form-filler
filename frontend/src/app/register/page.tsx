'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerAction } from './actions'

export default function RegisterPage() {
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('两次输入的密码不一致')
            return
        }
        if (username.length < 3) {
            setError('用户名至少3个字符')
            return
        }
        if (password.length < 6) {
            setError('密码至少6个字符')
            return
        }

        setLoading(true)
        try {
            const result = await registerAction(username, password)
            if (result.success) {
                router.push('/login?registered=1')
            } else {
                setError(result.error || '注册失败')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '注册失败')
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
                            <rect x="6" y="8" width="32" height="36" rx="3" stroke="currentColor" strokeWidth="2.5" fill="none" />
                            <path d="M14 16h16M14 22h12M14 28h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <circle cx="36" cy="36" r="8" fill="currentColor" />
                            <path d="M33 36h6M36 33v6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                    <h1 className="brand-title">SmartFiller</h1>
                    <p className="brand-subtitle">智能填表 · 高效文档 · 优雅工作</p>

                    <ul className="feature-list">
                        <li>
                            <span className="feature-icon">◆</span>
                            免费注册，立即体验 AI 智能填表
                        </li>
                        <li>
                            <span className="feature-icon">◆</span>
                            支持 PDF / DOCX 简历自动解析
                        </li>
                        <li>
                            <span className="feature-icon">◆</span>
                            每月免费使用次数，无需绑卡
                        </li>
                    </ul>
                </div>

                {/* 右侧注册卡片 */}
                <div className="login-section">
                    <div className="login-card">
                        <h2 className="login-heading">创建账号</h2>
                        <p className="login-subheading">注册后即可免费使用</p>

                        {error && <div className="error-message">{error}</div>}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">用户名</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="form-input"
                                    placeholder="至少3个字符"
                                    required
                                    minLength={3}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">密码</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="form-input"
                                    placeholder="至少6个字符"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">确认密码</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="form-input"
                                    placeholder="再次输入密码"
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
                                        <span>注册中...</span>
                                    </>
                                ) : (
                                    <span>免费注册</span>
                                )}
                            </button>
                        </form>

                        <p className="register-link" style={{ marginTop: '24px' }}>
                            已有账号？<Link href="/login">立即登录</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
