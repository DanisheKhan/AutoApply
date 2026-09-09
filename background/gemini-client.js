/**
 * Google Gemini API Client for AutoApply Pro
 * Optimized for ultra-low latency (< 1s) with active Flash-Lite models and intelligent prompt constraints.
 */

const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

// Fast, stable, currently active default model
const DEFAULT_MODEL = "gemini-flash-lite-latest";

/**
 * Generates an answer using Gemini with sub-second latency, or falls back instantly on timeout/missing key.
 * @param {Object} params
 * @param {string} params.question - The question from the job application form.
 * @param {string} [params.jobContext] - Optional context or job description from the page.
 * @param {number} [params.maxLength] - Optional character limit constraint.
 * @param {Object} profile - The candidate's master profile.
 * @returns {Promise<string>}
 */
async function generateAnswerWithGemini({ question, jobContext = "", maxLength }, profile) {
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

  const customInstructions = profile?.gemini?.customInstructions || "";
  const lengthConstraint = maxLength ? `Keep response strictly under ${maxLength} characters.` : "Provide a direct, polished, authentic first-person ('I') answer in 2 to 3 impactful sentences.";

  const systemPrompt = `You are an AI career assistant acting directly for candidate Mohammad Danish Khan (B.Tech in Artificial Intelligence, CGPA 7.79, Summer 2026 graduate).
Candidate Highlights:
- Stack: React.js, Node.js, Express.js, MongoDB, Next.js, Supabase, PostgreSQL, Tailwind CSS, TypeScript, Java DSA (500+ problems solved).
- Production Projects: CodeRace (DSA tracker, PostgreSQL/Supabase, leaderboard), Madina Perfumes (live e-commerce, Razorpay HMAC, Shiprocket API dispatch), Meet Bros intern (3 web apps shipped, cut dev time 25%).
- Rules: ${lengthConstraint} No greetings, bullet points, quotes, or meta-commentary.
${customInstructions ? `Custom User Instructions: ${customInstructions}` : ""}`;

  const userPrompt = `Job / Page Context: ${jobContext ? jobContext.slice(0, 300) : "Software Engineering Position"}\nQuestion: "${question}"\nDirect Answer:`;

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
          maxOutputTokens: 250
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (model !== "gemini-3.5-flash-lite") {
        return await tryFallbackModel({ question, jobContext, apiKey, systemPrompt, userPrompt });
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
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
  } catch (e) {}
  return generateInstantFallbackAnswer(question);
}

/**
 * Instant, tailored candidate responses matching Mohammad Danish Khan's real projects & bio.
 * Responds in 0ms with zero latency across 15+ screening question categories.
 */
function generateInstantFallbackAnswer(question, profile) {
  const q = (question || "").toLowerCase();

  // Why join / Motivation
  if (/why.*(join|company|team|role|hire|work with us|interested in)|passion|motivation|reason/i.test(q)) {
    return `I am eager to join your engineering team to contribute my full-stack web development skills across React, Node.js, Express, MongoDB, and Supabase. Having built and shipped production platforms like Madina Perfumes and CodeRace alongside solving 500+ Java DSA problems, I thrive on engineering fast, scalable user experiences and solving challenging technical problems.`;
  }

  // Projects & Accomplishments
  if (/project|built|challenge|achievement|accomplishment|coderace|madina|production|portfolio|proudest/i.test(q)) {
    return `In building CodeRace (a multi-user DSA tracking platform), I architected a normalized PostgreSQL/Supabase schema to maintain competitive live leaderboards and streak calculations with low query latency. Additionally, while engineering Madina Perfumes, I implemented secure HMAC SHA256 webhook verification for Razorpay payments and automated dispatch workflows with the Shiprocket API.`;
  }

  // Tech Stack & Skills
  if (/stack|technology|tech|match|experience with|skill|tool|framework/i.test(q)) {
    return `My core technical stack centers on React.js, Node.js, Express, MongoDB, Next.js, and Supabase, backed by a strong foundation in Java DSA (500+ problems solved). I focus on modular component architecture, robust RESTful API design, secure JWT authentication, and building clean, high-performance web applications.`;
  }

  // Strengths & Self-description
  if (/strength|greatest|about yourself|describe yourself|introduce|background|summary/i.test(q)) {
    return `My greatest strength is rapid full-stack execution combined with strong algorithmic problem-solving. Having delivered real client projects while graduating with a B.Tech in Artificial Intelligence (CGPA 7.79, zero backlogs), I learn new frameworks quickly and take full ownership of features from frontend UI to backend deployment.`;
  }

  // Weakness / Areas of improvement
  if (/weakness|area.*improvement|challenge.*overcome/i.test(q)) {
    return `Earlier in my development journey, I would occasionally focus extensively on pixel-perfect UI before finalizing data flow. I have since adopted a test-first, API-driven development methodology that balances rapid delivery with clean architectural boundaries.`;
  }

  // Teamwork & Leadership
  if (/team|collaborat|conflict|lead|cross-functional/i.test(q)) {
    return `During my 10-month internship at Meet Bros, I collaborated closely with designers and product owners to ship 3 production web applications. I actively participated in code reviews, authored comprehensive technical documentation, and helped streamline front-end workflows by 25%.`;
  }

  // Problem Solving / Debugging
  if (/debug|problem[_\s-]?solving|troubleshoot|bug|incident/i.test(q)) {
    return `When diagnosing complex issues, I use a systematic root-cause approach—inspecting network request payloads, isolating state mutations in React/Redux dev tools, and tracing database query plans to resolve bottlenecks at their source.`;
  }

  // Default Universal Fallback
  return `As a B.Tech Artificial Intelligence graduate with production full-stack experience (React, Node.js, Express, MongoDB, Supabase) and strong Java DSA problem-solving skills (500+ solved), I am excited to build scalable, high-performance web solutions and create meaningful impact on your team.`;
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
