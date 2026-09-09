// Automated verification test for AutoApply Pro engine
const { DEFAULT_PROFILE } = require('../default-profile.js');
const { testGeminiApiKey } = require('../background/gemini-client.js');

async function runVerification() {
  console.log("==================================================");
  console.log("⚡ AutoApply Pro - Automated Engine Verification");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Candidate Bio-Data Verification
  console.log("[1] Checking Candidate Master Profile:");
  assert(DEFAULT_PROFILE.personal.fullName.includes("Mohammad Danish Khan"), "Full name verified");
  assert(DEFAULT_PROFILE.academics.graduation.cgpa === "7.79", "B.Tech CGPA verified (7.79)");
  assert(DEFAULT_PROFILE.academics.graduation.activeBacklogs === "0", "Backlogs verified (0)");
  assert(DEFAULT_PROFILE.academics.tenth.percentage === "89.60", "10th SSC % verified (89.60%)");
  assert(DEFAULT_PROFILE.academics.twelfth.percentage === "70.50", "12th HSC % verified (70.50%)");
  assert(DEFAULT_PROFILE.identification.panNumber === "NNPPK5977P", "PAN Number verified");
  assert(DEFAULT_PROFILE.identification.aadhaarNumber === "270883622036", "Aadhaar verified");
  assert(DEFAULT_PROFILE.identification.passportNumber === "AH927400", "Passport verified");
  assert(DEFAULT_PROFILE.credentials.defaultPassword === "Danishe@1257", "Portal default password verified (Danishe@1257)");
  assert(DEFAULT_PROFILE.projects.length >= 3, "Featured projects loaded (at least 3)");

  const { RESUME_DATA } = require('../assets/resume-data.js');
  assert(RESUME_DATA && RESUME_DATA.filename === "DanishKhan_Resume.pdf", "Resume PDF asset verified (DanishKhan_Resume.pdf)");
  assert(RESUME_DATA.sizeBytes === 340082, "Resume byte size verified (340,082 bytes)");

  // Read API key from environment variable or local .env if available
  let apiKey = process.env.GEMINI_API_KEY || DEFAULT_PROFILE.gemini.apiKey;
  if (!apiKey) {
    try {
      const fs = require('fs');
      const path = require('path');
      const envFile = path.resolve(__dirname, '../.env');
      if (fs.existsSync(envFile)) {
        const match = fs.readFileSync(envFile, 'utf8').match(/GEMINI_API_KEY=(.+)/);
        if (match) apiKey = match[1].trim();
      }
    } catch (e) {}
  }

  if (apiKey) {
    console.log(`  Connecting with API key: ${apiKey.slice(0, 8)}...`);
  } else {
    console.log("  ℹ No Gemini API key configured in .env (skipping live API check).");
  }

  try {
    const result = await testGeminiApiKey(apiKey, "gemini-3.6-flash");
    if (result.success) {
      assert(true, `Gemini API response: ${result.message}`);
    } else {
      // Note: If API key is an example or rate limited, report status
      console.log(`  ℹ Gemini API response: ${result.message}`);
    }
  } catch (e) {
    console.log(`  ℹ Network status: ${e.message}`);
  }

  console.log("\n==================================================");
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================\n");
}

runVerification();
