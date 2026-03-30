import { apiPatch } from '@valuation-os/api'
import {
  clearInspectionDraft,
  getInspectionSyncJob,
  listInspectionSyncJobs,
  removeInspectionSyncJob,
  upsertInspectionSyncJob,
  type StoredInspectionDraft,
} from '@/lib/storage'

function toInspectionPatchPayload(payload: Omit<StoredInspectionDraft, 'updatedAt'>) {
  return {
    inspectionDate: payload.inspectionDate ? new Date(payload.inspectionDate).toISOString() : undefined,
    occupancy: payload.occupancy || undefined,
    locationDescription: payload.locationDescription || undefined,
    externalCondition: payload.externalCondition || undefined,
    internalCondition: payload.internalCondition || undefined,
    services: payload.services || undefined,
    conditionSummary: payload.conditionSummary || undefined,
    notes: payload.notes || undefined,
  }
}

export async function queueInspectionDraftSync(input: {
  caseId: string
  inspectionId: string
  payload: Omit<StoredInspectionDraft, 'updatedAt'>
}) {
  return upsertInspectionSyncJob(input)
}

export async function hasPendingInspectionDraftSync(inspectionId: string) {
  const job = await getInspectionSyncJob(inspectionId)
  return Boolean(job)
}

export async function flushInspectionDraftSyncs(options?: { inspectionId?: string }) {
  const queue = await listInspectionSyncJobs()
  const jobs = options?.inspectionId
    ? queue.filter((job) => job.inspectionId === options.inspectionId)
    : queue

  const syncedInspectionIds: string[] = []
  const failedInspectionIds: string[] = []

  for (const job of jobs) {
    try {
      await apiPatch(
        `/api/v1/cases/${job.caseId}/inspections/${job.inspectionId}`,
        toInspectionPatchPayload(job.payload),
      )
      await removeInspectionSyncJob(job.inspectionId)
      await clearInspectionDraft(job.inspectionId)
      syncedInspectionIds.push(job.inspectionId)
    } catch {
      failedInspectionIds.push(job.inspectionId)
    }
  }

  return {
    syncedInspectionIds,
    failedInspectionIds,
  }
}
