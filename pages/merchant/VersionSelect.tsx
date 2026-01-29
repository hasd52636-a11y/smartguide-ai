import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../../constants.tsx';
import { useStore } from '../../store.ts';
import { GuideMode } from '../../types.ts';

const VersionSelect: React.FC = () => {
  const { setGuideMode, t } = useStore();
  const navigate = useNavigate();

  const handleSelectVersion = (mode: GuideMode) => {
    setGuideMode(mode);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-10 border border-white/50">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-blue-600 p-4 rounded-3xl mb-6 shadow-xl shadow-blue-200">
            <ICONS.Wrench className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t.appName}</h1>
          <p className="text-gray-500 mt-3 font-medium">{t.selectVersion}</p>
        </div>

        <div className="space-y-6">
          {/* 纯文字会话版 */}
          <button
            onClick={() => handleSelectVersion(GuideMode.TEXT)}
            className="w-full bg-white border-2 border-blue-600 text-blue-600 font-bold py-6 rounded-2xl shadow-lg hover:bg-blue-50 transition-all active:scale-[0.98] flex flex-col items-start p-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <ICONS.LayoutDashboard className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{t.textVersion}</h3>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              {t.textVersionDesc}
            </p>
          </button>

          {/* 视频语音和文字一体的版本 */}
          <button
            onClick={() => handleSelectVersion(GuideMode.VIDEO)}
            className="w-full bg-blue-600 text-white font-bold py-6 rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] flex flex-col items-start p-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <ICONS.Camera className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">{t.videoVersion}</h3>
            </div>
            <p className="text-white/80 text-sm leading-relaxed">
              {t.videoVersionDesc}
            </p>
          </button>
        </div>

        <p className="text-gray-400 text-xs font-medium mt-10 text-center">
          {t.slogan}
        </p>
      </div>
    </div >
  );
};

export default VersionSelect;