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
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
            <Link href="/login" className="px-5 py-2.5 rounded-full bg-white text-slate-900 hover:bg-indigo-50 transition-colors font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              Get Started
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
            <span>AI-Powered Document Automation 2.0 is here</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            Stop filling forms. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
              Let AI do the work.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload your resume or raw notes, and our AI instantly maps it to any complex application, contract, or regulatory form. Save hours of manual copy-pasting.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/workspace" className="w-full sm:w-auto px-8 py-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-lg transition-all shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2 border border-indigo-400/20">
              Start for free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#pricing" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 text-white font-medium text-lg transition-all border border-white/10 flex items-center justify-center">
              View Pricing
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
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Designed for speed</h2>
            <p className="text-slate-400 text-lg">Every feature is built to shave hours off your workflow, letting you focus on what really matters.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <Zap className="text-indigo-400" />, title: 'Instant AI Parsing', desc: 'No templates needed. The AI understands unstructured data and maps it intelligently.' },
              { icon: <Shield className="text-indigo-400" />, title: 'Enterprise Security', desc: 'Your data is never stored longer than necessary. Bank-grade encryption applied.' },
              { icon: <FileText className="text-indigo-400" />, title: 'Native Word & PDF', desc: 'Export directly to formatted DOCX and flawless PDF files without altering the layout.' }
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
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-slate-400 text-lg">Start for free, upgrade when you need power.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm p-8 flex flex-col hover:border-white/20 transition-all">
              <h3 className="text-2xl font-semibold mb-2">Hobby</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-extrabold">$0</span>
                <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">/ forever</span>
              </div>
              <p className="text-slate-400 mb-8 border-b border-white/5 pb-8 min-h-[80px]">Perfect for individuals who occasionally need to fill out forms.</p>
              <ul className="space-y-5 mb-10 flex-1">
                {['3 full form generations per month', 'Standard TXT and Markdown support', 'Standard processing speed'].map(t => (
                  <li key={t} className="flex items-start gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="block w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-center font-semibold transition-colors mt-auto">
                Get Started Free
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="rounded-2xl border border-indigo-500/50 bg-[#0b1120] p-8 relative flex flex-col shadow-[0_0_50px_-12px_rgba(79,70,229,0.3)] transform md:-translate-y-4">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-lg">
                Most Popular
              </div>
              <h3 className="text-2xl font-semibold mb-2">Pro</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-extrabold">$9.99</span>
                <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">/ month</span>
              </div>
              <p className="text-slate-400 mb-8 border-b border-indigo-500/20 pb-8 min-h-[80px]">For professionals handling lots of applications and regulatory forms.</p>
              <ul className="space-y-5 mb-10 flex-1">
                {['Unlimited form generations', 'Advanced Native PDF & DOCX extraction', 'Batch processing (Coming soon)', 'Priority AI Models & fastest speed', 'No SmartFiller watermark'].map(t => (
                  <li key={t} className="flex items-start gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="block w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-center font-semibold transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] mt-auto">
                Upgrade to Pro
              </Link>
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
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
          </div>

          <div className="text-slate-600 text-sm">
            © 2026 SmartFiller Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
