const fs = require('fs');
const path = require('path');

const resumePath = path.resolve(__dirname, '..', 'DanishKhan_Resume.pdf');
const assetsDir = path.resolve(__dirname, '..', 'assets');
const outputPath = path.join(assetsDir, 'resume-data.js');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const buffer = fs.readFileSync(resumePath);
const base64 = buffer.toString('base64');

const code = `/**
 * Auto-generated Base64 representation of DanishKhan_Resume.pdf
 * AutoApply Pro Resume Auto-Uploader
 */
const RESUME_DATA = {
  filename: "DanishKhan_Resume.pdf",
  mimeType: "application/pdf",
  sizeBytes: ${buffer.length},
  base64: "${base64}"
};

if (typeof window !== 'undefined') {
  window.RESUME_DATA = RESUME_DATA;
}
if (typeof self !== 'undefined') {
  self.RESUME_DATA = RESUME_DATA;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RESUME_DATA };
}
`;

fs.writeFileSync(outputPath, code, 'utf8');
console.log(`✓ Generated ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
