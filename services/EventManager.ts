import RealtimeService from './RealtimeService.ts';
import AudioPlayer from './AudioPlayer.ts';

interface EventHandler {
  (data: any): void;
}

interface EventSubscription {
  handler: EventHandler;
  once: boolean;
}

class EventManager {
  private realtimeService: RealtimeService;
  private audioPlayer: AudioPlayer;
  private eventSubscriptions: Record<string, EventSubscription[]> = {};
  private activeResponses: Record<string, any> = {};
  private errorHandlers: EventHandler[] = [];
  private messageHandlers: EventHandler[] = [];
  private isInitialized: boolean = false;

  constructor(realtimeService: RealtimeService, audioPlayer: AudioPlayer) {
    this.realtimeService = realtimeService;
    this.audioPlayer = audioPlayer;
    this.initialize();
  }

  private initialize() {
    if (this.isInitialized) return;

    // 注册基本事件处理
    this.registerRealtimeEvents();
    this.isInitialized = true;
    console.log('EventManager initialized');
  }

  private registerRealtimeEvents() {
    // 会话相关事件
    this.realtimeService.on('session.created', this.handleSessionCreated.bind(this));
    this.realtimeService.on('session.updated', this.handleSessionUpdated.bind(this));
    this.realtimeService.on('transcription_session.updated', this.handleTranscriptionSessionUpdated.bind(this));

    // 连接相关事件
    this.realtimeService.on('connected', this.handleConnected.bind(this));
    this.realtimeService.on('disconnected', this.handleDisconnected.bind(this));
    this.realtimeService.on('reconnecting', this.handleReconnecting.bind(this));

    // 对话项相关事件
    this.realtimeService.on('conversation.item.created', this.handleConversationItemCreated.bind(this));
    this.realtimeService.on('conversation.item.deleted', this.handleConversationItemDeleted.bind(this));
    this.realtimeService.on('conversation.item.retrieved', this.handleConversationItemRetrieved.bind(this));
    this.realtimeService.on('conversation.item.input_audio_transcription.completed', this.handleAudioTranscriptionCompleted.bind(this));
    this.realtimeService.on('conversation.item.input_audio_transcription.failed', this.handleAudioTranscriptionFailed.bind(this));

    // 音频缓冲区事件
    this.realtimeService.on('input_audio_buffer.committed', this.handleAudioBufferCommitted.bind(this));
    this.realtimeService.on('input_audio_buffer.speech_started', this.handleSpeechStarted.bind(this));
    this.realtimeService.on('input_audio_buffer.speech_stopped', this.handleSpeechStopped.bind(this));

    // 响应相关事件
    this.realtimeService.on('response.created', this.handleResponseCreated.bind(this));
    this.realtimeService.on('response.output_item.added', this.handleOutputItemAdded.bind(this));
    this.realtimeService.on('response.output_item.done', this.handleOutputItemDone.bind(this));
    this.realtimeService.on('response.content_part.added', this.handleContentPartAdded.bind(this));
    this.realtimeService.on('response.content_part.done', this.handleContentPartDone.bind(this));
    this.realtimeService.on('response.text.delta', this.handleTextDelta.bind(this));
    this.realtimeService.on('response.text.done', this.handleTextDone.bind(this));
    this.realtimeService.on('response.audio.delta', this.handleAudioDelta.bind(this));
    this.realtimeService.on('response.audio.done', this.handleAudioDone.bind(this));
    this.realtimeService.on('response.audio_transcript.delta', this.handleAudioTranscriptDelta.bind(this));
    this.realtimeService.on('response.audio_transcript.done', this.handleAudioTranscriptDone.bind(this));
    this.realtimeService.on('response.function_call_arguments.done', this.handleFunctionCallArgumentsDone.bind(this));
    this.realtimeService.on('response.function_call.simple_browser', this.handleSimpleBrowser.bind(this));
    this.realtimeService.on('response.done', this.handleResponseDone.bind(this));

    // 速率限制事件
    this.realtimeService.on('rate_limits.updated', this.handleRateLimitsUpdated.bind(this));

    // 错误事件
    this.realtimeService.on('error', this.handleError.bind(this));

    // 未知事件
    this.realtimeService.on('unknown_event', this.handleUnknownEvent.bind(this));
  }

  // 会话相关事件处理
  private handleSessionCreated(data: any) {
    console.log('Session created:', data.session.id);
    this.emit('session.created', data);
  }

  private handleSessionUpdated(data: any) {
    console.log('Session updated');
    this.emit('session.updated', data);
  }

  private handleTranscriptionSessionUpdated(data: any) {
    console.log('Transcription session updated');
    this.emit('transcription_session.updated', data);
  }

  // 连接相关事件处理
  private handleConnected(data: any) {
    console.log('Connected to Realtime API');
    this.emit('connected', data);
  }

  private handleDisconnected(data: any) {
    console.log('Disconnected from Realtime API:', data.reason);
    this.emit('disconnected', data);
  }

  private handleReconnecting(data: any) {
    console.log('Reconnecting to Realtime API:', data);
    this.emit('reconnecting', data);
  }

  // 对话项相关事件处理
  private handleConversationItemCreated(data: any) {
    console.log('Conversation item created:', data.item.id);
    this.emit('conversation.item.created', data);
  }

  private handleConversationItemDeleted(data: any) {
    console.log('Conversation item deleted:', data.item_id);
    this.emit('conversation.item.deleted', data);
  }

  private handleConversationItemRetrieved(data: any) {
    console.log('Conversation item retrieved:', data.item.id);
    this.emit('conversation.item.retrieved', data);
  }

  private handleAudioTranscriptionCompleted(data: any) {
    console.log('Audio transcription completed:', data.transcript);
    this.emit('conversation.item.input_audio_transcription.completed', data);
  }

  private handleAudioTranscriptionFailed(data: any) {
    console.error('Audio transcription failed:', data.error);
    this.emit('conversation.item.input_audio_transcription.failed', data);
  }

  // 音频缓冲区事件处理
  private handleAudioBufferCommitted(data: any) {
    console.log('Audio buffer committed');
    this.emit('input_audio_buffer.committed', data);
  }

  private handleSpeechStarted(data: any) {
    console.log('Speech started');
    this.emit('input_audio_buffer.speech_started', data);
  }

  private handleSpeechStopped(data: any) {
    console.log('Speech stopped');
    this.emit('input_audio_buffer.speech_stopped', data);
  }

  // 响应相关事件处理
  private handleResponseCreated(data: any) {
    console.log('Response created:', data.response.id);
    this.activeResponses[data.response.id] = {
      id: data.response.id,
      startTime: Date.now(),
      status: 'created',
      content: ''
    };
    this.emit('response.created', data);
  }

  private handleOutputItemAdded(data: any) {
    console.log('Output item added:', data.item.id);
    this.emit('response.output_item.added', data);
  }

  private handleOutputItemDone(data: any) {
    console.log('Output item done:', data.item.id);
    this.emit('response.output_item.done', data);
  }

  private handleContentPartAdded(data: any) {
    console.log('Content part added:', data.part.type);
    this.emit('response.content_part.added', data);
  }

  private handleContentPartDone(data: any) {
    console.log('Content part done');
    this.emit('response.content_part.done', data);
  }

  private handleTextDelta(data: any) {
    console.log('Text delta:', data.delta);
    // 更新响应内容
    if (this.activeResponses[data.response_id]) {
      this.activeResponses[data.response_id].content += data.delta;
    }
    this.emit('response.text.delta', data);
    // 通知消息处理器
    this.messageHandlers.forEach(handler => handler(data));
  }

  private handleTextDone(data: any) {
    console.log('Text done:', data.text);
    // 更新响应内容
    if (this.activeResponses[data.response_id]) {
      this.activeResponses[data.response_id].content = data.text;
      this.activeResponses[data.response_id].status = 'completed';
    }
    this.emit('response.text.done', data);
  }

  private handleAudioDelta(data: any) {
    console.log('Audio delta received');
    // 处理音频数据
    this.audioPlayer.processAudioDelta(data.delta);
    this.emit('response.audio.delta', data);
  }

  private handleAudioDone(data: any) {
    console.log('Audio done');
    // 完成音频播放
    this.audioPlayer.completePlayback();
    this.emit('response.audio.done', data);
  }

  private handleAudioTranscriptDelta(data: any) {
    console.log('Audio transcript delta:', data.delta);
    this.emit('response.audio_transcript.delta', data);
  }

  private handleAudioTranscriptDone(data: any) {
    console.log('Audio transcript done:', data.transcript);
    this.emit('response.audio_transcript.done', data);
  }

  private handleFunctionCallArgumentsDone(data: any) {
    console.log('Function call arguments done:', data.name, data.arguments);
    this.emit('response.function_call_arguments.done', data);
  }

  private handleSimpleBrowser(data: any) {
    console.log('Simple browser function call:', data.name);
    this.emit('response.function_call.simple_browser', data);
  }

  private handleResponseDone(data: any) {
    console.log('Response done:', data.response.id);
    // 计算响应时间
    if (this.activeResponses[data.response.id]) {
      const responseTime = Date.now() - this.activeResponses[data.response.id].startTime;
      console.log('Response time:', responseTime, 'ms');
      this.activeResponses[data.response.id].responseTime = responseTime;
      this.activeResponses[data.response.id].status = 'done';
    }
    this.emit('response.done', data);
  }

  // 速率限制事件处理
  private handleRateLimitsUpdated(data: any) {
    console.log('Rate limits updated:', data.rate_limits);
    this.emit('rate_limits.updated', data);
  }

  // 错误事件处理
  private handleError(error: any) {
    console.error('Error:', error);
    // 通知错误处理器
    this.errorHandlers.forEach(handler => handler(error));
    this.emit('error', error);
  }

  // 未知事件处理
  private handleUnknownEvent(data: any) {
    console.log('Unknown event:', data.type);
    this.emit('unknown_event', data);
  }

  // 事件注册和监听
  on(event: string, handler: EventHandler, once: boolean = false) {
    if (!this.eventSubscriptions[event]) {
      this.eventSubscriptions[event] = [];
    }
    this.eventSubscriptions[event].push({ handler, once });
    console.log(`Event listener added for: ${event}`);
  }

  once(event: string, handler: EventHandler) {
    this.on(event, handler, true);
  }

  off(event: string, handler?: EventHandler) {
    if (!this.eventSubscriptions[event]) return;

    if (handler) {
      this.eventSubscriptions[event] = this.eventSubscriptions[event].filter(
        subscription => subscription.handler !== handler
      );
    } else {
      delete this.eventSubscriptions[event];
    }
    console.log(`Event listener removed for: ${event}`);
  }

  // 错误处理器
  onError(handler: EventHandler) {
    this.errorHandlers.push(handler);
  }

  offError(handler: EventHandler) {
    this.errorHandlers = this.errorHandlers.filter(h => h !== handler);
  }

  // 消息处理器
  onMessage(handler: EventHandler) {
    this.messageHandlers.push(handler);
  }

  offMessage(handler: EventHandler) {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  // 事件分发
  emit(event: string, data: any) {
    if (!this.eventSubscriptions[event]) return;

    const subscriptions = this.eventSubscriptions[event];
    const remainingSubscriptions: EventSubscription[] = [];

    subscriptions.forEach(subscription => {
      try {
        subscription.handler(data);
        if (!subscription.once) {
          remainingSubscriptions.push(subscription);
        }
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });

    this.eventSubscriptions[event] = remainingSubscriptions;
  }

  // 获取活动响应
  getActiveResponse(responseId: string) {
    return this.activeResponses[responseId];
  }

  // 获取所有活动响应
  getActiveResponses() {
    return this.activeResponses;
  }

  // 清除活动响应
  clearActiveResponse(responseId: string) {
    delete this.activeResponses[responseId];
  }

  // 清除所有活动响应
  clearAllActiveResponses() {
    this.activeResponses = {};
  }

  // 发送文本消息
  sendTextMessage(text: string) {
    return this.realtimeService.sendTextMessage(text);
  }

  // 发送音频数据
  sendAudioData(audioData: string, format: string = 'pcm16', sampleRate: number = 16000) {
    return this.realtimeService.sendAudioData(audioData, format, sampleRate);
  }

  // 发送视频帧
  sendVideoFrame(videoData: string, format: string = 'jpeg', width: number, height: number) {
    return this.realtimeService.sendVideoFrame(videoData, format, width, height);
  }

  // 提交音频缓冲区
  commitAudioBuffer() {
    return this.realtimeService.commitAudioBuffer();
  }

  // 清除音频缓冲区
  clearAudioBuffer() {
    return this.realtimeService.clearAudioBuffer();
  }

  // 获取会话状态
  getSessionState() {
    return this.realtimeService.getSessionState();
  }

  // 检查连接状态
  isConnected() {
    return this.realtimeService.isConnected();
  }

  // 连接到Realtime API
  connect() {
    this.realtimeService.connect();
  }

  // 断开连接
  disconnect() {
    this.realtimeService.disconnect();
    this.clearAllActiveResponses();
  }

  // 销毁
  destroy() {
    this.disconnect();
    this.eventSubscriptions = {};
    this.activeResponses = {};
    this.errorHandlers = [];
    this.messageHandlers = [];
    console.log('EventManager destroyed');
  }
}

export default EventManager;