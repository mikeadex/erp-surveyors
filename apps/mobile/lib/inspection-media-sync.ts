import { File } from 'expo-file-system'
import { apiDelete, apiPost } from '@valuation-os/api'
import {
  enqueueInspectionMediaSyncJob,
  listInspectionMediaSyncJobs,
  listInspectionMediaSyncJobsForInspection,
  removeInspectionMediaSyncJob,
  type InspectionPhotoSection,
} from '@/lib/storage'

interface QueueInspectionMediaSyncInput {
  caseId: string
  inspectionId: string
  localUri: string
  fileType: string
  section: InspectionPhotoSection
  caption?: string | null
}

async function uploadInspectionMedia(job: QueueInspectionMediaSyncInput) {
  let mediaId: string | null = null

  try {
    const createResponse = await apiPost<{
      mediaId: string
      fileKey: string
      uploadUrl: string
    }>(`/api/v1/cases/${job.caseId}/inspections/${job.inspectionId}/media`, {
      section: job.section,
      fileType: job.fileType,
      caption: job.caption || undefined,
    })
    mediaId = createResponse.mediaId

    const file = new File(job.localUri)
    const uploadResponse = await fetch(createResponse.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': job.fileType },
      body: file,
    })

    if (!uploadResponse.ok) {
      throw new Error('Photo upload failed while sending the file to storage.')
    }

    await apiPost(
      `/api/v1/cases/${job.caseId}/inspections/${job.inspectionId}/media/${createResponse.mediaId}/confirm`,
      {
        caption: job.caption || undefined,
        takenAt: new Date().toISOString(),
      },
    )
  } catch (error) {
    if (mediaId) {
      await apiDelete(`/api/v1/cases/${job.caseId}/inspections/${job.inspectionId}/media/${mediaId}`).catch(
        () => undefined,
      )
    }

    throw error
  }
}

export async function queueInspectionMediaSync(input: QueueInspectionMediaSyncInput) {
  return enqueueInspectionMediaSyncJob(input)
}

export async function getPendingInspectionMediaSyncCount(inspectionId: string) {
  const jobs = await listInspectionMediaSyncJobsForInspection(inspectionId)
  return jobs.length
}

export async function flushInspectionMediaSyncs(options?: { inspectionId?: string }) {
  const queue = await listInspectionMediaSyncJobs()
  const jobs = options?.inspectionId
    ? queue.filter((job) => job.inspectionId === options.inspectionId)
    : queue

  const syncedJobIds: string[] = []
  const failedJobIds: string[] = []
  const syncedInspectionIds = new Set<string>()

  for (const job of jobs) {
    try {
      await uploadInspectionMedia(job)
      await removeInspectionMediaSyncJob(job.jobId)
      syncedJobIds.push(job.jobId)
      syncedInspectionIds.add(job.inspectionId)
    } catch {
      failedJobIds.push(job.jobId)
    }
  }

  return {
    syncedJobIds,
    failedJobIds,
    syncedInspectionIds: Array.from(syncedInspectionIds),
  }
}
