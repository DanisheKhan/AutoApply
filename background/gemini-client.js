/**
 * Google Gemini API Client for AutoApply Pro
 * Optimized for ultra-low latency (< 1s) with active Flash-Lite and 3.x models.
 */

const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

// Fast, stable, currently active default model
const DEFAULT_MODEL = "gemini-flash-lite-latest";

/**
 * Generates an answer using Gemini with sub-second latency, or falls back instantly on timeout/missing key.
 * @param {Object} params
 * @param {string} params.question - The question from the job application form.
 * @param {string} [params.jobContext] - Optional context or job description from the page.
 * @param {Object} profile - The candidate's master profile.
 * @returns {Promise<string>}
 */
async function generateAnswerWithGemini({ question, jobContext = "" }, profile) {
  const apiKey = profile?.gemini?.apiKey;
  let model = profile?.gemini?.model || DEFAULT_MODEL;

  // Normalize legacy/deprecated model names
  if (model.includes("2.5") || model.includes("1.5") || model.includes("2.0")) {
    model = DEFAULT_MODEL;
  }

  // If no API key configured, return instant high-impact candidate answer immediately
  if (!apiKey || apiKey.trim() === "") {
    return generateInstantFallbackAnswer(question, profile);
  }

  const systemPrompt = `You are an AI career assistant acting directly for candidate Mohammad Danish Khan (B.Tech in AI, CGPA 7.79, Summer 2026 graduate).
Candidate Highlights:
- Stack: React.js, Node.js, Express, MongoDB, Next.js, Supabase, Tailwind CSS, TypeScript, Java DSA (500+ solved).
- Production Projects: CodeRace (DSA tracker, PostgreSQL/Supabase, leaderboard), Madina Perfumes (live e-commerce, Razorpay HMAC, Shiprocket API), Meet Bros intern (3 web apps shipped, cut dev time 25%).
- Rules: Provide a direct, polished, authentic first-person ("I") answer in 2 to 3 impactful sentences. No greetings, quotes, or meta-commentary.`;

  const userPrompt = `Job Context: ${jobContext ? jobContext.slice(0, 300) : "Software Engineering"}\nQuestion: "${question}"\nDirect Answer:`;

  const url = `${GEMINI_API_ENDPOINT}/${model}:generateContent?key=${apiKey.trim()}`;

  // 6-second timeout controller so UI never hangs
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 250 // Low token count for ultra-fast generation (< 1 sec)
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // If selected model failed, try fast fallback model
      if (model !== "gemini-3.5-flash-lite") {
        return await tryFallbackModel({ question, jobContext, apiKey, systemPrompt, userPrompt });
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    // Extract text part (filter out thought objects if any)
    const textPart = parts.find(p => p.text && !p.thought) || parts.find(p => p.text) || parts[parts.length - 1];
    const text = textPart?.text;

    if (text && text.trim()) {
      return text.trim();
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("[AutoApply Pro] Gemini API call skipped/timed out, using instant intelligent answer:", err.message);
  }

  // Graceful ultra-fast fallback on API error/timeout
  return generateInstantFallbackAnswer(question, profile);
}

/**
 * Automatic fallback to gemini-3.5-flash-lite
 */
async function tryFallbackModel({ question, jobContext, apiKey, systemPrompt, userPrompt }) {
  try {
    const url = `${GEMINI_API_ENDPOINT}/gemini-3.5-flash-lite:generateContent?key=${apiKey.trim()}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 250 }
      })
    });
    if (response.ok) {
      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find(p => p.text && !p.thought) || parts.find(p => p.text);
      if (textPart?.text) return textPart.text.trim();
    }
  } catch (e) {
    // ignore
  }
  return generateInstantFallbackAnswer(question);
}

/**
 * Instant, tailored candidate responses matching Mohammad Danish Khan's real projects & bio.
 * Responds in 0ms with zero latency.
 */
function generateInstantFallbackAnswer(question, profile) {
  const q = (question || "").toLowerCase();

  if (/why.*(join|company|team|role|hire|work with us)|passion|interest|reason/i.test(q)) {
    return `I am eager to join your engineering team to contribute my full-stack web development skills across React, Node.js, Express, MongoDB, and Supabase. Having built and shipped production platforms like Madina Perfumes and CodeRace alongside solving 500+ Java DSA problems, I thrive on engineering fast, scalable user experiences and solving challenging technical problems.`;
  }

  if (/project|built|challenge|achievement|accomplishment|coderace|madina|production/i.test(q)) {
    return `In building CodeRace (a multi-user DSA tracking platform), I architected a normalized PostgreSQL/Supabase schema to maintain competitive live leaderboards and streak calculations with low query latency. Additionally, while engineering Madina Perfumes, I implemented secure HMAC SHA256 webhook verification for Razorpay payments and automated dispatch workflows with the Shiprocket API.`;
  }

  if (/stack|technology|tech|match|experience with|skill|tool/i.test(q)) {
    return `My core technical stack centers on React.js, Node.js, Express, MongoDB, Next.js, and Supabase, backed by a strong foundation in Java DSA (500+ problems solved). I focus on modular component architecture, robust RESTful API design, secure JWT authentication, and building clean, high-performance web applications.`;
  }

  if (/strength|weakness|greatest|about yourself|describe yourself|introduce/i.test(q)) {
    return `My greatest strength is rapid full-stack execution combined with strong algorithmic problem-solving. Having delivered real client projects while graduating with a B.Tech in Artificial Intelligence (CGPA 7.79, zero backlogs), I learn new frameworks quickly and take full ownership of features from frontend UI to backend deployment.`;
  }

  return `As a B.Tech Artificial Intelligence graduate with production full-stack experience (React, Node.js, Express, MongoDB, Supabase) and strong Java DSA problem-solving skills, I am excited to build scalable, high-performance web solutions and create meaningful impact on your team.`;
}

/**
 * Tests the Gemini API Key connection with low latency.
 * @param {string} apiKey 
 * @param {string} model 
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function testGeminiApiKey(apiKey, model = DEFAULT_MODEL) {
  if (!apiKey || apiKey.trim() === "") {
    return { success: false, message: "API key is empty." };
  }

  let selectedModel = model;
  if (selectedModel.includes("2.5") || selectedModel.includes("1.5") || selectedModel.includes("2.0")) {
    selectedModel = DEFAULT_MODEL;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const url = `${GEMINI_API_ENDPOINT}/${selectedModel}:generateContent?key=${apiKey.trim()}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Respond with the single word: OK" }] }],
        generationConfig: { maxOutputTokens: 10 }
      })
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err?.error?.message || `HTTP ${res.status}` };
    }

    const json = await res.json();
    const parts = json?.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find(p => p.text && !p.thought) || parts[0] || {};
    const reply = textPart.text || "OK";
    return { success: true, message: `Connected successfully! Model: ${selectedModel} (${reply.trim()})` };
  } catch (e) {
    clearTimeout(timeoutId);
    return { success: false, message: e.message };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateAnswerWithGemini, testGeminiApiKey, generateInstantFallbackAnswer };
}
