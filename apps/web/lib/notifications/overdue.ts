import { prisma } from '@/lib/db/prisma'
import { createNotificationsForRoles, createNotificationsForUsers } from './workflow'

const CLOSED_CASE_STAGES = ['payment_received', 'archived'] as const

export async function syncOverdueWorkflowState(now = new Date()) {
  const newlyOverdueCases = await prisma.case.findMany({
    where: {
      dueDate: { lt: now },
      isOverdue: false,
      stage: { notIn: [...CLOSED_CASE_STAGES] },
    },
    select: {
      id: true,
      firmId: true,
      branchId: true,
      reference: true,
      dueDate: true,
      assignedValuerId: true,
      assignedReviewerId: true,
    },
  })

  const clearedOverdueCases = await prisma.case.findMany({
    where: {
      isOverdue: true,
      OR: [
        { dueDate: null },
        { dueDate: { gte: now } },
        { stage: { in: [...CLOSED_CASE_STAGES] } },
      ],
    },
    select: { id: true },
  })

  const newlyOverdueInvoices = await prisma.invoice.findMany({
    where: {
      dueDate: { lt: now },
      status: { in: ['sent', 'partial'] },
    },
    select: {
      id: true,
      firmId: true,
      invoiceNumber: true,
      caseId: true,
      case: {
        select: {
          branchId: true,
          reference: true,
        },
      },
    },
  })

  await prisma.$transaction([
    ...(newlyOverdueCases.length > 0
      ? [
          prisma.case.updateMany({
            where: { id: { in: newlyOverdueCases.map((item) => item.id) } },
            data: { isOverdue: true },
          }),
        ]
      : []),
    ...(clearedOverdueCases.length > 0
      ? [
          prisma.case.updateMany({
            where: { id: { in: clearedOverdueCases.map((item) => item.id) } },
            data: { isOverdue: false },
          }),
        ]
      : []),
    ...(newlyOverdueInvoices.length > 0
      ? [
          prisma.invoice.updateMany({
            where: { id: { in: newlyOverdueInvoices.map((item) => item.id) } },
            data: { status: 'overdue' },
          }),
        ]
      : []),
  ])

  for (const caseRecord of newlyOverdueCases) {
    await Promise.all([
      createNotificationsForUsers({
        firmId: caseRecord.firmId,
        userIds: [caseRecord.assignedValuerId, caseRecord.assignedReviewerId],
        type: 'case_overdue',
        title: `Case overdue: ${caseRecord.reference}`,
        body: caseRecord.dueDate
          ? `The due date passed on ${new Intl.DateTimeFormat('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }).format(caseRecord.dueDate)}.`
          : 'This case is now overdue and needs attention.',
        entityType: 'Case',
        entityId: caseRecord.id,
      }),
      createNotificationsForRoles({
        firmId: caseRecord.firmId,
        roles: ['managing_partner', 'admin'],
        branchId: caseRecord.branchId,
        type: 'case_overdue',
        title: `Case overdue: ${caseRecord.reference}`,
        body: 'An active case has crossed its due date and needs operational follow-up.',
        entityType: 'Case',
        entityId: caseRecord.id,
      }),
    ])
  }

  for (const invoice of newlyOverdueInvoices) {
    await createNotificationsForRoles({
      firmId: invoice.firmId,
      roles: ['managing_partner', 'finance'],
      branchId: invoice.case.branchId,
      type: 'invoice_overdue',
      title: `Invoice overdue: ${invoice.invoiceNumber}`,
      body: `Invoice follow-up is required for case ${invoice.case.reference}.`,
      entityType: 'Case',
      entityId: invoice.caseId,
    })
  }

  return {
    casesMarkedOverdue: newlyOverdueCases.length,
    casesCleared: clearedOverdueCases.length,
    invoicesMarkedOverdue: newlyOverdueInvoices.length,
  }
}

