import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function clampText(s, max = 2000) {
  if (s === undefined || s === null) return "";
  return String(s).slice(0, max);
}

app.post("/api/generate", async (req, res) => {
  try {
    const businessName = clampText(req.body.businessName, 80) || "our business";
    const businessType = clampText(req.body.businessType, 30) || "other";
    const highlights = clampText(req.body.highlights, 140);

    const platform = clampText(req.body.platform, 30) || "Google";
    const stars = Number(req.body.stars ?? 0);
    const tone = clampText(req.body.tone, 20) || "professional";

    const reviewText = clampText(req.body.reviewText, 2000);

    if (!reviewText.trim()) {
      return res.status(400).json({ error: "Please paste a review." });
    }

    const system = `
You are a "Local Business Review Assistant" that writes safe, professional replies to customer reviews.

Hard rules:
- Never argue with the reviewer.
- Do not insult the reviewer.
- Do not mention refunds/compensation publicly; invite them to contact privately when needed.
- Keep replies realistic, polite, and specific.
- Use the business name naturally 0-1 times max.
- Do NOT invent policies, discounts, or specific compensation.
- Output MUST be valid JSON only (no markdown, no extra text).
`.trim();

    const user = `
Business: ${businessName}
Business type: ${businessType}
Platform: ${platform}
Star rating: ${stars}
Preferred tone: ${tone}
Key details to mention (if relevant): ${highlights || "none"}

Customer review:
"""
${reviewText}
"""

Return JSON only with keys:
sentiment ("positive"|"neutral"|"negative"),
issues (array of 1-5 short phrases),
replies (array of exactly 3 objects: {label, text})

Create the 3 replies:
1) label: "Short public" — short, platform-safe
2) label: "Warm public" — warmer, still platform-safe
3) label: "Private follow-up" — NOT public; for email/text to the customer

Guidance for reply 3:
- If stars <= 3 OR sentiment is negative: apologize, take ownership, invite them to contact privately, and focus on making it right.
- If stars >= 4: thank them and include a gentle return-visit/referral nudge.

Keep each reply concise and natural.
`.trim();

    const resp = await openai.responses.create({
      model: "gpt-5.2",
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const text = resp.output_text || "";

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // Fallback if model returns non-JSON for any reason
      data = {
        sentiment: "neutral",
        issues: [],
        replies: [
          { label: "Short public", text },
          { label: "Warm public", text },
          { label: "Private follow-up", text },
        ],
      };
    }

    // Normalize structure
    if (!data || typeof data !== "object") {
      data = {
        sentiment: "neutral",
        issues: [],
        replies: [
          { label: "Short public", text: "" },
          { label: "Warm public", text: "" },
          { label: "Private follow-up", text: "" },
        ],
      };
    }

    if (!["positive", "neutral", "negative"].includes(data.sentiment)) {
      data.sentiment = "neutral";
    }

    if (!Array.isArray(data.issues)) data.issues = [];
    data.issues = data.issues
      .map((x) => clampText(x, 80))
      .filter(Boolean)
      .slice(0, 5);

    if (!Array.isArray(data.replies)) data.replies = [];

    // Ensure exactly 3 replies
    const fallbackLabels = ["Short public", "Warm public", "Private follow-up"];
    data.replies = data.replies.slice(0, 3).map((r, i) => ({
      label: clampText(r?.label, 40) || fallbackLabels[i],
      text: clampText(r?.text, 1200) || "",
    }));

    while (data.replies.length < 3) {
      data.replies.push({
        label: fallbackLabels[data.replies.length],
        text: "",
      });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error. Check terminal logs." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Running on http://localhost:${port}`));