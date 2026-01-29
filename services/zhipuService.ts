
import { Language } from '../types.ts';

// 获取当前项目的API密钥
const getApiKey = (projectId?: string): string => {
  try {
    const projects = JSON.parse(localStorage.getItem('smartguide_projects') || '[]');
    if (projectId) {
      const project = projects.find((p: any) => p.id === projectId);
      return project?.config?.zhipuApiKey || '';
    }
    // 如果没有指定项目ID，返回第一个项目的API密钥
    return projects[0]?.config?.zhipuApiKey || '';
  } catch (error) {
    console.error('Error getting API key:', error);
    return '';
  }
};

// Using the OpenAI-compatible endpoint for Zhipu GLM-4V via backend proxy
export const analyzeInstallationState = async (
  imageData: string,
  currentStep: any,
  systemPrompt: string,
  language: Language = Language.EN,
  knowledgeBase: any[] = []
) => {
  const model = "glm-4v-flash"; // Use Flash for speed/cost, or glm-4v for quality

  // 构建知识库参考信息
  let knowledgeBaseReference = "";
  if (knowledgeBase && knowledgeBase.length > 0) {
    knowledgeBaseReference = `\n\nKnowledge Base References:\n`;
    knowledgeBase.forEach((item, index) => {
      if (item.summary && item.filename) {
        knowledgeBaseReference += `${index + 1}. ${item.filename}: ${item.summary}\n`;
      }
    });
  }

  const instruction = `
    Role: Professional Industrial Quality Inspector.
    Task: Verify if the photo matches the TARGET STATE.
    
    Current Step: ${currentStep.name}
    Target State: ${currentStep.targetState}
    ${knowledgeBaseReference}
    
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
          text: `Evaluate this installation. System Context: ${systemPrompt}. Use knowledge base references if relevant. Respond in ${language === Language.ZH ? 'Chinese' : 'English'}.`
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
    const apiKey = getApiKey();
    const response = await fetch("/api/proxy/zhipu/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-zhipu-api-key": apiKey
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
    const apiKey = getApiKey();
    const response = await fetch("/api/proxy/zhipu/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-zhipu-api-key": apiKey
      },
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

export const generateEmbedding = async (text: string, dimensions: number = 1024): Promise<number[] | null> => {
  try {
    // Use Embedding-3 model with custom dimensions
    const apiKey = getApiKey();
    const response = await fetch("/api/proxy/zhipu/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-zhipu-api-key": apiKey
      },
      body: JSON.stringify({
        model: "embedding-3",
        input: text,
        dimensions: dimensions
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

export const generateSpeech = async (text: string, voice: string = "tongtong") => {
  try {
    // 尝试使用智谱AI的文本转语音服务
    const audioBlob = await textToSpeech(text, voice);
    if (audioBlob) {
      // 如果成功获取音频，创建音频URL并返回
      const audioUrl = URL.createObjectURL(audioBlob);
      return audioUrl;
    }
    
    // 如果智谱AI服务失败，使用浏览器内置的TTS作为备选
    console.log("Using browser TTS fallback");
    return null; // 返回null触发系统fallback
  } catch (error) {
    console.error("Generate Speech Error", error);
    return null;
  }
};

// 音色复刻
export const cloneVoice = async (
  voiceName: string,
  input: string,
  fileId: string,
  text?: string,
  requestId?: string
) => {
  try {
    const apiKey = getApiKey();
    const response = await fetch("/api/proxy/zhipu/voice/clone", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-zhipu-api-key": apiKey
      },
      body: JSON.stringify({
        model: "glm-tts-clone",
        voice_name: voiceName,
        input: input,
        file_id: fileId,
        text: text,
        request_id: requestId
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("Voice Clone Error:", data.error.message);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Voice Clone Error", error);
    return null;
  }
};

// 获取音色列表
export const getVoiceList = async (voiceName?: string, voiceType?: 'OFFICIAL' | 'PRIVATE') => {
  try {
    let url = "/api/proxy/zhipu/voice/list";
    
    // 构建查询参数
    const params = new URLSearchParams();
    if (voiceName) params.append('voiceName', voiceName);
    if (voiceType) params.append('voiceType', voiceType);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const apiKey = getApiKey();
    const response = await fetch(url, {
      headers: {
        "x-zhipu-api-key": apiKey
      }
    });
    const data = await response.json();
    
    if (data.error) {
      console.error("Get Voice List Error:", data.error.message);
      return [];
    }
    
    return data.voice_list || [];
  } catch (error) {
    console.error("Get Voice List Error", error);
    return [];
  }
};

// 删除音色
export const deleteVoice = async (voice: string, requestId?: string) => {
  try {
    const apiKey = getApiKey();
    const response = await fetch("/api/proxy/zhipu/voice/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-zhipu-api-key": apiKey
      },
      body: JSON.stringify({
        voice: voice,
        request_id: requestId
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("Delete Voice Error:", data.error.message);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Delete Voice Error", error);
    return null;
  }
};

// 文本转语音（使用智谱AI）
export const textToSpeech = async (
  text: string,
  voice: string = "tongtong",
  responseFormat: string = "wav"
) => {
  try {
    const apiKey = getApiKey();
    const response = await fetch("/api/proxy/zhipu/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-zhipu-api-key": apiKey
      },
      body: JSON.stringify({
        model: "glm-tts",
        input: text,
        voice: voice,
        response_format: responseFormat
      })
    });

    if (response.ok) {
      // 处理二进制音频响应
      const audioBlob = await response.blob();
      return audioBlob;
    } else {
      const errorData = await response.json();
      console.error("Text to Speech Error:", errorData.error?.message || "API request failed");
      return null;
    }
  } catch (error) {
    console.error("Text to Speech Error", error);
    return null;
  }
};
