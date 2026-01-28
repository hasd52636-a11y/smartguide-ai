
export enum VoiceGender {
  MALE = 'male',
  FEMALE = 'female'
}

export enum Language {
  EN = 'en',
  ZH = 'zh'
}

export enum LLMProvider {
  GEMINI = 'gemini',
  ZHIPU = 'zhipu'
}

export enum TTSEngine {
  GEMINI = 'gemini',
  SYSTEM = 'system' // 系统高保真真人语音 (如微软晓晓/云希)
}

export interface InstallationStep {
  id: string;
  name: string;
  description: string;
  targetState: string;
  checkpoints: string[];
}

export interface UsageStats {
  totalTokensUsed: number;
  monthlyLimit: number;
  billingCycleStart: string;
  overageRate: number;
}

export interface ProjectConfig {
  assistantName: string;
  systemPrompt: string;
  voiceGender: VoiceGender;
  ttsEngine: TTSEngine; // 新增：语音引擎选择
  brandLogo?: string;
  blacklist: string[];
  provider: LLMProvider;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  status: 'active' | 'inactive';
  config: ProjectConfig;
  steps: InstallationStep[];
  knowledgeBase: { text: string; embedding?: number[] }[];
  usage: UsageStats;
}

export interface AuthState {
  phone: string | null;
  isLoggedIn: boolean;
  language: Language;
}
