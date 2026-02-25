import { v2 as cloudinary } from 'cloudinary';
import { config } from './index.config';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export const uploadToCloudinary = async (
  buffer: Buffer,
  folder: string = 'properties'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { quality: 'auto', fetch_format: 'auto' },
            { width: 1200, crop: 'limit' },
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result?.secure_url || '');
          }
        }
      )
      .end(buffer);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};

export default cloudinary;
