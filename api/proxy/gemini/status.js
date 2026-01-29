const API_KEY_GEMINI = process.env.API_KEY || "";

export default async function handler(req, res) {
  if (!API_KEY_GEMINI) {
    return res.status(200).json({ ok: false, error: "Server missing Gemini API Key" });
  }

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1/models/gemini-3-flash-preview:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY_GEMINI
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: "ping" }]
        }],
        generationConfig: {
          maxOutputTokens: 1
        }
      })
    });

    if (response.ok) {
      res.status(200).json({ ok: true });
    } else {
      const errorData = await response.json();
      res.status(200).json({ ok: false, error: errorData.error?.message || "API request failed" });
    }
  } catch (e) {
    console.error("Gemini API Status Check Error", e);
    res.status(200).json({ ok: false, error: e.message });
  }
}