import "server-only";

import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { isConfigured } from "@/lib/utils";

export function hasCloudinaryConfig() {
  return (
    isConfigured(process.env.CLOUDINARY_CLOUD_NAME) &&
    isConfigured(process.env.CLOUDINARY_API_KEY) &&
    isConfigured(process.env.CLOUDINARY_API_SECRET)
  );
}

export function getCloudinary() {
  if (!hasCloudinaryConfig()) return null;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return cloudinary;
}

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: "image" | "raw" | "auto" = "auto",
): Promise<UploadApiResponse> {
  const client = getCloudinary();
  if (!client) throw new Error("Cloudinary is not configured.");

  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder: `more-energy/${folder}`,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) reject(error ?? new Error("Upload failed"));
        else resolve(result);
      },
    );

    stream.end(buffer);
  });
}
