// Simple standalone script to test the /conversation endpoint from Node.
// Usage: node testenpoint.js <path_to_audio_file> [lang] [target_lang]

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

async function main() {
  const filePath = process.argv[2];
  const lang = process.argv[3] || 'en';
  const targetLang = process.argv[4] || 'en';

  if (!filePath) {
    console.error('Provide an audio file path. Example: node testenpoint.js sample.m4a en es');
    process.exit(1);
  }

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error('File not found:', resolved);
    process.exit(1);
  }

  const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const token = process.env.EXPO_PUBLIC_API_TOKEN || '';

  const form = new FormData();
  form.append('file', fs.createReadStream(resolved));
  form.append('lang', lang);
  form.append('target_lang', targetLang);

  console.log('Sending request to', baseURL + '/conversation');

  try {
    const response = await axios.post(baseURL + '/conversation', form, {
      headers: {
        ...form.getHeaders(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000,
    });

    console.log('Status:', response.status);
    console.log('Response data:', response.data);
  } catch (err) {
    if (err.response) {
      console.error('Error status:', err.response.status);
      console.error('Error data:', err.response.data);
    } else {
      console.error('Request failed:', err.message);
    }
    process.exit(1);
  }
}

main();