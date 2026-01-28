
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Language, LLMProvider } from '../types.ts';

// Platform-level API Keys
const geminiAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
 * 文字转语音 (使用 Gemini TTS)
 */
export const generateSpeech = async (text: string) => {
  try {
    const response = await geminiAI.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) {
    console.error("TTS Error", e);
    return null;
  }
};

export const generateEmbedding = async (
  text: string,
  provider: LLMProvider = LLMProvider.GEMINI
): Promise<number[] | null> => {
  if (provider === LLMProvider.GEMINI) {
    try {
      const result = await geminiAI.models.embedContent({
        model: "text-embedding-004",
        content: { parts: [{ text }] }
      });
      return result.embedding.values;
    } catch (e) {
      console.error("Gemini Embedding Error", e);
      return null;
    }
  } else if (provider === LLMProvider.ZHIPU) {
    return await import('./zhipuService.ts').then(m => m.generateEmbedding(text));
  }
  return null;
};

export const analyzeInstallationState = async (
  imageData: string,
  currentStep: any,
  systemPrompt: string,
  language: Language = Language.EN,
  provider: LLMProvider = LLMProvider.GEMINI
): Promise<AIResponse> => {
  const prompt = `
    Role: Professional Industrial Quality Inspector.
    Verify if the image matches the "TARGET STATE" of the installation step.
    
    Step: ${currentStep.name}
    Description: ${currentStep.description}
    Target State (Strict Criteria): ${currentStep.targetState}
    
    If verification fails or confidence is low, strictly explain WHAT to shoot, WHERE to point, and WHY.
    Coordinates x,y must be 0-1000.
  `;

  if (provider === LLMProvider.GEMINI) {
    try {
      const response = await geminiAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: imageData.split(',')[1] } }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isComplete: { type: Type.BOOLEAN },
              confidence: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              photoRequest: {
                type: Type.OBJECT,
                properties: {
                  what: { type: Type.STRING },
                  where: { type: Type.STRING },
                  why: { type: Type.STRING }
                }
              },
              visualHints: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    point: {
                      type: Type.ARRAY,
                      items: { type: Type.NUMBER }
                    },
                    label: { type: Type.STRING }
                  }
                }
              }
            },
            required: ["isComplete", "confidence", "feedback"]
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      return {
        ...parsed,
        tokensUsed: response.usageMetadata?.totalTokenCount || 0
      };
    } catch (e) { return fallback(language); }
  } else if (provider === LLMProvider.ZHIPU) {
    return await import('./zhipuService.ts').then(m => m.analyzeInstallationState(imageData, currentStep, systemPrompt, language));
  } else {
    // Other implementations
    return fallback(language);
  }
};

const fallback = (lang: Language): AIResponse => ({
  isComplete: false,
  confidence: 0,
  feedback: lang === Language.ZH ? "分析超时，请调整角度重试。" : "Analysis timeout, please retry.",
  visualHints: [],
  tokensUsed: 0
});
