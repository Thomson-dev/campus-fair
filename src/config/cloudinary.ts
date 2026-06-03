import { v2 as cloudinary, UploadApiResponse, UploadApiOptions } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env['CLOUDINARY_CLOUD_NAME'],
  api_key:    process.env['CLOUDINARY_API_KEY'],
  api_secret: process.env['CLOUDINARY_API_SECRET'],
  secure: true,
});

/**
 * Upload a raw buffer to Cloudinary.
 */
export const uploadBuffer = (buffer: Buffer, options: UploadApiOptions = {}): Promise<UploadApiResponse> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err || !result) reject(err ?? new Error('Cloudinary upload failed'));
      else resolve(result);
    });
    stream.end(buffer);
  });

/**
 * Delete a Cloudinary asset by public_id.
 */
export const destroy = (publicId: string) => cloudinary.uploader.destroy(publicId);

export { cloudinary };
