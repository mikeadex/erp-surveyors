import { prisma } from './prisma'

function withFirmScope(
  firmId: string,
  where?: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(where ?? {}), firmId }
}

function tenantModel(model: any, firmId: string): any {
  return {
    findMany: (args?: Record<string, unknown>) =>
      model.findMany?.({
        ...args,
        where: withFirmScope(firmId, args?.where as Record<string, unknown> | undefined),
      }),
    findFirst: (args?: Record<string, unknown>) =>
      model.findFirst?.({
        ...args,
        where: withFirmScope(firmId, args?.where as Record<string, unknown> | undefined),
      }),
    findUnique: (args: { where: Record<string, unknown> } & Record<string, unknown>) =>
      model.findFirst?.({
        ...args,
        where: withFirmScope(firmId, args.where),
      }),
    create: (args: { data: Record<string, unknown> } & Record<string, unknown>) =>
      model.create?.({
        ...args,
        data: { ...args.data, firmId },
      }),
    updateMany: (args: { where?: Record<string, unknown>; data: Record<string, unknown> }) =>
      model.updateMany?.({
        ...args,
        where: withFirmScope(firmId, args.where),
      }),
    deleteMany: (args: { where?: Record<string, unknown> }) =>
      model.deleteMany?.({
        ...args,
        where: withFirmScope(firmId, args.where),
      }),
    count: (args?: Record<string, unknown>) =>
      model.count?.({
        ...args,
        where: withFirmScope(firmId, args?.where as Record<string, unknown> | undefined),
      }),
  }
}

/**
 * Returns a scoped Prisma wrapper that enforces firmId on every tenant-aware model.
 * Always use this inside authenticated route handlers — never raw prisma for firm-scoped tables.
 */
export function tenantPrisma(firmId: string) {
  return {
    branch: tenantModel(prisma.branch, firmId),
    user: tenantModel(prisma.user, firmId),
    client: tenantModel(prisma.client, firmId),
    property: tenantModel(prisma.property, firmId),
    case: tenantModel(prisma.case, firmId),
    inspection: tenantModel(prisma.inspection, firmId),
    comparable: tenantModel(prisma.comparable, firmId),
    valuationAnalysis: tenantModel(prisma.valuationAnalysis, firmId),
    reportTemplate: tenantModel(prisma.reportTemplate, firmId),
    report: tenantModel(prisma.report, firmId),
    reviewComment: tenantModel(prisma.reviewComment, firmId),
    invoice: tenantModel(prisma.invoice, firmId),
    document: tenantModel(prisma.document, firmId),
    notification: tenantModel(prisma.notification, firmId),
    auditLog: tenantModel(prisma.auditLog, firmId),
  }
}

export type TenantPrisma = ReturnType<typeof tenantPrisma>
