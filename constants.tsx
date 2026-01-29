
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
  HelpCircle,
  MessageSquare,
  Video
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
  HelpCircle,
  MessageSquare,
  Video
};


export const DEFAULT_PROJECTS: any[] = [
  {
    id: 'p1',
    name: '矿泉水使用指南 (Mineral Water)',
    description: '通过 AI 助手指导用户正确使用矿泉水瓶，确保饮用安全和便捷。',
    createdAt: '2024-05-20',
    status: 'active',
    config: {
      assistantName: '智指助理',
      systemPrompt: '你是一位耐心的产品使用指导专家。在指导用户时，要清晰明了，确保每一步都易于理解和执行。',
      voiceGender: 'female',
      blacklist: ['不要建议用户饮用过期矿泉水', '不要建议用户将矿泉水瓶用于其他危险用途'],
    },
    steps: [
      {
        id: 's1',
        name: '检查包装',
        description: '检查矿泉水瓶的包装是否完好，瓶身是否有破损或泄漏。',
        targetState: '瓶身完整无破损，瓶盖密封良好，没有液体泄漏。',
        checkpoints: ['瓶身无裂缝', '瓶盖无松动', '无液体渗出']
      },
      {
        id: 's2',
        name: '拧开瓶盖',
        description: '逆时针旋转瓶盖，直到瓶盖完全打开。',
        targetState: '瓶盖与瓶身分离，瓶口清晰可见，无塑料包装残留。',
        checkpoints: ['瓶盖完全旋开', '瓶口清洁', '无包装残留']
      },
      {
        id: 's3',
        name: '饮用准备',
        description: '将瓶口对准嘴巴，保持适当角度，准备饮用。',
        targetState: '瓶口与嘴巴接触适当，瓶身倾斜角度合理，不会导致液体溢出。',
        checkpoints: ['瓶口位置正确', '倾斜角度适当', '准备就绪']
      },
      {
        id: 's4',
        name: '饮用',
        description: '缓慢倾斜瓶身，让水流入口中，适量饮用。',
        targetState: '液体顺利流入口腔，无呛水或溢出情况。',
        checkpoints: ['水流速度适中', '无呛水', '无溢出']
      },
      {
        id: 's5',
        name: '密封保存',
        description: '饮用完毕后，顺时针旋转瓶盖，直到完全拧紧。',
        targetState: '瓶盖与瓶身紧密贴合，无松动迹象，确保液体不会泄漏。',
        checkpoints: ['瓶盖完全拧紧', '无松动', '密封良好']
      }
    ],
    usage: {
      totalTokensUsed: 0
    }
  }
];
