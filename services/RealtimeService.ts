import { Language } from '../types.ts';

interface SessionState {
  id: string;
  isConnected: boolean;
  isAuthenticated: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  isProcessing: boolean;
  rateLimits: {
    concurrentRequests: number;
    remaining: number;
    resetTime: number;
  };
}

interface RealtimeEvent {
  event_id: string;
  type: string;
  client_timestamp: number;
  [key: string]: any;
}

interface ResponseState {
  id: string;
  status: 'created' | 'in_progress' | 'completed' | 'cancelled';
  outputItems: Array<{
    id: string;
    index: number;
    role: string;
    status: 'in_progress' | 'completed';
    contentParts: Array<{
      index: number;
      type: 'text' | 'audio';
      content: string;
      status: 'in_progress' | 'completed';
    }>;
  }>;
  startTime: number;
  endTime: number | null;
}

class RealtimeService {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private systemPrompt: string = '';
  private sessionState: SessionState;
  private responses: Record<string, ResponseState> = {};
  private eventHandlers: Record<string, Array<(data: any) => void>> = {};
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private isReconnecting: boolean = false;

  constructor(apiKey: string, systemPrompt: string = '') {
    this.apiKey = apiKey;
    this.systemPrompt = systemPrompt;
    this.sessionState = {
      id: '',
      isConnected: false,
      isAuthenticated: false,
      isSpeaking: false,
      isListening: false,
      isProcessing: false,
      rateLimits: {
        concurrentRequests: 5,
        remaining: 5,
        resetTime: Date.now() + 60000
      }
    };
  }

  setSystemPrompt(prompt: string) {
    this.systemPrompt = prompt;
  }

  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      this.ws = new WebSocket('wss://open.bigmodel.cn/api/paas/v4/realtime');

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.sessionState.isConnected = true;
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        this.authenticate();
        this.emit('connected', this.sessionState);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleEvent(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          this.emit('error', { type: 'PARSE_ERROR', message: 'Failed to parse message' });
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.sessionState.isConnected = false;
        this.sessionState.isAuthenticated = false;
        this.emit('disconnected', { code: event.code, reason: event.reason });
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', { type: 'WebSocket_ERROR', message: 'WebSocket error occurred' });
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.emit('error', { type: 'CONNECTION_ERROR', message: 'Failed to create WebSocket connection' });
      this.attemptReconnect();
    }
  }

  private authenticate() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const authEvent: RealtimeEvent = {
      event_id: this.generateEventId(),
      type: 'session.update',
      client_timestamp: Date.now(),
      session: {
        input_audio_format: 'pcm16',
        input_audio_noise_reduction: {
          type: 'far_field'
        },
        modalities: ['text', 'audio', 'video'],
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true,
          interrupt_response: true
        },
        system_prompt: this.systemPrompt
      }
    };

    this.sendEvent(authEvent);
  }

  private attemptReconnect() {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    this.reconnectDelay *= 2;

    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.emit('reconnecting', { attempt: this.reconnectAttempts, maxAttempts: this.maxReconnectAttempts });

    setTimeout(() => {
      this.isReconnecting = false;
      this.connect();
    }, this.reconnectDelay);
  }

  private handleEvent(data: any) {
    const eventType = data.type;
    console.log('Received event:', eventType);

    // 处理会话相关事件
    if (eventType === 'session.created') {
      this.sessionState.id = data.session.id;
      this.emit('session.created', data);
    } else if (eventType === 'session.updated') {
      this.sessionState.isAuthenticated = true;
      this.emit('session.updated', data);
    } else if (eventType === 'transcription_session.updated') {
      this.emit('transcription_session.updated', data);
    }

    // 处理对话项相关事件
    else if (eventType === 'conversation.item.created') {
      this.emit('conversation.item.created', data);
    } else if (eventType === 'conversation.item.deleted') {
      this.emit('conversation.item.deleted', data);
    } else if (eventType === 'conversation.item.retrieved') {
      this.emit('conversation.item.retrieved', data);
    } else if (eventType === 'conversation.item.input_audio_transcription.completed') {
      this.emit('conversation.item.input_audio_transcription.completed', data);
    } else if (eventType === 'conversation.item.input_audio_transcription.failed') {
      this.emit('conversation.item.input_audio_transcription.failed', data);
    }

    // 处理输入音频缓冲区事件
    else if (eventType === 'input_audio_buffer.committed') {
      this.emit('input_audio_buffer.committed', data);
    } else if (eventType === 'input_audio_buffer.speech_started') {
      this.sessionState.isSpeaking = true;
      this.emit('input_audio_buffer.speech_started', data);
    } else if (eventType === 'input_audio_buffer.speech_stopped') {
      this.sessionState.isSpeaking = false;
      this.emit('input_audio_buffer.speech_stopped', data);
    }

    // 处理响应相关事件
    else if (eventType === 'response.created') {
      this.createResponse(data.response.id);
      this.sessionState.isProcessing = true;
      this.emit('response.created', data);
    } else if (eventType === 'response.output_item.added') {
      this.addOutputItem(data.response_id, data.output_index, data.item);
      this.emit('response.output_item.added', data);
    } else if (eventType === 'response.output_item.done') {
      this.updateOutputItemStatus(data.response_id, data.item.id, data.item.status);
      this.emit('response.output_item.done', data);
    } else if (eventType === 'response.content_part.added') {
      this.addContentPart(data.response_id, data.item_id, data.content_index, data.part.type);
      this.emit('response.content_part.added', data);
    } else if (eventType === 'response.content_part.done') {
      this.updateContentPartStatus(data.response_id, data.item_id, data.content_index, 'completed');
      this.emit('response.content_part.done', data);
    } else if (eventType === 'response.text.delta') {
      this.updateContentPart(data.response_id, data.item_id, data.content_index, data.delta);
      this.emit('response.text.delta', data);
    } else if (eventType === 'response.text.done') {
      this.updateContentPart(data.response_id, data.item_id, data.content_index, data.text, true);
      this.emit('response.text.done', data);
    } else if (eventType === 'response.audio.delta') {
      this.emit('response.audio.delta', data);
    } else if (eventType === 'response.audio.done') {
      this.emit('response.audio.done', data);
    } else if (eventType === 'response.audio_transcript.delta') {
      this.emit('response.audio_transcript.delta', data);
    } else if (eventType === 'response.audio_transcript.done') {
      this.emit('response.audio_transcript.done', data);
    } else if (eventType === 'response.function_call_arguments.done') {
      this.emit('response.function_call_arguments.done', data);
    } else if (eventType === 'response.function_call.simple_browser') {
      this.emit('response.function_call.simple_browser', data);
    } else if (eventType === 'response.done') {
      this.updateResponseStatus(data.response.id, 'completed');
      this.sessionState.isProcessing = false;
      this.emit('response.done', data);
    }

    // 处理速率限制事件
    else if (eventType === 'rate_limits.updated') {
      this.sessionState.rateLimits = data.rate_limits;
      this.emit('rate_limits.updated', data);
    }

    // 处理错误事件
    else if (eventType === 'error') {
      this.emit('error', data.error);
    }

    // 处理未知事件
    else {
      console.log('Unhandled event:', eventType);
      this.emit('unknown_event', data);
    }
  }

  private createResponse(responseId: string) {
    this.responses[responseId] = {
      id: responseId,
      status: 'created',
      outputItems: [],
      startTime: Date.now(),
      endTime: null
    };
  }

  private updateResponseStatus(responseId: string, status: ResponseState['status']) {
    if (this.responses[responseId]) {
      this.responses[responseId].status = status;
      if (status === 'completed') {
        this.responses[responseId].endTime = Date.now();
      }
    }
  }

  private addOutputItem(responseId: string, outputIndex: number, item: any) {
    if (!this.responses[responseId]) return;

    this.responses[responseId].outputItems.push({
      id: item.id,
      index: outputIndex,
      role: item.role,
      status: item.status,
      contentParts: []
    });
  }

  private updateOutputItemStatus(responseId: string, itemId: string, status: string) {
    if (!this.responses[responseId]) return;

    const outputItem = this.responses[responseId].outputItems.find(item => item.id === itemId);
    if (outputItem) {
      outputItem.status = status as 'in_progress' | 'completed';
    }
  }

  private addContentPart(responseId: string, itemId: string, contentIndex: number, partType: string) {
    if (!this.responses[responseId]) return;

    const outputItem = this.responses[responseId].outputItems.find(item => item.id === itemId);
    if (outputItem) {
      outputItem.contentParts.push({
        index: contentIndex,
        type: partType as 'text' | 'audio',
        content: '',
        status: 'in_progress'
      });
    }
  }

  private updateContentPart(responseId: string, itemId: string, contentIndex: number, delta: string, isDone: boolean = false) {
    if (!this.responses[responseId]) return;

    const outputItem = this.responses[responseId].outputItems.find(item => item.id === itemId);
    if (outputItem) {
      const contentPart = outputItem.contentParts.find(part => part.index === contentIndex);
      if (contentPart) {
        contentPart.content += delta;
        if (isDone) {
          contentPart.status = 'completed';
        }
      }
    }
  }

  private updateContentPartStatus(responseId: string, itemId: string, contentIndex: number, status: 'in_progress' | 'completed') {
    if (!this.responses[responseId]) return;

    const outputItem = this.responses[responseId].outputItems.find(item => item.id === itemId);
    if (outputItem) {
      const contentPart = outputItem.contentParts.find(part => part.index === contentIndex);
      if (contentPart) {
        contentPart.status = status;
      }
    }
  }

  sendEvent(event: RealtimeEvent) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      this.emit('error', { type: 'CONNECTION_ERROR', message: 'WebSocket not connected' });
      return false;
    }

    try {
      this.ws.send(JSON.stringify(event));
      return true;
    } catch (error) {
      console.error('Error sending event:', error);
      this.emit('error', { type: 'SEND_ERROR', message: 'Failed to send event' });
      return false;
    }
  }

  sendTextMessage(text: string) {
    const itemId = `item_${Date.now()}`;

    const itemEvent: RealtimeEvent = {
      event_id: this.generateEventId(),
      type: 'conversation.item.create',
      client_timestamp: Date.now(),
      item: {
        id: itemId,
        type: 'message',
        object: 'realtime.item',
        status: 'completed',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: text
          }
        ]
      }
    };

    if (!this.sendEvent(itemEvent)) return false;

    const responseEvent: RealtimeEvent = {
      event_id: this.generateEventId(),
      type: 'response.create',
      client_timestamp: Date.now()
    };

    return this.sendEvent(responseEvent);
  }

  sendAudioData(audioData: string, format: string = 'pcm16', sampleRate: number = 16000) {
    const audioEvent: RealtimeEvent = {
      event_id: this.generateEventId(),
      type: 'input_audio_buffer.append',
      client_timestamp: Date.now(),
      audio: {
        data: audioData,
        format: format,
        sample_rate: sampleRate
      }
    };

    return this.sendEvent(audioEvent);
  }

  sendVideoFrame(videoData: string, format: string = 'jpeg', width: number, height: number) {
    const videoEvent: RealtimeEvent = {
      event_id: this.generateEventId(),
      type: 'input_audio_buffer.append_video_frame',
      client_timestamp: Date.now(),
      video: {
        data: videoData,
        format: format,
        width: width,
        height: height,
        timestamp: Date.now()
      }
    };

    return this.sendEvent(videoEvent);
  }

  commitAudioBuffer() {
    const commitEvent: RealtimeEvent = {
      event_id: this.generateEventId(),
      type: 'input_audio_buffer.commit',
      client_timestamp: Date.now()
    };

    return this.sendEvent(commitEvent);
  }

  clearAudioBuffer() {
    const clearEvent: RealtimeEvent = {
      event_id: this.generateEventId(),
      type: 'input_audio_buffer.clear',
      client_timestamp: Date.now()
    };

    return this.sendEvent(clearEvent);
  }

  on(event: string, handler: (data: any) => void) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  off(event: string, handler?: (data: any) => void) {
    if (!this.eventHandlers[event]) return;

    if (handler) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    } else {
      delete this.eventHandlers[event];
    }
  }

  private emit(event: string, data: any) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in event handler:', error);
        }
      });
    }
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSessionState(): SessionState {
    return { ...this.sessionState };
  }

  getResponse(responseId: string): ResponseState | undefined {
    return this.responses[responseId];
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.sessionState.isConnected = false;
    this.sessionState.isAuthenticated = false;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
  }

  isConnected(): boolean {
    return this.sessionState.isConnected && this.sessionState.isAuthenticated;
  }
}

export default RealtimeService;