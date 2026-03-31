import type { AuthedRequest } from '@/lib/api/with-auth'
import { Errors } from '@/lib/api/errors'
import { prisma } from '@/lib/db/prisma'

type ReportWorkflowContext = NonNullable<
  Awaited<ReturnType<typeof fetchReportWorkflowContext>>
>

export async function fetchReportWorkflowContext({
  caseId,
  reportId,
  firmId,
}: {
  caseId: string
  reportId: string
  firmId: string
}) {
  return prisma.report.findFirst({
    where: { id: reportId, caseId, firmId },
    select: {
      id: true,
      status: true,
      renderedHtml: true,
      generatedAt: true,
      approvedById: true,
      approvedAt: true,
      case: {
        select: {
          id: true,
          stage: true,
          assignedValuerId: true,
          inspection: {
            select: {
              id: true,
              status: true,
            },
          },
          caseComparables: {
            select: {
              id: true,
            },
          },
          analysis: {
            select: {
              id: true,
              basisOfValue: true,
              concludedValue: true,
            },
          },
        },
      },
      comments: {
        where: {
          type: 'blocking',
          isResolved: false,
        },
        select: {
          id: true,
          body: true,
        },
      },
    },
  })
}

export function requireReportWorkflowContext(
  report: Awaited<ReturnType<typeof fetchReportWorkflowContext>>,
): ReportWorkflowContext {
  if (!report) {
    throw Errors.NOT_FOUND('Report')
  }

  return report
}

export function assertNoBlockingComments(
  report: Pick<ReportWorkflowContext, 'comments'>,
  action: string,
) {
  if (report.comments.length === 0) {
    return
  }

  throw Errors.VALIDATION({
    workflow: [`Resolve all blocking comments before ${action}.`],
    blockingCommentIds: report.comments.map((comment) => comment.id),
    blockingComments: report.comments.map((comment) => comment.body),
  })
}

export function assertReadyForIssue(
  report: Pick<ReportWorkflowContext, 'case'>,
) {
  const details: Record<string, string[]> = {}

  if (!report.case.inspection || report.case.inspection.status !== 'submitted') {
    details.inspection = ['Inspection must be submitted before issuing the final report.']
  }

  if (report.case.caseComparables.length === 0) {
    details.comparables = ['Attach at least one comparable before issuing the final report.']
  }

  if (!report.case.analysis?.basisOfValue) {
    details.basisOfValue = ['Set the basis of value before issuing the final report.']
  }

  if (!report.case.analysis?.concludedValue) {
    details.concludedValue = ['Set the concluded value before issuing the final report.']
  }

  if (Object.keys(details).length > 0) {
    throw Errors.VALIDATION(details)
  }
}

export async function createAuditEntry(
  req: AuthedRequest,
  {
    action,
    entityType,
    entityId,
    before,
    after,
  }: {
    action: string
    entityType: string
    entityId: string
    before?: Record<string, unknown> | null
    after?: Record<string, unknown> | null
  },
) {
  const forwardedFor = req.headers.get('x-forwarded-for')
  const ipAddress = forwardedFor?.split(',')[0]?.trim() || null
  const userAgent = req.headers.get('user-agent')?.slice(0, 500) || null

  await prisma.auditLog.create({
    data: {
      firmId: req.session.firmId,
      userId: req.session.userId,
      action,
      entityType,
      entityId,
      ...(before !== undefined ? { before: before as any } : {}),
      ...(after !== undefined ? { after: after as any } : {}),
      ipAddress,
      userAgent,
    },
  })
}
