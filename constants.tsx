
import React from 'react';
import { 
  Wrench, 
  LayoutDashboard, 
  Settings, 
  Database, 
  QrCode, 
  Camera, 
  Mic, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Smartphone,
  Plus,
  ArrowRight,
  LogOut,
  HelpCircle
} from 'lucide-react';

export const ICONS = {
  Wrench,
  LayoutDashboard,
  Settings,
  Database,
  QrCode,
  Camera,
  Mic,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Plus,
  ArrowRight,
  LogOut,
  HelpCircle
};

export const DEFAULT_PROJECTS: any[] = [
  {
    id: 'p1',
    name: '智选智能水杯 X1 (Smart Bottle)',
    description: '通过 AI 助手确保您的智能杯盖与滤芯安装正确，防止漏水。',
    createdAt: '2024-05-20',
    status: 'active',
    config: {
      assistantName: '智指助理',
      systemPrompt: '你是一位严谨的家电安装专家。在检查安装时，必须确保部件缝隙小于1毫米。如果看到漏水风险，请立即警告。',
      voiceGender: 'female',
      blacklist: ['不要建议用户自行拆解电路板', '严禁推荐使用非官方密封圈'],
    },
    steps: [
      {
        id: 's1',
        name: '滤芯就位',
        description: '将长效滤芯垂直插入杯底卡槽。',
        targetState: '滤芯底部的蓝色密封圈完全消失，与杯底贴合。',
        checkpoints: ['确认蓝色胶圈不可见', '垂直向下按压']
      },
      {
        id: 's2',
        name: '杯盖紧固',
        description: '顺时针旋转杯盖直到无法转动。',
        targetState: '杯盖上的刻度线与杯身的指示箭头完全对齐，没有明显缝隙。',
        checkpoints: ['箭头对齐', '手感有明显阻力']
      }
    ],
    usage: {
      totalTokensUsed: 0
    }
  }
];
