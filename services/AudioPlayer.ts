class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioBuffer: Float32Array = new Float32Array(0);
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private volume: number = 1.0;
  private sampleRate: number = 24000;
  private bufferSize: number = 8192;
  private playInterval: NodeJS.Timeout | null = null;
  private minBufferSize: number = 4096;
  private maxBufferSize: number = 32768;
  private lastPlayTime: number = 0;
  private playedSamples: number = 0;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    try {
      // 创建音频上下文
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate
      });

      // 创建增益节点
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.volume;

      console.log('Audio context initialized with sample rate:', this.sampleRate);
    } catch (error) {
      console.error('Error initializing audio context:', error);
      this.audioContext = null;
    }
  }

  async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('Audio context resumed');
      } catch (error) {
        console.error('Error resuming audio context:', error);
      }
    }
  }

  processAudioDelta(audioData: string) {
    if (!this.audioContext) {
      this.initAudioContext();
      if (!this.audioContext) {
        console.error('Audio context not available');
        return;
      }
    }

    try {
      // 解码Base64音频数据
      const binaryData = atob(audioData);
      const byteArray = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        byteArray[i] = binaryData.charCodeAt(i);
      }

      // 转换为PCM16格式
      const pcm16Array = this.uint8ToUint16(byteArray);
      // 转换为Float32格式
      const float32Array = this.uint16ToFloat32(pcm16Array);

      // 添加到音频缓冲区
      this.appendToBuffer(float32Array);

      // 如果当前没有播放，且缓冲区足够大，开始播放
      if (!this.isPlaying && this.audioBuffer.length >= this.minBufferSize) {
        this.startPlaying();
      }
    } catch (error) {
      console.error('Error processing audio delta:', error);
    }
  }

  private uint8ToUint16(uint8Array: Uint8Array): Uint16Array {
    const length = uint8Array.length / 2;
    const uint16Array = new Uint16Array(length);
    
    for (let i = 0; i < length; i++) {
      uint16Array[i] = (uint8Array[i * 2] | (uint8Array[i * 2 + 1] << 8));
    }
    
    return uint16Array;
  }

  private uint16ToFloat32(uint16Array: Uint16Array): Float32Array {
    const float32Array = new Float32Array(uint16Array.length);
    
    for (let i = 0; i < uint16Array.length; i++) {
      float32Array[i] = (uint16Array[i] - 32768) / 32768;
    }
    
    return float32Array;
  }

  private appendToBuffer(data: Float32Array) {
    const newLength = this.audioBuffer.length + data.length;
    const newBuffer = new Float32Array(newLength);
    
    newBuffer.set(this.audioBuffer);
    newBuffer.set(data, this.audioBuffer.length);
    
    // 限制缓冲区大小
    if (newLength > this.maxBufferSize) {
      this.audioBuffer = newBuffer.slice(newLength - this.maxBufferSize);
    } else {
      this.audioBuffer = newBuffer;
    }
  }

  private startPlaying() {
    if (!this.audioContext || this.isPlaying) return;

    this.isPlaying = true;
    this.isPaused = false;
    this.lastPlayTime = Date.now();

    console.log('Starting audio playback with buffer size:', this.audioBuffer.length);

    // 开始播放循环
    this.playNextChunk();
  }

  private playNextChunk() {
    if (!this.audioContext || !this.isPlaying || this.isPaused) return;

    // 检查缓冲区是否有足够数据
    if (this.audioBuffer.length < this.bufferSize) {
      // 缓冲区不足，等待更多数据
      if (this.audioBuffer.length === 0) {
        // 缓冲区为空，停止播放
        this.stop();
        return;
      }
      // 继续等待
      setTimeout(() => this.playNextChunk(), 10);
      return;
    }

    try {
      // 提取要播放的数据
      const chunk = this.audioBuffer.slice(0, this.bufferSize);
      // 移除已播放的数据
      this.audioBuffer = this.audioBuffer.slice(this.bufferSize);

      // 创建音频缓冲区
      const buffer = this.audioContext.createBuffer(1, chunk.length, this.sampleRate);
      buffer.getChannelData(0).set(chunk);

      // 创建音频源
      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = buffer;

      // 连接节点
      if (!this.gainNode) {
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
        this.gainNode.gain.value = this.volume;
      }

      this.sourceNode.connect(this.gainNode);

      // 播放完成回调
      this.sourceNode.onended = () => {
        this.playedSamples += chunk.length;
        this.lastPlayTime = Date.now();
        this.playNextChunk();
      };

      // 开始播放
      this.sourceNode.start();
    } catch (error) {
      console.error('Error playing audio chunk:', error);
      this.stop();
    }
  }

  pause() {
    if (!this.isPlaying || this.isPaused) return;

    this.isPaused = true;
    if (this.sourceNode) {
      // 注意：AudioBufferSourceNode 不支持暂停，只能停止
      this.sourceNode.stop();
      this.sourceNode = null;
    }

    console.log('Audio playback paused');
  }

  resume() {
    if (!this.isPlaying || !this.isPaused) return;

    this.isPaused = false;
    console.log('Audio playback resumed');
    this.playNextChunk();
  }

  stop() {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.isPaused = false;

    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (error) {
        // 忽略已停止的节点错误
      }
      this.sourceNode = null;
    }

    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }

    // 清空缓冲区
    this.audioBuffer = new Float32Array(0);
    this.playedSamples = 0;

    console.log('Audio playback stopped');
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  getVolume(): number {
    return this.volume;
  }

  setSampleRate(rate: number) {
    if (!this.isPlaying) {
      this.sampleRate = rate;
      // 重新初始化音频上下文
      this.initAudioContext();
    }
  }

  getSampleRate(): number {
    return this.sampleRate;
  }

  getBufferSize(): number {
    return this.audioBuffer.length;
  }

  isActive(): boolean {
    return this.isPlaying;
  }

  getStats() {
    const playbackTime = this.playedSamples / this.sampleRate;
    const bufferFill = (this.audioBuffer.length / this.maxBufferSize) * 100;

    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      volume: this.volume,
      sampleRate: this.sampleRate,
      bufferSize: this.audioBuffer.length,
      maxBufferSize: this.maxBufferSize,
      bufferFillPercentage: Math.round(bufferFill * 10) / 10,
      playedSamples: this.playedSamples,
      playbackTime: Math.round(playbackTime * 100) / 100,
      lastPlayTime: this.lastPlayTime
    };
  }

  completePlayback() {
    // 音频流完成，播放剩余数据
    console.log('Audio stream completed, playing remaining buffer');
    if (this.audioBuffer.length > 0 && !this.isPlaying) {
      this.startPlaying();
    }
  }

  destroy() {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    console.log('Audio player destroyed');
  }
}

export default AudioPlayer;