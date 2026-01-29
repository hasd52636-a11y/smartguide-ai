
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 优先使用请求中的API密钥，其次使用环境变量
    const API_KEY_GEMINI = req.headers['x-gemini-api-key'] || process.env.API_KEY || process.env.GEMINI_API_KEY;

    if (!API_KEY_GEMINI) {
        return res.status(500).json({ error: "Server missing Gemini API Key" });
    }

    try {
        const { model, contents, config } = req.body;
        const client = new GoogleGenAI({ apiKey: API_KEY_GEMINI });

        // Passthrough to Google
        const response = await client.models.generateContent({
            model: model || 'gemini-2.0-flash-exp', // Updated default model as per latest capabilities or stick to user prefernece
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
}
