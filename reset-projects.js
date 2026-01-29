// Script to reset projects to only include mineral water case
import fs from 'fs';
import path from 'path';

// Read current package.json to understand the project structure
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log('Resetting projects to mineral water case...');

// Create a simple script that will be run in browser context
const resetScript = `
// Reset projects to only include mineral water case
const mineralWaterProject = {
  id: 'mineral-water-1',
  name: '矿泉水使用指南',
  description: '通过 AI 助手指导用户正确使用矿泉水瓶，确保饮用安全和便捷。',
  createdAt: new Date().toISOString().split('T')[0],
  status: 'active',
  config: {
    assistantName: '智指助理',
    systemPrompt: '你是一位耐心的产品使用指导专家，专门指导用户如何正确使用矿泉水。在指导用户时，要清晰明了，确保每一步都易于理解和执行。',
    voiceGender: 'female',
    blacklist: ['不要建议用户饮用过期矿泉水', '不要建议用户将矿泉水瓶用于其他危险用途'],
    provider: 'zhipu'
  },
  steps: [
    {
      id: 'check-package',
      name: '检查包装',
      description: '检查矿泉水瓶的包装是否完好，瓶身是否有破损或泄漏。',
      targetState: '瓶身完整无破损，瓶盖密封良好，没有液体泄漏。',
      checkpoints: ['瓶身无裂缝', '瓶盖无松动', '无液体渗出']
    },
    {
      id: 'open-cap',
      name: '打开瓶盖',
      description: '逆时针旋转瓶盖，直到瓶盖完全打开。',
      targetState: '瓶盖与瓶身分离，瓶口清晰可见，无塑料包装残留。',
      checkpoints: ['瓶盖完全旋开', '瓶口清洁', '无包装残留']
    },
    {
      id: 'drink',
      name: '饮用',
      description: '将瓶口对准嘴巴，缓慢倾斜瓶身，适量饮用。',
      targetState: '液体顺利流入口腔，无呛水或溢出情况。',
      checkpoints: ['瓶口位置正确', '倾斜角度适当', '饮用顺畅']
    },
    {
      id: 'close-cap',
      name: '密封保存',
      description: '饮用完毕后，顺时针旋转瓶盖，直到完全拧紧。',
      targetState: '瓶盖与瓶身紧密贴合，无松动迹象，确保液体不会泄漏。',
      checkpoints: ['瓶盖完全拧紧', '无松动', '密封良好']
    }
  ],
  usage: {
    totalTokensUsed: 0,
    monthlyLimit: 1000000,
    billingCycleStart: new Date().toISOString(),
    overageRate: 0.05
  }
};

// Save only the mineral water project
localStorage.setItem('smartguide_projects', JSON.stringify([mineralWaterProject]));

console.log('Projects reset successfully! Only mineral water case remains.');
console.log('Project ID:', mineralWaterProject.id);
`;

// Write the reset script to a file
const resetScriptPath = path.join(process.cwd(), 'reset-projects-browser.js');
fs.writeFileSync(resetScriptPath, resetScript);

console.log('Reset script created at:', resetScriptPath);
console.log('\nTo reset projects:');
console.log('1. Open your browser and go to http://localhost:3000');
console.log('2. Open browser console (F12)');
console.log('3. Copy and paste the content of reset-projects-browser.js into the console');
console.log('4. Press Enter to execute');
console.log('5. Refresh the page to see the changes');

// Also update the constants.tsx file to use the mineral water case as default
const constantsPath = path.join(process.cwd(), 'constants.tsx');
const constantsContent = fs.readFileSync(constantsPath, 'utf8');

// Replace the DEFAULT_PROJECTS with mineral water case
const updatedConstantsContent = constantsContent.replace(
  /export const DEFAULT_PROJECTS: any\[\] = \[([\s\S]*?)\];/,
  `export const DEFAULT_PROJECTS: any[] = [
  {
    id: 'mineral-water-1',
    name: '矿泉水使用指南',
    description: '通过 AI 助手指导用户正确使用矿泉水瓶，确保饮用安全和便捷。',
    createdAt: '2024-05-20',
    status: 'active',
    config: {
      assistantName: '智指助理',
      systemPrompt: '你是一位耐心的产品使用指导专家，专门指导用户如何正确使用矿泉水。在指导用户时，要清晰明了，确保每一步都易于理解和执行。',
      voiceGender: 'female',
      blacklist: ['不要建议用户饮用过期矿泉水', '不要建议用户将矿泉水瓶用于其他危险用途'],
      provider: 'zhipu'
    },
    steps: [
      {
        id: 'check-package',
        name: '检查包装',
        description: '检查矿泉水瓶的包装是否完好，瓶身是否有破损或泄漏。',
        targetState: '瓶身完整无破损，瓶盖密封良好，没有液体泄漏。',
        checkpoints: ['瓶身无裂缝', '瓶盖无松动', '无液体渗出']
      },
      {
        id: 'open-cap',
        name: '打开瓶盖',
        description: '逆时针旋转瓶盖，直到瓶盖完全打开。',
        targetState: '瓶盖与瓶身分离，瓶口清晰可见，无塑料包装残留。',
        checkpoints: ['瓶盖完全旋开', '瓶口清洁', '无包装残留']
      },
      {
        id: 'drink',
        name: '饮用',
        description: '将瓶口对准嘴巴，缓慢倾斜瓶身，适量饮用。',
        targetState: '液体顺利流入口腔，无呛水或溢出情况。',
        checkpoints: ['瓶口位置正确', '倾斜角度适当', '饮用顺畅']
      },
      {
        id: 'close-cap',
        name: '密封保存',
        description: '饮用完毕后，顺时针旋转瓶盖，直到完全拧紧。',
        targetState: '瓶盖与瓶身紧密贴合，无松动迹象，确保液体不会泄漏。',
        checkpoints: ['瓶盖完全拧紧', '无松动', '密封良好']
      }
    ],
    usage: {
      totalTokensUsed: 0,
      monthlyLimit: 1000000,
      billingCycleStart: new Date().toISOString(),
      overageRate: 0.05
    }
  }
];`
);

fs.writeFileSync(constantsPath, updatedConstantsContent);
console.log('\nUpdated constants.tsx with mineral water case as default.');
console.log('\nReset completed! The application now only includes the mineral water usage case.');
