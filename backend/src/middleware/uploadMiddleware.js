import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const MAX_MB = parseInt(process.env.MAX_IMAGE_UPLOAD_MB || '10', 10);

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

// Ensure local fallback dir exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const base = crypto.randomBytes(12).toString('hex');
    cb(null, `${Date.now()}-${base}${ext || '.jpg'}`);
  },
});

const allowedMime = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function fileFilter(_req, file, cb) {
  if (allowedMime.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Allowed: JPG, PNG, WEBP, GIF.'), false);
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 5 },
});

export default upload;
