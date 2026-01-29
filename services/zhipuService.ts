
import { Language } from '../types.ts';

// Using the OpenAI-compatible endpoint for Zhipu GLM-4V via backend proxy
export const analyzeInstallationState = async (
  imageData: string,
  currentStep: any,
  systemPrompt: string,
  language: Language = Language.EN
) => {
  const model = "glm-4v-flash"; // Use Flash for speed/cost, or glm-4v for quality

  const instruction = `
    Role: Professional Industrial Quality Inspector.
    Task: Verify if the photo matches the TARGET STATE.
    
    Current Step: ${currentStep.name}
    Target State: ${currentStep.targetState}
    
    Output JSON ONLY:
    {
      "isComplete": boolean,
      "confidence": number (0-100),
      "feedback": string (Client facing),
      "photoRequest": { "what": string, "where": string, "why": string } (Optional, if confidence < 80),
      "visualHints": [{ "type": "circle", "point": [x, y], "label": string }] (Optional, point 0-1000)
    }
  `;

  const messages = [
    {
      role: "system",
      content: instruction
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Evaluate this installation. System Context: ${systemPrompt}. Respond in ${language === Language.ZH ? 'Chinese' : 'English'}.`
        },
        {
          type: "image_url",
          image_url: {
            url: imageData
          }
        }
      ]
    }
  ];

  try {
    // Use backend proxy API instead of direct API call
    const response = await fetch("/api/proxy/zhipu/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.1,
        max_tokens: 1024,
        top_p: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Zhipu API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Cleanup code blocks if present
    const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
      ...result,
      tokensUsed: data.usage?.total_tokens || 0
    };

  } catch (error) {
    console.error("Zhipu/GLM Analysis Error:", error);
    return {
      isComplete: false,
      confidence: 0,
      feedback: language === Language.ZH ? "网络或分析错误，请重试。" : "Connection or analysis error. Please retry.",
      visualHints: [],
      tokensUsed: 0
    };
  }
};

// ... image analysis code ...

export const chatWithAssistant = async (
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<string> => {
  const model = "glm-4-flash";

  const formattedMessages = [
    { role: "system", content: systemPrompt },
    ...messages
  ];

  try {
    const response = await fetch("/api/proxy/zhipu/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        messages: formattedMessages,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) throw new Error(`Zhipu Chat Error: ${response.statusText}`);
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Zhipu/GLM Chat Error:", error);
    return "Sorry, I am having trouble connecting to the server.";
  }
};

export const generateEmbedding = async (text: string): Promise<number[] | null> => {
  try {
    // Use backend proxy API instead of direct API call
    const response = await fetch("/api/proxy/zhipu/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "embedding-2",
        input: text
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.data[0].embedding;
  } catch (e) {
    console.error("Zhipu Embedding Error", e);
    return null;
  }
};

export const generateSpeech = async (text: string) => {
  // ... existing speech code ...
  // Zhipu currently mostly supports text, for TTS we might need a different partner or browser fallback.
  // For now, return null to trigger system fallback or implement if Zhipu adds TTS.
  return null;
};
