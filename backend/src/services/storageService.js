import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

const useCloudinary = () =>
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (useCloudinary()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Uploads a single file (from Multer) to Cloudinary, or falls back to a
 * locally-served /uploads URL when Cloudinary is not configured.
 * Returns { url, publicId }.
 */
export async function uploadImage(file) {
  if (!file) return null;

  if (useCloudinary()) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'oceanshield/reports',
        resource_type: 'image',
      });
      // Clean up the local temp file after upload
      safeDelete(file.path);
      return { url: result.secure_url, publicId: result.public_id };
    } catch (err) {
      console.error('Cloudinary upload failed, falling back to local:', err.message);
    }
  }

  // Local fallback: serve via /uploads static route
  const localUrl = `${process.env.BASE_URL || ''}/uploads/${path.basename(file.path)}`;
  return { url: localUrl, publicId: '' };
}

export async function uploadImages(files = []) {
  const results = [];
  for (const file of files) {
    const uploaded = await uploadImage(file);
    if (uploaded) results.push(uploaded);
  }
  return results;
}

/**
 * Deletes an image from Cloudinary by publicId (if available).
 */
export async function deleteImage(publicId) {
  if (!publicId || !useCloudinary()) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Failed to delete image from Cloudinary:', err.message);
  }
}

function safeDelete(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
}

export default { uploadImage, uploadImages, deleteImage };
