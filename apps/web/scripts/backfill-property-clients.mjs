import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const properties = await prisma.property.findMany({
    where: { clientId: null },
    select: { id: true },
  })

  let updated = 0

  for (const property of properties) {
    const [caseClients, documentClients] = await Promise.all([
      prisma.case.findMany({
        where: { propertyId: property.id },
        select: { clientId: true },
      }),
      prisma.document.findMany({
        where: {
          propertyId: property.id,
          clientId: { not: null },
          deletedAt: null,
        },
        select: { clientId: true },
      }),
    ])

    const distinctClientIds = Array.from(
      new Set(
        [...caseClients.map((item) => item.clientId), ...documentClients.map((item) => item.clientId).filter(Boolean)]
          .filter(Boolean),
      ),
    )

    if (distinctClientIds.length === 1) {
      await prisma.property.update({
        where: { id: property.id },
        data: { clientId: distinctClientIds[0] },
      })
      updated += 1
    }
  }

  console.log(`Backfilled ${updated} properties with a safe single-client match.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
