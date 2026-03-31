import type { UserRole } from '@valuation-os/types'
import { prisma } from '@/lib/db/prisma'

type DashboardSession = {
  firmId: string
  userId: string
  role: UserRole
}

function buildCaseWhere(
  session: DashboardSession,
  scopedBranchId?: string,
) {
  const base = {
    firmId: session.firmId,
    ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
  }

  if (session.role === 'valuer') {
    return {
      ...base,
      assignedValuerId: session.userId,
    }
  }

  if (session.role === 'field_officer') {
    return {
      ...base,
      inspection: {
        inspectedById: session.userId,
      },
    }
  }

  return base
}

export async function getDashboardStageItems(
  session: DashboardSession,
  scopedBranchId?: string,
) {
  const rows = await prisma.case.groupBy({
    by: ['stage'],
    where: buildCaseWhere(session, scopedBranchId),
    _count: { id: true },
    orderBy: { stage: 'asc' },
  })

  return rows.map((row) => ({
    stage: row.stage,
    count: row._count.id,
  }))
}

export async function getDashboardSummary(
  session: DashboardSession,
  scopedBranchId?: string,
) {
  const caseWhere = buildCaseWhere(session, scopedBranchId)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  if (session.role === 'finance') {
    const [unpaid, paidThisMonth, paidThisYear, overdue, overdueValue, outstanding] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          firmId: session.firmId,
          ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}),
          status: { in: ['sent', 'partial', 'overdue'] },
        },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          firmId: session.firmId,
          ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}),
          status: 'paid',
          paidAt: { gte: startOfMonth },
        },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          firmId: session.firmId,
          ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}),
          status: 'paid',
          paidAt: { gte: startOfYear },
        },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.count({
        where: {
          firmId: session.firmId,
          ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}),
          status: 'overdue',
        },
      }),
      prisma.invoice.aggregate({
        where: {
          firmId: session.firmId,
          ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}),
          status: 'overdue',
        },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.count({
        where: {
          firmId: session.firmId,
          ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}),
          status: { in: ['sent', 'partial', 'overdue'] },
        },
      }),
    ])

    return {
      role: session.role,
      unpaidInvoices: unpaid._sum.totalAmount ?? 0,
      paidThisMonth: paidThisMonth._sum.totalAmount ?? 0,
      paidThisYear: paidThisYear._sum.totalAmount ?? 0,
      projectedReceipts: Number(paidThisMonth._sum.totalAmount ?? 0) + Number(unpaid._sum.totalAmount ?? 0),
      invoicesOverdue: overdue,
      overdueAmount: overdueValue._sum.totalAmount ?? 0,
      outstandingCount: outstanding,
    }
  }

  if (session.role === 'valuer' || session.role === 'field_officer') {
    const [assignedToMe, overdueAssigned, inspectionsDue, stageItems] = await Promise.all([
      prisma.case.count({
        where: {
          ...caseWhere,
          stage: { notIn: ['archived', 'payment_received'] },
        },
      }),
      prisma.case.count({
        where: {
          ...caseWhere,
          isOverdue: true,
        },
      }),
      prisma.case.count({
        where: {
          ...caseWhere,
          stage: 'inspection_scheduled',
        },
      }),
      getDashboardStageItems(session, scopedBranchId),
    ])

    return {
      role: session.role,
      assignedToMe,
      overdueAssigned,
      inspectionsDue,
      myCasesByStage: Object.fromEntries(stageItems.map((item) => [item.stage, item.count])),
    }
  }

  const [openCases, overdueCases, stageItems, unpaidInvoices, comparableCount, turnaroundRows] = await Promise.all([
    prisma.case.count({
      where: {
        ...caseWhere,
        stage: { notIn: ['archived', 'payment_received'] },
      },
    }),
    prisma.case.count({
      where: {
        ...caseWhere,
        isOverdue: true,
      },
    }),
    getDashboardStageItems(session, scopedBranchId),
    prisma.invoice.aggregate({
      where: {
        firmId: session.firmId,
        ...(scopedBranchId ? { case: { branchId: scopedBranchId } } : {}),
        status: { in: ['sent', 'partial', 'overdue'] },
      },
      _sum: { totalAmount: true },
    }),
    prisma.comparable.count({
      where: {
        firmId: session.firmId,
      },
    }),
    prisma.case.findMany({
      where: {
        ...caseWhere,
        stage: { in: ['final_issued', 'payment_received'] },
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
      take: 200,
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const casesByStage = Object.fromEntries(stageItems.map((item) => [item.stage, item.count]))
  const avgTurnaroundDays =
    turnaroundRows.length > 0
      ? turnaroundRows.reduce((sum, row) => {
          const diff = row.updatedAt.getTime() - row.createdAt.getTime()
          return sum + diff / (1000 * 60 * 60 * 24)
        }, 0) / turnaroundRows.length
      : 0

  return {
    role: session.role,
    openCases,
    overdueCases,
    casesByStage,
    revenuePipeline: unpaidInvoices._sum.totalAmount ?? 0,
    unpaidInvoices: unpaidInvoices._sum.totalAmount ?? 0,
    comparableCount,
    avgTurnaroundDays,
  }
}

export async function getDashboardOverdueCases(
  session: DashboardSession,
  scopedBranchId?: string,
) {
  return prisma.case.findMany({
    where: {
      ...buildCaseWhere(session, scopedBranchId),
      isOverdue: true,
    },
    select: {
      id: true,
      reference: true,
      stage: true,
      dueDate: true,
      assignedValuer: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      client: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
    take: 25,
  })
}

export async function getDashboardComparableStats(session: DashboardSession) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [total, verified, addedThisMonth, recent] = await Promise.all([
    prisma.comparable.count({ where: { firmId: session.firmId } }),
    prisma.comparable.count({ where: { firmId: session.firmId, isVerified: true } }),
    prisma.comparable.count({
      where: {
        firmId: session.firmId,
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.comparable.findMany({
      where: { firmId: session.firmId },
      select: {
        id: true,
        address: true,
        city: true,
        comparableType: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ])

  return {
    total,
    verified,
    addedThisMonth,
    recent,
  }
}

export async function getDashboardTurnaroundStats(
  session: DashboardSession,
  scopedBranchId?: string,
) {
  const completed = await prisma.case.findMany({
    where: {
      ...buildCaseWhere(session, scopedBranchId),
      stage: { in: ['final_issued', 'payment_received'] },
    },
    select: {
      id: true,
      reference: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })

  const items = completed.map((item) => {
    const turnaroundDays = (item.updatedAt.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    return {
      id: item.id,
      reference: item.reference,
      turnaroundDays,
      completedAt: item.updatedAt,
    }
  })

  const averageDays =
    items.length > 0 ? items.reduce((sum, item) => sum + item.turnaroundDays, 0) / items.length : 0

  return {
    averageDays,
    completedCount: items.length,
    items,
  }
}
