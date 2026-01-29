
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
  Video,
  Trash,
  Volume2,
  Clock
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
  Video,
  Trash,
  Volume2,
  Clock
};


export const DEFAULT_PROJECTS: any[] = [
  {
    id: 'mineral-water-1',
    name: '清泉矿泉水使用指南',
    description: '通过 AI 助手指导用户正确使用清泉矿泉水，确保饮用安全和便捷，享受纯净健康的饮水体验。',
    createdAt: '2024-05-20',
    status: 'active',
    config: {
      assistantName: '清泉助手',
      systemPrompt: '你是一位专业的饮用水指导专家，专门指导用户如何正确使用清泉矿泉水。在指导用户时，要清晰明了，确保每一步都易于理解和执行，同时传递清泉品牌的健康理念。',
      voiceGender: 'female',
      blacklist: ['不要建议用户饮用过期矿泉水', '不要建议用户将矿泉水瓶用于其他危险用途'],
      provider: 'zhipu',
      greeting: '亲爱的顾客你好，我是清泉助手，您的饮用水专家，有任何产品疑问我都可以帮您解答哦！',
      brandLogo: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=clean%20mineral%20water%20bottle%20logo%20with%20blue%20water%20drop%20symbol%20and%20green%20leaf%2C%20clean%20modern%20design&image_size=square',
      brandInfo: {
        name: '清泉矿泉水',
        slogan: '纯净源于自然，健康伴随生活',
        positioning: '高端天然矿泉水，为健康生活提供纯净水源',
        identity: '致力于为消费者提供高品质的天然矿泉水，源自深层地下水源，经过多重过滤和净化工艺，保留天然矿物质，不含任何添加剂。',
        productInfo: {
          name: '清泉天然矿泉水',
          type: '天然矿泉水',
          source: '深层地下水源，源自无污染的山区',
          minerals: '富含钙、镁、钾等天然矿物质',
          packaging: '环保PET瓶，500ml标准装',
          shelfLife: '18个月'
        }
      }
    },
    steps: [
      {
        id: 'check-package',
        name: '检查包装',
        description: '检查清泉矿泉水瓶的包装是否完好，瓶身是否有破损或泄漏，查看生产日期和保质期。',
        targetState: '瓶身完整无破损，瓶盖密封良好，没有液体泄漏，生产日期清晰，在保质期内。',
        checkpoints: ['瓶身无裂缝', '瓶盖无松动', '无液体渗出', '生产日期清晰', '在保质期内']
      },
      {
        id: 'open-cap',
        name: '打开瓶盖',
        description: '逆时针旋转瓶盖，直到瓶盖完全打开，注意不要用力过猛，避免液体溅出。',
        targetState: '瓶盖与瓶身分离，瓶口清晰可见，无塑料包装残留，无液体溅出。',
        checkpoints: ['瓶盖完全旋开', '瓶口清洁', '无包装残留', '无液体溅出']
      },
      {
        id: 'check-quality',
        name: '检查水质',
        description: '观察瓶中水质是否清澈透明，无悬浮物或沉淀物，闻一闻是否有异味。',
        targetState: '水质清澈透明，无悬浮物或沉淀物，无异味，符合国家饮用水标准。',
        checkpoints: ['水质清澈透明', '无悬浮物', '无沉淀物', '无异味']
      },
      {
        id: 'drink',
        name: '饮用',
        description: '将瓶口对准嘴巴，缓慢倾斜瓶身，适量饮用，感受清泉矿泉水的纯净口感。',
        targetState: '液体顺利流入口腔，无呛水或溢出情况，口感清爽甘甜，无异味。',
        checkpoints: ['瓶口位置正确', '倾斜角度适当', '饮用顺畅', '口感清爽', '无异味']
      },
      {
        id: 'close-cap',
        name: '密封保存',
        description: '饮用完毕后，顺时针旋转瓶盖，直到完全拧紧，确保密封良好。',
        targetState: '瓶盖与瓶身紧密贴合，无松动迹象，确保液体不会泄漏，便于携带和保存。',
        checkpoints: ['瓶盖完全拧紧', '无松动', '密封良好', '便于携带']
      },
      {
        id: 'recycle',
        name: '环保回收',
        description: '使用完毕后，将空瓶投入可回收垃圾桶，支持环保事业。',
        targetState: '空瓶已正确投入可回收垃圾桶，符合环保要求。',
        checkpoints: ['空瓶已回收', '投入可回收垃圾桶', '符合环保要求']
      }
    ],
    knowledgeBase: [
      {
        id: 'kb-1',
        title: '清泉矿泉水的水源地',
        content: '清泉矿泉水源自于海拔1000米以上的无污染山区，深层地下水源经过天然过滤和矿化，富含多种对人体有益的矿物质。',
        type: '文本',
        date: '2024-05-20',
        summary: '介绍清泉矿泉水的水源地和水质特点'
      },
      {
        id: 'kb-2',
        title: '矿泉水与纯净水的区别',
        content: '矿泉水是从地下深处自然涌出的或经人工揭露的、未受污染的地下矿水，含有一定量的矿物盐、微量元素或二氧化碳气体。纯净水则是通过蒸馏、反渗透等技术净化处理后的水，不含任何矿物质。',
        type: '文本',
        date: '2024-05-20',
        summary: '对比矿泉水与纯净水的区别'
      },
      {
        id: 'kb-3',
        title: '正确保存矿泉水的方法',
        content: '1. 避免阳光直射，存放在阴凉干燥处；2. 避免高温环境，不要放在汽车后备箱等高温场所；3. 开封后尽快饮用，避免长时间存放；4. 不要重复使用矿泉水瓶盛装其他液体；5. 注意查看保质期，过期的矿泉水不宜饮用。',
        type: '文本',
        date: '2024-05-20',
        summary: '介绍正确保存矿泉水的方法'
      }
    ],
    usage: {
      totalTokensUsed: 0,
      monthlyLimit: 1000000,
      billingCycleStart: new Date().toISOString(),
      overageRate: 0.05
    }
  }
];
