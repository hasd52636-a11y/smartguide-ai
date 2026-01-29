
import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout.tsx';
import { useStore } from '../../store.ts';
import { ICONS } from '../../constants.tsx';

const Profile: React.FC = () => {
  const { t, auth } = useStore();
  const [apiStatus, setApiStatus] = useState<{
    zhipu: { status: 'checking' | 'online' | 'offline'; error?: string };
    gemini: { status: 'checking' | 'online' | 'offline'; error?: string };
  }>({
    zhipu: { status: 'checking' },
    gemini: { status: 'checking' }
  });

  useEffect(() => {
    // 检查API状态
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      // 检查智谱API状态
      const zhipuResponse = await fetch('/api/proxy/zhipu/status');
      const zhipuData = await zhipuResponse.json();
      setApiStatus(prev => ({
        ...prev,
        zhipu: zhipuData.ok ? { status: 'online' } : { status: 'offline', error: zhipuData.error }
      }));

      // 检查Gemini API状态
      const geminiResponse = await fetch('/api/proxy/gemini/status');
      const geminiData = await geminiResponse.json();
      setApiStatus(prev => ({
        ...prev,
        gemini: geminiData.ok ? { status: 'online' } : { status: 'offline', error: geminiData.error }
      }));
    } catch (error) {
      console.error('API status check failed:', error);
      setApiStatus(prev => ({
        ...prev,
        zhipu: { status: 'offline', error: 'Connection failed' },
        gemini: { status: 'offline', error: 'Connection failed' }
      }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-600 bg-green-50';
      case 'offline':
        return 'text-red-600 bg-red-50';
      case 'checking':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <ICONS.CheckCircle2 className="w-4 h-4" />;
      case 'offline':
        return <ICONS.AlertCircle className="w-4 h-4" />;
      case 'checking':
        return <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />;
      default:
        return <ICONS.HelpCircle className="w-4 h-4" />;
    }
  };

  return (
    <Layout title={t.profile}>
      <div className="max-w-2xl bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t.accountInfo}</h3>
            <p className="text-gray-500 text-sm">{t.loginNotice}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 border-t border-gray-100 pt-8">
            <div className="bg-gray-50 p-4 rounded-xl">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t.userIdentity}</label>
              <p className="text-gray-900 font-semibold">{auth.phone || 'Administrator'}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-xl">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t.role}</label>
              <p className="text-gray-900 font-semibold">{t.masterMerchant}</p>
            </div>
          </div>

          {/* API状态显示 */}
          <div className="border-t border-gray-100 pt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">API状态</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-gray-700">智谱API</label>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${getStatusColor(apiStatus.zhipu.status)}`}>
                    {getStatusIcon(apiStatus.zhipu.status)}
                    {apiStatus.zhipu.status === 'online' ? '正常' : apiStatus.zhipu.status === 'offline' ? '异常' : '检查中'}
                  </span>
                </div>
                {apiStatus.zhipu.status === 'offline' && apiStatus.zhipu.error && (
                  <p className="text-xs text-red-500 mt-2">错误: {apiStatus.zhipu.error}</p>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-gray-700">Gemini API</label>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${getStatusColor(apiStatus.gemini.status)}`}>
                    {getStatusIcon(apiStatus.gemini.status)}
                    {apiStatus.gemini.status === 'online' ? '正常' : apiStatus.gemini.status === 'offline' ? '异常' : '检查中'}
                  </span>
                </div>
                {apiStatus.gemini.status === 'offline' && apiStatus.gemini.error && (
                  <p className="text-xs text-red-500 mt-2">错误: {apiStatus.gemini.error}</p>
                )}
              </div>

              <button 
                onClick={checkApiStatus}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-colors"
              >
                刷新API状态
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
            <p className="text-blue-700 text-sm font-medium">
              {t.authSimplified}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
