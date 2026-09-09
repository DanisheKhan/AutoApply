// Pure Node.js ZIP Packager for Chrome Web Store distribution
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const OUTPUT_ZIP = path.join(DIST_DIR, 'AutoApply-Pro-Extension.zip');

const INCLUDE_PATTERNS = [
  'manifest.json',
  'default-profile.js',
  'DanishKhan_Resume.pdf',
  'assets',
  'icons',
  'background',
  'content',
  'popup',
  'options',
  'test-page'
];

function getAllFiles(dir, baseDir = '') {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const relPath = path.join(baseDir, file).replace(/\\/g, '/');
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, relPath));
    } else {
      results.push({ fullPath, relPath });
    }
  });
  return results;
}

// Minimal standard ZIP writer
function createZip(files, outputPath) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  files.forEach(({ fullPath, relPath }) => {
    const content = fs.readFileSync(fullPath);
    const deflated = zlib.deflateRawSync(content);
    const crc = crc32(content);
    const nameBuf = Buffer.from(relPath, 'utf8');

    // Local Header
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localHeader.writeUInt16LE(20, 4);         // Version needed
    localHeader.writeUInt16LE(0, 6);          // Flags
    localHeader.writeUInt16LE(8, 8);          // Compression: Deflate
    localHeader.writeUInt16LE(0, 10);         // Mod time
    localHeader.writeUInt16LE(0, 12);         // Mod date
    localHeader.writeUInt32LE(crc, 14);       // CRC32
    localHeader.writeUInt32LE(deflated.length, 18); // Compressed size
    localHeader.writeUInt32LE(content.length, 22);  // Uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26);  // Filename length
    localHeader.writeUInt16LE(0, 28);         // Extra field length
    nameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, deflated);

    // Central Directory Header
    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Signature
    centralHeader.writeUInt16LE(20, 4);         // Version made by
    centralHeader.writeUInt16LE(20, 6);         // Version needed
    centralHeader.writeUInt16LE(0, 8);          // Flags
    centralHeader.writeUInt16LE(8, 10);         // Compression
    centralHeader.writeUInt16LE(0, 12);         // Mod time
    centralHeader.writeUInt16LE(0, 14);         // Mod date
    centralHeader.writeUInt32LE(crc, 16);       // CRC32
    centralHeader.writeUInt32LE(deflated.length, 20); // Compressed size
    centralHeader.writeUInt32LE(content.length, 24);  // Uncompressed size
    centralHeader.writeUInt16LE(nameBuf.length, 28);  // Filename length
    centralHeader.writeUInt16LE(0, 30);         // Extra length
    centralHeader.writeUInt16LE(0, 32);         // Comment length
    centralHeader.writeUInt16LE(0, 34);         // Disk start
    centralHeader.writeUInt16LE(0, 36);         // Internal attr
    centralHeader.writeUInt32LE(0, 38);         // External attr
    centralHeader.writeUInt32LE(offset, 42);    // Local header offset
    nameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);

    offset += localHeader.length + deflated.length;
  });

  const centralDirOffset = offset;
  let centralDirSize = 0;
  centralHeaders.forEach(ch => centralDirSize += ch.length);

  // End of Central Directory
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);          // Signature
  eocd.writeUInt16LE(0, 4);                   // Disk number
  eocd.writeUInt16LE(0, 6);                   // Disk with central dir
  eocd.writeUInt16LE(files.length, 8);        // Entries on this disk
  eocd.writeUInt16LE(files.length, 10);       // Total entries
  eocd.writeUInt32LE(centralDirSize, 12);     // Central dir size
  eocd.writeUInt32LE(centralDirOffset, 16);   // Central dir offset
  eocd.writeUInt16LE(0, 20);                  // Comment length

  const finalZip = Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
  fs.writeFileSync(outputPath, finalZip);
}

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

// Collect target files
if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

let allFilesToPackage = [];
INCLUDE_PATTERNS.forEach(entry => {
  const full = path.join(ROOT_DIR, entry);
  if (fs.existsSync(full)) {
    if (fs.statSync(full).isDirectory()) {
      allFilesToPackage = allFilesToPackage.concat(getAllFiles(full, entry));
    } else {
      allFilesToPackage.push({ fullPath: full, relPath: entry });
    }
  }
});

createZip(allFilesToPackage, OUTPUT_ZIP);
const stats = fs.statSync(OUTPUT_ZIP);
console.log(`\n✓ Successfully packaged ${allFilesToPackage.length} files into:`);
console.log(`  ${OUTPUT_ZIP} (${(stats.size / 1024).toFixed(1)} KB)`);
