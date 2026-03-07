import { Storage } from "@google-cloud/storage"
import { env } from "../lib/env.js"

let storage: Storage | null = null

function getStorage(): Storage {
  if (!storage) {
    if (!env.GCS_BUCKET) throw new Error("GCS_BUCKET is not set")
    storage = new Storage(env.GCLOUD_PROJECT_ID ? { projectId: env.GCLOUD_PROJECT_ID } : undefined)
  }
  return storage
}

/**
 * Upload image buffer to GCS and return the public URL.
 * File name: trash/{cuid}.{ext}
 */
export async function uploadTrashImage(
  buffer: Buffer,
  mimeType: string,
  id: string
): Promise<string> {
  const bucket = getStorage().bucket(env.GCS_BUCKET!)
  const ext = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1] || "bin"
  const name = `trash/${id}.${ext}`
  const file = bucket.file(name)
  await file.save(buffer, {
    metadata: { contentType: mimeType },
    public: true,
  })
  return `https://storage.googleapis.com/${env.GCS_BUCKET}/${name}`
}
