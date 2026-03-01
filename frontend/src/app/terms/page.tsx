import Link from 'next/link'
import { FileText } from 'lucide-react'

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
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
                <h1 className="text-4xl font-bold text-white mb-2">服务条款</h1>
                <p className="text-slate-500 mb-12">最后更新：2026年3月1日</p>

                <div className="space-y-10 text-slate-300 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">1. 服务说明</h2>
                        <p>SmartFiller 是一个基于 AI 的智能填表工具。您可以上传个人信息和文档模板，系统自动将信息填充到对应表格字段中。本服务目前处于<strong className="text-indigo-400">公开测试（Beta）</strong>阶段。</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">2. 用户责任</h2>
                        <ul className="list-disc list-inside space-y-2 text-slate-400">
                            <li>您应确保上传的内容合法、真实，不侵犯他人权益</li>
                            <li>您应妥善保管账号密码，因密码泄露导致的损失由您自行承担</li>
                            <li>禁止利用本服务进行任何违法活动或恶意攻击行为</li>
                            <li>AI 生成的结果仅供参考，最终提交前请您自行核实内容准确性</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">3. 免费额度与付费</h2>
                        <p>注册用户每月享有一定的免费使用额度。免费额度用尽后，您可以等待每月重置或升级至付费方案以获得更多使用次数。具体方案详情请参见首页定价说明。</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">4. 免责声明</h2>
                        <ul className="list-disc list-inside space-y-2 text-slate-400">
                            <li>AI 填表结果可能存在误差，请在使用前务必核实</li>
                            <li>因不可抗力、第三方服务中断等原因导致的服务暂停，我们不承担责任</li>
                            <li>本服务处于 Beta 阶段，可能存在功能变更或服务调整</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">5. 知识产权</h2>
                        <p>SmartFiller 的界面设计、代码、商标等知识产权归我们所有。您上传的文档内容的知识产权归您或原始权利人所有，我们不会主张任何权利。</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">6. 条款修改</h2>
                        <p>我们保留随时修改本条款的权利。重大变更时我们会在网站上进行通知。继续使用本服务即表示您接受修改后的条款。</p>
                    </section>
                </div>
            </main>
        </div>
    )
}
