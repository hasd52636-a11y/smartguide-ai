
import React from 'react';
import { ICONS } from '../constants.tsx';
import { useStore } from '../store.ts';
import { useNavigate } from 'react-router-dom';
import { Language } from '../types.ts';

const Layout: React.FC<{ children: React.ReactNode, title: string }> = ({ children, title }) => {
  const { auth, logout, setLanguage, t } = useStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <ICONS.Wrench className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {t.appName}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setLanguage(Language.EN)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${auth.language === Language.EN ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
            >EN</button>
            <button 
              onClick={() => setLanguage(Language.ZH)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${auth.language === Language.ZH ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
            >中</button>
          </div>
          
          <button 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors text-sm text-gray-600"
          >
            <ICONS.Settings className="w-4 h-4" />
            <span className="font-medium hidden sm:block">{auth.phone || 'User'}</span>
          </button>
          
          <button 
            onClick={logout}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
            title={t.logout}
          >
            <ICONS.LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        </div>
        {children}
      </main>
    </div>
  );
};

export default Layout;
