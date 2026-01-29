
import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
// 浏览器环境中不使用path模块，使用自定义函数
const basename = (filePath: string): string => {
  return filePath.split('/').pop()?.split('\\').pop() || '';
};
import Layout from '../../components/Layout.tsx';
import { ICONS } from '../../constants.tsx';
import { useStore } from '../../store.ts';
import { VoiceGender, LLMProvider, InstallationStep, TTSEngine } from '../../types.ts';
import { QRCodeSVG } from 'qrcode.react';
import { getVoiceList, cloneVoice, deleteVoice, textToSpeech } from '../../services/zhipuService.ts';

const ProjectConfig: React.FC = () => {
  const { id } = useParams();
  const { projects, updateProject, t } = useStore();
  const project = projects.find(p => p.id === id);

  const [activeTab, setActiveTab] = useState<'info' | 'steps' | 'knowledge' | 'assistant' | 'qrcode' | 'usage'>('info');
  const [isParsing, setIsParsing] = useState(false);
  const [newRestriction, setNewRestriction] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 声音管理相关状态
  const [voices, setVoices] = useState<any[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [isCloningVoice, setIsCloningVoice] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState<string | null>(null);
  const [voiceCloneForm, setVoiceCloneForm] = useState({
    voiceName: '',
    inputText: '',
    fileId: '',
    sampleText: '你好，我是智能助手，很高兴为您服务。'
  });
  const [selectedVoice, setSelectedVoice] = useState<string>('tongtong');
  const [testingZhipuApiKey, setTestingZhipuApiKey] = useState(false);
  const [testingGeminiApiKey, setTestingGeminiApiKey] = useState(false);
  const [zhipuApiKeyStatus, setZhipuApiKeyStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [geminiApiKeyStatus, setGeminiApiKeyStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [showZhipuApiKey, setShowZhipuApiKey] = useState(false);
  const [showGeminiApiKey, setShowGeminiApiKey] = useState(false);
  const voiceFileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // 初始化selectedVoice
  useEffect(() => {
    if (project?.config?.voice) {
      setSelectedVoice(project.config.voice);
    }
  }, [project]);

  if (!project) return <div>{t.projectNotFound}</div>;

  const clientUrl = `${window.location.origin}${window.location.pathname}#/guide/${project.id}`;

  const tabs = [
    { id: 'info', name: t.basicInfo, icon: ICONS.LayoutDashboard },
    { id: 'steps', name: t.structuredSteps, icon: ICONS.Wrench },
    { id: 'knowledge', name: t.knowledgeBase, icon: ICONS.Database },
    { id: 'assistant', name: t.aiAssistant, icon: ICONS.Settings },
    { id: 'usage', name: t.billingUsage, icon: ICONS.CheckCircle2 },
    { id: 'qrcode', name: t.launchQr, icon: ICONS.QrCode },
  ] as const;

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsParsing(true);
    try {
      // 创建FormData对象
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      
      // 上传文件到服务器
      const response = await fetch('/api/upload/knowledge', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 转换上传的文件数据为知识库格式
          const knowledgeBaseItems = data.files.map((file: any) => ({
            id: file.id,
            type: file.type,
            filename: file.filename,
            summary: file.summary,
            date: file.date,
            // 根据文件类型添加相应的字段
            ...(file.type === 'image' && {
              url: `/uploads/${basename(file.path)}`,
              thumbnail: `/uploads/${basename(file.path)}`
            }),
            ...(file.type === 'video' && {
              url: `/uploads/${basename(file.path)}`,
              thumbnail: `/uploads/${basename(file.path)}`,
              duration: 0 // 实际应用中可以通过视频处理获取
            }),
            ...(file.type === 'text' && {
              text: `Content of ${file.filename}`, // 实际应用中可以通过文件解析获取
              embedding: []
            })
          }));
          
          // 更新知识库
          updateProject(project.id, { 
            knowledgeBase: [...(project.knowledgeBase || []), ...knowledgeBaseItems] 
          });
          
          alert(`成功上传 ${files.length} 个文件到知识库！`);
        } else {
          alert('文件上传失败：' + (data.error || '未知错误'));
        }
      } else {
        const errorData = await response.json();
        alert('文件上传失败：' + (errorData.error || '服务器错误'));
      }
    } catch (error) {
      console.error("File processing failed", error);
      alert('文件处理失败，请重试');
    } finally {
      setIsParsing(false);
      // 重置文件输入，允许选择相同的文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const simulateParsing = async () => {
    // 这个函数保留作为备用，或者在未来用于实际的文件解析
    handleFileSelect();
  };

  const addRestriction = () => {
    if (!newRestriction.trim()) return;
    const updatedBlacklist = [...(project.config.blacklist || []), newRestriction.trim()];
    updateProject(project.id, { config: { ...project.config, blacklist: updatedBlacklist } });
    setNewRestriction('');
  };

  const removeRestriction = (index: number) => {
    const updatedBlacklist = (project.config.blacklist || []).filter((_, i) => i !== index);
    updateProject(project.id, { config: { ...project.config, blacklist: updatedBlacklist } });
  };
  
  // 声音管理相关函数
  const loadVoices = async () => {
    setIsLoadingVoices(true);
    try {
      const voiceList = await getVoiceList();
      setVoices(voiceList);
    } catch (error) {
      console.error('Failed to load voices:', error);
    } finally {
      setIsLoadingVoices(false);
    }
  };
  
  useEffect(() => {
    // 当切换到assistant标签时加载音色列表
    if (activeTab === 'assistant') {
      loadVoices();
    }
  }, [activeTab]);
  
  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoice(voiceId);
    updateProject(project.id, { config: { ...project.config, voice: voiceId } });
  };
  
  const handleVoiceFileSelect = () => {
    voiceFileInputRef.current?.click();
  };
  
  // 音色名称映射表
  const voiceNameMap: Record<string, string> = {
    'jam1': '雅琳',
    'luodo': '梦琪',
    'kazi': '雨桐',
    'douji': '诗涵',
    'jam': '婉晴',
    'tongtong': '专业女声',
    'xiaochen': '子轩',
    'chuichui': '浩然',
    '测试1': '俊杰',
    '测试': '明宇',
    '窦老师音色': '泽阳',
    '教师音色4': '雨泽',
    '教师音色3': '文轩',
    '教师音色2': '浩宇',
    '教师音色1': '梓晨',
    '教师音色0': '铭轩',
    '标准女声': '专业女声',
    '标准男声': '稳重男声'
  };

  const handleVoiceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // 检查文件大小
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过10MB');
      return;
    }
    
    // 检查文件类型
    const allowedTypes = ['.mp3', '.wav'];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedTypes.includes(ext)) {
      alert('只允许上传MP3或WAV格式的文件');
      return;
    }
    
    // 创建FormData对象
    const formData = new FormData();
    formData.append('voice', file);
    
    try {
      // 上传文件到服务器
      const response = await fetch('/api/upload/voice', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setVoiceCloneForm(prev => ({ ...prev, fileId: data.fileId }));
          alert(`文件上传成功！文件名：${data.fileName}，大小：${(data.fileSize / 1024 / 1024).toFixed(2)}MB`);
        } else {
          alert('文件上传失败：' + (data.error || '未知错误'));
        }
      } else {
        const errorData = await response.json();
        alert('文件上传失败：' + (errorData.error || '服务器错误'));
      }
    } catch (error) {
      console.error('File upload error:', error);
      alert('文件上传失败，请重试');
    }
  };
  
  const handleCloneVoice = async () => {
    if (!voiceCloneForm.voiceName || !voiceCloneForm.inputText || !voiceCloneForm.fileId) {
      alert('请填写所有必填字段');
      return;
    }
    
    setIsCloningVoice(true);
    try {
      const result = await cloneVoice(
        voiceCloneForm.voiceName,
        voiceCloneForm.inputText,
        voiceCloneForm.fileId,
        voiceCloneForm.sampleText
      );
      
      if (result) {
        alert('音色复刻成功！');
        // 重新加载音色列表
        loadVoices();
        // 重置表单
        setVoiceCloneForm({
          voiceName: '',
          inputText: '欢迎使用我们的智能助手',
          fileId: '',
          sampleText: ''
        });
      } else {
        alert('音色复刻失败，请重试');
      }
    } catch (error) {
      console.error('Failed to clone voice:', error);
      alert('音色复刻失败，请重试');
    } finally {
      setIsCloningVoice(false);
    }
  };
  
  const handleDeleteVoice = async (voiceId: string) => {
    if (window.confirm('确定要删除这个音色吗？')) {
      try {
        const result = await deleteVoice(voiceId);
        if (result) {
          alert('音色删除成功！');
          // 重新加载音色列表
          loadVoices();
          // 如果删除的是当前选中的音色，切换到默认音色
          if (selectedVoice === voiceId) {
            setSelectedVoice('tongtong');
            updateProject(project.id, { config: { ...project.config, voice: 'tongtong' } });
          }
        } else {
          alert('音色删除失败，请重试');
        }
      } catch (error) {
        console.error('Failed to delete voice:', error);
        alert('音色删除失败，请重试');
      }
    }
  };
  
  // 播放示例音频
  const playVoiceSample = async (voiceId: string) => {
    try {
      // 停止当前正在播放的音频
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      setIsPlayingVoice(voiceId);
      const sampleText = '我是AI时代的售后助手！';
      
      const audioBlob = await textToSpeech(sampleText, voiceId);
      if (audioBlob) {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          setIsPlayingVoice(null);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.onerror = () => {
          setIsPlayingVoice(null);
          URL.revokeObjectURL(audioUrl);
          alert('播放失败，请重试');
        };
        
        await audio.play();
      } else {
        setIsPlayingVoice(null);
        alert('生成音频失败，请重试');
      }
    } catch (error) {
      console.error('Failed to play voice sample:', error);
      setIsPlayingVoice(null);
      alert('播放失败，请重试');
    }
  };

  const addStep = () => {
    const newStep: InstallationStep = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Step',
      description: 'Describe what the user should do.',
      targetState: 'What should the AI see to confirm completion?',
      checkpoints: []
    };
    updateProject(project.id, { steps: [...project.steps, newStep] });
  };

  const removeStep = (stepId: string) => {
    updateProject(project.id, { steps: project.steps.filter(s => s.id !== stepId) });
  };

  const updateStep = (stepId: string, updates: Partial<InstallationStep>) => {
    updateProject(project.id, {
      steps: project.steps.map(s => s.id === stepId ? { ...s, ...updates } : s)
    });
  };

  const usagePercent = Math.min(100, ((project.usage?.totalTokensUsed || 0) / (project.usage?.monthlyLimit || 1000000)) * 100);

  // 测试智谱AI API密钥
  const testZhipuApiKey = async (apiKey: string) => {
    if (!apiKey) {
      setZhipuApiKeyStatus({ success: false, message: '请输入API密钥' });
      return;
    }
    
    setTestingZhipuApiKey(true);
    setZhipuApiKeyStatus(null);
    
    try {
      const response = await fetch('/api/proxy/zhipu/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-zhipu-api-key': apiKey
        }
      });
      
      const data = await response.json();
      
      if (data.ok) {
        setZhipuApiKeyStatus({ success: true, message: 'API密钥有效，连接正常' });
      } else {
        setZhipuApiKeyStatus({ success: false, message: `API密钥无效: ${data.error || '未知错误'}` });
      }
    } catch (error) {
      console.error('Error testing Zhipu API key:', error);
      setZhipuApiKeyStatus({ success: false, message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}` });
    } finally {
      setTestingZhipuApiKey(false);
    }
  };
  
  // 测试Gemini API密钥
  const testGeminiApiKey = async (apiKey: string) => {
    if (!apiKey) {
      setGeminiApiKeyStatus({ success: false, message: '请输入API密钥' });
      return;
    }
    
    setTestingGeminiApiKey(true);
    setGeminiApiKeyStatus(null);
    
    try {
      const response = await fetch('/api/proxy/gemini/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': apiKey
        }
      });
      
      const data = await response.json();
      
      if (data.ok) {
        setGeminiApiKeyStatus({ success: true, message: 'API密钥有效，连接正常' });
      } else {
        setGeminiApiKeyStatus({ success: false, message: `API密钥无效: ${data.error || '未知错误'}` });
      }
    } catch (error) {
      console.error('Error testing Gemini API key:', error);
      setGeminiApiKeyStatus({ success: false, message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}` });
    } finally {
      setTestingGeminiApiKey(false);
    }
  };

  return (
    <Layout title={`${project.name}`}>
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-64 flex flex-col gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </aside>

        <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-xl p-8 min-h-[600px]">
          {activeTab === 'info' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-xl font-bold text-gray-900">{t.basicInfo}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">{t.productName}</label>
                  <input
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                    placeholder={t.productName}
                    value={project.name}
                    onChange={(e) => updateProject(project.id, { name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">{t.productDesc}</label>
                  <textarea
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm leading-relaxed"
                    placeholder={t.productDesc}
                    rows={4}
                    value={project.description}
                    onChange={(e) => updateProject(project.id, { description: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'steps' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">{t.structuredSteps}</h3>
                <button onClick={addStep} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors">
                  <ICONS.Plus className="w-4 h-4" /> {t.add}
                </button>
              </div>
              <div className="space-y-4">
                {project.steps.length === 0 && <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-gray-400 font-medium">{t.noSteps}</div>}
                {project.steps.map((step, index) => (
                  <div key={step.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 group relative">
                    <button onClick={() => removeStep(step.id)} className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <ICONS.LogOut className="w-4 h-4 rotate-45" />
                    </button>
                    <div className="flex gap-4">
                      <div className="bg-white w-8 h-8 rounded-lg flex items-center justify-center font-black text-blue-600 shadow-sm border border-gray-100 shrink-0">{index + 1}</div>
                      <div className="flex-1 space-y-4">
                        <input className="w-full bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none font-bold text-lg pb-1" value={step.name} onChange={(e) => updateStep(step.id, { name: e.target.value })} />
                        <textarea className="w-full bg-transparent text-sm text-gray-500 outline-none resize-none" value={step.description} onChange={(e) => updateStep(step.id, { description: e.target.value })} rows={2} />
                        <div className="pt-2 border-t border-gray-200/50">
                          <label className="text-[10px] font-black text-blue-600 uppercase mb-1 block tracking-widest">{t.targetStateLabel}</label>
                          <input className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none" value={step.targetState} onChange={(e) => updateStep(step.id, { targetState: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="space-y-8">
              <h3 className="text-xl font-bold text-gray-900">{t.knowledgeBase}</h3>
              
              {/* 知识库文件列表 */}
              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.mp4,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h4 className="font-bold text-gray-700">{t.knowledgeBase}</h4>
                    <p className="text-xs text-gray-400">{project.knowledgeBase?.length || 0} 个文档</p>
                  </div>
                  <button 
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-all"
                    onClick={handleFileSelect}
                  >
                    {t.selectFilesBtn}
                  </button>
                </div>
                
                <div className="flex gap-4 mb-6">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2 text-xs font-bold text-gray-500"><ICONS.Smartphone className="w-4 h-4" /> {t.docTxt}</div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2 text-xs font-bold text-gray-500"><ICONS.Wrench className="w-4 h-4" /> {t.docPdf}</div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2 text-xs font-bold text-gray-500"><ICONS.Camera className="w-4 h-4" /> {t.docVideo}</div>
                </div>
                
                <p className="text-gray-400 max-w-md mx-auto mb-6 font-medium">
                  {t.knowledgeBaseDesc}
                </p>
                
                {/* 模拟知识库文件列表 */}
                <div className="space-y-3">
                  {(project.knowledgeBase || []).map((item, index) => (
                    <div key={index} className="flex items-start justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-start gap-3">
                        {item.thumbnail ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={item.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-gray-100 flex-shrink-0">
                            {item.type === 'text' && <ICONS.Database className="w-6 h-6 text-gray-600" />}
                            {item.type === 'image' && <ICONS.Camera className="w-6 h-6 text-gray-600" />}
                            {item.type === 'video' && <ICONS.Camera className="w-6 h-6 text-gray-600" />}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-bold text-sm text-gray-900">
                            {item.filename || (item.type === 'text' && 'Product Manual') || (item.type === 'image' && 'Product Image') || (item.type === 'video' && 'Installation Video')}
                          </div>
                          <div className="text-xs text-gray-400 mb-2">
                            {item.type === 'text' && 'Text Document'}
                            {item.type === 'image' && 'Image File'}
                            {item.type === 'video' && `${item.duration || 0}s Video`}
                            {item.date && ` • ${item.date}`}
                          </div>
                          {item.summary && (
                            <div className="text-xs text-gray-600 line-clamp-2 mb-2">
                              {item.summary}
                            </div>
                          )}
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-red-500 transition-colors mt-1">
                        <ICONS.LogOut className="w-4 h-4 rotate-45" />
                      </button>
                    </div>
                  ))}
                  
                  {(project.knowledgeBase || []).length === 0 && (
                    <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 font-medium">
                      {t.noSteps}
                    </div>
                  )}
                </div>
              </div>
              
              {/* 解析文件生成步骤 */}
              {isParsing && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center">
                  <div className="bg-white rounded-3xl p-8 max-w-md mx-auto text-center">
                    <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
                    <p className="font-bold text-gray-900 mb-2">{t.parsingFiles}</p>
                    <p className="text-gray-500 text-sm">{t.parseNotice}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'assistant' && (
            <div className="space-y-8 max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">{t.systemPrompt}</label>
                    <textarea rows={4} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium leading-relaxed" value={project.config.systemPrompt} onChange={(e) => updateProject(project.id, { config: { ...project.config, systemPrompt: e.target.value } })} />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">{t.assistantName}</label>
                    <input className="w-full px-4 py-3 rounded-xl bg-gray-50 font-bold outline-none" value={project.config.assistantName} onChange={(e) => updateProject(project.id, { config: { ...project.config, assistantName: e.target.value } })} />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">问候语</label>
                    <input className="w-full px-4 py-3 rounded-xl bg-gray-50 font-bold outline-none" value={project.config.greeting || '亲爱的顾客你好，我是清泉助手，您的饮用水专家，有任何产品疑问我都可以帮您解答哦！'} onChange={(e) => updateProject(project.id, { config: { ...project.config, greeting: e.target.value } })} />
                    <p className="text-xs text-gray-400 mt-2">用户连接后会自动发送一次问候语，用于欢迎用户</p>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">品牌Logo</label>
                    <div className="space-y-4">
                      {project.config.brandLogo ? (
                        <div className="relative">
                          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center gap-4">
                            <img src={project.config.brandLogo} alt="Brand Logo" className="w-16 h-16 object-contain" />
                            <div className="flex-1">
                              <div className="font-bold text-sm">已上传Logo</div>
                              <div className="text-xs text-gray-400">点击下方按钮更换</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => updateProject(project.id, { config: { ...project.config, brandLogo: undefined } })} 
                            className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <ICONS.Trash className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer" onClick={() => document.getElementById('logo-upload')?.click()}>
                          <ICONS.Camera className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                          <div className="font-medium text-gray-600 mb-1">上传品牌Logo</div>
                          <div className="text-xs text-gray-400">支持 JPG, PNG, SVG 格式</div>
                          <input 
                            id="logo-upload" 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const base64 = event.target?.result as string;
                                  updateProject(project.id, { config: { ...project.config, brandLogo: base64 } });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">{t.forbiddenBehaviors}</label>
                    <div className="space-y-2 mb-4">
                      {(project.config.blacklist || []).map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-100">
                          <span>{item}</span>
                          <button onClick={() => removeRestriction(i)}><ICONS.Trash className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input className="flex-1 px-4 py-2 bg-gray-50 rounded-xl text-xs outline-none" placeholder={t.addRestriction} value={newRestriction} onChange={(e) => setNewRestriction(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addRestriction()} />
                      <button onClick={addRestriction} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold">{t.add}</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">{t.llmProvider}</label>
                      <div className="space-y-2">
                        <button onClick={() => updateProject(project.id, { config: { ...project.config, provider: LLMProvider.GEMINI } })} className={`w-full px-5 py-4 rounded-2xl border-2 text-left transition-all ${project.config.provider === LLMProvider.GEMINI ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-gray-50'}`}>
                          <div className="font-bold text-sm">🌍 {t.providerGemini}</div>
                        </button>
                        <button onClick={() => updateProject(project.id, { config: { ...project.config, provider: LLMProvider.ZHIPU } })} className={`w-full px-5 py-4 rounded-2xl border-2 text-left transition-all ${project.config.provider === LLMProvider.ZHIPU ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-gray-50'}`}>
                          <div className="font-bold text-sm">🇨🇳 {t.providerZhipu}</div>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">API密钥配置</label>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">智谱AI API密钥</label>
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <input 
                              type={showZhipuApiKey ? "text" : "password"} 
                              value={project.config.zhipuApiKey || ''} 
                              onChange={(e) => updateProject(project.id, { config: { ...project.config, zhipuApiKey: e.target.value } })} 
                              placeholder="请输入智谱AI API密钥" 
                              className="w-full px-4 py-3 pr-10 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                            <button 
                              onClick={() => setShowZhipuApiKey(!showZhipuApiKey)} 
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {showZhipuApiKey ? (
                                <ICONS.EyeOff className="w-4 h-4" />
                              ) : (
                                <ICONS.Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <button 
                            onClick={() => testZhipuApiKey(project.config.zhipuApiKey || '')} 
                            disabled={testingZhipuApiKey}
                            className="px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {testingZhipuApiKey ? (
                              <>
                                <ICONS.Clock className="w-4 h-4 animate-spin inline-block mr-1" />
                                测试中
                              </>
                            ) : (
                              '测试'
                            )}
                          </button>
                        </div>
                        {zhipuApiKeyStatus && (
                          <div className={`text-xs mt-1 flex items-center ${zhipuApiKeyStatus.success ? 'text-green-600' : 'text-red-600'}`}>
                            {zhipuApiKeyStatus.success ? (
                              <ICONS.CheckCircle2 className="w-3 h-3 mr-1" />
                            ) : (
                              <ICONS.AlertCircle className="w-3 h-3 mr-1" />
                            )}
                            {zhipuApiKeyStatus.message}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">用于语音合成、音色克隆等功能</p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Gemini API密钥</label>
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <input 
                              type={showGeminiApiKey ? "text" : "password"} 
                              value={project.config.geminiApiKey || ''} 
                              onChange={(e) => updateProject(project.id, { config: { ...project.config, geminiApiKey: e.target.value } })} 
                              placeholder="请输入Gemini API密钥" 
                              className="w-full px-4 py-3 pr-10 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                            <button 
                              onClick={() => setShowGeminiApiKey(!showGeminiApiKey)} 
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {showGeminiApiKey ? (
                                <ICONS.EyeOff className="w-4 h-4" />
                              ) : (
                                <ICONS.Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <button 
                            onClick={() => testGeminiApiKey(project.config.geminiApiKey || '')} 
                            disabled={testingGeminiApiKey}
                            className="px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {testingGeminiApiKey ? (
                              <>
                                <ICONS.Clock className="w-4 h-4 animate-spin inline-block mr-1" />
                                测试中
                              </>
                            ) : (
                              '测试'
                            )}
                          </button>
                        </div>
                        {geminiApiKeyStatus && (
                          <div className={`text-xs mt-1 flex items-center ${geminiApiKeyStatus.success ? 'text-green-600' : 'text-red-600'}`}>
                            {geminiApiKeyStatus.success ? (
                              <ICONS.CheckCircle2 className="w-3 h-3 mr-1" />
                            ) : (
                              <ICONS.AlertCircle className="w-3 h-3 mr-1" />
                            )}
                            {geminiApiKeyStatus.message}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">用于图像分析等功能</p>
                      </div>
                    </div>
                  </div>

                </div>
                <div className="space-y-6">
                  {/* 声音管理模块 */}
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">语音音色</label>
                    
                    {/* 内置音色选择 */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className={`rounded-xl border-2 ${selectedVoice === 'tongtong' ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-50'}`}>
                        <button 
                          onClick={() => handleVoiceSelect('tongtong')} 
                          className="w-full py-3 font-bold"
                        >
                          专业女声
                        </button>
                        <button 
                          onClick={() => playVoiceSample('tongtong')} 
                          className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-center gap-1"
                        >
                          {isPlayingVoice === 'tongtong' ? (
                            <ICONS.Clock className="w-4 h-4 animate-spin" />
                          ) : (
                            <ICONS.Volume2 className="w-4 h-4" />
                          )}
                          播放示例
                        </button>
                      </div>
                      <div className={`rounded-xl border-2 ${selectedVoice === 'zhichao' ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-50'}`}>
                        <button 
                          onClick={() => handleVoiceSelect('zhichao')} 
                          className="w-full py-3 font-bold"
                        >
                          稳重男声
                        </button>
                        <button 
                          onClick={() => playVoiceSample('zhichao')} 
                          className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-center gap-1"
                        >
                          {isPlayingVoice === 'zhichao' ? (
                            <ICONS.Clock className="w-4 h-4 animate-spin" />
                          ) : (
                            <ICONS.Volume2 className="w-4 h-4" />
                          )}
                          播放示例
                        </button>
                      </div>
                    </div>
                    
                    {/* 自定义音色列表 */}
                    <div className="mb-6">
                      <h4 className="text-sm font-bold text-gray-700 mb-3">自定义音色</h4>
                      {isLoadingVoices ? (
                        <div className="text-center py-4 text-gray-500">加载中...</div>
                      ) : voices.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">暂无自定义音色</div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {voices.map((voice, index) => (
                            <div 
                              key={index} 
                              className={`p-2 rounded-lg border-2 transition-all text-center min-h-[60px] flex flex-col ${selectedVoice === voice.voice ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-gray-50 bg-gray-50'}`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] text-gray-400 font-bold">{index + 1}</span>
                                <div className="flex gap-1">
                                  <button 
                                    onClick={() => playVoiceSample(voice.voice)} 
                                    className="p-0.5 text-blue-600 hover:text-blue-800 transition-colors"
                                  >
                                    {isPlayingVoice === voice.voice ? (
                                      <ICONS.Clock className="w-2.5 h-2.5 animate-spin" />
                                    ) : (
                                      <ICONS.Volume2 className="w-2.5 h-2.5" />
                                    )}
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteVoice(voice.voice)} 
                                    className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <ICONS.Trash className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleVoiceSelect(voice.voice)} 
                                className={`block w-full text-[9px] font-bold mb-1 truncate ${selectedVoice === voice.voice ? 'text-blue-700' : 'text-gray-700'}`}
                              >
                                {voiceNameMap[voice.voice_name || voice.voice] || voice.voice_name || voice.voice}
                              </button>
                              <div className="mt-auto">
                                {selectedVoice === voice.voice && (
                                  <div className="text-[8px] text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded-full inline-block mx-auto">
                                    系统
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* 音色复刻表单 */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <h4 className="text-sm font-bold text-gray-700 mb-3">音色复刻</h4>
                      <input 
                        type="file" 
                        ref={voiceFileInputRef} 
                        className="hidden" 
                        onChange={handleVoiceFileChange}
                        accept=".mp3,.wav"
                      />
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">音色名称</label>
                          <input 
                            type="text" 
                            value={voiceCloneForm.voiceName} 
                            onChange={(e) => setVoiceCloneForm(prev => ({ ...prev, voiceName: e.target.value }))}
                            placeholder="请输入音色名称"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">输入文本</label>
                          <input 
                            type="text" 
                            value={voiceCloneForm.inputText} 
                            onChange={(e) => setVoiceCloneForm(prev => ({ ...prev, inputText: e.target.value }))}
                            placeholder="请输入复刻文本"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">声音样本</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={voiceCloneForm.fileId} 
                              readOnly 
                              placeholder="请上传声音文件"
                              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button 
                              onClick={handleVoiceFileSelect}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                            >
                              上传
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">示例文本（可选）</label>
                          <input 
                            type="text" 
                            value={voiceCloneForm.sampleText} 
                            onChange={(e) => setVoiceCloneForm(prev => ({ ...prev, sampleText: e.target.value }))}
                            placeholder="请输入示例文本"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <button 
                          onClick={handleCloneVoice}
                          disabled={isCloningVoice}
                          className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {isCloningVoice ? '复刻中...' : '开始复刻'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="space-y-8">
              <h3 className="text-xl font-bold">{t.billingUsage}</h3>
              <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">{t.tokenUsage}</label>
                    <div className="text-4xl font-black text-gray-900 mt-2">{(project.usage?.totalTokensUsed || 0).toLocaleString()} <span className="text-base font-bold text-gray-400">/ {(project.usage?.monthlyLimit || 1000000).toLocaleString()} {t.tokens}</span></div>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full font-black text-[10px] uppercase ${usagePercent > 90 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{usagePercent.toFixed(1)}% Consumed</div>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${usagePercent > 90 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${usagePercent}%` }} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qrcode' && (
            <div className="flex flex-col items-center justify-center h-full py-10">
              <div className="p-10 bg-white rounded-[40px] shadow-2xl shadow-blue-100 border border-gray-100 mb-10 transform hover:scale-105 transition-transform"><QRCodeSVG value={clientUrl} size={240} /></div>
              <div className="text-center space-y-4">
                <h4 className="font-black text-gray-900 text-xl">{t.scanQrTitle}</h4>
                <p className="text-gray-400 text-sm max-w-xs mx-auto">{t.scanQrDesc}</p>
                <div className="flex gap-4 justify-center mt-6">
                  <button onClick={() => window.open(clientUrl, '_blank')} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl">{t.launchPreview}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProjectConfig;
