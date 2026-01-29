
import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ICONS } from '../../constants.tsx';
import { useStore } from '../../store.ts';
import { analyzeInstallationState } from '../../services/aiService.ts';
import { generateSpeech } from '../../services/zhipuService.ts';
import { Language, TTSEngine, VoiceGender, GuideMode } from '../../types.ts';
import RealtimeService from '../../services/RealtimeService.ts';
import AudioProcessor from '../../services/AudioProcessor.ts';
import VideoProcessor from '../../services/VideoProcessor.ts';
import AudioPlayer from '../../services/AudioPlayer.ts';
import EventManager from '../../services/EventManager.ts';

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
  const [isRecording, setIsRecording] = useState(false); // For voice recording status
  const [isRealtimeActive, setIsRealtimeActive] = useState(false); // For realtime service status
  const [realtimeConnectionStatus, setRealtimeConnectionStatus] = useState('disconnected'); // Connection status
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [visualHints, setVisualHints] = useState<VisualHint[]>([]);
  const [failureCount, setFailureCount] = useState(0);
  const [isStuckMode, setIsStuckMode] = useState(false);

  // Service instances
  const realtimeServiceRef = useRef<RealtimeService | null>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const videoProcessorRef = useRef<VideoProcessor | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const eventManagerRef = useRef<EventManager | null>(null);

  // DOM references
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize
  useEffect(() => {
    if (project) {
      // 使用项目配置的问候语，如果没有则使用默认问候语
      const greeting = project.config.greeting || `亲爱的顾客你好，我是${project.config.assistantName || '清泉助手'}，您的饮用水专家，有任何产品疑问我都可以帮您解答哦！`;
      setMessages([
        { role: 'assistant', content: greeting }
      ]);
      // 自动播放问候语
      speak(greeting);
    }
    // Request Camera early for seamless switch
    initCamera();
    
    // Initialize realtime services
    initializeRealtimeServices();
    
    // Cleanup on unmount
    return () => {
      cleanupRealtimeServices();
    };
  }, [id, project]);

  // Initialize realtime services
  const initializeRealtimeServices = () => {
    try {
      // Create audio player
      const audioPlayer = new AudioPlayer();
      audioPlayerRef.current = audioPlayer;
      
      // Create realtime service with API key and system prompt
      // Get API key from localStorage
      const apiKey = localStorage.getItem('smartguide_api_key') || 'a75d46768b0f45dc90a5969077ffc8d9.dT0t2tku3hZGfYkk';
      const systemPrompt = project?.config.systemPrompt || '';
      const realtimeService = new RealtimeService(apiKey, systemPrompt);
      realtimeServiceRef.current = realtimeService;
      
      // Create event manager
      const eventManager = new EventManager(realtimeService, audioPlayer);
      eventManagerRef.current = eventManager;
      
      // Create audio processor
      const audioProcessor = new AudioProcessor(realtimeService);
      audioProcessorRef.current = audioProcessor;
      
      // Create video processor with fallback support
      const videoProcessor = new VideoProcessor(realtimeService);
      videoProcessorRef.current = videoProcessor;
      
      // Register event listeners
      registerEventListeners(eventManager);
      
      // Connect to realtime service
      realtimeService.connect();
      
      console.log('Realtime services initialized');
    } catch (error) {
      console.error('Error initializing realtime services:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Failed to initialize realtime services. Please check your network connection and try again.'
      }]);
    }
  };

  // Register event listeners
  const registerEventListeners = (eventManager: EventManager) => {
    // Connection events
    eventManager.on('connected', (data) => {
      setRealtimeConnectionStatus('connected');
      setIsRealtimeActive(true);
      console.log('Connected to realtime service');
      // Add connection success message for better user feedback
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (!lastMessage || lastMessage.role !== 'assistant' || !lastMessage.content.includes('Connected')) {
          return [...prev, {
            role: 'assistant',
            content: 'Connected to AI assistant. You can now chat with me using text or voice.'
          }];
        }
        return prev;
      });
    });
    
    eventManager.on('disconnected', (data) => {
      setRealtimeConnectionStatus('disconnected');
      setIsRealtimeActive(false);
      console.log('Disconnected from realtime service');
    });
    
    eventManager.on('reconnecting', (data) => {
      setRealtimeConnectionStatus('reconnecting');
      console.log('Reconnecting to realtime service:', data);
    });
    
    // Message events
    eventManager.on('response.text.delta', (data) => {
      // Update messages with streaming text
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.type) {
          return prev.map((msg, index) => 
            index === prev.length - 1 
              ? { ...msg, content: (msg.content || '') + data.delta }
              : msg
          );
        } else {
          // Create new message
          return [...prev, {
            role: 'assistant',
            content: data.delta
          }];
        }
      });
    });
    
    eventManager.on('response.done', (data) => {
      setIsProcessing(false);
      console.log('Response completed');
    });
    
    // Audio events for voice feedback
    eventManager.on('response.audio.delta', (data) => {
      // Audio is being processed by AudioPlayer
      console.log('Receiving audio data...');
    });
    
    eventManager.on('response.audio.done', (data) => {
      console.log('Audio response completed');
    });
    
    // Error events
    eventManager.onError((error) => {
      console.error('Realtime error:', error);
      setIsProcessing(false);
      
      // Provide user-friendly error messages
      let errorMessage = 'An error occurred. Please try again.';
      
      if (error.type === 'CONNECTION_ERROR') {
        errorMessage = 'Failed to connect to AI service. Please check your network connection.';
      } else if (error.type === 'AUTH_ERROR') {
        errorMessage = 'Authentication failed. Please check your API key.';
      } else if (error.type === 'RATE_LIMIT_ERROR') {
        errorMessage = 'Too many requests. Please try again later.';
      }
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
      }]);
    });
    
    // Speech detection events for better user feedback
    eventManager.on('input_audio_buffer.speech_started', (data) => {
      console.log('Speech started');
      setIsRecording(true);
    });
    
    eventManager.on('input_audio_buffer.speech_stopped', (data) => {
      console.log('Speech stopped');
      setIsRecording(false);
    });
  };

  // Cleanup realtime services
  const cleanupRealtimeServices = () => {
    // Stop video processor
    if (videoProcessorRef.current) {
      videoProcessorRef.current.stop();
    }
    
    // Stop audio processor
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stop();
    }
    
    // Stop audio player
    if (audioPlayerRef.current) {
      audioPlayerRef.current.destroy();
    }
    
    // Disconnect realtime service
    if (eventManagerRef.current) {
      eventManagerRef.current.destroy();
    }
    
    console.log('Realtime services cleaned up');
  };

  const initCamera = async () => {
    try {
      // 检查是否需要使用虚拟角色模式（商家端不需要真人出现）
      // 这里可以根据项目配置或用户设置来决定是否使用虚拟角色模式
      const useVirtualAvatarMode = true; // 默认为true，商家端不需要真人出现
      
      if (useVirtualAvatarMode) {
        console.log('Using virtual avatar mode for video (no camera required)');
        // 在虚拟角色模式下，不需要请求摄像头权限
        if (videoProcessorRef.current && videoRef.current) {
          await videoProcessorRef.current.start(videoRef.current, realtimeServiceRef.current, {
            useFallback: true,
            brandLogo: project?.config.brandLogo || null
          });
        }
      } else {
        // 正常模式，请求摄像头权限
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 } },
          audio: true
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera init failed or perm denied", err);
      // 添加用户友好的权限提示
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: t.cameraPermissionNeeded || "Please grant camera and microphone permissions to use video mode."
      }]);
      
      // 自动切换到fallback模式
      if (videoProcessorRef.current && videoRef.current) {
        await videoProcessorRef.current.start(videoRef.current, realtimeServiceRef.current, {
          useFallback: true,
          brandLogo: project?.config.brandLogo || null
        });
      }
    }
  };

  // 语音录制现在由 AudioProcessor 处理
  // 旧的录制逻辑已移除，使用新的实时服务

  // 处理步骤跳转
  const handleStepJump = (targetStepIndex: number) => {
    if (!project || targetStepIndex < 0 || targetStepIndex >= project.steps.length) {
      return;
    }
    
    setCurrentStepIndex(targetStepIndex);
    setIsStuckMode(false);
    setFailureCount(0);
    
    const targetStep = project.steps[targetStepIndex];
    const jumpMessage = `${t.ttsJumpToStep || 'Jumping to step'}: ${targetStep.name}`;
    
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: jumpMessage 
    }]);
    speak(jumpMessage);
  };

  // 检查用户是否要求跳过步骤
  const checkForStepJump = (userMessage: string) => {
    if (!project) return null;
    
    // 检查是否包含跳转指令
    const jumpKeywords = ['跳', '跳过', 'go to', 'skip to', 'jump to'];
    const hasJumpKeyword = jumpKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
    
    if (hasJumpKeyword) {
      // 尝试识别目标步骤
      for (let i = 0; i < project.steps.length; i++) {
        const step = project.steps[i];
        if (userMessage.toLowerCase().includes(step.name.toLowerCase())) {
          return i;
        }
      }
      
      // 尝试识别步骤编号
      const stepNumberMatch = userMessage.match(/第(\d+)步|step (\d+)/i);
      if (stepNumberMatch) {
        const stepNumber = parseInt(stepNumberMatch[1] || stepNumberMatch[2]) - 1;
        if (stepNumber >= 0 && stepNumber < project.steps.length) {
          return stepNumber;
        }
      }
    }
    
    return null;
  };

  const speak = async (text: string) => {
    if (!project) return;
    
    try {
      // 首先尝试使用智谱AI的语音服务
      const selectedVoice = project.config.voice || 'tongtong';
      const audioUrl = await generateSpeech(text, selectedVoice);
      
      if (audioUrl) {
        // 使用智谱AI生成的语音
        const audio = new Audio(audioUrl);
        audio.play().catch(error => {
          console.error('Error playing audio:', error);
          // 播放失败时使用浏览器内置TTS作为备选
          useBrowserTTS(text);
        });
        console.log('Using Zhipu AI TTS:', text);
        return;
      }
      
      // 如果智谱AI语音服务失败，使用浏览器内置TTS
      useBrowserTTS(text);
    } catch (error) {
      console.error('Speech error:', error);
      // 确保即使出错也不会影响其他功能
      // 出错时使用浏览器内置TTS作为备选
      useBrowserTTS(text);
    }
  };
  
  const useBrowserTTS = (text: string) => {
    // 检查浏览器是否支持语音合成
    if (!('speechSynthesis' in window)) {
      console.log('Browser does not support speech synthesis');
      return;
    }
    
    const { voiceGender } = project?.config || {};

    // 确保语音引擎已加载
    let voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      // 延迟重试，等待语音引擎加载
      setTimeout(() => useBrowserTTS(text), 100);
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
    console.log('Using browser TTS:', text);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const userMsg = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsProcessing(true);

    try {
      // 1. Check if user wants to jump to another step
      const targetStepIndex = checkForStepJump(userMsg);
      if (targetStepIndex !== null) {
        handleStepJump(targetStepIndex);
        setIsProcessing(false);
        return;
      }

      // 2. Check if realtime service is available
      if (eventManagerRef.current && eventManagerRef.current.isConnected()) {
        // Use realtime service to send message
        eventManagerRef.current.sendTextMessage(userMsg);
      } else {
        // Fallback to original method if realtime service is not available
        console.warn('Realtime service not available, using fallback method');
        setIsProcessing(false);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Realtime service is not available. Please try again later.'
        }]);
      }
    } catch (error) {
      console.error("Chat error", error);
      setIsProcessing(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error sending message: ${error.message || 'Unknown error'}`
      }]);
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
      auth.language,
      undefined,
      project?.knowledgeBase || []
    );

    if (result) {
      // 检查置信度
      if (result.confidence < 80) {
        const lowConfidenceMsg = t.lowConfidence;
        setMessages(prev => [...prev, { role: 'assistant', content: lowConfidenceMsg }]);
        speak(lowConfidenceMsg);
        setFailureCount(prev => prev + 1);
        // 连续失败时进入诊断模式
        if (failureCount >= 2) {
          setIsStuckMode(true);
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: result.feedback }]);
        speak(result.feedback);
        if (result.isComplete) {
          setIsStuckMode(false);
          setFailureCount(0);
          if (currentStepIndex < (project?.steps.length || 0) - 1) {
            setTimeout(() => {
              setCurrentStepIndex(prev => prev + 1);
              const nextMsg = `${t.ttsNext} ${project?.steps[currentStepIndex + 1].name}`;
              setMessages(prev => [...prev, { role: 'assistant', content: nextMsg }]);
              speak(nextMsg);
            }, 2000);
          }
        } else {
          setFailureCount(prev => prev + 1);
          // 连续失败时进入诊断模式
          if (failureCount >= 2) {
            setIsStuckMode(true);
          }
        }
      }
    }

    setIsProcessing(false);
    setShowCamera(false);
  };

  // --- RENDERERS ---

  const renderTextMode = () => (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Brand Header */}
      {project?.config.brandLogo && (
        <div className="p-3 bg-white border-b border-gray-100 flex items-center justify-center">
          <img src={project.config.brandLogo} className="h-10 object-contain" alt="Brand Logo" />
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(messages || []).map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end`}>
            {msg.role === 'assistant' && (
              <div className="mr-2 flex flex-col items-center">
                {project?.config.brandLogo ? (
                  <img src={project.config.brandLogo} className="w-8 h-8 rounded-full object-cover" alt="Brand Logo" />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-tr from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{project?.config.assistantName?.charAt(0) || 'A'}</span>
                  </div>
                )}
              </div>
            )}
            <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-white shadow text-gray-800 rounded-bl-none'
              }`}>
              {msg.type === 'image' && <img src={msg.imageUrl} className="rounded-lg mb-2 max-h-40" alt="User upload" />}
              <p className="text-sm">{msg.content}</p>
            </div>
            {msg.role === 'user' && (
              <div className="ml-2 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <ICONS.User className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}
        {isProcessing && <div className="text-xs text-gray-400 text-center animate-pulse">{t.aiThinking || 'AI is thinking...'}</div>}
        {!isRealtimeActive && (
          <div className="text-xs text-yellow-500 text-center">
            {realtimeConnectionStatus === 'reconnecting' ? 'Reconnecting to AI service...' : 'AI service is offline'}
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-3">
        <button
          onClick={() => setShowCamera(!showCamera)}
          className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <ICONS.Camera className="w-6 h-6" />
        </button>
        <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex items-center">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={t.textModeDesc || 'Type your message here...'}
            className="bg-transparent border-none outline-none w-full text-sm"
            disabled={!isRealtimeActive}
          />
        </div>
        <button
          onClick={handleSendMessage}
          className={`p-2 rounded-full text-white shadow-lg active:scale-95 transition-all ${isRealtimeActive ? 'bg-blue-600' : 'bg-gray-400 cursor-not-allowed'}`}
          disabled={!isRealtimeActive || !inputMessage.trim()}
        >
          {inputMessage ? <ICONS.ArrowRight className="w-5 h-5" /> : <ICONS.Mic className="w-5 h-5" />}
        </button>
      </div>

      {showCamera && (
        <div className="absolute inset-0 z-50 bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <button onClick={handleCapture} className="absolute bottom-10 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-gray-300 transition-transform hover:scale-105 active:scale-95" />
          <button onClick={() => setShowCamera(false)} className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors">
            <ICONS.LogOut className="w-6 h-6" />
          </button>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );



  const renderVideoMode = () => (
    <div className="relative h-full bg-black">
      {/* Bot Layer (Avatar) */}
      <div className="absolute top-0 w-full h-1/2 bg-gray-900 flex items-center justify-center border-b border-gray-800">
        {/* Placeholder for 3D/Video Avatar */}
        <div className="text-center">
          {project?.config.brandLogo ? (
            <img src={project.config.brandLogo} className="w-24 h-24 rounded-full mx-auto mb-4 object-cover shadow-lg shadow-blue-500/50" />
          ) : (
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-400 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-500/50">
              <span className="text-white text-2xl font-bold">{project?.config.assistantName?.charAt(0) || 'A'}</span>
            </div>
          )}
          <p className="text-white font-bold">{project?.config.assistantName}</p>
          <div className={`mt-2 bg-gray-800 px-3 py-1 rounded-full text-xs text-blue-400 border border-blue-500/30 transition-opacity ${isProcessing ? 'opacity-100' : 'opacity-0'}`}>
            {t.speaking || 'Speaking'}
          </div>
          {/* Connection status indicator */}
          <div className={`mt-1 px-3 py-1 rounded-full text-xs font-bold transition-colors ${realtimeConnectionStatus === 'connected' ? 'bg-green-900/50 text-green-400 border border-green-500/30' : realtimeConnectionStatus === 'reconnecting' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-500/30' : 'bg-red-900/50 text-red-400 border border-red-500/30'}`}>
            {realtimeConnectionStatus === 'connected' ? 'Online' : realtimeConnectionStatus === 'reconnecting' ? 'Reconnecting' : 'Offline'}
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
            onMouseDown={async () => {
              if (audioProcessorRef.current && !audioProcessorRef.current.isActive() && isRealtimeActive) {
                try {
                  await audioProcessorRef.current.start(realtimeServiceRef.current);
                  setIsRecording(true);
                } catch (error) {
                  console.error('Failed to start audio recording:', error);
                  setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'Failed to start audio recording. Please check your microphone permissions.'
                  }]);
                }
              }
            }}
            onMouseUp={async () => {
              if (audioProcessorRef.current && audioProcessorRef.current.isActive()) {
                await audioProcessorRef.current.stop();
                setIsRecording(false);
              }
            }}
            onMouseLeave={async () => {
              if (audioProcessorRef.current && audioProcessorRef.current.isActive()) {
                await audioProcessorRef.current.stop();
                setIsRecording(false);
              }
            }}
            onTouchStart={async () => {
              if (audioProcessorRef.current && !audioProcessorRef.current.isActive() && isRealtimeActive) {
                try {
                  await audioProcessorRef.current.start(realtimeServiceRef.current);
                  setIsRecording(true);
                } catch (error) {
                  console.error('Failed to start audio recording:', error);
                  setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'Failed to start audio recording. Please check your microphone permissions.'
                  }]);
                }
              }
            }}
            onTouchEnd={async () => {
              if (audioProcessorRef.current && audioProcessorRef.current.isActive()) {
                await audioProcessorRef.current.stop();
                setIsRecording(false);
              }
            }}
            className={`flex-1 font-bold h-14 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all ${isRecording ? 'bg-red-500 text-white' : isRealtimeActive ? 'bg-white text-black' : 'bg-gray-500 text-gray-300 cursor-not-allowed'}`}
            disabled={!isRealtimeActive}
          >
            <ICONS.Mic className="w-6 h-6 mr-2" /> {isRecording ? (t.recording || "Recording...") : (t.holdToSpeak || "Hold to Speak")}
          </button>
          <button
            onClick={handleCapture}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl active:scale-95 transition-all ${isRealtimeActive ? 'bg-blue-600' : 'bg-gray-500 cursor-not-allowed'}`}
            disabled={!isRealtimeActive}
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
        {/* Realtime Connection Status */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold ${realtimeConnectionStatus === 'connected' ? 'bg-green-100 text-green-800' : realtimeConnectionStatus === 'reconnecting' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
          {realtimeConnectionStatus === 'connected' ? 'Connected' : realtimeConnectionStatus === 'reconnecting' ? 'Reconnecting' : 'Disconnected'}
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl w-full">
          {
            [
              { id: GuideMode.TEXT, icon: ICONS.MessageSquare, label: t.modeText },
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
            ))
          }
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {guideMode === GuideMode.TEXT && renderTextMode()}
        {guideMode === GuideMode.VIDEO && renderVideoMode()}
      </div>
    </div>
  );
};

export default ClientGuide;
