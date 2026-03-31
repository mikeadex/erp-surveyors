import { describe, expect, it } from 'vitest'
import { buildRuntimeReadinessSnapshotFromEnv } from './runtime-readiness'

describe('buildRuntimeReadinessSnapshotFromEnv', () => {
  it('marks production ready when core env values exist', () => {
    const snapshot = buildRuntimeReadinessSnapshotFromEnv({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/app',
      JWT_ACCESS_SECRET: 'access-secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
      S3_BUCKET_NAME: 'bucket',
      S3_ACCESS_KEY_ID: 'key',
      S3_SECRET_ACCESS_KEY: 'secret',
      CRON_SECRET: 'cron-secret',
    })

    expect(snapshot.productionReady).toBe(true)
    expect(snapshot.blockingFailures).toHaveLength(0)
  })

  it('flags missing blocking configuration', () => {
    const snapshot = buildRuntimeReadinessSnapshotFromEnv({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/app',
      JWT_ACCESS_SECRET: 'access-secret',
    })

    expect(snapshot.productionReady).toBe(false)
    expect(snapshot.blockingFailures.map((check) => check.key)).toEqual(
      expect.arrayContaining(['jwt-refresh', 'storage-write', 'storage-read', 'cron-secret']),
    )
  })
})
