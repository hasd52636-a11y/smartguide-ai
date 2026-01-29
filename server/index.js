
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import * as db from './db.js';
import { GoogleGenAI } from "@google/genai";

// Environment variables
const PORT = process.env.PORT || 3000;
const API_KEY_GEMINI = process.env.API_KEY || ''; // Read from env
const API_KEY_ZHIPU = process.env.ZHIPU_API_KEY || '';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Large limit for images
app.use(express.static(path.join(__dirname, '../dist')));

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
    if (!API_KEY_ZHIPU) return res.status(500).json({ error: "Server missing Zhipu API Key" });

    try {
        const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY_ZHIPU}`
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
    if (!API_KEY_ZHIPU) return res.status(500).json({ error: "Server missing Zhipu API Key" });

    try {
        const response = await fetch("https://open.bigmodel.cn/api/paas/v4/embeddings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY_ZHIPU}`
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error("Zhipu Embeddings Proxy Error", e);
        res.status(500).json({ error: e.message });
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
