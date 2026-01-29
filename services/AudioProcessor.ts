import RealtimeService from './RealtimeService.ts';

class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private sampleRate: number = 16000;
  private frameSize: number = 2048;
  private bufferSize: number = 4096;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private audioSource: MediaStreamAudioSourceNode | null = null;
  private realtimeService: RealtimeService | null = null;
  private isRecording: boolean = false;
  private silenceThreshold: number = 0.01;
  private silenceDuration: number = 1000;
  private lastVoiceTime: number = 0;
  private audioBuffer: Float32Array = new Float32Array(0);
  private maxBufferSize: number = 16384;
  private processingInterval: NodeJS.Timeout | null = null;
  private processingIntervalMs: number = 100;

  constructor(realtimeService?: RealtimeService) {
    this.realtimeService = realtimeService;
  }

  async start(realtimeService?: RealtimeService) {
    if (this.isRecording) {
      console.log('Audio recording already started');
      return;
    }

    if (realtimeService) {
      this.realtimeService = realtimeService;
    }

    if (!this.realtimeService) {
      throw new Error('RealtimeService is required');
    }

    try {
      // 请求麦克风权限
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: this.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // 创建音频上下文
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });

      // 创建音频源
      this.audioSource = this.audioContext.createMediaStreamSource(this.mediaStream);

      // 创建脚本处理器
      this.scriptProcessor = this.audioContext.createScriptProcessor(this.bufferSize, 1, 1);

      // 处理音频数据
      this.scriptProcessor.onaudioprocess = (event) => {
        this.processAudioData(event);
      };

      // 连接音频处理器
      this.audioSource.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      // 开始处理间隔
      this.processingInterval = setInterval(() => {
        this.flushAudioBuffer();
      }, this.processingIntervalMs);

      this.isRecording = true;
      this.lastVoiceTime = Date.now();

      console.log('Audio recording started');
      return true;
    } catch (error) {
      console.error('Error starting audio recording:', error);
      this.stop();
      throw error;
    }
  }

  private processAudioData(event: AudioProcessingEvent) {
    if (!this.isRecording) return;

    const inputData = event.inputBuffer.getChannelData(0);
    const float32Array = new Float32Array(inputData);

    // 检测是否有声音
    const hasVoice = this.detectVoice(float32Array);

    if (hasVoice) {
      this.lastVoiceTime = Date.now();
    }

    // 添加到音频缓冲区
    this.appendToBuffer(float32Array);
  }

  private detectVoice(buffer: Float32Array): boolean {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += Math.abs(buffer[i]);
    }
    const rms = Math.sqrt(sum / buffer.length);
    return rms > this.silenceThreshold;
  }

  private appendToBuffer(data: Float32Array) {
    const newLength = this.audioBuffer.length + data.length;
    const newBuffer = new Float32Array(newLength);
    newBuffer.set(this.audioBuffer);
    newBuffer.set(data, this.audioBuffer.length);
    this.audioBuffer = newBuffer;

    // 限制缓冲区大小
    if (this.audioBuffer.length > this.maxBufferSize) {
      this.audioBuffer = this.audioBuffer.slice(this.audioBuffer.length - this.maxBufferSize);
    }
  }

  private flushAudioBuffer() {
    if (!this.isRecording || this.audioBuffer.length === 0) return;

    // 检查是否超过静音时长
    const now = Date.now();
    const isSilent = now - this.lastVoiceTime > this.silenceDuration;

    if (isSilent && this.audioBuffer.length > 0) {
      // 发送音频数据
      this.sendAudioData(this.audioBuffer);
      // 清空缓冲区
      this.audioBuffer = new Float32Array(0);
    } else if (this.audioBuffer.length >= this.maxBufferSize / 2) {
      // 缓冲区达到一半大小时发送
      this.sendAudioData(this.audioBuffer);
      this.audioBuffer = new Float32Array(0);
    }
  }

  private sendAudioData(buffer: Float32Array) {
    if (!this.realtimeService || !this.realtimeService.isConnected()) return;

    try {
      // 转换为PCM16格式
      const pcmData = this.convertFloat32ToPCM16(buffer);
      // 编码为Base64
      const base64Data = this.arrayBufferToBase64(pcmData.buffer);
      // 发送音频数据
      this.realtimeService.sendAudioData(base64Data);
    } catch (error) {
      console.error('Error sending audio data:', error);
    }
  }

  private convertFloat32ToPCM16(buffer: Float32Array): Uint16Array {
    const pcm16 = new Uint16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      pcm16[i] = (s < 0 ? s * 0x8000 : s * 0x7FFF) + 0x8000;
    }
    return pcm16;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async stop() {
    if (!this.isRecording) {
      console.log('Audio recording not started');
      return;
    }

    // 清除处理间隔
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // 发送剩余的音频数据
    if (this.audioBuffer.length > 0) {
      this.sendAudioData(this.audioBuffer);
      this.audioBuffer = new Float32Array(0);
    }

    // 停止脚本处理器
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    // 停止音频源
    if (this.audioSource) {
      this.audioSource.disconnect();
      this.audioSource = null;
    }

    // 关闭音频上下文
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    // 停止媒体流
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.isRecording = false;
    this.lastVoiceTime = 0;

    console.log('Audio recording stopped');
  }

  async restart() {
    await this.stop();
    await this.start();
  }

  isActive(): boolean {
    return this.isRecording;
  }

  setRealtimeService(realtimeService: RealtimeService) {
    this.realtimeService = realtimeService;
  }

  setSilenceThreshold(threshold: number) {
    this.silenceThreshold = threshold;
  }

  setSilenceDuration(duration: number) {
    this.silenceDuration = duration;
  }

  setSampleRate(rate: number) {
    if (!this.isRecording) {
      this.sampleRate = rate;
    }
  }

  getStats() {
    return {
      isRecording: this.isRecording,
      bufferSize: this.audioBuffer.length,
      sampleRate: this.sampleRate,
      lastVoiceTime: this.lastVoiceTime,
      silenceDuration: this.silenceDuration,
      silenceThreshold: this.silenceThreshold
    };
  }
}

export default AudioProcessor;