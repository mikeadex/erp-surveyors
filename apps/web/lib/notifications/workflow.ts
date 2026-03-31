import type { NotificationType, UserRole } from '@valuation-os/types'
import { prisma } from '@/lib/db/prisma'

async function sendExpoPushMessages(
  messages: Array<{
    to: string
    title: string
    body?: string | null
    data: Record<string, string>
  }>,
) {
  if (messages.length === 0) return

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (process.env.EXPO_ACCESS_TOKEN) {
      headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`
    }

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(messages),
    })
  } catch (error) {
    console.warn('[Notifications] Failed to send Expo push messages', error)
  }
}

export async function createNotificationsForUsers({
  firmId,
  userIds,
  type,
  title,
  body,
  entityType,
  entityId,
  skipIfExistsSince,
}: {
  firmId: string
  userIds: Array<string | null | undefined>
  type: NotificationType
  title: string
  body?: string | null
  entityType: string
  entityId: string
  skipIfExistsSince?: Date
}) {
  const recipients = Array.from(new Set(userIds.filter((value): value is string => Boolean(value))))
  if (recipients.length === 0) return

  const users = await prisma.user.findMany({
    where: {
      id: { in: recipients },
      firmId,
      isActive: true,
    },
    select: {
      id: true,
      expoPushToken: true,
    },
  })
  if (users.length === 0) return

  const existingKeys =
    skipIfExistsSince
      ? new Set(
          (
            await prisma.notification.findMany({
              where: {
                firmId,
                userId: { in: users.map((user) => user.id) },
                type,
                entityType,
                entityId,
                createdAt: { gte: skipIfExistsSince },
              },
              select: { userId: true },
            })
          ).map((item) => item.userId),
        )
      : null

  const targetUsers = existingKeys
    ? users.filter((user) => !existingKeys.has(user.id))
    : users
  if (targetUsers.length === 0) return

  await prisma.notification.createMany({
    data: targetUsers.map((user) => ({
      firmId,
      userId: user.id,
      type,
      title,
      body: body ?? null,
      entityType,
      entityId,
    })),
    skipDuplicates: true,
  })

  const pushMessages = targetUsers
    .filter((user) => user.expoPushToken)
    .map((user) => ({
      to: user.expoPushToken as string,
      title,
      ...(body ? { body } : {}),
      data: {
        entityType,
        entityId,
      },
    }))

  await sendExpoPushMessages(pushMessages)
}

export async function createNotificationsForRoles({
  firmId,
  roles,
  branchId,
  type,
  title,
  body,
  entityType,
  entityId,
  skipIfExistsSince,
}: {
  firmId: string
  roles: UserRole[]
  branchId?: string | null
  type: NotificationType
  title: string
  body?: string | null
  entityType: string
  entityId: string
  skipIfExistsSince?: Date
}) {
  const users = await prisma.user.findMany({
    where: {
      firmId,
      role: { in: roles },
      isActive: true,
      ...(branchId ? { OR: [{ branchId }, { role: 'managing_partner' }] } : {}),
    },
    select: { id: true },
  })

  await createNotificationsForUsers({
    firmId,
    userIds: users.map((user) => user.id),
    type,
    title,
    ...(body !== undefined ? { body } : {}),
    entityType,
    entityId,
    ...(skipIfExistsSince ? { skipIfExistsSince } : {}),
  })
}
