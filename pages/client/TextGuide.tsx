import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ICONS } from '../../constants.tsx';
import { useStore } from '../../store.ts';
import { Language, VoiceGender, TTSEngine } from '../../types.ts';

const TextGuide: React.FC = () => {
  const { id } = useParams();
  const { projects, auth, trackUsage, t } = useStore();
  const project = projects.find(p => p.id === id);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showSafetyDisclaimer, setShowSafetyDisclaimer] = useState(true);
  const [messages, setMessages] = useState<{ text: string; isUser: boolean; timestamp: Date }[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const speak = async (text: string) => {
    if (!project) return;
    
    try {
      // 检查浏览器是否支持语音合成
      if (!('speechSynthesis' in window)) {
        console.log('Browser does not support speech synthesis');
        return;
      }
      
      const { voiceGender } = project.config;
      
      // 确保语音引擎已加载
      let voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        // 延迟重试，等待语音引擎加载
        setTimeout(() => speak(text), 100);
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = auth.language === Language.ZH ? 'zh-CN' : 'en-US';
      utterance.volume = 1.0;
      utterance.rate = 1.0;
      utterance.pitch = voiceGender === VoiceGender.FEMALE ? 1.1 : 0.9;
      
      // 选择合适的语音
      const targetVoice = voices.find(v => 
        (v.name.includes('Xiaoxiao') || v.name.includes('Yunxi') || v.lang.startsWith(utterance.lang))
      );
      if (targetVoice) {
        utterance.voice = targetVoice;
      }
      
      // 播放语音
      window.speechSynthesis.speak(utterance);
      console.log('Speech synthesis started:', text);
    } catch (error) {
      console.error('Speech error:', error);
      // 确保即使出错也不会影响其他功能
    }
  };

  const progress = project?.steps.length ? ((currentStepIndex + 1) / project.steps.length) * 100 : 0;

  const handleUnderstandSafety = () => {
    setShowSafetyDisclaimer(false);
    const welcomeMsg = `${t.ttsWelcome} ${project?.steps[0]?.name || t.defaultStep}`;
    addMessage(welcomeMsg, false);
    // 播放欢迎语音
    speak(welcomeMsg);
  };

  const addMessage = (text: string, isUser: boolean) => {
    setMessages(prev => [...prev, { text, isUser, timestamp: new Date() }]);
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage = inputText.trim();
    addMessage(userMessage, true);
    setInputText('');
    setIsTyping(true);

    // 模拟 AI 回复
    setTimeout(() => {
      let aiResponse = '';
      const currentStep = project?.steps[currentStepIndex];

      if (userMessage.toLowerCase().includes('help') || userMessage.toLowerCase().includes('stuck')) {
        aiResponse = t.lowConfidence;
      } else if (userMessage.toLowerCase().includes('next') || userMessage.toLowerCase().includes('完成')) {
        if (currentStepIndex < (project?.steps.length || 0) - 1) {
          setCurrentStepIndex(prev => prev + 1);
          aiResponse = `${t.perfect} ${t.ttsNext} ${project?.steps[currentStepIndex + 1]?.name}`;
        } else {
          aiResponse = `${t.perfect} 所有步骤已完成！`;
        }
      } else {
        aiResponse = `关于 ${currentStep?.name}：${currentStep?.description}。\n\n目标状态：${currentStep?.targetState}。\n\n请按照说明操作，完成后输入"完成"或"next"进入下一步。`;
      }

      addMessage(aiResponse, false);
      // 播放 AI 回复语音
      speak(aiResponse);
      setIsTyping(false);
    }, 1000);
  };

  useEffect(() => {
    if (!showSafetyDisclaimer && messages.length === 0 && project) {
      const welcomeMsg = `${t.ttsWelcome} ${project.steps[0]?.name || t.defaultStep}`;
      addMessage(welcomeMsg, false);
    }
  }, [showSafetyDisclaimer, project, messages.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Safety Disclaimer Overlay */}
      {showSafetyDisclaimer && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="bg-white rounded-[40px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300 max-w-md mx-auto">
            <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ICONS.AlertCircle className="w-10 h-10 text-orange-600" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tight">{t.securityProtocol}</h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed mb-8">{t.safetyWarning}</p>
            <button
              onClick={handleUnderstandSafety}
              className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl active:scale-95 transition-all"
            >
              {t.understand}
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white p-6 pt-12 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl">
              <ICONS.Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-sm">{project?.name}</h2>
              <p className="text-10px text-gray-400 font-bold uppercase tracking-wider">{t.aiGuide}</p>
            </div>
          </div>
          <div className="bg-blue-50 px-3 py-1.5 rounded-full">
            <span className="text-[10px] font-black text-blue-700 uppercase">{t.stepLabel} {currentStepIndex + 1} / {project?.steps.length || 1}</span>
          </div>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${progress}%` }} />
        </div>
        <h3 className="font-black text-gray-900 text-lg">{project?.steps[currentStepIndex]?.name}</h3>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl ${msg.isUser ? 'bg-blue-600 text-white' : 'bg-white shadow-md'}`}>
              <p className="text-sm leading-relaxed">{msg.text}</p>
              <p className={`text-xs mt-1 ${msg.isUser ? 'text-blue-200' : 'text-gray-400'}`}>
                {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white shadow-md p-4 rounded-2xl max-w-[80%]">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white p-6 border-t border-gray-200">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={t.inputPlaceholder}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isTyping}
            className={`px-6 py-3 rounded-xl bg-blue-600 text-white font-bold transition-all ${(!inputText.trim() || isTyping) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 active:scale-95'}`}
          >
            {t.scanNow}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TextGuide;