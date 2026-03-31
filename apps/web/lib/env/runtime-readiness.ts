type ReadinessCheck = {
  key: string
  label: string
  ready: boolean
  detail: string
}

type EnvSource = Record<string, string | undefined>

export function buildRuntimeReadinessSnapshotFromEnv(env: EnvSource) {
  const hasStorageWrite =
    Boolean(env.S3_BUCKET_NAME?.trim())
    && Boolean(env.S3_ACCESS_KEY_ID?.trim())
    && Boolean(env.S3_SECRET_ACCESS_KEY?.trim())
  const hasStorageRead = hasStorageWrite || Boolean(env.S3_PUBLIC_URL?.trim() || env.CLOUDFLARE_R2_PUBLIC_URL?.trim())

  const checks: ReadinessCheck[] = [
    {
      key: 'database',
      label: 'Database URL',
      ready: Boolean(env.DATABASE_URL?.trim()),
      detail: 'Required for the app, Prisma, and scheduled jobs.',
    },
    {
      key: 'jwt-access',
      label: 'JWT access secret',
      ready: Boolean(env.JWT_ACCESS_SECRET?.trim()),
      detail: 'Required to avoid development fallback access-token signing.',
    },
    {
      key: 'jwt-refresh',
      label: 'JWT refresh secret',
      ready: Boolean(env.JWT_REFRESH_SECRET?.trim()),
      detail: 'Required to avoid development fallback refresh-token signing.',
    },
    {
      key: 'storage-write',
      label: 'Document/media upload storage',
      ready: hasStorageWrite,
      detail: 'Required for signed uploads on web and mobile.',
    },
    {
      key: 'storage-read',
      label: 'Document/media read path',
      ready: hasStorageRead,
      detail: 'Signed or public asset reads must be configured for file delivery.',
    },
    {
      key: 'cron-secret',
      label: 'Overdue job secret',
      ready: Boolean(env.CRON_SECRET?.trim()),
      detail: 'Required for protected overdue sync jobs and deployment cron wiring.',
    },
    {
      key: 'expo-push',
      label: 'Expo push token',
      ready: Boolean(env.EXPO_ACCESS_TOKEN?.trim() || env.EXPO_PUSH_ACCESS_TOKEN?.trim()),
      detail: 'Recommended for real push delivery beyond in-app notifications.',
    },
  ]

  const blockingKeys = new Set(['database', 'jwt-access', 'jwt-refresh', 'storage-write', 'storage-read', 'cron-secret'])
  const blockingFailures = checks.filter((check) => blockingKeys.has(check.key) && !check.ready)

  return {
    checks,
    blockingFailures,
    productionReady: blockingFailures.length === 0,
  }
}

export function buildRuntimeReadinessSnapshot() {
  return buildRuntimeReadinessSnapshotFromEnv(process.env)
}
