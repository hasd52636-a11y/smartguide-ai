import fetch from 'node-fetch';

// 测试前端API密钥配置功能
async function testFrontendAPI() {
  console.log('=== 测试前端API密钥配置功能 ===\n');
  
  // 测试1: 使用请求头中的API密钥测试聊天功能
  console.log('1. 测试使用请求头中的API密钥...');
  try {
    const apiKey = 'a75d46768b0f45dc90a5969077ffc8d9.dT0t2tku3hZGfYkk';
    const response = await fetch('http://localhost:3001/api/proxy/zhipu/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-zhipu-api-key': apiKey
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          {
            role: 'user',
            content: '测试API密钥配置'
          }
        ],
        temperature: 0.7,
        stream: false
      })
    });
    
    const data = await response.json();
    console.log('✓ 使用请求头API密钥成功');
    console.log('  回复:', data.choices?.[0]?.message?.content || '无回复');
  } catch (error) {
    console.log('✗ 使用请求头API密钥失败:', error.message);
  }
  
  // 测试2: 测试获取音色列表
  console.log('\n2. 测试获取音色列表...');
  try {
    const apiKey = 'a75d46768b0f45dc90a5969077ffc8d9.dT0t2tku3hZGfYkk';
    const response = await fetch('http://localhost:3001/api/proxy/zhipu/voice/list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-zhipu-api-key': apiKey
      }
    });
    
    const data = await response.json();
    console.log('✓ 获取音色列表成功');
    console.log(`  音色数量: ${data.voice_list?.length || 0}`);
  } catch (error) {
    console.log('✗ 获取音色列表失败:', error.message);
  }
  
  // 测试3: 测试文本转语音
  console.log('\n3. 测试文本转语音...');
  try {
    const apiKey = 'a75d46768b0f45dc90a5969077ffc8d9.dT0t2tku3hZGfYkk';
    const response = await fetch('http://localhost:3001/api/proxy/zhipu/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-zhipu-api-key': apiKey
      },
      body: JSON.stringify({
        model: 'glm-tts',
        input: '测试前端API密钥配置',
        voice: 'tongtong',
        response_format: 'wav'
      })
    });
    
    if (response.ok) {
      const audioBlob = await response.blob();
      console.log('✓ 文本转语音成功');
      console.log(`  音频大小: ${audioBlob.size} bytes`);
    } else {
      const errorData = await response.json();
      console.log('✗ 文本转语音失败:', errorData.error?.message || '未知错误');
    }
  } catch (error) {
    console.log('✗ 文本转语音失败:', error.message);
  }
  
  console.log('\n=== 前端API密钥配置测试完成 ===');
}

// 运行测试
testFrontendAPI().catch(console.error);
