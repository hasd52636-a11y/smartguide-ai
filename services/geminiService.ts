
import { GoogleGenAI, Type } from "@google/genai";
import { Language } from '../types.ts';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeInstallationState = async (
  imageData: string,
  currentStep: any,
  systemPrompt: string,
  language: Language = Language.EN
) => {
  const model = 'gemini-3-flash-preview';
  
  const prompt = `
    Role: Professional Industrial Quality Inspector & Installation Assistant.
    Context: The user is installing a product following a specific step.
    
    Current Step Name: ${currentStep.name}
    Current Step Description: ${currentStep.description}
    TARGET STATE TO VERIFY: ${currentStep.targetState}
    
    Task:
    Analyze the provided image to see if it matches the "TARGET STATE".
    
    Output Requirements (JSON only):
    1. "isComplete": boolean (True only if the target state is clearly achieved).
    2. "confidence": number (0-100).
    3. "feedback": string (If incomplete, give 1-2 specific technical tips. If complete, give positive reinforcement).
    4. "photoRequest": string (If confidence is low or view is blocked, describe exactly WHAT to photograph next, WHERE to point the camera, and WHY).
    5. "isSafetyIssue": boolean (True if you see incorrect tool usage or hazardous conditions).

    Rules:
    - Language: ${language === Language.ZH ? 'Chinese (Simplified)' : 'English'}.
    - Instructions: Only use knowledge from: ${systemPrompt}.
    - Be strict. If unsure, ask for a closer/clearer photo.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
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
            photoRequest: { type: Type.STRING },
            isSafetyIssue: { type: Type.BOOLEAN }
          },
          required: ["isComplete", "confidence", "feedback"]
        }
      }
    });

    const jsonStr = response.text?.trim() || '{}';
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return { 
      isComplete: false, 
      confidence: 0, 
      feedback: language === Language.ZH ? "分析失败，请确保网络通畅并重新拍摄。" : "Analysis failed. Please ensure connection and try again." 
    };
  }
};

export const chatWithAssistant = async (
  query: string,
  context: string,
  systemPrompt: string,
  language: Language = Language.EN
) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Context Knowledge: ${context}\n\nUser Question: ${query}`,
      config: {
        systemInstruction: `${systemPrompt}\n\nYou are a helpful assistant. Use ONLY the provided context. If the answer isn't there, say you can't assist with that specific query. Respond in ${language === Language.ZH ? 'Chinese (Simplified)' : 'English'}.`
      }
    });
    return response.text;
  } catch (error) {
    return "Connection error.";
  }
};
