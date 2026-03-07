import { v2 as cloudinary } from "cloudinary"
import { env } from "../lib/env.js"

let configured = false

function ensureConfigured(): void {
  if (configured) return
  if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    })
    configured = true
  }
}

/**
 * Upload image buffer to Cloudinary and return the public URL.
 * Folder: trash/; public_id: trash/{id}
 */
export async function uploadTrashImage(
  buffer: Buffer,
  mimeType: string,
  id: string
): Promise<string> {
  ensureConfigured()
  const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "trash",
    public_id: id,
    overwrite: true,
  })
  return result.secure_url
}
