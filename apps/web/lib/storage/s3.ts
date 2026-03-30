import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

interface StorageConfig {
  bucket: string
  region: string
  endpoint?: string
  accessKeyId: string
  secretAccessKey: string
}

let cachedClient: S3Client | null = null

function getStorageConfig(): StorageConfig | null {
  const bucket = process.env.S3_BUCKET_NAME?.trim()
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim()
  const endpoint = process.env.S3_ENDPOINT?.trim()

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return null
  }

  return {
    bucket,
    region: process.env.S3_REGION?.trim() || 'us-east-1',
    accessKeyId,
    secretAccessKey,
    ...(endpoint ? { endpoint } : {}),
  }
}

export function hasSignedStorageConfig() {
  return Boolean(getStorageConfig())
}

export function getPublicAssetBaseUrl() {
  return process.env.S3_PUBLIC_URL ?? process.env.CLOUDFLARE_R2_PUBLIC_URL ?? null
}

export function hasMediaReadConfig() {
  return hasSignedStorageConfig() || Boolean(getPublicAssetBaseUrl())
}

function getS3Client() {
  const config = getStorageConfig()
  if (!config) {
    throw new Error('Signed storage is not configured')
  }

  if (!cachedClient) {
    cachedClient = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    })
  }

  return { client: cachedClient, config }
}

export async function createPresignedUploadUrl({
  key,
  contentType,
  expiresIn = 900,
}: {
  key: string
  contentType: string
  expiresIn?: number
}) {
  const { client, config } = getS3Client()
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  })

  return getSignedUrl(client, command, { expiresIn })
}

export async function createPresignedDownloadUrl({
  key,
  expiresIn = 900,
}: {
  key: string
  expiresIn?: number
}) {
  const { client, config } = getS3Client()
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  })

  return getSignedUrl(client, command, { expiresIn })
}

export async function deleteStorageObject(key: string) {
  const { client, config } = getS3Client()
  await client.send(new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key,
  }))
}

export function buildPublicAssetUrl(key: string) {
  const baseUrl = getPublicAssetBaseUrl()
  if (!baseUrl) return null

  const normalizedKey = key.replace(/^\/+/, '')
  return `${baseUrl.replace(/\/$/, '')}/${normalizedKey}`
}
