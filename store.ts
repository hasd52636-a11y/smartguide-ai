
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project, AuthState, Language } from './types.ts';
import { DEFAULT_PROJECTS } from './constants.tsx';
import { translations } from './translations.ts';

const STORAGE_KEY = 'smartguide_projects';
const AUTH_KEY = 'smartguide_auth';

interface StoreContextType {
  projects: Project[];
  auth: AuthState;
  login: (identity?: string) => void;
  logout: () => void;
  setLanguage: (language: Language) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  trackUsage: (projectId: string, tokens: number) => void;
  t: any;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);

  // 使用默认项目数据，确保前端能够独立运行
  useEffect(() => {
    // 直接使用默认项目数据，不依赖后端 API
    setProjects(DEFAULT_PROJECTS);
  }, []);

  const saveToBackend = (project: Project) => {
    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project)
    }).catch(e => console.error("Save failed", e));
  };


  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem(AUTH_KEY);
    return saved ? JSON.parse(saved) : { phone: null, isLoggedIn: false, language: Language.ZH };
  });

  useEffect(() => {
    // Debounce save or save immediately? For MVP, we save immediately on change.
    // However, since 'projects' is an array, we'd better update individually in real app.
    // For this prototype, we won't auto-save the whole array on every change loop to avoid spamming.
    // Instead, the modifier functions (add/update) handles the save.
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  }, [auth]);

  const login = (identity: string = 'Admin') => {
    setAuth(prev => ({ ...prev, phone: identity, isLoggedIn: true }));
  };

  const logout = () => {
    setAuth(prev => ({ ...prev, phone: null, isLoggedIn: false }));
  };

  const setLanguage = (language: Language) => {
    setAuth(prev => ({ ...prev, language }));
  };

  const addProject = (project: Project) => {
    setProjects(prev => [...prev, project]);
    saveToBackend(project);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      const target = next.find(p => p.id === id);
      if (target) saveToBackend(target);
      return next;
    });
  };

  const trackUsage = (projectId: string, tokens: number) => {
    setProjects(prev => {
      const next = prev.map(p =>
        p.id === projectId
          ? { ...p, usage: { ...p.usage, totalTokensUsed: p.usage.totalTokensUsed + tokens } }
          : p
      );
      const target = next.find(p => p.id === projectId);
      if (target) saveToBackend(target); // Async usage tracking
      return next;
    });
  };

  const t = translations[auth.language];

  const value = {
    projects,
    auth,
    login,
    logout,
    setLanguage,
    addProject,
    updateProject,
    trackUsage,
    t
  };

  return React.createElement(StoreContext.Provider, { value }, children);
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
