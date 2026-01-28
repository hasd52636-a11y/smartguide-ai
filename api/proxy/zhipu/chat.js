
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const API_KEY_ZHIPU = process.env.ZHIPU_API_KEY;

    if (!API_KEY_ZHIPU) {
        return res.status(500).json({ error: "Server missing Zhipu API Key" });
    }

    try {
        const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY_ZHIPU}`
            },
            body: JSON.stringify(req.body)
        });

        // Handle non-JSON responses from upstream
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Zhipu API Error: ${response.status} - ${text}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error("Zhipu Proxy Error", e);
        res.status(500).json({ error: e.message });
    }
}
