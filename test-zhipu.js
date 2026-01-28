// Test script to verify Zhipu AI API connection
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const ZHIPU_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const API_KEY = process.env.ZHIPU_API_KEY || "";

// Test function to check Zhipu AI connection
async function testZhipuConnection() {
  console.log('Testing Zhipu AI API connection...');
  console.log('API Key:', API_KEY ? 'Configured' : 'Not configured');
  
  if (!API_KEY) {
    console.error('Error: ZHIPU_API_KEY is not configured');
    return false;
  }
  
  try {
    const response = await fetch(ZHIPU_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "glm-4",
        messages: [
          {
            role: "user",
            content: "Hello, test connection"
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error:', errorData.error || response.statusText);
      return false;
    }
    
    const data = await response.json();
    console.log('Connection successful!');
    console.log('Response:', data);
    return true;
    
  } catch (error) {
    console.error('Connection error:', error.message);
    return false;
  }
}

// Run test
testZhipuConnection().then(success => {
  console.log('Test result:', success ? 'PASSED' : 'FAILED');
});
