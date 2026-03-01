import Link from 'next/link'
import { ArrowRight, FileText, Zap, Shield, CheckCircle } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              SmartFiller
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">功能介绍</a>
            <a href="#pricing" className="hover:text-white transition-colors">定价方案</a>
            <Link href="/login" className="hover:text-white transition-colors">登录</Link>
            <Link href="/register" className="px-5 py-2.5 rounded-full bg-white text-slate-900 hover:bg-indigo-50 transition-colors font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              免费注册
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden flex flex-col items-center">
        {/* Glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-indigo-500/20 rounded-[100%] blur-[120px] -z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-500/20 rounded-[100%] blur-[100px] -z-10" />

        <div className="max-w-4xl mx-auto text-center mt-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-semibold mb-8 backdrop-blur-sm">
            <Zap className="w-4 h-4" />
            <span>公测中 · 免费体验 AI 智能填表</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            告别手动填表 <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
              让 AI 替你做
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            上传个人简历（PDF / DOCX / TXT）和报名表模板，AI 自动将信息精准填入对应字段。不再手动复制粘贴，大幅提升填表效率。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto px-8 py-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-lg transition-all shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2 border border-indigo-400/20">
              免费开始使用
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#pricing" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 text-white font-medium text-lg transition-all border border-white/10 flex items-center justify-center">
              查看方案
            </a>
          </div>
        </div>

        {/* Abstract UI Preview */}
        <div className="mt-20 max-w-5xl w-full mx-auto rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-2xl p-2 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 rounded-xl" />
          <div className="rounded-lg border border-white/5 bg-[#0b1120] p-4 aspect-[16/9] md:aspect-[21/9] flex flex-col relative overflow-hidden">
            {/* Fake browser top */}
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/5">
              <div className="w-3 h-3 rounded-full bg-slate-700/50" />
              <div className="w-3 h-3 rounded-full bg-slate-700/50" />
              <div className="w-3 h-3 rounded-full bg-slate-700/50" />
            </div>

            {/* UI visual representation */}
            <div className="flex-1 flex gap-4 h-full relative z-0">
              {/* Sidebar fake */}
              <div className="hidden sm:flex w-1/4 rounded-md bg-slate-800/20 p-4 flex-col gap-4 border border-white/5">
                <div className="h-6 w-2/3 bg-slate-700/50 rounded-md" />
                <div className="h-8 w-full bg-indigo-500/20 border border-indigo-500/20 rounded-md mt-4" />
                <div className="h-4 w-full bg-slate-700/30 rounded-md" />
                <div className="h-4 w-5/6 bg-slate-700/30 rounded-md" />
              </div>

              {/* Main content fake */}
              <div className="flex-1 rounded-md border border-indigo-500/20 p-8 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 to-[#0b1120]">

                <div className="flex items-center justify-between mb-8">
                  <div className="h-8 w-1/3 bg-slate-700/50 rounded-md" />
                  <div className="h-8 w-24 bg-indigo-600 rounded-md" />
                </div>

                <div className="flex-1 rounded-lg border border-white/5 bg-slate-800/20 p-6 flex flex-col gap-4">
                  <div className="h-4 w-1/4 bg-slate-600/50 rounded" />
                  <div className="h-[2px] w-full bg-white/5 rounded my-2" />

                  <div className="flex gap-4 items-center">
                    <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="flex-1 h-3 bg-slate-700/50 rounded" />
                    <div className="w-16 h-4 bg-emerald-500/20 border border-emerald-500/20 rounded" />
                  </div>

                  <div className="flex gap-4 items-center">
                    <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="flex-1 h-3 bg-indigo-500/40 rounded w-2/3" />
                    <div className="w-16 h-4 bg-emerald-500/20 border border-emerald-500/20 rounded" />
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 relative z-10 bg-slate-950 border-t border-white/5">
        <div className="max-w-7xl mx-auto mt-12 mb-12">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">为效率而生</h2>
            <p className="text-slate-400 text-lg">每个功能都为节省你的时间而设计，让你专注于真正重要的事。</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <Zap className="text-indigo-400" />, title: 'AI 智能解析', desc: '无需手动模板配置。AI 可以理解非结构化的个人信息，自动匹配填入表格字段。' },
              { icon: <Shield className="text-indigo-400" />, title: '数据安全保障', desc: '简历解析在浏览器端完成，原始文件不会上传。上传文档 24 小时后自动删除。' },
              { icon: <FileText className="text-indigo-400" />, title: '原生 Word 格式', desc: '直接导出 DOCX 文档，完美保留原始表格排版和格式，无需二次调整。' }
            ].map((f, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-[#0f172a] p-8 hover:border-indigo-500/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6">
                  {f.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                <p className="text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section preview */}
      <section id="pricing" className="py-32 px-6 border-t border-white/5 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-indigo-900/10 via-slate-950 to-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[50%] w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px] -z-10" />
            <h2 className="text-3xl md:text-5xl font-bold mb-4">简单透明的定价</h2>
            <p className="text-slate-400 text-lg">公测期间免费使用，正式版将提供更多專业功能。</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm p-8 flex flex-col hover:border-white/20 transition-all">
              <h3 className="text-2xl font-semibold mb-2">免费版</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-extrabold">¥0</span>
                <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">/ 永久免费</span>
              </div>
              <p className="text-slate-400 mb-8 border-b border-white/5 pb-8 min-h-[80px]">适合偶尔需要填表的个人用户，公测期间所有功能全部免费。</p>
              <ul className="space-y-5 mb-10 flex-1">
                {['每月 5 次完整填表生成', '支持 PDF / DOCX / TXT 简历解析', '标准 AI 处理速度'].map(t => (
                  <li key={t} className="flex items-start gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center font-semibold transition-colors mt-auto">
                免费注册
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="rounded-2xl border border-indigo-500/50 bg-[#0b1120] p-8 relative flex flex-col shadow-[0_0_50px_-12px_rgba(79,70,229,0.3)] transform md:-translate-y-4">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-lg">
                即将推出
              </div>
              <h3 className="text-2xl font-semibold mb-2">专业版</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-extrabold">¥19.9</span>
                <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">/ 月</span>
              </div>
              <p className="text-slate-400 mb-8 border-b border-indigo-500/20 pb-8 min-h-[80px]">适合频繁处理报名表、合同等文档的专业用户和团队。</p>
              <ul className="space-y-5 mb-10 flex-1">
                {['无限填表生成次数', '支持批量处理（开发中）', '优先 AI 模型 + 最快处理速度', '去除 SmartFiller 水印', '专属客服支持'].map(t => (
                  <li key={t} className="flex items-start gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
              <button disabled className="block w-full py-4 rounded-xl bg-indigo-600/50 text-white/70 text-center font-semibold cursor-not-allowed mt-auto">
                敬请期待
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#020617] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center">
              <FileText className="w-3 h-3 text-slate-400" />
            </div>
            <span className="font-semibold text-slate-300">SmartFiller</span>
          </div>

          <div className="flex gap-8 text-sm font-medium text-slate-400">
            <a href="https://github.com/jinzenshi/smart-form-filler" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            <Link href="/terms" className="hover:text-white transition-colors">服务条款</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">隐私政策</Link>
          </div>

          <div className="text-slate-600 text-sm">
            © 2026 SmartFiller. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
