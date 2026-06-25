import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env['CLOUDINARY_CLOUD_NAME'],
  api_key:    process.env['CLOUDINARY_API_KEY'],
  api_secret: process.env['CLOUDINARY_API_SECRET'],
  secure: true,
});

/**
 * Delete a Cloudinary asset by public_id.
 * Uploads happen client-side (Flutter uploads directly to Cloudinary); the backend
 * only ever needs to clean up replaced/removed assets.
 */
export const destroy = (publicId: string) => cloudinary.uploader.destroy(publicId);

export { cloudinary };
