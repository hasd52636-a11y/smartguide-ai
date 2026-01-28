
import React from 'react';
import { ICONS } from '../../constants.tsx';
import { useStore } from '../../store.ts';
import { Language } from '../../types.ts';

const Login: React.FC = () => {
  const { login, setLanguage, auth, t } = useStore();

  const handleDirectLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login('Admin User');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="absolute top-6 right-6 flex bg-white/50 backdrop-blur-md p-1 rounded-lg shadow-sm border border-white/20">
        <button
          onClick={() => setLanguage(Language.EN)}
          className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${auth.language === Language.EN ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >EN</button>
        <button
          onClick={() => setLanguage(Language.ZH)}
          className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${auth.language === Language.ZH ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >中</button>
      </div>

      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-10 border border-white/50 text-center">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-blue-600 p-4 rounded-3xl mb-6 shadow-xl shadow-blue-200">
            <ICONS.Wrench className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t.appName}</h1>
          <p className="text-gray-500 mt-3 font-medium">{t.merchantPortal}</p>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
            <p className="text-sm text-blue-600 font-medium mb-1">{t.testingMode}</p>
            <p className="text-xs text-blue-400">{t.termsNotice}</p>
          </div>

          <button
            onClick={handleDirectLogin}
            className="group w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {t.enterPortal}
            <ICONS.ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <p className="text-gray-400 text-xs font-medium mt-10">
          {t.slogan}
        </p>
      </div>
    </div >
  );
};

export default Login;
