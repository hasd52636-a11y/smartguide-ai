
import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ICONS } from '../../constants.tsx';
import { useStore } from '../../store.ts';
import { analyzeInstallationState, generateSpeech } from '../../services/aiService.ts';
import { Language, TTSEngine, VoiceGender } from '../../types.ts';

interface VisualHint {
  type: 'circle' | 'arrow';
  point: [number, number];
  label?: string;
}

const ClientGuide: React.FC = () => {
  const { id } = useParams();
  const { projects, auth, trackUsage, t } = useStore();
  const project = projects.find(p => p.id === id);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isStuckMode, setIsStuckMode] = useState(false);
  const [showSafetyDisclaimer, setShowSafetyDisclaimer] = useState(true);
  const [failureCount, setFailureCount] = useState(0);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [photoRequest, setPhotoRequest] = useState<{ what: string, where: string, why: string } | null>(null);
  const [visualHints, setVisualHints] = useState<VisualHint[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const progress = project?.steps.length ? ((currentStepIndex + 1) / project.steps.length) * 100 : 0;

  const speak = async (text: string) => {
    if (!project || showSafetyDisclaimer) return;
    const { ttsEngine, voiceGender } = project.config;

    if (ttsEngine === TTSEngine.SYSTEM) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = auth.language === Language.ZH ? 'zh-CN' : 'en-US';
      const voices = window.speechSynthesis.getVoices();
      const targetVoice = voices.find(v => (v.name.includes('Xiaoxiao') || v.name.includes('Yunxi')) && v.lang.startsWith(utterance.lang));
      if (targetVoice) utterance.voice = targetVoice;
      utterance.pitch = voiceGender === VoiceGender.FEMALE ? 1.1 : 0.9;
      window.speechSynthesis.speak(utterance);
      return;
    }

    const base64Audio = await generateSpeech(text);
    if (!base64Audio) return;
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioContextRef.current;
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    const dataInt16 = new Int16Array(bytes.buffer);
    const audioBuffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();
  };

  const handleUnderstandSafety = () => {
    setShowSafetyDisclaimer(false);
    const welcomeMsg = `${t.ttsWelcome} ${project?.steps[0]?.name || t.defaultStep}`;
    speak(welcomeMsg);
  };

  useEffect(() => {
    window.speechSynthesis.getVoices();
    const requestAccess = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setIsPermissionGranted(true);
      } catch (err) { }
    };
    requestAccess();
  }, [id]);

  const handleCaptureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    setIsAnalyzing(true);
    setFeedback(null);
    setPhotoRequest(null);

    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context?.drawImage(videoRef.current, 0, 0);
    const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);

    // AI Instruction tailored based on Stuck Mode
    const customPrompt = isStuckMode ? "User is STUCK. Perform a deep diagnosis of ALL connections. Be extremely pedantic about placement." : project?.config.systemPrompt || '';

    const result = await analyzeInstallationState(
      imageData,
      project?.steps[currentStepIndex] || { name: 'Setup', targetState: 'Ready' },
      customPrompt,
      auth.language,
      project?.config.provider
    );

    setIsAnalyzing(false);
    if (result) {
      if (result.tokensUsed > 0 && project) trackUsage(project.id, result.tokensUsed);

      // PRD 6.6: Confidence Rule
      if (result.confidence < 80) {
        setFeedback(t.lowConfidence);
        speak(t.lowConfidence);
        setFailureCount(prev => prev + 1);
        return;
      }

      setVisualHints(result.visualHints || []);

      if (result.isComplete) {
        setIsStuckMode(false);
        setFailureCount(0);
        setFeedback(result.feedback || t.perfect);
        speak(result.feedback || t.perfect);
        if (currentStepIndex < (project?.steps.length || 0) - 1) {
          setTimeout(() => {
            setCurrentStepIndex(prev => prev + 1);
            setFeedback(null);
            setVisualHints([]);
            const nextMsg = `${t.ttsNext} ${project?.steps[currentStepIndex + 1].name}`;
            speak(nextMsg);
          }, 3500);
        }
      } else {
        setFeedback(result.feedback);
        setPhotoRequest(result.photoRequest || null);
        speak(result.feedback);
        setFailureCount(prev => prev + 1);
      }

      // PRD 6.6: 3 Failures trigger Stuck Mode / Human Support
      if (failureCount >= 2) {
        setIsStuckMode(true);
      }
    }
  };

  // Mobile Orientation Logic
  const [isLandscape, setIsLandscape] = useState(false);
  useEffect(() => {
    const checkOrientation = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', checkOrientation);
    checkOrientation();
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden max-w-md mx-auto font-sans">
      {/* Landscape Warning */}
      {isLandscape && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center text-white p-8 text-center animate-in fade-in duration-300">
          <ICONS.Smartphone className="w-16 h-16 mb-4 animate-spin" />
          <h3 className="text-xl font-bold mb-2">{t.rotatePhone}</h3>
          <p className="text-gray-400 text-sm">{t.rotatePhoneDesc}</p>
        </div>
      )}
      {/* Safety Disclaimer Overlay */}
      {showSafetyDisclaimer && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="bg-white rounded-[40px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300">
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

      {/* Failures Alert Overlay */}
      {failureCount >= 3 && !showSafetyDisclaimer && (
        <div className="absolute top-32 left-4 right-4 z-[50] animate-in slide-in-from-top duration-300">
          <div className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ICONS.AlertCircle className="w-5 h-5" />
              <span className="text-xs font-bold">{t.tooManyFailures}</span>
            </div>
            <button className="bg-white text-red-600 px-3 py-1 rounded-lg text-[10px] font-black">{t.contactSupport}</button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white/95 backdrop-blur-md p-6 pt-12 z-20 shadow-2xl rounded-b-[32px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl transition-colors ${isStuckMode ? 'bg-orange-600' : 'bg-blue-600'}`}>
              <ICONS.Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-sm">{project?.name}</h2>
              <p className="text-10px text-gray-400 font-bold uppercase tracking-wider">{isStuckMode ? t.stuckMode : t.aiGuide}</p>
            </div>
          </div>
          <div className="bg-blue-50 px-3 py-1.5 rounded-full">
            <span className="text-[10px] font-black text-blue-700 uppercase">{t.stepLabel} {currentStepIndex + 1} / {project?.steps.length || 1}</span>
          </div>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div className={`h-full transition-all duration-1000 ${isStuckMode ? 'bg-orange-500' : 'bg-blue-600'}`} style={{ width: `${progress}%` }} />
        </div>
        <h3 className="font-black text-gray-900 text-lg">{project?.steps[currentStepIndex]?.name}</h3>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative bg-gray-950">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

        {visualHints.map((hint, i) => (
          <div key={i} className="absolute w-12 h-12 border-4 border-white rounded-full animate-ping z-30" style={{ left: `${hint.point[0] / 10}%`, top: `${hint.point[1] / 10}%` }} />
        ))}

        {isAnalyzing && <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-bounce" />}

        {photoRequest && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-[85%] bg-white p-6 rounded-[32px] shadow-2xl border-4 border-blue-500/20">
            <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase mb-2">
              <ICONS.Camera className="w-3 h-3" /> {t.scanNow}
            </div>
            <p className="text-sm font-bold text-gray-900 mb-2 leading-tight">{photoRequest.what}</p>
            <p className="text-xs text-gray-500 italic">"{photoRequest.why}"</p>
          </div>
        )}

        {feedback && !photoRequest && (
          <div className={`absolute bottom-10 left-4 right-4 z-40 p-5 rounded-[24px] shadow-2xl border-l-8 ${isStuckMode ? 'bg-orange-50 border-orange-500' : 'bg-white border-blue-600'}`}>
            <p className="text-sm font-bold text-gray-900 leading-snug">{feedback}</p>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-white p-6 pb-12 rounded-t-[48px] shadow-2xl relative">
        <div className="flex gap-4 items-center">
          <button
            onClick={() => {
              setIsStuckMode(!isStuckMode);
              speak(isStuckMode ? t.exitDiagnosis : t.enterDiagnosis);
            }}
            className={`w-16 h-16 flex items-center justify-center rounded-2xl transition-colors ${isStuckMode ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'}`}
          >
            <ICONS.HelpCircle className="w-7 h-7" />
          </button>

          <button onClick={handleCaptureAndAnalyze} disabled={isAnalyzing} className={`flex-1 h-20 rounded-[28px] text-white flex flex-col items-center justify-center font-black shadow-lg transition-all active:scale-95 ${isAnalyzing ? 'bg-gray-400' : isStuckMode ? 'bg-orange-600' : 'bg-blue-600'}`}>
            {isAnalyzing ? t.analyzingDot : t.scanNow}
          </button>

          <button className="w-16 h-16 bg-gray-900 text-white flex items-center justify-center rounded-2xl">
            <ICONS.Mic className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientGuide;
