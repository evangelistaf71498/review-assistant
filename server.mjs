import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function clampText(s, max = 2000) {
  if (!s) return "";
  return String(s).slice(0, max);
}

app.post("/api/generate", async (req, res) => {
  try {
    const businessName = clampText(req.body.businessName, 80) || "our business";
    const platform = clampText(req.body.platform, 30) || "Google";
    const stars = Number(req.body.stars ?? 0);
    const tone = clampText(req.body.tone, 20) || "professional";
    const businessType = clampText(req.body.businessType, 30) || "other";
    const highlights = clampText(req.body.highlights, 140);

const reviewText = clampText(req.body.reviewText, 2000);

    if (!reviewText.trim()) {
      return res.status(400).json({ error: "Please paste a review." });
    }

    const system = `
You are a "Local Business Review Assistant" that writes safe, professional public replies to customer reviews.

Rules:
- Never argue with the reviewer.
- Do not insult the reviewer.
- Avoid offering refunds publicly; invite them to contact privately when needed.
- Keep replies realistic, polite, and specific.
- Use the business name naturally 0-1 times max.

Output JSON only with keys:
sentiment ("positive"|"neutral"|"negative"),
issues (array of 1-5 short phrases),
replies (array of exactly 3 objects: {label, text}).
`;

    const user = `
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

Return 3 reply options:
1) Short public reply (platform-safe)
2) Warm public reply (platform-safe)
3) Private follow-up message to the customer (NOT public; for email/text)

If stars <= 3 OR sentiment is negative, make option 3 an apology + invite to contact + make-it-right tone.
If stars >= 4, make option 3 a short “thanks + ask for referrals/return visit” private note.

Extra guidance:
- If the review is negative, apologize and invite them to contact us privately.
- If the review is positive, thank them and reinforce one key detail (if provided).
- Do not invent policies, discounts, or specific compensation.
`;
Customer review:
"""
${reviewText}
"""

Return 3 reply options:
1) Short
2) Balanced
3) Warm & detailed
`;

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
      data = {
        sentiment: "neutral",
        issues: [],
        replies: [
          { label: "Short", text },
          { label: "Balanced", text },
          { label: "Warm & detailed", text },
        ],
      };
    }

    // Ensure exactly 3 replies
    if (!Array.isArray(data.replies)) data.replies = [];
    data.replies = data.replies.slice(0, 3);
    while (data.replies.length < 3) {
      data.replies.push({ label: "Option", text: "" });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error. Check terminal logs." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Running on http://localhost:${port}`));