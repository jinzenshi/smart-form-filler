import Link from 'next/link'
import { FileText } from 'lucide-react'

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">SmartFiller</span>
                    </Link>
                    <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">← 返回首页</Link>
                </div>
            </nav>

            <main className="max-w-3xl mx-auto px-6 pt-28 pb-20">
                <h1 className="text-4xl font-bold text-white mb-2">隐私政策</h1>
                <p className="text-slate-500 mb-12">最后更新：2026年3月1日</p>

                <div className="space-y-10 text-slate-300 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">1. 我们收集哪些信息</h2>
                        <p>当您使用 SmartFiller 时，我们可能会收集以下信息：</p>
                        <ul className="list-disc list-inside mt-3 space-y-2 text-slate-400">
                            <li><strong className="text-slate-300">账号信息</strong>：注册时提供的用户名和加密存储的密码</li>
                            <li><strong className="text-slate-300">上传文档</strong>：您上传的个人简历（PDF/DOCX/TXT）和报名表模板（DOCX），仅用于完成填表任务</li>
                            <li><strong className="text-slate-300">使用日志</strong>：操作时间、IP 地址等基础访问日志</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">2. 我们如何使用您的信息</h2>
                        <ul className="list-disc list-inside space-y-2 text-slate-400">
                            <li>提供智能填表核心服务（AI 字段匹配与文档生成）</li>
                            <li>改善产品功能和用户体验</li>
                            <li>保障系统安全和防止滥用</li>
                        </ul>
                        <p className="mt-3 text-indigo-400 font-medium">我们不会将您的数据出售给任何第三方。</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">3. 数据存储与安全</h2>
                        <ul className="list-disc list-inside space-y-2 text-slate-400">
                            <li>用户密码经过 HMAC-SHA256 加密存储，我们无法查看您的明文密码</li>
                            <li>上传的文档在服务器上保留不超过 <strong className="text-slate-300">24 小时</strong>，之后自动删除</li>
                            <li>PDF / DOCX 简历的文本解析在浏览器端完成，<strong className="text-slate-300">原始文件不会上传到服务器</strong></li>
                            <li>我们使用 HTTPS 加密传输所有数据</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">4. 第三方服务</h2>
                        <p>我们使用以下第三方服务来提供产品功能：</p>
                        <ul className="list-disc list-inside mt-3 space-y-2 text-slate-400">
                            <li><strong className="text-slate-300">AI 模型服务</strong>：用于智能字段匹配（仅传输文本摘要，不传输原始文档）</li>
                            <li><strong className="text-slate-300">Supabase</strong>：用于文件临时存储（24小时后自动清理）</li>
                            <li><strong className="text-slate-300">Vercel / Render</strong>：应用托管平台</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">5. 您的权利</h2>
                        <p>您有权随时：</p>
                        <ul className="list-disc list-inside mt-3 space-y-2 text-slate-400">
                            <li>查看、修改或删除您的账号信息</li>
                            <li>要求我们删除与您相关的所有存储数据</li>
                            <li>停止使用本服务并注销账号</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">6. 联系我们</h2>
                        <p>如对隐私政策有任何疑问，请通过以下方式联系我们：</p>
                        <p className="mt-2 text-indigo-400">📧 support@smartfiller.app</p>
                    </section>
                </div>
            </main>
        </div>
    )
}
