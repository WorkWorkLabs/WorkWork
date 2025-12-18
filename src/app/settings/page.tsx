'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { CryptoSettingsForm } from '@/components/settings/crypto-settings-form';

// Temporary user ID for demo - will be replaced with auth
const DEMO_USER_ID = 'demo-user-id';

type SettingsTab = 'general' | 'crypto';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('crypto');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">设置</h1>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'general'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              基本设置
            </button>
            <button
              onClick={() => setActiveTab('crypto')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'crypto'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              稳定币收款
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'general' && (
            <div className="text-gray-500">
              基本设置功能开发中...
            </div>
          )}
          {activeTab === 'crypto' && (
            <CryptoSettingsForm userId={DEMO_USER_ID} />
          )}
        </div>
      </div>
    </div>
  );
}
