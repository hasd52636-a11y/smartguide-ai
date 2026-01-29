
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout.tsx';
import { ICONS } from '../../constants.tsx';
import { useStore } from '../../store.ts';
import { VoiceGender, LLMProvider, InstallationStep, TTSEngine } from '../../types.ts';
import { QRCodeSVG } from 'qrcode.react';

const ProjectConfig: React.FC = () => {
  const { id } = useParams();
  const { projects, updateProject, t } = useStore();
  const project = projects.find(p => p.id === id);

  const [activeTab, setActiveTab] = useState<'info' | 'steps' | 'knowledge' | 'assistant' | 'qrcode' | 'usage'>('info');
  const [isParsing, setIsParsing] = useState(false);
  const [newRestriction, setNewRestriction] = useState('');

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

  const simulateParsing = async () => {
    setIsParsing(true);
    // Real implementation: Parse manual content and generate embeddings
    // For MVP demonstration, we will generate embeddings for a sample text
    try {
      // In a real app, this would iterate over project.knowledgeBase
      const sampleText = "Power Connection: Plug in the Type-C cable. Ensure it clicks.";
      const embedding = await import('../../services/aiService.ts').then(m => m.generateEmbedding(sampleText, project.config.provider));

      // Store the embedding (Mocking the storage verification)
      if (embedding) {
        console.log("Generated Embedding for " + project.config.provider, embedding.slice(0, 5) + "...");
      }

      // 模拟添加知识库内容，支持多种格式
      const mockKnowledgeBase = [
        {
          type: 'text' as const,
          text: sampleText,
          embedding: embedding
        },
        {
          type: 'image' as const,
          url: 'https://via.placeholder.com/400x300?text=Product+Image',
          thumbnail: 'https://via.placeholder.com/100x100?text=Thumbnail'
        },
        {
          type: 'video' as const,
          url: 'https://via.placeholder.com/640x360?text=Installation+Video',
          thumbnail: 'https://via.placeholder.com/100x100?text=Video+Thumbnail',
          duration: 120
        }
      ];

      // 只更新知识库，不自动生成步骤
      updateProject(project.id, { knowledgeBase: mockKnowledgeBase });
    } catch (e) {
      console.error("Parsing failed", e);
    } finally {
      setIsParsing(false);
      // 保持在知识库页面，不自动跳转到步骤页面
    }
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
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-bold text-gray-700">{t.knowledgeBase}</h4>
                  <button 
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-all"
                    onClick={simulateParsing}
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
                  知识库用于存储产品资料，包括说明书、图片和视频等。
                  执行标准流程时，AI 会从知识库中读取相关资料进行细节判断。
                  步骤配置在"步骤"标签页中进行，由商家手动制定标准流程。
                </p>
                
                {/* 模拟知识库文件列表 */}
                <div className="space-y-3">
                  {project.knowledgeBase.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100">
                          {item.type === 'text' && <ICONS.Database className="w-5 h-5 text-gray-600" />}
                          {item.type === 'image' && <ICONS.Camera className="w-5 h-5 text-gray-600" />}
                          {item.type === 'video' && <ICONS.Camera className="w-5 h-5 text-gray-600" />}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-gray-900">
                            {item.type === 'text' && 'Product Manual'}
                            {item.type === 'image' && 'Product Image'}
                            {item.type === 'video' && 'Installation Video'}
                          </div>
                          <div className="text-xs text-gray-400">
                            {item.type === 'text' && 'Text Document'}
                            {item.type === 'image' && 'Image File'}
                            {item.type === 'video' && `${item.duration || 0}s Video`}
                          </div>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-red-500 transition-colors">
                        <ICONS.LogOut className="w-4 h-4 rotate-45" />
                      </button>
                    </div>
                  ))}
                  
                  {project.knowledgeBase.length === 0 && (
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
                    <label className="block text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">{t.assistantName}</label>
                    <input className="w-full px-4 py-3 rounded-xl bg-gray-50 font-bold outline-none" value={project.config.assistantName} onChange={(e) => updateProject(project.id, { config: { ...project.config, assistantName: e.target.value } })} />
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
                    <label className="block text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">{t.voiceGender}</label>
                    <div className="flex gap-2">
                      {[VoiceGender.FEMALE, VoiceGender.MALE].map(gender => (
                        <button key={gender} onClick={() => updateProject(project.id, { config: { ...project.config, voiceGender: gender } })} className={`flex-1 py-3 rounded-xl border-2 font-bold text-xs ${project.config.voiceGender === gender ? 'border-blue-600 bg-blue-50' : 'border-gray-50'}`}>{gender === VoiceGender.FEMALE ? t.female : t.male}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">{t.systemPrompt}</label>
                    <textarea rows={6} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium leading-relaxed" value={project.config.systemPrompt} onChange={(e) => updateProject(project.id, { config: { ...project.config, systemPrompt: e.target.value } })} />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-400 mb-3 tracking-widest">{t.forbiddenBehaviors}</label>
                    <div className="space-y-2 mb-4">
                      {(project.config.blacklist || []).map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-100">
                          <span>{item}</span>
                          <button onClick={() => removeRestriction(i)}><ICONS.LogOut className="w-3 h-3 rotate-45" /></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input className="flex-1 px-4 py-2 bg-gray-50 rounded-xl text-xs outline-none" placeholder={t.addRestriction} value={newRestriction} onChange={(e) => setNewRestriction(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addRestriction()} />
                      <button onClick={addRestriction} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold">{t.add}</button>
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
