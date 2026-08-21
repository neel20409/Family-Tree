// One-time backup: uploads every file in public/photos/ (the original,
// full-quality source photos -- not the build-time-generated avif/webp/jpg
// derivatives in public/optimized/) to Cloudinary, as a copy independent of
// the GitHub repo/LFS. Safe to re-run: each file gets a stable public_id
// derived from its filename, and Cloudinary just returns the existing asset
// unchanged on a repeat upload to the same id (unsigned presets can't
// overwrite, so re-running never actually re-uploads, just confirms it's
// already there).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const photosDir = path.join(__dirname, '..', 'public', 'photos');
const envPath = path.join(__dirname, '..', '.env');

function loadEnv(filePath) {
  const env = {};
  const text = readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
}

const env = loadEnv(envPath);
const CLOUD_NAME = env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = env.VITE_CLOUDINARY_UPLOAD_PRESET;

if (!CLOUD_NAME || !UPLOAD_PRESET) {
  console.error('Missing VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET in .env');
  process.exit(1);
}

const files = readdirSync(photosDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
console.log(`Uploading ${files.length} photos from public/photos/ to Cloudinary (cloud: ${CLOUD_NAME})...`);

let ok = 0;
let failed = [];

for (const file of files) {
  const filePath = path.join(photosDir, file);
  const base = file.replace(/\.[^.]+$/, '');
  const publicId = `original-photos/${base}`;

  const bytes = readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([bytes]), file);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('public_id', publicId);

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
    });
    const data = await res.json();
    if (!res.ok) {
      failed.push({ file, error: data.error?.message || res.statusText });
      console.error(`  ✗ ${file}: ${data.error?.message || res.statusText}`);
    } else {
      ok += 1;
      console.log(`  ✓ ${file} -> ${data.secure_url}`);
    }
  } catch (err) {
    failed.push({ file, error: err.message });
    console.error(`  ✗ ${file}: ${err.message}`);
  }
}

console.log(`\nDone: ${ok}/${files.length} uploaded.`);
if (failed.length) {
  console.log(`Failed (${failed.length}):`, failed.map((f) => f.file).join(', '));
  process.exit(1);
}
