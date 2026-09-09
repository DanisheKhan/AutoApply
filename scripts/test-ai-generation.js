const { DEFAULT_PROFILE } = require('../default-profile.js');
const { generateAnswerWithGemini } = require('../background/gemini-client.js');
const fs = require('fs');
const path = require('path');

const envFile = path.resolve(__dirname, '../.env');
if (fs.existsSync(envFile)) {
  const match = fs.readFileSync(envFile, 'utf8').match(/GEMINI_API_KEY=(.+)/);
  if (match) DEFAULT_PROFILE.gemini.apiKey = match[1].trim();
}

async function runTest() {
  const start = Date.now();
  const q = "Why do you want to join our engineering team and what makes you passionate about web development?";
  console.log('Sending Question to Gemini...');
  const answer = await generateAnswerWithGemini({ question: q, jobContext: "Full-Stack Software Engineer" }, DEFAULT_PROFILE);
  const elapsed = Date.now() - start;
  console.log(`\n⚡ Completed in ${elapsed}ms!\n`);
  console.log('Answer:\n', answer);
}

runTest();
