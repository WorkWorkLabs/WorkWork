'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Three.js
const GlobeAnimation = dynamic(
  () => import('@/components/home/globe-animation').then(mod => mod.GlobeAnimation),
  { ssr: false }
);

export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Three.js Background Animation */}
      <GlobeAnimation />

      {/* Navigation */}
      <nav className="relative z-10 bg-transparent">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-xl font-bold text-white">
              WorkWork Ledger
            </Link>
            <div className="flex gap-6">
              <Link href="/clients" className="text-gray-300 hover:text-white transition-colors">
                客户
              </Link>
              <Link href="/projects" className="text-gray-300 hover:text-white transition-colors">
                项目
              </Link>
              <Link href="/invoices" className="text-gray-300 hover:text-white transition-colors">
                发票
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              WorkWork Ledger
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            轻量级收入管理工具，专为数字游民、自由职业者和小型工作室设计。
            <br />
            <span className="text-emerald-400">30秒创建发票</span>，支持多币种和
            <span className="text-cyan-400">稳定币收款</span>。
          </p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-12 mb-16">
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-400">5+</div>
            <div className="text-gray-400 text-sm">支持币种</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-cyan-400">3</div>
            <div className="text-gray-400 text-sm">区块链网络</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400">∞</div>
            <div className="text-gray-400 text-sm">全球收款</div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {/* Clients Card */}
          <Link href="/clients" className="group">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-emerald-500/50 transition-all hover:bg-white/10">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                客户管理
              </h3>
              <p className="text-gray-400 text-sm">
                管理全球客户信息，快速创建和搜索客户记录。
              </p>
            </div>
          </Link>

          {/* Projects Card */}
          <Link href="/projects" className="group">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-cyan-500/50 transition-all hover:bg-white/10">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                项目管理
              </h3>
              <p className="text-gray-400 text-sm">
                创建项目用于标记发票，按项目追踪收入。
              </p>
            </div>
          </Link>

          {/* Invoices Card */}
          <Link href="/invoices" className="group">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition-all hover:bg-white/10">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                发票管理
              </h3>
              <p className="text-gray-400 text-sm">
                创建专业发票，支持多币种，自动计算税额。
              </p>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="text-center mb-16">
          <div className="flex justify-center gap-4">
            <Link
              href="/clients"
              className="px-8 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors font-medium shadow-lg shadow-emerald-500/25"
            >
              添加客户
            </Link>
            <Link
              href="/invoices/new"
              className="px-8 py-4 bg-white/10 backdrop-blur text-white rounded-xl hover:bg-white/20 transition-colors font-medium border border-white/20"
            >
              创建发票
            </Link>
          </div>
        </div>

        {/* Features List */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-white mb-8 text-center">核心功能</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex gap-4 p-4 bg-white/5 backdrop-blur rounded-xl border border-white/10">
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white">多币种支持</h3>
                <p className="text-sm text-gray-400">支持 USD、EUR、CNY、GBP、JPY</p>
              </div>
            </div>
            <div className="flex gap-4 p-4 bg-white/5 backdrop-blur rounded-xl border border-white/10">
              <div className="flex-shrink-0 w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white">自动计算</h3>
                <p className="text-sm text-gray-400">自动计算小计、税额和总额</p>
              </div>
            </div>
            <div className="flex gap-4 p-4 bg-white/5 backdrop-blur rounded-xl border border-white/10">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white">状态追踪</h3>
                <p className="text-sm text-gray-400">草稿、已发送、已付款、逾期、已取消</p>
              </div>
            </div>
            <div className="flex gap-4 p-4 bg-white/5 backdrop-blur rounded-xl border border-white/10">
              <div className="flex-shrink-0 w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white">稳定币收款</h3>
                <p className="text-sm text-gray-400">支持 USDC/USDT 多链收款 (Arbitrum, Base, Polygon)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          <p>© 2024 WorkWork Ledger. 专为数字游民和自由职业者打造。</p>
          <p className="text-sm mt-2 text-gray-500">
            🌍 Work anywhere, get paid everywhere.
          </p>
        </div>
      </footer>
    </div>
  );
}
