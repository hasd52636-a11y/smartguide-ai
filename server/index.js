
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import * as db from './db.js';
import { GoogleGenAI } from "@google/genai";
import multer from 'multer';
import fs from 'fs/promises';

// Environment variables
const PORT = process.env.PORT || 3001;
const API_KEY_GEMINI = process.env.API_KEY || ''; // Read from env
const API_KEY_ZHIPU = process.env.ZHIPU_API_KEY || "a75d46768b0f45dc90a5969077ffc8d9.dT0t2tku3hZGfYkk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// 文件上传配置
const uploadDir = path.join(__dirname, 'uploads');
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // 确保上传目录存在
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 限制
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.mp3', '.wav'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传 MP3 或 WAV 格式的文件'), false);
    }
  }
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Large limit for images
app.use(express.static(path.join(__dirname, '../dist')));
// 静态文件服务，用于访问上传的文件
app.use('/uploads', express.static(uploadDir));

// --- Project API ---

app.get('/api/projects', (req, res) => {
    try {
        const projects = db.getAllProjects();
        res.json(projects);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/projects', (req, res) => {
    try {
        const project = req.body;
        if (!project.id) throw new Error("Project ID required");
        db.saveProject(project);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- File Upload API ---

app.post('/api/upload/voice', upload.single('voice'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // 生成唯一的fileId
        const fileId = 'file_' + Date.now() + '_' + Math.round(Math.random() * 1E9);
        
        // 这里可以根据需要将文件信息存储到数据库
        // 暂时只返回fileId
        res.json({ 
            success: true, 
            fileId, 
            fileName: req.file.originalname,
            fileSize: req.file.size,
            filePath: req.file.path
        });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/upload/knowledge', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        
        // 处理上传的文件
        const uploadedFiles = [];
        const currentDate = new Date().toISOString().split('T')[0];
        
        for (const file of req.files) {
            // 生成唯一的fileId
            const fileId = 'kb_' + Date.now() + '_' + Math.round(Math.random() * 1E9);
            
            // 根据文件类型确定处理方式
            let fileType = 'text';
            let summary = 'Uploaded file';
            
            const ext = path.extname(file.originalname).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
                fileType = 'image';
                summary = 'Image file';
            } else if (['.mp4', '.avi', '.mov', '.wmv'].includes(ext)) {
                fileType = 'video';
                summary = 'Video file';
            } else if (['.pdf', '.doc', '.docx', '.txt'].includes(ext)) {
                fileType = 'text';
                summary = 'Document file';
            }
            
            uploadedFiles.push({
                id: fileId,
                type: fileType,
                filename: file.originalname,
                size: file.size,
                path: file.path,
                date: currentDate,
                summary: summary
            });
        }
        
        res.json({ 
            success: true, 
            files: uploadedFiles
        });
    } catch (error) {
        console.error('Knowledge file upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- AI Proxy API (Security Layer) ---

// Gemini Proxy
app.post('/api/proxy/gemini/chat', async (req, res) => {
    if (!API_KEY_GEMINI) return res.status(500).json({ error: "Server missing Gemini API Key" });

    try {
        const { model, contents, config } = req.body;
        const client = new GoogleGenAI({ apiKey: API_KEY_GEMINI });

        // Passthrough to Google
        const response = await client.models.generateContent({
            model: model || 'gemini-3-flash-preview',
            contents,
            config
        });

        // Standardize response for frontend
        res.json({
            text: response.text,
            usageMetadata: response.usageMetadata
        });
    } catch (e) {
        console.error("Gemini Proxy Error", e);
        res.status(500).json({ error: e.message });
    }
});

// Zhipu Proxy
app.post('/api/proxy/zhipu/chat', async (req, res) => {
    try {
        const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.headers['x-zhipu-api-key'] || API_KEY_ZHIPU}`
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error("Zhipu Proxy Error", e);
        res.status(500).json({ error: e.message });
    }
});

// Zhipu Embeddings Proxy
app.post('/api/proxy/zhipu/embeddings', async (req, res) => {
    try {
        const response = await fetch("https://open.bigmodel.cn/api/paas/v4/embeddings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.headers['x-zhipu-api-key'] || API_KEY_ZHIPU}`
            },
            body: JSON.stringify(req.body),
            timeout: 30000 // 30秒超时
        });

        if (response.ok) {
            const data = await response.json();
            res.json(data);
        } else {
            const errorData = await response.json();
            console.error("Zhipu Embeddings API Error:", errorData);
            res.status(500).json({ 
                error: errorData.error?.message || "API request failed",
                status: response.status,
                details: errorData
            });
        }
    } catch (e) {
        console.error("Zhipu Embeddings Proxy Error:", e);
        res.status(500).json({ 
            error: e.message,
            details: e.stack || "No stack trace available"
        });
    }
});

// Zhipu Text to Speech Proxy
app.post('/api/proxy/zhipu/speech', async (req, res) => {
    try {
        const response = await fetch("https://open.bigmodel.cn/api/paas/v4/audio/speech", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.headers['x-zhipu-api-key'] || API_KEY_ZHIPU}`
            },
            body: JSON.stringify(req.body),
            timeout: 60000 // 60秒超时
        });

        if (response.ok) {
            // 处理二进制音频响应
            const audioBuffer = await response.arrayBuffer();
            res.setHeader('Content-Type', 'audio/wav');
            res.send(Buffer.from(audioBuffer));
        } else {
            const errorData = await response.json();
            console.error("Zhipu TTS API Error:", errorData);
            res.status(500).json({ 
                error: errorData.error?.message || "API request failed",
                status: response.status,
                details: errorData
            });
        }
    } catch (e) {
        console.error("Zhipu TTS Proxy Error:", e);
        res.status(500).json({ 
            error: e.message,
            details: e.stack || "No stack trace available"
        });
    }
});

// Zhipu Voice Clone Proxy
app.post('/api/proxy/zhipu/voice/clone', async (req, res) => {
    try {
        const response = await fetch("https://open.bigmodel.cn/api/paas/v4/voice/clone", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.headers['x-zhipu-api-key'] || API_KEY_ZHIPU}`
            },
            body: JSON.stringify(req.body),
            timeout: 120000 // 120秒超时
        });

        if (response.ok) {
            const data = await response.json();
            res.json(data);
        } else {
            const errorData = await response.json();
            console.error("Zhipu Voice Clone API Error:", errorData);
            res.status(500).json({ 
                error: errorData.error?.message || "API request failed",
                status: response.status,
                details: errorData
            });
        }
    } catch (e) {
        console.error("Zhipu Voice Clone Proxy Error:", e);
        res.status(500).json({ 
            error: e.message,
            details: e.stack || "No stack trace available"
        });
    }
});

// Zhipu Voice List Proxy
app.get('/api/proxy/zhipu/voice/list', async (req, res) => {
    try {
        const { voiceName, voiceType } = req.query;
        let url = "https://open.bigmodel.cn/api/paas/v4/voice/list";
        
        // 构建查询参数
        const params = new URLSearchParams();
        if (voiceName) params.append('voiceName', voiceName);
        if (voiceType) params.append('voiceType', voiceType);
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${req.headers['x-zhipu-api-key'] || API_KEY_ZHIPU}`
            },
            timeout: 15000 // 15秒超时
        });

        if (response.ok) {
            const data = await response.json();
            res.json(data);
        } else {
            const errorData = await response.json();
            console.error("Zhipu Voice List API Error:", errorData);
            res.status(500).json({ 
                error: errorData.error?.message || "API request failed",
                status: response.status,
                details: errorData
            });
        }
    } catch (e) {
        console.error("Zhipu Voice List Proxy Error:", e);
        res.status(500).json({ 
            error: e.message,
            details: e.stack || "No stack trace available"
        });
    }
});

// Zhipu Voice Delete Proxy
app.post('/api/proxy/zhipu/voice/delete', async (req, res) => {
    try {
        const response = await fetch("https://open.bigmodel.cn/api/paas/v4/voice/delete", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${req.headers['x-zhipu-api-key'] || API_KEY_ZHIPU}`
            },
            body: JSON.stringify(req.body),
            timeout: 30000 // 30秒超时
        });

        if (response.ok) {
            const data = await response.json();
            res.json(data);
        } else {
            const errorData = await response.json();
            console.error("Zhipu Voice Delete API Error:", errorData);
            res.status(500).json({ 
                error: errorData.error?.message || "API request failed",
                status: response.status,
                details: errorData
            });
        }
    } catch (e) {
        console.error("Zhipu Voice Delete Proxy Error:", e);
        res.status(500).json({ 
            error: e.message,
            details: e.stack || "No stack trace available"
        });
    }
});

// API状态检查端点
app.get('/api/proxy/zhipu/status', async (req, res) => {
    try {
        // 获取API密钥
        const apiKey = req.headers['x-zhipu-api-key'] || API_KEY_ZHIPU;
        
        // 验证API密钥是否存在
        if (!apiKey || apiKey === 'INVALID_API_KEY') {
            console.log('Invalid Zhipu API key:', apiKey ? 'INVALID_API_KEY' : 'Missing');
            return res.json({ ok: false, error: "Invalid or missing API key" });
        }
        
        // 首先测试网络连接
        console.log('Testing network connection to Zhipu API...');
        
        // 发送一个简单的请求来检查API是否正常
        const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "glm-4-flash",
                messages: [{
                    role: "user",
                    content: "ping"
                }],
                max_tokens: 1
            }),
            timeout: 10000 // 添加超时设置
        });

        console.log('Zhipu API response status:', response.status);
        
        if (response.ok) {
            res.json({ ok: true });
        } else {
            const errorData = await response.json();
            console.log('Zhipu API error:', errorData);
            res.json({ ok: false, error: errorData.error?.message || "API request failed" });
        }
    } catch (e) {
        console.error("Zhipu API Status Check Error:", e);
        console.error("Error stack:", e.stack);
        
        // 检查是否是网络连接错误
        if (e.code === 'ECONNRESET' || e.code === 'ENOTFOUND' || e.code === 'ETIMEDOUT') {
            res.json({ ok: false, error: "Network connection failed. Please check your network settings." });
        } else {
            res.json({ ok: false, error: e.message });
        }
    }
});

app.get('/api/proxy/gemini/status', async (req, res) => {
    if (!API_KEY_GEMINI) return res.json({ ok: false, error: "Server missing Gemini API Key" });

    try {
        const client = new GoogleGenAI({ apiKey: API_KEY_GEMINI });
        // 发送一个简单的请求来检查API是否正常
        const response = await client.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
            config: {
                maxOutputTokens: 1
            }
        });

        res.json({ ok: true });
    } catch (e) {
        console.error("Gemini API Status Check Error", e);
        res.json({ ok: false, error: e.message });
    }
});

// Fallback for SPA (Express 5 compatible)
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`- Database: SQLite (${path.join(__dirname, 'database.sqlite')})`);
    console.log(`- Client: Serving content from ../dist`);
});
