// Uploads a static frontend file to Cloudinary (the CDN from Exercise 4) and prints its URL.
// The dashboard itself still loads its files from the droplet (origin). The CDN copy is used to
// compare response times for the same file from origin and CDN (tests/cdn/compare.sh, figure F19).
// Usage (from backend/): npm run cdn:upload [-- <file in frontend/public>]   default: style.css
const path = require('path');
const { v2: cloudinary } = require('cloudinary');
const config = require('../config');

const file = process.argv[2] || 'style.css';
const source = path.join(__dirname, '..', '..', 'frontend', 'public', file);

async function main() {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET in .env');
    process.exit(1);
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

  const result = await cloudinary.uploader.upload(source, {
    folder: 'night-agent',
    use_filename: true,
    unique_filename: false,
    overwrite: true,
    resource_type: 'auto', // images as "image", CSS and other files as "raw"
  });

  console.log(`Uploaded ${file}: ${result.bytes} bytes (${result.resource_type})`);
  console.log(`Origin: https://night-agent.me/public/${file}`);
  console.log(`CDN:    ${result.secure_url}`);
}

main().catch((err) => {
  console.error('Upload failed:', err.message || err);
  process.exit(1);
});
