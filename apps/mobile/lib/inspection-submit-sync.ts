import { ApiRequestError, apiPost } from '@valuation-os/api'
import { flushInspectionMediaSyncs, getPendingInspectionMediaSyncCount } from '@/lib/inspection-media-sync'
import { flushInspectionDraftSyncs, hasPendingInspectionDraftSync } from '@/lib/inspection-sync'
import {
  enqueueInspectionSubmitSyncJob,
  getInspectionSubmitSyncJob,
  listInspectionSubmitSyncJobs,
  removeInspectionSubmitSyncJob,
} from '@/lib/storage'

export async function queueInspectionSubmitSync(input: {
  caseId: string
  inspectionId: string
}) {
  return enqueueInspectionSubmitSyncJob(input)
}

export async function hasPendingInspectionSubmitSync(inspectionId: string) {
  const job = await getInspectionSubmitSyncJob(inspectionId)
  return Boolean(job)
}

export async function flushInspectionSubmitSyncs(options?: { inspectionId?: string }) {
  const queue = await listInspectionSubmitSyncJobs()
  const jobs = options?.inspectionId
    ? queue.filter((job) => job.inspectionId === options.inspectionId)
    : queue

  const syncedInspectionIds: string[] = []
  const failedInspectionIds: string[] = []

  for (const job of jobs) {
    try {
      await flushInspectionDraftSyncs({ inspectionId: job.inspectionId })
      await flushInspectionMediaSyncs({ inspectionId: job.inspectionId })

      const hasPendingDraft = await hasPendingInspectionDraftSync(job.inspectionId)
      const pendingMediaCount = await getPendingInspectionMediaSyncCount(job.inspectionId)

      if (hasPendingDraft || pendingMediaCount > 0) {
        failedInspectionIds.push(job.inspectionId)
        continue
      }

      await apiPost(`/api/v1/cases/${job.caseId}/inspections/${job.inspectionId}/submit`)
      await removeInspectionSubmitSyncJob(job.inspectionId)
      syncedInspectionIds.push(job.inspectionId)
    } catch (err) {
      if (err instanceof ApiRequestError && (err.status === 404 || err.status === 409 || err.status === 422)) {
        await removeInspectionSubmitSyncJob(job.inspectionId)
        syncedInspectionIds.push(job.inspectionId)
        continue
      }

      failedInspectionIds.push(job.inspectionId)
    }
  }

  return {
    syncedInspectionIds,
    failedInspectionIds,
  }
}
