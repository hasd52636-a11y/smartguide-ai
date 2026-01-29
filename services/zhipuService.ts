
import { Language } from '../types.ts';

export type ZhipuModel = 
  | 'glm-4.5-flash'      // 深度思考（普惠）
  | 'glm-4v-flash'       // 视觉理解（普惠）
  | 'glm-4-flash'        // 文本生成（普惠）
  | 'cogvideox-flash'    // 视频生成（普惠）
  | 'cogview-3-flash'    // 图像生成（普惠）
  | 'glm-4.6v'           // 高端视觉理解
  | 'cogvideox-3'        // 高端视频生成
  | 'cogview-3';         // 高端图像生成

// 模型配置管理
class ModelConfigManager {
  private static instance: ModelConfigManager;
  private modelConfig: any;

  private constructor() {
    // 从本地存储加载模型配置
    const saved = localStorage.getItem('zhipu_models_config');
    this.modelConfig = saved ? JSON.parse(saved) : {
      text: 'glm-4-flash',
      thinking: 'glm-4.5-flash',
      vision: 'glm-4v-flash',
      video: 'cogvideox-flash',
      image: 'cogview-3-flash'
    };
  }

  public static getInstance(): ModelConfigManager {
    if (!ModelConfigManager.instance) {
      ModelConfigManager.instance = new ModelConfigManager();
    }
    return ModelConfigManager.instance;
  }

  // 获取指定类别的模型
  public getModel(category: 'text' | 'thinking' | 'vision' | 'video' | 'image'): string {
    return this.modelConfig[category] || {
      text: 'glm-4-flash',
      thinking: 'glm-4.5-flash',
      vision: 'glm-4v-flash',
      video: 'cogvideox-flash',
      image: 'cogview-3-flash'
    }[category];
  }

  // 保存模型配置
  public saveModelConfig(config: any): void {
    this.modelConfig = { ...this.modelConfig, ...config };
    localStorage.setItem('zhipu_models_config', JSON.stringify(this.modelConfig));
  }

  // 获取所有模型配置
  public getModelConfig(): any {
    return this.modelConfig;
  }
}

// API密钥管理
class ApiKeyManager {
  private static instance: ApiKeyManager;
  private cachedApiKey: string | null = null;
  private cacheExpiry: number = 0;

  private constructor() {}

  public static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  // 获取当前项目的API密钥
  public getApiKey(projectId?: string): string {
    // 检查缓存是否有效（5分钟内）
    const now = Date.now();
    if (this.cachedApiKey && now < this.cacheExpiry) {
      return this.cachedApiKey;
    }

    try {
      const projects = JSON.parse(localStorage.getItem('smartguide_projects') || '[]');
      let apiKey = '';

      if (projectId) {
        const project = projects.find((p: any) => p.id === projectId);
        apiKey = project?.config?.zhipuApiKey || '';
      } else {
        // 如果没有指定项目ID，返回第一个项目的API密钥
        apiKey = projects[0]?.config?.zhipuApiKey || '';
      }

      // 更新缓存
      this.cachedApiKey = apiKey;
      this.cacheExpiry = now + 5 * 60 * 1000; // 5分钟缓存

      return apiKey;
    } catch (error) {
      console.error('Error getting API key:', error);
      return '';
    }
  }

  // 清除缓存
  public clearCache(): void {
    this.cachedApiKey = null;
    this.cacheExpiry = 0;
  }
}

// 生成唯一的请求ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// 通用API请求函数
const fetchApi = async (endpoint: string, options: RequestInit): Promise<Response> => {
  const apiKeyManager = ApiKeyManager.getInstance();
  const apiKey = apiKeyManager.getApiKey();

  // 设置默认请求头
  const headers = {
    'Content-Type': 'application/json',
    'x-zhipu-api-key': apiKey,
    ...(options.headers || {})
  };

  // 添加超时处理
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
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
  const modelConfigManager = ModelConfigManager.getInstance();
  const model = modelConfigManager.getModel('vision'); // 使用配置的视觉模型

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
    console.log(`[ZhipuService] Analyzing installation state with ${model}...`);
    
    const requestId = generateRequestId();
    
    const response = await fetchApi("/api/proxy/zhipu/chat", {
      method: "POST",
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.1,
        max_tokens: 1024,
        top_p: 0.7,
        stream: false,
        request_id: requestId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ZhipuService] Analysis API error: ${response.status} - ${errorText}`);
      throw new Error(`Zhipu API Error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[ZhipuService] Analysis API response received`);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error(`Invalid API response format: ${JSON.stringify(data)}`);
    }

    const content = data.choices[0].message.content;

    // Cleanup code blocks if present
    const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const result = JSON.parse(jsonStr);
      
      console.log(`[ZhipuService] Analysis completed successfully`);
      
      return {
        ...result,
        tokensUsed: data.usage?.total_tokens || 0
      };
    } catch (jsonError) {
      console.error(`[ZhipuService] JSON parsing error:`, jsonError);
      console.error(`[ZhipuService] Raw content:`, content);
      throw new Error(`Failed to parse API response: ${jsonError.message}`);
    }

  } catch (error) {
    console.error("[ZhipuService] Analysis Error:", error);
    console.error("[ZhipuService] Error stack:", error.stack);
    
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
  systemPrompt: string,
  useThinking: boolean = false
): Promise<string> => {
  const modelConfigManager = ModelConfigManager.getInstance();
  const model = useThinking ? modelConfigManager.getModel('thinking') : modelConfigManager.getModel('text');

  const formattedMessages = [
    { role: "system", content: systemPrompt },
    ...messages
  ];

  try {
    console.log(`[ZhipuService] Chat with ${model}...`);
    
    const requestId = generateRequestId();
    
    const response = await fetchApi("/api/proxy/zhipu/chat", {
      method: "POST",
      body: JSON.stringify({
        model: model,
        messages: formattedMessages,
        temperature: 0.7,
        stream: false,
        request_id: requestId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ZhipuService] Chat API error: ${response.status} - ${errorText}`);
      throw new Error(`Zhipu Chat Error: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[ZhipuService] Chat API response received`);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error(`Invalid chat API response format: ${JSON.stringify(data)}`);
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error("[ZhipuService] Chat Error:", error);
    return "Sorry, I am having trouble connecting to the server.";
  }
};

export const generateEmbedding = async (text: string, dimensions: number = 1024): Promise<number[] | null> => {
  try {
    // Use Embedding-3 model with custom dimensions
    const response = await fetchApi("/api/proxy/zhipu/embeddings", {
      method: "POST",
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
    const response = await fetchApi("/api/proxy/zhipu/voice/clone", {
      method: "POST",
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

    const response = await fetchApi(url, {
      method: "GET"
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
    console.log(`[ZhipuService] Deleting voice: ${voice}`);
    
    const response = await fetchApi("/api/proxy/zhipu/voice/delete", {
      method: "POST",
      body: JSON.stringify({
        voice: voice,
        request_id: requestId || generateRequestId()
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("[ZhipuService] Delete Voice Error:", data.error.message);
      return null;
    }
    
    console.log(`[ZhipuService] Voice deleted successfully: ${voice}`);
    return data;
  } catch (error) {
    console.error("[ZhipuService] Delete Voice Error", error);
    return null;
  }
};

// 模型配置管理函数
export const getModelConfig = () => {
  const modelConfigManager = ModelConfigManager.getInstance();
  return modelConfigManager.getModelConfig();
};

export const saveModelConfig = (config: any) => {
  const modelConfigManager = ModelConfigManager.getInstance();
  modelConfigManager.saveModelConfig(config);
};

export const getModel = (category: 'text' | 'thinking' | 'vision' | 'video' | 'image') => {
  const modelConfigManager = ModelConfigManager.getInstance();
  return modelConfigManager.getModel(category);
};

// 文本转语音（使用智谱AI）
export const textToSpeech = async (
  text: string,
  voice: string = "tongtong",
  responseFormat: string = "wav"
) => {
  try {
    const response = await fetchApi("/api/proxy/zhipu/speech", {
      method: "POST",
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
