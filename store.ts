
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
  // Initialize projects from LocalStorage or use defaults
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PROJECTS;
    } catch (e) {
      console.error("Failed to load projects from localStorage", e);
      return DEFAULT_PROJECTS;
    }
  });

  // Save to LocalStorage whenever projects change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem(AUTH_KEY);
    return saved ? JSON.parse(saved) : { phone: null, isLoggedIn: false, language: Language.ZH };
  });

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
    setProjects(prev => [project, ...prev]);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...updates } : p);
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
  try {
    const context = useContext(StoreContext);
    if (context === undefined) {
      throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
  } catch (error) {
    console.error("useStore error:", error);
    // 返回默认值，确保应用不会崩溃
    return {
      projects: DEFAULT_PROJECTS,
      auth: { phone: null, isLoggedIn: false, language: Language.ZH },
      login: () => {},
      logout: () => {},
      setLanguage: () => {},
      addProject: () => {},
      updateProject: () => {},
      trackUsage: () => {},
      t: translations[Language.ZH]
    };
  }
};
