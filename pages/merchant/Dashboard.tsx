
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout.tsx';
import { ICONS } from '../../constants.tsx';
import { useStore } from '../../store.ts';
// Added TTSEngine to the imported types
import { Project, VoiceGender, LLMProvider, TTSEngine } from '../../types.ts';

const Dashboard: React.FC = () => {
  const { projects, addProject, updateProject, t } = useStore();
  const navigate = useNavigate();

  const handleStatusChange = (projectId: string, newStatus: 'active' | 'inactive') => {
    updateProject(projectId, { status: newStatus });
  };

  const createNewProject = () => {
    const id = Math.random().toString(36).substr(2, 9);
    // Fix: Added missing 'ttsEngine' property to comply with the ProjectConfig interface
    const newProject: Project = {
      id,
      name: t.createNewProject,
      description: '',
      createdAt: new Date().toISOString().split('T')[0],
      status: 'inactive',
      config: {
        assistantName: 'AI Guide',
        systemPrompt: 'You are an helpful assistant.',
        voiceGender: VoiceGender.FEMALE,
        // Defaulting to Gemini TTS engine
        ttsEngine: TTSEngine.GEMINI,
        blacklist: [],
        provider: LLMProvider.GEMINI
      },
      steps: [],
      knowledgeBase: [],
      usage: {
        totalTokensUsed: 0,
        monthlyLimit: 1000000,
        billingCycleStart: new Date().toISOString(),
        overageRate: 0.05
      }
    };
    addProject(newProject);
    navigate(`/project/${id}`);
  };

  return (
    <Layout title={t.dashboardTitle}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button 
          onClick={createNewProject}
          className="group relative flex flex-col items-center justify-center h-52 border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
        >
          <div className="bg-gray-100 group-hover:bg-blue-100 p-3 rounded-full mb-3 transition-colors">
            <ICONS.Plus className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
          </div>
          <span className="text-gray-500 group-hover:text-blue-600 font-medium">{t.createNewProject}</span>
        </button>

        {projects.map(project => (
          <div 
            key={project.id}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col"
          >
            <div className="p-5 flex-1">
              <div className="flex items-start justify-between mb-3">
                <div className="bg-blue-50 p-2.5 rounded-xl" onClick={() => navigate(`/project/${project.id}`)}>
                  <ICONS.Smartphone className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex items-center">
                  <span className={`text-xs font-semibold mr-2 ${
                    project.status === 'active' ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    {project.status === 'active' ? t.active : t.inactive}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={project.status === 'active'}
                      onChange={(e) => handleStatusChange(project.id, e.target.checked ? 'active' : 'inactive')}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
              <div onClick={() => navigate(`/project/${project.id}`)} className="cursor-pointer">
                <h3 className="font-bold text-gray-900 text-lg mb-1">{project.name}</h3>
                <p className="text-gray-500 text-sm line-clamp-2">{project.description}</p>
              </div>
            </div>
            
            <div className="border-t border-gray-100 p-5 flex items-center justify-between" onClick={() => navigate(`/project/${project.id}`)}>
              <div className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <ICONS.Database className="w-4 h-4" />
                {project.steps.length} {t.stepsConfigured}
              </div>
              <ICONS.ArrowRight className="w-4 h-4 text-gray-300 cursor-pointer" />
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default Dashboard;
