import RealtimeService from './RealtimeService.ts';

class VideoProcessor {
  private videoStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private realtimeService: RealtimeService | null = null;
  private isCapturing: boolean = false;
  private captureInterval: NodeJS.Timeout | null = null;
  private frameRate: number = 10;
  private resolution: { width: number; height: number } = { width: 640, height: 480 };
  private quality: number = 0.7;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private droppedFrames: number = 0;
  private useFallback: boolean = false;
  private fallbackImage: string | null = null;
  private useVirtualAvatar: boolean = false;
  private avatarType: string = 'default'; // default, custom, brand
  private avatarImage: string | null = null;
  private animationFrame: number = 0;
  private isSpeaking: boolean = false;

  constructor(realtimeService?: RealtimeService) {
    this.realtimeService = realtimeService;
  }

  async start(videoElement: HTMLVideoElement, realtimeService?: RealtimeService, options?: {
    useFallback?: boolean;
    fallbackImage?: string;
    brandLogo?: string;
    customAvatar?: string;
    useVirtualAvatar?: boolean;
    avatarType?: string;
    avatarImage?: string;
  }) {
    if (this.isCapturing) {
      console.log('Video capture already started');
      return;
    }

    if (realtimeService) {
      this.realtimeService = realtimeService;
    }

    if (!this.realtimeService) {
      throw new Error('RealtimeService is required');
    }

    if (!videoElement) {
      throw new Error('Video element is required');
    }

    this.videoElement = videoElement;
    this.useFallback = options?.useFallback || options?.useVirtualAvatar || false;
    // 优先使用自定义角色，然后是fallback图像，最后是品牌Logo
    this.fallbackImage = options?.customAvatar || options?.avatarImage || options?.fallbackImage || options?.brandLogo || null;
    this.useVirtualAvatar = options?.useVirtualAvatar || false;
    this.avatarType = options?.avatarType || 'default';
    this.avatarImage = options?.avatarImage || options?.brandLogo || null;

    try {
      // 创建canvas用于捕获帧
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.resolution.width;
      this.canvas.height = this.resolution.height;
      this.ctx = this.canvas.getContext('2d');

      if (!this.ctx) {
        throw new Error('Failed to get canvas context');
      }

      if (this.useVirtualAvatar) {
        // 使用虚拟角色模式
        console.log('Starting video capture with virtual avatar (no camera required)');
        
        // 绘制虚拟角色
        this.drawVirtualAvatar();
        
        // 设置视频元素显示虚拟角色
        this.updateVideoElementWithAvatar();
      } else if (this.useFallback) {
        // 使用fallback模式，不需要摄像头
        console.log('Starting video capture in fallback mode (no camera required)');
        
        // 绘制默认图像或品牌Logo
        this.drawFallbackImage();
        
        // 设置视频元素显示fallback图像
        this.updateVideoElementWithFallback();
      } else {
        // 正常模式，使用摄像头
        // 请求摄像头权限
        this.videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: {
              ideal: this.resolution.width,
              max: 1280
            },
            height: {
              ideal: this.resolution.height,
              max: 720
            },
            frameRate: {
              ideal: this.frameRate,
              max: 30
            },
            facingMode: 'user' // 前置摄像头
          }
        });

        // 设置视频源
        this.videoElement.srcObject = this.videoStream;
        this.videoElement.autoplay = true;
        this.videoElement.playsInline = true;
        this.videoElement.muted = true;
      }

      // 开始捕获帧
      this.startCaptureLoop();

      this.isCapturing = true;
      this.lastFrameTime = Date.now();
      this.frameCount = 0;
      this.droppedFrames = 0;

      console.log('Video capture started');
      return true;
    } catch (error) {
      console.error('Error starting video capture:', error);
      
      // 如果摄像头失败，自动切换到虚拟角色模式
      console.log('Switching to virtual avatar mode due to camera error');
      this.useVirtualAvatar = true;
      
      // 创建canvas用于捕获帧
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.resolution.width;
      this.canvas.height = this.resolution.height;
      this.ctx = this.canvas.getContext('2d');

      if (!this.ctx) {
        this.stop();
        throw error;
      }

      // 绘制虚拟角色
      this.drawVirtualAvatar();
      
      // 设置视频元素显示虚拟角色
      this.updateVideoElementWithAvatar();
      
      // 开始捕获帧
      this.startCaptureLoop();

      this.isCapturing = true;
      this.lastFrameTime = Date.now();
      this.frameCount = 0;
      this.droppedFrames = 0;

      console.log('Video capture started with virtual avatar');
      return true;
    }
  }

  private startCaptureLoop() {
    const intervalMs = 1000 / this.frameRate;

    this.captureInterval = setInterval(() => {
      this.captureFrame();
    }, intervalMs);
  }

  private captureFrame() {
    if (!this.isCapturing || !this.ctx || !this.realtimeService) {
      return;
    }

    try {
      const now = Date.now();
      const elapsed = now - this.lastFrameTime;

      // 检查是否需要捕获帧（基于帧率控制）
      if (elapsed < 1000 / this.frameRate) {
        this.droppedFrames++;
        return;
      }

      if (this.useVirtualAvatar) {
        // 虚拟角色模式：更新角色动画
        this.updateAvatarAnimation();
      } else if (this.useFallback) {
        // Fallback模式：使用预绘制的图像
        // 不需要重新绘制，直接使用已有的canvas内容
      } else if (this.videoElement) {
        // 正常模式：绘制视频帧到canvas
        this.ctx.drawImage(
          this.videoElement, 
          0, 0, 
          this.canvas!.width, 
          this.canvas!.height
        );
      }

      // 转换为base64
      const imageData = this.canvas!.toDataURL('image/jpeg', this.quality);
      const base64Data = imageData.split(',')[1];

      // 发送视频帧
      this.sendVideoFrame(base64Data);

      this.lastFrameTime = now;
      this.frameCount++;

    } catch (error) {
      console.error('Error capturing video frame:', error);
      this.droppedFrames++;
    }
  }

  private drawVirtualAvatar() {
    if (!this.ctx || !this.canvas) {
      return;
    }

    // 清空canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.avatarImage) {
      // 使用提供的头像图像
      const img = new Image();
      img.onload = () => {
        // 计算缩放比例，保持图像比例
        const scale = Math.min(
          this.canvas.width / img.width,
          this.canvas.height / img.height,
          0.8 // 留一些边距
        );
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (this.canvas.width - scaledWidth) / 2;
        const y = (this.canvas.height - scaledHeight) / 2;

        // 绘制头像
        this.ctx!.drawImage(img, x, y, scaledWidth, scaledHeight);
      };
      img.onerror = () => {
        // 如果图像加载失败，绘制默认虚拟角色
        this.drawDefaultAvatar();
      };
      img.src = this.avatarImage;
    } else {
      // 绘制默认虚拟角色
      this.drawDefaultAvatar();
    }
  }

  private drawDefaultAvatar() {
    if (!this.ctx || !this.canvas) {
      return;
    }

    // 清空canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制背景渐变
    const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    gradient.addColorStop(0, '#f0f4f8');
    gradient.addColorStop(1, '#e2e8f0');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制虚拟角色头部
    this.ctx.fillStyle = '#ffdbac';
    this.ctx.beginPath();
    this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, 80, 0, Math.PI * 2);
    this.ctx.fill();

    // 绘制头发
    this.ctx.fillStyle = '#333';
    this.ctx.beginPath();
    this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2 - 30, 90, 0, Math.PI * 2);
    this.ctx.fill();

    // 绘制眼睛
    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    this.ctx.arc(this.canvas.width / 2 - 30, this.canvas.height / 2, 20, 0, Math.PI * 2);
    this.ctx.arc(this.canvas.width / 2 + 30, this.canvas.height / 2, 20, 0, Math.PI * 2);
    this.ctx.fill();

    // 绘制瞳孔
    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.arc(this.canvas.width / 2 - 30, this.canvas.height / 2, 10, 0, Math.PI * 2);
    this.ctx.arc(this.canvas.width / 2 + 30, this.canvas.height / 2, 10, 0, Math.PI * 2);
    this.ctx.fill();

    // 绘制嘴巴（根据说话状态）
    if (this.isSpeaking) {
      // 说话时的嘴巴
      this.ctx.fillStyle = 'black';
      this.ctx.beginPath();
      this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2 + 40, 15, 0, Math.PI);
      this.ctx.fill();
    } else {
      // 正常时的嘴巴
      this.ctx.strokeStyle = 'black';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2 + 40, 15, 0, Math.PI);
      this.ctx.stroke();
    }

    // 绘制身体
    this.ctx.fillStyle = '#3b82f6';
    this.ctx.fillRect(this.canvas.width / 2 - 60, this.canvas.height / 2 + 80, 120, 100);

    // 绘制底部文字
    this.ctx.fillStyle = '#64748b';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('AI Assistant', this.canvas.width / 2, this.canvas.height - 40);
  }

  private updateAvatarAnimation() {
    if (!this.ctx || !this.canvas) {
      return;
    }

    // 更新动画帧
    this.animationFrame = (this.animationFrame + 1) % 360;

    // 重新绘制虚拟角色
    this.drawVirtualAvatar();

    // 添加简单的动画效果
    if (this.isSpeaking) {
      // 说话时的动画效果
      const scale = 1 + Math.sin(this.animationFrame * Math.PI / 180) * 0.05;
      this.ctx.save();
      this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
      this.ctx.scale(scale, scale);
      this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
      this.drawVirtualAvatar();
      this.ctx.restore();
    }
  }

  private updateVideoElementWithAvatar() {
    if (!this.videoElement || !this.canvas) {
      return;
    }

    // 将canvas内容转换为data URL并设置为视频元素的源
    const imageData = this.canvas.toDataURL('image/jpeg', this.quality);
    
    // 创建一个静态图像作为视频元素的源
    this.videoElement.src = imageData;
    this.videoElement.autoplay = false;
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;
  }

  // 设置说话状态，用于动画效果
  setSpeaking(isSpeaking: boolean) {
    this.isSpeaking = isSpeaking;
  }

  // 设置虚拟角色图像
  setAvatarImage(avatarImage: string) {
    this.avatarImage = avatarImage;
    if (this.useVirtualAvatar && this.isCapturing) {
      this.drawVirtualAvatar();
    }
  }

  // 切换到虚拟角色模式
  async switchToVirtualAvatar(avatarImage?: string) {
    if (this.isCapturing) {
      await this.stop();
    }

    this.useVirtualAvatar = true;
    this.useFallback = false;
    if (avatarImage) {
      this.avatarImage = avatarImage;
    }

    if (this.videoElement) {
      await this.start(this.videoElement, this.realtimeService, {
        useVirtualAvatar: true,
        avatarImage: this.avatarImage
      });
    }
  }

  // 切换到摄像头模式
  async switchToCamera() {
    if (this.isCapturing) {
      await this.stop();
    }

    this.useVirtualAvatar = false;
    this.useFallback = false;

    if (this.videoElement) {
      await this.start(this.videoElement, this.realtimeService);
    }
  }

  private drawFallbackImage() {
    if (!this.ctx || !this.canvas) {
      return;
    }

    // 清空canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.fallbackImage) {
      // 使用提供的fallback图像或品牌Logo
      const img = new Image();
      img.onload = () => {
        // 计算缩放比例，保持图像比例
        const scale = Math.min(
          this.canvas.width / img.width,
          this.canvas.height / img.height,
          0.8 // 留一些边距
        );
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (this.canvas.width - scaledWidth) / 2;
        const y = (this.canvas.height - scaledHeight) / 2;

        // 绘制图像
        this.ctx!.drawImage(img, x, y, scaledWidth, scaledHeight);
      };
      img.onerror = () => {
        // 如果图像加载失败，绘制默认图形
        this.drawDefaultFallback();
      };
      img.src = this.fallbackImage;
    } else {
      // 绘制默认图形
      this.drawDefaultFallback();
    }
  }

  private drawDefaultFallback() {
    if (!this.ctx || !this.canvas) {
      return;
    }

    // 清空canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制背景渐变
    const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    gradient.addColorStop(0, '#f0f4f8');
    gradient.addColorStop(1, '#e2e8f0');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制默认图标（聊天气泡）
    this.ctx.fillStyle = '#3b82f6';
    this.ctx.beginPath();
    this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, 60, 0, Math.PI * 2);
    this.ctx.fill();

    // 绘制消息图标
    this.ctx.fillStyle = 'white';
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('💬', this.canvas.width / 2, this.canvas.height / 2);

    // 绘制底部文字
    this.ctx.fillStyle = '#64748b';
    this.ctx.font = '16px Arial';
    this.ctx.fillText('AI Customer Support', this.canvas.width / 2, this.canvas.height - 40);
  }

  private updateVideoElementWithFallback() {
    if (!this.videoElement || !this.canvas) {
      return;
    }

    // 将canvas内容转换为data URL并设置为视频元素的源
    const imageData = this.canvas.toDataURL('image/jpeg', this.quality);
    
    // 创建一个静态图像作为视频元素的源
    this.videoElement.src = imageData;
    this.videoElement.autoplay = false;
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;
  }

  private sendVideoFrame(frameData: string) {
    if (!this.realtimeService || !this.realtimeService.isConnected()) {
      return;
    }

    try {
      this.realtimeService.sendVideoFrame(
        frameData,
        'jpeg',
        this.resolution.width,
        this.resolution.height
      );
    } catch (error) {
      console.error('Error sending video frame:', error);
      this.droppedFrames++;
    }
  }

  async stop() {
    if (!this.isCapturing) {
      console.log('Video capture not started');
      return;
    }

    // 清除捕获间隔
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    // 停止视频流
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }

    // 清除视频元素
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    // 清除canvas
    this.canvas = null;
    this.ctx = null;

    this.isCapturing = false;
    this.frameCount = 0;
    this.droppedFrames = 0;

    console.log('Video capture stopped');
  }

  async restart() {
    await this.stop();
    if (this.videoElement) {
      await this.start(this.videoElement);
    }
  }

  switchCamera() {
    if (!this.isCapturing) {
      console.log('Video capture not started');
      return;
    }

    // 获取当前摄像头方向
    const currentFacingMode = this.getFacingMode();
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

    // 重新启动捕获
    this.restartWithFacingMode(newFacingMode);
  }

  private async restartWithFacingMode(facingMode: string) {
    await this.stop();
    
    try {
      // 请求摄像头权限，指定方向
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: {
            ideal: this.resolution.width,
            max: 1280
          },
          height: {
            ideal: this.resolution.height,
            max: 720
          },
          frameRate: {
            ideal: this.frameRate,
            max: 30
          },
          facingMode: facingMode
        }
      });

      // 设置视频源
      if (this.videoElement) {
        this.videoElement.srcObject = this.videoStream;
      }

      // 重新开始捕获
      this.startCaptureLoop();
      this.isCapturing = true;
      this.lastFrameTime = Date.now();
      this.frameCount = 0;
      this.droppedFrames = 0;

      console.log(`Switched to ${facingMode} camera`);
    } catch (error) {
      console.error(`Error switching to ${facingMode} camera:`, error);
      // 尝试使用默认摄像头
      this.start(this.videoElement!);
    }
  }

  private getFacingMode(): string {
    // 简单实现，实际应该从mediaStream中获取
    return 'user'; // 默认返回前置摄像头
  }

  isActive(): boolean {
    return this.isCapturing;
  }

  setRealtimeService(realtimeService: RealtimeService) {
    this.realtimeService = realtimeService;
  }

  setFrameRate(rate: number) {
    if (rate > 0 && rate <= 30) {
      this.frameRate = rate;
      // 如果正在捕获，重新设置间隔
      if (this.isCapturing && this.captureInterval) {
        clearInterval(this.captureInterval);
        this.startCaptureLoop();
      }
    }
  }

  setResolution(width: number, height: number) {
    if (!this.isCapturing) {
      this.resolution = { width, height };
      // 更新canvas大小
      if (this.canvas) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
    }
  }

  setQuality(quality: number) {
    if (quality >= 0.1 && quality <= 1.0) {
      this.quality = quality;
    }
  }

  getStats() {
    const fps = this.frameCount / ((Date.now() - this.lastFrameTime) / 1000) || 0;
    const dropRate = this.frameCount > 0 ? (this.droppedFrames / (this.frameCount + this.droppedFrames)) * 100 : 0;

    return {
      isCapturing: this.isCapturing,
      frameRate: this.frameRate,
      actualFPS: Math.round(fps * 10) / 10,
      resolution: this.resolution,
      quality: this.quality,
      frameCount: this.frameCount,
      droppedFrames: this.droppedFrames,
      dropRate: Math.round(dropRate * 10) / 10
    };
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }
}

export default VideoProcessor;