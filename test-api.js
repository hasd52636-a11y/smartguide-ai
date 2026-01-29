import fetch from 'node-fetch';

// 测试智谱AI API功能
async function testZhipuAPI() {
  console.log('=== 测试智谱AI API功能 ===\n');
  
  // 测试1: 获取音色列表
  console.log('1. 测试获取音色列表...');
  try {
    const response = await fetch('http://localhost:3001/api/proxy/zhipu/voice/list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('✓ 获取音色列表成功');
    console.log(`  音色数量: ${data.voice_list?.length || 0}`);
    if (data.voice_list && data.voice_list.length > 0) {
      console.log('  前3个音色:', data.voice_list.slice(0, 3).map(v => v.voice_name || v.voice).join(', '));
    }
  } catch (error) {
    console.log('✗ 获取音色列表失败:', error.message);
  }
  
  // 测试2: 文本转语音
  console.log('\n2. 测试文本转语音...');
  try {
    const response = await fetch('http://localhost:3001/api/proxy/zhipu/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'glm-tts',
        input: '我是AI时代的售后助手！',
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
  
  // 测试3: 聊天功能
  console.log('\n3. 测试聊天功能...');
  try {
    const response = await fetch('http://localhost:3001/api/proxy/zhipu/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          {
            role: 'system',
            content: '你是一个智能助手'
          },
          {
            role: 'user',
            content: '你好，你是谁？'
          }
        ],
        temperature: 0.7,
        stream: false
      })
    });
    
    const data = await response.json();
    console.log('✓ 聊天功能成功');
    console.log('  回复:', data.choices?.[0]?.message?.content || '无回复');
  } catch (error) {
    console.log('✗ 聊天功能失败:', error.message);
  }
  
  console.log('\n=== 测试完成 ===');
}

// 运行测试
testZhipuAPI().catch(console.error);
