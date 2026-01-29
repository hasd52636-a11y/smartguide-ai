
import React from 'react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 md:p-6 flex items-center justify-center">
      <div className="max-w-4xl w-full">
        {/* 标题部分 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            SmartGuide AI (New Design)
          </h1>
          <p className="text-purple-200 text-sm md:text-base">
            智能安装助手
          </p>
        </div>
        
        {/* 主卡片 - 液态玻璃效果 */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-xl p-5 md:p-6 mb-6">
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
            系统状态
          </h2>
          
          {/* 状态卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* 左侧状态卡片 */}
            <div className="backdrop-blur-md bg-purple-500/20 rounded-xl border border-purple-400/30 shadow-lg p-4 transition-all duration-300 hover:shadow-purple-500/20 hover:scale-[1.01]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-white">组件状态</h3>
                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-100">React 渲染</span>
                  <span className="text-green-300 font-medium">正常</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-100">Tailwind CSS</span>
                  <span className="text-green-300 font-medium">已加载</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-100">API 连接</span>
                  <span className="text-green-300 font-medium">可用</span>
                </div>
              </div>
            </div>
            
            {/* 右侧状态卡片 */}
            <div className="backdrop-blur-md bg-indigo-500/20 rounded-xl border border-indigo-400/30 shadow-lg p-4 transition-all duration-300 hover:shadow-indigo-500/20 hover:scale-[1.01]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-white">系统信息</h3>
                <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse"></div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-100">版本</span>
                  <span className="text-white font-medium">v1.0.0</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-100">状态</span>
                  <span className="text-green-300 font-medium">运行中</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-100">响应时间</span>
                  <span className="text-white font-medium">23ms</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 功能卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {/* 功能 1 */}
            <div className="backdrop-blur-md bg-purple-600/20 rounded-lg border border-purple-500/30 shadow-md p-3 transition-all duration-300 hover:bg-purple-600/30 hover:shadow-purple-500/30 hover:translate-y-[-2px]">
              <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h4 className="font-medium text-white mb-1">智能助手</h4>
              <p className="text-purple-200 text-xs">实时解答安装问题</p>
            </div>
            
            {/* 功能 2 */}
            <div className="backdrop-blur-md bg-purple-600/20 rounded-lg border border-purple-500/30 shadow-md p-3 transition-all duration-300 hover:bg-purple-600/30 hover:shadow-purple-500/30 hover:translate-y-[-2px]">
              <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h4 className="font-medium text-white mb-1">步骤引导</h4>
              <p className="text-purple-200 text-xs">可视化安装流程</p>
            </div>
            
            {/* 功能 3 */}
            <div className="backdrop-blur-md bg-purple-600/20 rounded-lg border border-purple-500/30 shadow-md p-3 transition-all duration-300 hover:bg-purple-600/30 hover:shadow-purple-500/30 hover:translate-y-[-2px]">
              <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="font-medium text-white mb-1">数据分析</h4>
              <p className="text-purple-200 text-xs">安装数据统计</p>
            </div>
          </div>
        </div>
        
        {/* 底部信息 */}
        <div className="text-center text-purple-300 text-xs">
          <p>© 2026 SmartGuide AI | 版本 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default App;
