import { v2 as cloudinary } from 'cloudinary'
import crypto from 'crypto'
import { env } from '../../config/env'
import { logger } from '../../utils/logger'

export interface UploadResult {
  url: string
  publicId: string
}

export interface UploadOptions {
  folder?: string
  filename?: string
  mimetype?: string
}

/** Abstraction over object storage so the provider can be swapped or stubbed. */
export interface StorageProvider {
  readonly name: string
  upload(buffer: Buffer, opts?: UploadOptions): Promise<UploadResult>
}

class CloudinaryStorage implements StorageProvider {
  readonly name = 'CLOUDINARY'
  constructor(cloudName: string, apiKey: string, apiSecret: string) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })
  }
  upload(buffer: Buffer, opts?: UploadOptions): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: opts?.folder ?? 'mela', resource_type: 'image' },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error('Upload failed'))
          resolve({ url: result.secure_url, publicId: result.public_id })
        }
      )
      stream.end(buffer)
    })
  }
}

/** Dev/test stub used when Cloudinary is unconfigured. Does not persist. */
class StubStorage implements StorageProvider {
  readonly name = 'STUB'
  async upload(_buffer: Buffer, opts?: UploadOptions): Promise<UploadResult> {
    const id = crypto.randomBytes(8).toString('hex')
    logger.warn('Stub storage in use — file not persisted', { folder: opts?.folder })
    return { url: `https://cdn.local/stub/${opts?.folder ?? 'mela'}/${id}`, publicId: id }
  }
}

export const storage: StorageProvider =
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
    ? new CloudinaryStorage(
        env.CLOUDINARY_CLOUD_NAME,
        env.CLOUDINARY_API_KEY,
        env.CLOUDINARY_API_SECRET
      )
    : new StubStorage()
