const API_KEY_ZHIPU = process.env.ZHIPU_API_KEY || "a75d46768b0f45dc90a5969077ffc8d9.dT0t2tku3hZGfYkk";

export default async function handler(req, res) {
  if (!API_KEY_ZHIPU) {
    return res.status(200).json({ ok: false, error: "Server missing Zhipu API Key" });
  }

  try {
    // 发送一个简单的请求来检查API是否正常
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY_ZHIPU}`
      },
      body: JSON.stringify({
        model: "glm-4-flash",
        messages: [{
          role: "user",
          content: "ping"
        }],
        max_tokens: 1
      })
    });

    if (response.ok) {
      res.status(200).json({ ok: true });
    } else {
      const errorData = await response.json();
      res.status(200).json({ ok: false, error: errorData.error?.message || "API request failed" });
    }
  } catch (e) {
    console.error("Zhipu API Status Check Error", e);
    res.status(200).json({ ok: false, error: e.message });
  }
}