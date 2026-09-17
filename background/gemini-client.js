/**
 * Google Gemini API Client for AutoApply Pro
 * Optimized for ultra-low latency (< 1s) with active Flash-Lite models and intelligent prompt constraints.
 */

const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

// Fast, stable, currently active default model in Google Generative Language API
const DEFAULT_MODEL = "gemini-3.6-flash";

function normalizeModelName(modelName) {
  if (!modelName) return DEFAULT_MODEL;
  let clean = modelName.replace(/^models\//, '').trim();
  // Map legacy / deprecated model aliases to stable defaults while allowing gemini-2.5-flash, gemini-3.6-flash, gemini-3.7-flash
  if (clean.includes("lite") || clean.includes("flash-latest") || clean === "gemini-2.0-flash") {
    return DEFAULT_MODEL;
  }
  return clean || DEFAULT_MODEL;
}

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
  const qLower = (question || "").toLowerCase();

  // Fast intercept for short numeric/factual questions so LLM never writes an essay for salary/experience/days!
  if (/\b(salary|ctc|compensation|remuneration|lpa|inr|months?[\s_()/-]*of|experience[\s_()/-]*in[\s_()/-]*months?|how soon.*(start|join)|notice.*period|start.*in days|join.*in days)\b/i.test(qLower)) {
    return generateInstantFallbackAnswer(question, profile);
  }

  const apiKey = profile?.gemini?.apiKey;
  let model = normalizeModelName(profile?.gemini?.model || DEFAULT_MODEL);

  // If no API key configured, return instant high-impact candidate answer immediately
  if (!apiKey || apiKey.trim() === "") {
    return generateInstantFallbackAnswer(question, profile);
  }

  const customInstructions = profile?.gemini?.customInstructions || "";
  const isCoverLetter = /cover[_\s-]?letter|motivation[_\s-]?letter|letter.*motivation/i.test(qLower);
  const is3Words = /(three|3)\s*words|describe.*company/i.test(qLower);

  // Length constraint: if a char limit or specific format exists, enforce it
  let lengthConstraint = "";
  if (is3Words) {
    lengthConstraint = "Respond with ONLY three strong, descriptive words or short phrases separated by commas. No complete sentences. Example: Innovative, Mission-driven, High-impact.";
  } else if (isCoverLetter) {
    lengthConstraint = "Write a complete, professional, 3-paragraph Cover Letter tailored to this company and position. Highlight production projects (Madina Perfumes, CodeRace) and internship experience at Meet Bros.";
  } else if (maxLength) {
    const safeTarget = Math.max(80, Math.min(maxLength - 25, Math.floor(maxLength * 0.85)));
    lengthConstraint = `STRICT CHARACTER LIMIT: Must be strictly under ${maxLength} characters total (target ~${safeTarget} characters). Write 1 or 2 concise, complete, punchy sentences that finish completely within this limit. MUST end with a period. NEVER exceed ${maxLength} characters.`;
  } else {
    lengthConstraint = "Write a complete, compelling, professional answer of 2 to 3 full sentences (approx 50 to 90 words). The answer must be fully finished and end with a period.";
  }

  const systemPrompt = `You are an elite career assistant drafting job application answers directly as candidate Mohammad Danish Khan.

CANDIDATE PROFILE:
- Name: Mohammad Danish Khan | B.Tech in Artificial Intelligence, CGPA 7.79, Summer 2026 graduate
- Tech Stack: React.js, Node.js, Express.js, MongoDB, Next.js, Supabase, PostgreSQL, Tailwind CSS, TypeScript
- DSA: Java, 500+ problems solved on LeetCode/competitive platforms
- Production Projects:
  • CodeRace — multi-user DSA tracking platform with PostgreSQL/Supabase live leaderboards & streak calculations
  • Madina Perfumes — live e-commerce store with Razorpay HMAC SHA256 webhook verification & Shiprocket API dispatch
  • Meet Bros — 10-month internship, shipped 3 production web apps, reduced development time by 25%
- Experience: 12 months total (10-month Full Stack Intern + freelance)
- Notice Period: Immediate | Location: Bhusawal, Maharashtra | Open to relocate

ANSWER RULES & TONE:
- Write in first person ("I", "I'm").
- Tone: Speak like an articulate, confident, enthusiastic human software engineer. Sound natural, direct, and human.
- FORBIDDEN: Do NOT write robotic resume dumps like "With 12 months of full-stack experience using...", "As a B.Tech graduate...", or dry credential listings.
- When asked how you fit the role, why hire you, or a general message/pitch to the team, open with confidence and purpose (for example: "I'm a strong fit for this role with hands-on experience in full-stack web development using React.js, Node.js, Express.js, and MongoDB. I'm a quick learner, problem solver, and eager to contribute while growing with the team.")
- ${lengthConstraint}
- No meta-commentary, no preambles (never say "Here is an answer:"), no quotes around the response.
- CRITICAL: Write a COMPLETE response with full sentences. Every sentence must end cleanly with proper punctuation (no dangling words or mid-sentence cutoffs).
${customInstructions ? `\nCustom Instructions: ${customInstructions}` : ""}`;

  const userPrompt = `Job / Page Context: ${jobContext ? jobContext.slice(0, 400) : "Software Engineering Position"}

Question: "${question}"

Complete Answer (write the full answer now, do not stop early):`;

  const url = `${GEMINI_API_ENDPOINT}/${model}:generateContent?key=${apiKey.trim()}`;

  // 15-second timeout — open-ended questions need more time to generate properly
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

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
          temperature: 0.55,      // slightly higher for more natural fluent writing
          maxOutputTokens: 700    // ~500 words — enough for a complete 3-4 sentence answer
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (model !== "gemini-3.7-flash") {
        return await tryFallbackModel({ question, jobContext, apiKey, systemPrompt, userPrompt });
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    // Skip thought/reasoning tokens (present in thinking models like gemini-3.7-flash)
    const textPart = parts.find(p => p.text && !p.thought) || parts.find(p => p.text) || parts[parts.length - 1];
    const text = textPart?.text;

    if (text && text.trim()) {
      let cleaned = text.trim()
        .replace(/^["']|["']$/g, '')
        .replace(/^```[a-z]*\s*|\s*```$/gi, '')
        .replace(/^(here is|sure,? here is|certainly,? here is|answer:)\s*/i, '')
        .trim();
      if (maxLength && cleaned.length > maxLength) {
        // Find the last complete sentence boundary (., !, ?) within maxLength
        const sentenceBoundary = cleaned.slice(0, maxLength).lastIndexOf('.');
        if (sentenceBoundary > Math.floor(maxLength * 0.5)) {
          cleaned = cleaned.slice(0, sentenceBoundary + 1).trim();
        } else {
          // If no sentence boundary in range, find last space to avoid cut words
          const lastSpace = cleaned.slice(0, maxLength - 1).lastIndexOf(' ');
          if (lastSpace > Math.floor(maxLength * 0.5)) {
            cleaned = cleaned.slice(0, lastSpace).trim() + '.';
          } else {
            cleaned = cleaned.slice(0, maxLength);
          }
        }
      }
      return cleaned;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("[AutoApply Pro] Gemini API call skipped/timed out, using instant intelligent answer:", err.message);
  }

  // Graceful fallback on API error/timeout
  return generateInstantFallbackAnswer(question, profile, maxLength);
}


/**
 * Automatic fallback to gemini-3.7-flash
 */
async function tryFallbackModel({ question, jobContext, apiKey, systemPrompt, userPrompt }) {
  try {
    const url = `${GEMINI_API_ENDPOINT}/gemini-3.7-flash:generateContent?key=${apiKey.trim()}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: { temperature: 0.55, maxOutputTokens: 700 }
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
function generateInstantFallbackAnswer(question, profile, maxLength) {
  const p = profile || (typeof DEFAULT_PROFILE !== 'undefined' ? DEFAULT_PROFILE : {});
  const q = (question || "").toLowerCase();

  // Helper to ensure open-ended fallbacks fit within character limits cleanly without cut-off words
  const constrain = (text) => {
    if (!maxLength || text.length <= maxLength) return text;
    const lastPeriod = text.slice(0, maxLength).lastIndexOf('.');
    if (lastPeriod > Math.floor(maxLength * 0.5)) {
      return text.slice(0, lastPeriod + 1).trim();
    }
    const lastSpace = text.slice(0, maxLength - 1).lastIndexOf(' ');
    if (lastSpace > Math.floor(maxLength * 0.5)) {
      return text.slice(0, lastSpace).trim() + '.';
    }
    return text.slice(0, maxLength);
  };

  // 1. Factual & Numeric Questions (Intercept early to prevent long essay answers!)
  if (/\b(expected.*(salary|ctc|package|compensation|remuneration)|annual.*expected|salary.*expect|desired.*(salary|ctc)|target.*ctc)\b/i.test(q)) {
    if (q.includes('inr') || q.includes('annual') || q.includes('rs')) {
      return p.career?.expectedCtcInr || "500000";
    }
    return p.career?.expectedCtcLpa || "5.0";
  }

  if (/\b(current.*(salary|ctc|package|compensation|remuneration)|annual.*current|present.*(ctc|salary)|fixed.*(ctc|salary)|put 0.*intern)\b/i.test(q)) {
    return p.career?.currentCtcInr || "0";
  }

  if (/\b(experience[\s_()/-]*in[\s_()/-]*months?|months?[\s_()/-]*of[\s_()/-]*(work[_\s-]?)?experience|how many months|relevant.*experience.*month|work.*experience.*month|total.*experience.*month)\b/i.test(q)) {
    return p.career?.totalExperienceMonths || "12";
  }

  if (/\b(experience[\s_()/-]*in[\s_()/-]*years?|years?[\s_()/-]*of[\s_()/-]*(work[_\s-]?)?experience|total.*exp|overall.*experience|relevant.*experience)\b/i.test(q) && !/month/i.test(q)) {
    return p.career?.totalExperienceYears || "1";
  }

  if (/\b(how soon.*(start|join)|notice.*period|availability.*(start|join|days)|when.*can.*you.*(start|join)|(start|join)[\s_()/-]*in[\s_()/-]*days|earliest.*start)\b/i.test(q)) {
    if (q.includes('day') || q.includes('in days')) {
      return p.career?.noticePeriodDays || "0";
    }
    return p.career?.noticePeriodString || "Immediate (0 Days)";
  }

  // Factual Skills & Education Intercepts
  if (/\b(primary[_\s-]?skills?|key[_\s-]?skills?|technical[_\s-]?skills?|core[_\s-]?skills?|skills?|skill[_\s-]?set|tech[_\s-]?stack|technolog(y|ies)|proficienc(y|ies))\b/i.test(q) && !/why|describe|explain|tell|experience with|motivation|strengths?/i.test(q)) {
    return p.skillsSummary || "React.js, Node.js, Express.js, MongoDB, JavaScript, TypeScript, Tailwind CSS, Supabase, Next.js, Java DSA, REST APIs, Git, SQL";
  }

  if (/\b(education[_\s-]?details|educational[_\s-]?qualifications?|education[_\s-]?summary|academic[_\s-]?details|qualification[_\s-]?details|education[_\s-]?background|education)\b/i.test(q) && !/why|describe|explain|tell|motivation/i.test(q)) {
    return p.educationSummary || "B.Tech in Artificial Intelligence (CGPA: 7.79, 2022-2026, G H Raisoni College of Engineering and Management, Jalgaon)";
  }

  if (/\b(current[_\s-]?location|present[_\s-]?location|your[_\s-]?location|work[_\s-]?location)\b/i.test(q)) {
    return p.address?.city || "Bhusawal";
  }

  // 1b. Role Fit / Message to Recruiter / Why hire / Suitability / Additional information
  if (/how.*fit|fit.*role|why.*(hire|choose)|message|additional[_\s-]?info|about[_\s-]?you|why.*suitable|pitch/i.test(q)) {
    return constrain("I'm a strong fit for this role with hands-on experience in full-stack web development using React.js, Node.js, Express.js, and MongoDB. I'm a quick learner, problem solver, and eager to contribute while growing with the team.");
  }

  // Why join / Motivation
  if (/why.*(join|company|team|role|hire|work with us|interested in)|passion|motivation|reason/i.test(q)) {
    return constrain("I am eager to join your engineering team to contribute my full-stack web development skills across React, Node.js, Express, MongoDB, and Supabase. Having built and shipped production platforms like Madina Perfumes and CodeRace alongside solving 500+ Java DSA problems, I thrive on engineering fast, scalable user experiences and solving challenging technical problems.");
  }

  // Projects & Accomplishments
  if (/project|built|challenge|achievement|accomplishment|coderace|madina|production|portfolio|proudest/i.test(q)) {
    return constrain("In building CodeRace (a multi-user DSA tracking platform), I architected a normalized PostgreSQL/Supabase schema to maintain competitive live leaderboards and streak calculations with low query latency. Additionally, while engineering Madina Perfumes, I implemented secure HMAC SHA256 webhook verification for Razorpay payments and automated dispatch workflows with the Shiprocket API.");
  }

  // Tech Stack & Skills (Open-ended essays)
  if (/stack|technology|tech|match|experience with|skill|tool|framework/i.test(q)) {
    return constrain("My core technical stack centers on React.js, Node.js, Express, MongoDB, Next.js, and Supabase, backed by a strong foundation in Java DSA (500+ problems solved). I focus on modular component architecture, robust RESTful API design, secure JWT authentication, and building clean, high-performance web applications.");
  }

  // Strengths & Self-description
  if (/strength|greatest|about yourself|describe yourself|introduce|background|summary/i.test(q)) {
    return constrain("My greatest strength is rapid full-stack execution combined with strong algorithmic problem-solving. Having delivered real client projects while graduating with a B.Tech in Artificial Intelligence (CGPA 7.79, zero backlogs), I learn new frameworks quickly and take full ownership of features from frontend UI to backend deployment.");
  }

  // Weakness / Areas of improvement
  if (/weakness|area.*improvement|challenge.*overcome/i.test(q)) {
    return constrain("Earlier in my development journey, I would occasionally focus extensively on pixel-perfect UI before finalizing data flow. I have since adopted a test-first, API-driven development methodology that balances rapid delivery with clean architectural boundaries.");
  }

  // Critical Feedback / Conflict / Handling Criticism
  if (/critical.*work|handling.*criticism|receive.*feedback|critical\b.*feedback|feedback.*work|critic(al|ism)|disagree.*team|conflict/i.test(q)) {
    return constrain("When receiving critical feedback on my work, I welcome it with an open mindset as an opportunity for continuous improvement. I focus on understanding the objective reasoning behind the critique, ask clarifying questions to ensure full alignment, and collaborate constructively with my team member to reach the best technical solution for the product and codebase.");
  }

  // 3 words or phrases / Describe company
  if (/(three|3)\s*words|describe.*(our\s*)?company|words.*describe/i.test(q)) {
    return "Innovative, Mission-driven, High-impact";
  }

  // Teamwork & Leadership
  if (/team|collaborat|lead|cross-functional/i.test(q)) {
    return constrain("During my 10-month internship at Meet Bros, I collaborated closely with designers and product owners to ship 3 production web applications. I actively participated in code reviews, authored comprehensive technical documentation, and helped streamline front-end workflows by 25%.");
  }

  // Cover Letter / Letter of Motivation
  if (/cover[_\s-]?letter|motivation[_\s-]?letter|letter.*motivation|statement.*purpose/i.test(q)) {
    return `Dear Hiring Team,\n\nI am writing to express my strong enthusiasm for this engineering opportunity. As a B.Tech Artificial Intelligence graduate (CGPA 7.79) with 12 months of total engineering experience—including a 10-month Full Stack Developer internship at Meet Bros—I specialize in architecting performant, resilient web applications using React.js, Node.js, Express, MongoDB, Next.js, and Supabase, complemented by solving 500+ Java DSA algorithmic challenges.\n\nIn my production projects, I engineered CodeRace, a competitive DSA tracking platform featuring live leaderboards and low-latency database queries on Supabase/PostgreSQL. Furthermore, for Madina Perfumes, I developed secure HMAC SHA256 webhook verification for Razorpay payment processing and automated dispatch pipelines with the Shiprocket API. At Meet Bros, I shipped three client web applications while streamlining front-end workflows by 25% through reusable design systems and clean component state management.\n\nI am confident that my strong engineering ownership, rigorous problem-solving mindset, and dedication to rapid execution will make an immediate positive impact on your team. I look forward to the opportunity to discuss how my technical skills align with your engineering roadmap.\n\nSincerely,\nMohammad Danish Khan\nFull Stack Developer | danishkhan.jsx@gmail.com | +91 9322990946`;
  }

  // Deadlines & High-Pressure Environments
  if (/deadline|pressure|fast-paced|tight schedule|priorit/i.test(q)) {
    return constrain("When operating under tight deadlines, I prioritize ruthlessly by breaking deliverables into core MVP functionality versus secondary enhancements. During my client freelancing and Meet Bros internship, I used agile sprint planning, automated testing, and proactive status communication to ensure every milestone was delivered on schedule without compromising software quality.");
  }

  // Continuous Learning / New Tech
  if (/learn|new technology|framework|adapt|up-to-date/i.test(q)) {
    return constrain("I maintain a disciplined learning habit by building practical proofs of concept whenever exploring new tools. When transitioning to Next.js and Supabase for recent projects, I quickly mastered server-side rendering, Row-Level Security policies, and real-time event streaming within days by studying official documentation and implementing live prototypes.");
  }

  // Default Universal Fallback
  return constrain("I'm a passionate Full-Stack Developer with hands-on experience across React.js, Node.js, Express.js, and MongoDB, complemented by 500+ solved Java DSA problems. I'm eager to contribute clean, scalable code and grow alongside your engineering team.");
}

/**
 * Uses Gemini AI to infer the value or best option for unique/unknown form fields.
 * Accepts the full field fingerprint for maximum context accuracy.
 *
 * @param {Object} params - Full field fingerprint
 * @param {string} params.label          - Resolved label text
 * @param {string} [params.tag]          - HTML tag name (input, select, textarea)
 * @param {string} [params.type]         - Input type (text, number, email, etc.)
 * @param {string[]} [params.options]    - Dropdown option texts (for select)
 * @param {string} [params.sectionContext] - Legacy section context string
 * @param {string} [params.placeholder]  - Placeholder attribute text
 * @param {string} [params.fieldName]    - HTML name attribute
 * @param {string} [params.fieldId]      - HTML id attribute
 * @param {number|null} [params.maxLength] - maxlength attribute value
 * @param {string} [params.surroundingText] - Visible text surrounding the field
 * @param {string} [params.sectionHeading]  - Nearest section heading text
 * @param {string} [params.formTitle]       - Page/form title
 * @param {string} [params.ariaLabel]       - aria-label attribute
 * @param {string} [params.ariaDescribedby] - Resolved aria-describedby text
 * @param {Object} [params.dataAttrs]       - data-* attributes object
 * @param {Object} profile - The candidate's master profile
 * @returns {Promise<string>}
 */
async function inferFieldWithGemini({
  label,
  tag = "input",
  type = "text",
  options = [],
  sectionContext = "",
  placeholder = "",
  fieldName = "",
  fieldId = "",
  maxLength = null,
  surroundingText = "",
  sectionHeading = "",
  formTitle = "",
  ariaLabel = "",
  ariaDescribedby = "",
  dataAttrs = {}
}, profile) {
  // Build a combined signal from all available text sources for fast fallback matching
  const dataStr = Object.values(dataAttrs || {}).filter(Boolean).join(' ');
  const combinedSignal = [
    label, placeholder, fieldName, fieldId, ariaLabel,
    surroundingText, sectionHeading, sectionContext, dataStr
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  // Require at least some signal to proceed
  if (!combinedSignal) return null;

  const apiKey = profile?.gemini?.apiKey;
  const model = normalizeModelName(profile?.gemini?.model || DEFAULT_MODEL);

  // Bio-Data context snapshot (used in both fast fallback and Gemini prompt)
  const candidateBio = `Candidate: Mohammad Danish Khan (Male, Born: 01/06/2005).
Location: Bhusawal, Jalgaon, Maharashtra - 425201, India.
Citizenship: Indian. Marital Status: Single. Religion: Islam.
Degree: B.Tech in Artificial Intelligence (2022-2026), CGPA 7.79, Zero Backlogs, G H Raisoni College of Engineering, KBC North Maharashtra University.
Tech Stack: React.js, Node.js, Express.js, MongoDB, Supabase, Next.js, Java DSA (500+ solved).
Experience: 12 months total (10-month Full Stack Intern at Meet Bros, Freelance: Madina Perfumes, Muskan Hospital, Vega Star).
Expected CTC: 5.0 LPA (5,00,000 INR). Current CTC: 0 INR (Fresher/Intern).
Passport: Indian AH927400, Valid till 2035. Notice Period: Immediate (0 Days).
Current Location: Bhusawal, Maharashtra. Willing to relocate: Yes (Pune, Bengaluru, Mumbai, Hyderabad, Gurgaon, Remote).
Email: danishkhan.jsx@gmail.com. Phone: 9322990946 (+91 9322990946).
Headline: Full-Stack Web Developer | React, Node.js, Express, MongoDB, Supabase, Java DSA.
Designation: Full Stack Developer.`;

  /**
   * Fast zero-API fallback using combined signal across all field signals.
   * Now matches name="exp_months", id="expected-ctc", surroundingText, aria-label, etc.
   */
  function getFastFallback() {
    const s = combinedSignal; // already normalized lowercase

    // Expected salary / CTC
    if (/expected.*(salary|ctc|package|compensation|remuneration)|annual.*expected|salary.*expect|desired.*(salary|ctc)|target.*ctc/i.test(s)) {
      if (options && options.length > 0) {
        const matchOpt = options.find(o => /5(\\.0)?\\s*lpa|500000|5\\s*lakh|4\\s*-\\s*6/i.test(o.trim()));
        if (matchOpt) return matchOpt;
      }
      return (tag === 'input' && (type === 'number' || /inr|annual|rs/i.test(s))) ? "500000" : "5.0";
    }

    // Current salary / CTC
    if (/current.*(salary|ctc|package|compensation|remuneration)|annual.*current|put 0.*intern|fixed.*ctc/i.test(s)) {
      if (options && options.length > 0) {
        const matchOpt = options.find(o => /^0\\b|fresher|0-3|intern/i.test(o.trim()));
        if (matchOpt) return matchOpt;
      }
      return "0";
    }

    // Experience in months — catches name="exp_months", placeholder="e.g. 12", surrounding text "months of experience"
    if (/exp.*month|month.*exp|how many months|relevant.*exp.*month|work.*exp.*month|total.*exp.*month/i.test(s)) {
      if (options && options.length > 0) {
        const rangeOpt = options.find(o => {
          const t = o.toLowerCase();
          return t.includes('6-12') || t.includes('6 to 12') || t.includes('12') || t.includes('10') || t.includes('1-2') || t.includes('1 year');
        }) || options.find(o => o.toLowerCase().includes('0-6') || o.toLowerCase().includes('fresher'));
        if (rangeOpt) return rangeOpt;
      }
      return "12";
    }

    // Experience in years — catches name="experience_years", id="total-exp", surrounding "years of experience"
    if (/exp.*year|year.*exp|total.*exp|overall.*exp|relevant.*exp/i.test(s) && !/month/i.test(s)) {
      if (options && options.length > 0) {
        const rangeOpt = options.find(o => /^(1(\.0)?|1\s*year|1\s*years|1\s*-\s*2|0\s*-\s*1|fresher|junior)\b/i.test(o.trim()))
          || options.find(o => /1/i.test(o.trim()));
        if (rangeOpt) return rangeOpt;
      }
      return "1";
    }

    // Technical Skills / Primary Skills / Core Stack
    if (/\b(primary[_\s-]?skills?|key[_\s-]?skills?|technical[_\s-]?skills?|core[_\s-]?skills?|skills?|skill[_\s-]?set|tech[_\s-]?stack|technolog(y|ies)|proficienc(y|ies))\b/i.test(s) && !/exp|year|month/i.test(s)) {
      return profile?.skillsSummary || "React.js, Node.js, Express.js, MongoDB, JavaScript, TypeScript, Tailwind CSS, Supabase, Next.js, Java DSA, REST APIs, Git, SQL";
    }

    // Education Details / Academic Background / Educational Qualification
    if (/\b(education[_\s-]?details|educational[_\s-]?qualifications?|education[_\s-]?summary|academic[_\s-]?details|qualification[_\s-]?details|education[_\s-]?background|education)\b/i.test(s) && !/10th|12th|ssc|hsc|gap|cgpa|gpa|percentage|marks|passing|board|school|college|university|fee|stipend|ppo|structure|level/i.test(s)) {
      return profile?.educationSummary || "B.Tech in Artificial Intelligence (CGPA: 7.79, 2022-2026, G H Raisoni College of Engineering and Management, Jalgaon)";
    }

    // Notice period — catches id="notice-days", name="notice_period", type=number near "days"
    if (/notice|how soon.*(start|join)|availability.*(start|join|days)|when.*can.*(start|join)|(start|join).*in.*days|earliest.*start/i.test(s)) {
      if (options && options.length > 0) {
        const immOpt = options.find(o => /immediate|^0\b|0\s*days|15\s*days/i.test(o.trim()));
        if (immOpt) return immOpt;
      }
      return (type === 'number' || /days/i.test(s)) ? "0" : "Immediate";
    }

    // Prefix / Salutation
    if (/prefix|salutation|honorific/i.test(s) && !/job|position/i.test(s)) return "Mr.";

    // Gender / Sex
    if (/\bgender\b|\bsex\b/i.test(s)) return "Male";

    // Nationality / Citizenship
    if (/nationality|citizenship/i.test(s) && !/code|isd/i.test(s)) return "Indian";

    // Marital status
    if (/marital/i.test(s)) return "Single";

    // State / Province
    if (/\bstate\b|\bprovince\b/i.test(s) && !/country|city|district/i.test(s)) return "Maharashtra";

    // Country
    if (/\bcountry\b/i.test(s) && !/code|isd|dial|county/i.test(s)) return "India";

    // City / Location
    if (/\bcity\b|\bcurrent.*location\b/i.test(s) && !/state|country/i.test(s)) return "Bhusawal";

    // Designation / Job Title
    if (/designation|job.*title|role.*title|position.*title/i.test(s) && !/degree|education/i.test(s)) {
      return profile?.personal?.designation || profile?.career?.currentDesignation || "Full Stack Developer";
    }

    // Valid passport
    if (/valid.*passport|passport.*valid|hold.*passport/i.test(s)) return "Yes";

    // Immigration status
    if (/immigration.*status|work.*auth|authorized.*work/i.test(s)) return "Citizen";

    // Highest qualification / education
    if (/highest.*(education|qualification|degree)|education.*level/i.test(s)) return "B.Tech";

    // PPO / Pre-placement offer
    if (/ppo|pre.?placement|post.*internship/i.test(s)) {
      if (options && options.length > 0) {
        const yesOpt = options.find(o => /^(yes|definitely|interested)\\b/i.test(o.trim()));
        if (yesOpt) return yesOpt;
      }
      return "Yes";
    }

    // Stipend / Program structure acknowledgement
    if (/stipend|program.*structure|program.*details|gone.*through.*program|clear.*stipend/i.test(s)) {
      if (options && options.length > 0) {
        const yesOpt = options.find(o => /^(yes|definitely|clear|agree)\\b/i.test(o.trim()));
        if (yesOpt) return yesOpt;
      }
      return "Yes";
    }

    // Relocation
    if (/relocat|willing.*relocat/i.test(s)) {
      if (options && options.length > 0) {
        const yesOpt = options.find(o => /^(yes|agree|positive)\\b/i.test(o.trim()));
        if (yesOpt) return yesOpt;
      }
      return "Yes";
    }

    // Agreement / Declaration / Confirmation
    if (/agree|declaration|confirm.*read|certify|i.*agree|accept.*terms/i.test(s)) return "Yes";

    // Generic select with affirmative first option
    if (tag === 'select' && options.length > 0) {
      const positive = options.find(o => /^(yes|citizen|indian|male|single|mr|b\\.?tech|maharashtra|india)$/i.test(o.trim()));
      if (positive) return positive;
    }

    return "";
  }

  // If no API key, use the enhanced fast fallback immediately
  if (!apiKey || apiKey.trim() === "") {
    return getFastFallback();
  }

  // Build the rich Gemini prompt with ALL available signals
  const sectionDisplay = sectionHeading || sectionContext || "General";
  const fieldContextLines = [
    `Form Title: "${formTitle || document?.title || 'Job Application'}"`,
    `Section: "${sectionDisplay}"`,
    `Field Label: "${label || '(none)'}"`,
    fieldName  ? `HTML name attr: "${fieldName}"` : null,
    fieldId    ? `HTML id attr: "${fieldId}"` : null,
    ariaLabel  ? `ARIA Label: "${ariaLabel}"` : null,
    `Input Type: ${type}`,
    `HTML Tag: <${tag}>`,
    maxLength  ? `Max Length: ${maxLength}` : null,
    placeholder ? `Placeholder: "${placeholder}"` : null,
    surroundingText ? `Surrounding Text: "${surroundingText.slice(0, 200)}"` : null,
    ariaDescribedby ? `ARIA Description: "${ariaDescribedby.slice(0, 150)}"` : null,
  ].filter(Boolean).join('\n');

  let prompt;
  if (options && options.length > 0) {
    prompt = `[CANDIDATE PROFILE]
${candidateBio}

[FIELD CONTEXT — ALL SIGNALS]
${fieldContextLines}
Dropdown Options: ${JSON.stringify(options.slice(0, 30))}

[TASK]
You are auto-filling a job application for this candidate.
Using ALL context above, select the single best matching option.

RULES:
- Pick the option that best fits this candidate's profile
- For Yes/No questions, pick the correct answer for this candidate
- For experience in months → prefer the option containing 12 or 6-12
- For experience in years → prefer the option containing 1 or 1-2
- Respond with ONLY the exact matching option string from the list. No explanation. No quotes.

Answer:`;
  } else {
    prompt = `[CANDIDATE PROFILE]
${candidateBio}

[FIELD CONTEXT — ALL SIGNALS]
${fieldContextLines}

[TASK]
You are auto-filling a job application for this candidate.
Using ALL context above, determine the single exact value to type into this field.

RULES:
- Experience in months → 12
- Experience in years → 1
- Expected salary / CTC in INR or annual → 500000
- Expected CTC in LPA → 5
- Notice period in days → 0
- Notice period as text → Immediate
- Current CTC (fresher/intern) → 0
- Designation / Job Title → Full Stack Developer
- Yes/No questions → pick the correct answer for this candidate
- Respond with ONLY the raw value to type. No explanation. No units. No quotes. No punctuation unless required by the field format.

Answer:`;
  }

  const url = `${GEMINI_API_ENDPOINT}/${model}:generateContent?key=${apiKey.trim()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 60 }
      })
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find(p => p.text && !p.thought) || parts[0];
      const answer = textPart?.text?.trim().replace(/^["']|["']$/g, '');
      if (answer) return answer;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("[AutoApply Pro] AI field inference fallback:", err.message);
  }

  return getFastFallback();
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

  let selectedModel = normalizeModelName(model);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

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
      if ((res.status === 404 || res.status === 400) && selectedModel !== "gemini-3.7-flash") {
        const fallbackModel = "gemini-3.7-flash";
        const fbUrl = `${GEMINI_API_ENDPOINT}/${fallbackModel}:generateContent?key=${apiKey.trim()}`;
        const fbRes = await fetch(fbUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "Respond with the single word: OK" }] }],
            generationConfig: { maxOutputTokens: 10 }
          })
        });
        if (fbRes.ok) {
          return { success: true, message: `Connected successfully! Active model: ${fallbackModel}` };
        }
      }
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
    if (e.name === 'AbortError' || (e.message && e.message.includes('abort'))) {
      return { success: false, message: "Request timed out after 12s. Please check your internet connection or API key validity." };
    }
    return { success: false, message: e.message };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateAnswerWithGemini, inferFieldWithGemini, testGeminiApiKey, generateInstantFallbackAnswer };
}
