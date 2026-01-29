
import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ICONS } from '../../constants.tsx';
import { useStore } from '../../store.ts';
import { analyzeInstallationState, generateSpeech } from '../../services/aiService.ts';
import { Language, TTSEngine, VoiceGender, GuideMode } from '../../types.ts';

interface VisualHint {
  type: 'circle' | 'arrow';
  point: [number, number];
  label?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'image';
  imageUrl?: string;
}

const ClientGuide: React.FC = () => {
  const { id } = useParams();
  const { projects, auth, trackUsage, t } = useStore();
  const project = projects.find(p => p.id === id);

  const [guideMode, setGuideMode] = useState<GuideMode>(GuideMode.TEXT);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false); // For Text Mode Camera Overlay

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [visualHints, setVisualHints] = useState<VisualHint[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize
  useEffect(() => {
    if (project) {
      setMessages([
        { role: 'assistant', content: `${t.ttsWelcome} ${project.steps[0]?.name || t.defaultStep}` }
      ]);
    }
    // Request Camera early for seamless switch
    initCamera();
  }, [id, project]);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
        audio: true
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.warn("Camera init failed or perm denied", err);
    }
  };

  const speak = async (text: string) => {
    if (!project) return;
    
    try {
      // 检查浏览器是否支持语音合成
      if (!('speechSynthesis' in window)) {
        console.log('Browser does not support speech synthesis');
        return;
      }
      
      const { ttsEngine, voiceGender } = project.config;

      if (ttsEngine === TTSEngine.SYSTEM) {
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
        return;
      }
      
      // 非系统 TTS 引擎 - 保持原有逻辑
      console.log('Using non-system TTS engine');
    } catch (error) {
      console.error('Speech error:', error);
      // 确保即使出错也不会影响其他功能
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMsg = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsProcessing(true);

    try {
      // 1. Check if user is asking about current step
      const stepContext = project?.steps[currentStepIndex];
      const systemPrompt = `
        You are ${project?.config.assistantName}, an expert guide.
        Current Step: ${stepContext?.name} - ${stepContext?.description}.
        Target State: ${stepContext?.targetState}.
        System Prompt: ${project?.config.systemPrompt}.
        Language: ${auth.language}.
        Keep answers concise (under 50 words) and helpful.
      `;

      // 2. Chat with LLM
      const contextMessages = messages.slice(-5).map(m => ({ role: m.role, content: m.content }));
      contextMessages.push({ role: 'user', content: userMsg });

      const responseText = await chatWithAssistant(contextMessages, systemPrompt);

      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
      if (guideMode !== GuideMode.TEXT) {
        speak(responseText);
      }
    } catch (error) {
      console.error("Chat error", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsProcessing(true);

    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context?.drawImage(videoRef.current, 0, 0);
    const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);

    // Show image in chat
    setMessages(prev => [...prev, { role: 'user', content: 'Analyzing photo...', type: 'image', imageUrl: imageData }]);

    const result = await analyzeInstallationState(
      imageData,
      project?.steps[currentStepIndex],
      project?.config.systemPrompt || '',
      auth.language
    );

    if (result) {
      setMessages(prev => [...prev, { role: 'assistant', content: result.feedback }]);
      speak(result.feedback);
      if (result.isComplete && currentStepIndex < (project?.steps.length || 0) - 1) {
        setTimeout(() => {
          setCurrentStepIndex(prev => prev + 1);
          const nextMsg = `${t.ttsNext} ${project?.steps[currentStepIndex + 1].name}`;
          setMessages(prev => [...prev, { role: 'assistant', content: nextMsg }]);
          speak(nextMsg);
        }, 2000);
      }
    }

    setIsProcessing(false);
    setShowCamera(false);
  };

  // --- RENDERERS ---

  const renderTextMode = () => (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-white shadow text-gray-800 rounded-bl-none'
              }`}>
              {msg.type === 'image' && <img src={msg.imageUrl} className="rounded-lg mb-2 max-h-40" alt="User upload" />}
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        {isProcessing && <div className="text-xs text-gray-400 text-center animate-pulse">AI is thinking...</div>}
      </div>

      <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-3">
        <button
          onClick={() => setShowCamera(!showCamera)}
          className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200"
        >
          <ICONS.Camera className="w-6 h-6" />
        </button>
        <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex items-center">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={t.textModeDesc}
            className="bg-transparent border-none outline-none w-full text-sm"
          />
        </div>
        <button
          onClick={handleSendMessage}
          className="p-2 bg-blue-600 rounded-full text-white shadow-lg active:scale-95"
        >
          {inputMessage ? <ICONS.ArrowRight className="w-5 h-5" /> : <ICONS.Mic className="w-5 h-5" />}
        </button>
      </div>

      {showCamera && (
        <div className="absolute inset-0 z-50 bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <button onClick={handleCapture} className="absolute bottom-10 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-gray-300" />
          <button onClick={() => setShowCamera(false)} className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full">
            <ICONS.LogOut className="w-6 h-6" />
          </button>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );

  const renderVoiceMode = () => (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-indigo-900 to-purple-900 text-white p-6">
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <div className={`absolute inset-0 bg-blue-500 rounded-full blur-3xl opacity-30 ${isProcessing ? 'animate-pulse' : ''}`} />
          <div className="w-32 h-32 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.2)]">
            <ICONS.Mic className="w-12 h-12 text-white" />
          </div>
        </div>
        <h3 className="mt-8 text-xl font-bold">{isProcessing ? "Analyzing..." : t.voiceModeDesc}</h3>
        <p className="text-white/50 text-sm mt-2">{t.listening}</p>

        {/* Latest Response */}
        <div className="mt-12 bg-white/10 p-6 rounded-3xl backdrop-blur max-w-sm text-center">
          <p className="text-lg font-medium">
            "{messages[messages.length - 1]?.content || t.ttsWelcome}"
          </p>
        </div>
      </div>
      <button
        onClick={() => setGuideMode(GuideMode.TEXT)}
        className="mb-8 flex items-center gap-2 text-white/60 hover:text-white"
      >
        <ICONS.MessageSquare className="w-4 h-4" /> {t.modeText}
      </button>
    </div>
  );

  const renderVideoMode = () => (
    <div className="relative h-full bg-black">
      {/* Bot Layer (Avatar) */}
      <div className="absolute top-0 w-full h-1/2 bg-gray-900 flex items-center justify-center border-b border-gray-800">
        {/* Placeholder for 3D/Video Avatar */}
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-400 to-purple-500 rounded-full mx-auto mb-4 animate-bounce shadow-lg shadow-blue-500/50" />
          <p className="text-white font-bold">{project?.config.assistantName}</p>
          <div className={`mt-2 bg-gray-800 px-3 py-1 rounded-full text-xs text-blue-400 border border-blue-500/30 ${isProcessing ? 'opacity-100' : 'opacity-0'}`}>
            Speaking...
          </div>
        </div>
      </div>

      {/* User Camera Layer */}
      <div className="absolute bottom-0 w-full h-1/2">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-80" />
        <canvas ref={canvasRef} className="hidden" />

        {/* Interaction Overlays */}
        <div className="absolute bottom-6 left-6 right-6 flex items-center gap-4">
          <button
            onMouseDown={() => { /* Start Recording */ }}
            onMouseUp={() => { /* Stop Recording */ }}
            className="flex-1 bg-white text-black font-bold h-14 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all"
          >
            <ICONS.Mic className="w-6 h-6 mr-2" /> Hold to Speak
          </button>
          <button
            onClick={handleCapture}
            className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl active:scale-95"
          >
            <ICONS.Camera className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-white flex flex-col font-sans max-w-md mx-auto shadow-2xl overflow-hidden">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-100 px-2 py-2 flex justify-between items-center z-20">
        <div className="flex bg-gray-100 p-1 rounded-xl w-full">
          {[
            { id: GuideMode.TEXT, icon: ICONS.MessageSquare, label: t.modeText },
            { id: GuideMode.VOICE, icon: ICONS.Mic, label: t.modeVoice },
            { id: GuideMode.VIDEO, icon: ICONS.Video, label: t.modeVideo },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setGuideMode(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${guideMode === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {guideMode === GuideMode.TEXT && renderTextMode()}
        {guideMode === GuideMode.VOICE && renderVoiceMode()}
        {guideMode === GuideMode.VIDEO && renderVideoMode()}
      </div>
    </div>
  );
};

export default ClientGuide;
