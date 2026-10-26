import axios from 'axios';
import fs from 'fs';

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT_MS = 30000;

/**
 * Thin client for the Python FastAPI AI microservice.
 * All calls fail gracefully: if the AI service is down, callers should still
 * be able to save reports with aiStatus = 'unavailable'.
 */
const aiClient = axios.create({ baseURL: AI_URL, timeout: TIMEOUT_MS });

export async function checkAiHealth() {
  try {
    const { data } = await aiClient.get('/health');
    return { available: true, ...data };
  } catch (err) {
    return { available: false, error: err.message };
  }
}

/**
 * Send an image file path to the AI service for classification.
 * Reads the file into a multipart form and forwards it.
 */
export async function analyzeImage(imagePath) {
  if (!fs.existsSync(imagePath)) {
    throw new Error('Image file not found for AI analysis');
  }
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('image', fs.createReadStream(imagePath), {
    filename: 'report.jpg',
    contentType: 'image/jpeg',
  });

  const { data } = await aiClient.post('/analyze-image', form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  return data;
}

/**
 * Send a text description for NLP extraction (keywords, phrases, summary, etc).
 */
export async function analyzeText(description) {
  const { data } = await aiClient.post('/analyze-text', { description });
  return data;
}

/**
 * Check a report against existing reports for possible duplicates.
 * payload: { reportId?, latitude?, longitude?, category?, description?, observationDate? }
 */
export async function checkDuplicates(payload) {
  const { data } = await aiClient.post('/check-duplicates', payload);
  return data;
}

export default { checkAiHealth, analyzeImage, analyzeText, checkDuplicates };
