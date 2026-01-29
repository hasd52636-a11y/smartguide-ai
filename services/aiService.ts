
import { Language, LLMProvider } from '../types.ts';

export interface AIResponse {
  isComplete: boolean;
  confidence: number;
  feedback: string;
  photoRequest?: {
    what: string;
    where: string;
    why: string;
  };
  visualHints: Array<{
    type: 'circle' | 'arrow';
    point: [number, number];
    label?: string;
  }>;
  tokensUsed: number;
}

/**
 * 文字转语音 (使用浏览器内置 TTS)
 */
export const generateSpeech = async (text: string) => {
  // 使用浏览器内置 TTS 或返回 null 触发系统 fallback
  return null;
};

export const generateEmbedding = async (
  text: string,
  provider: LLMProvider = LLMProvider.ZHIPU
): Promise<number[] | null> => {
  // 只使用智谱 AI 进行嵌入生成
  return await import('./zhipuService.ts').then(m => m.generateEmbedding(text));
};

export const analyzeInstallationState = async (
  imageData: string,
  currentStep: any,
  systemPrompt: string,
  language: Language = Language.EN,
  provider: LLMProvider = LLMProvider.ZHIPU
): Promise<AIResponse> => {
  // 只使用智谱 AI 进行安装状态分析
  return await import('./zhipuService.ts').then(m => m.analyzeInstallationState(imageData, currentStep, systemPrompt, language));
};

export const chatWithAssistant = async (
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  provider: LLMProvider = LLMProvider.ZHIPU
): Promise<string> => {
  return await import('./zhipuService.ts').then(m => m.chatWithAssistant(messages, systemPrompt));
};

const fallback = (lang: Language): AIResponse => ({
  isComplete: false,
  confidence: 0,
  feedback: lang === Language.ZH ? "分析超时，请调整角度重试。" : "Analysis timeout, please retry.",
  visualHints: [],
  tokensUsed: 0
});
