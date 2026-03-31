import type { Router } from 'expo-router'

interface NotificationRouteData {
  entityType?: string | null
  entityId?: string | null
}

export function getNotificationHref(data: NotificationRouteData) {
  const entityType = data.entityType?.toLowerCase()
  const entityId = data.entityId?.trim()
  if (!entityType || !entityId) return null

  if (entityType === 'case') {
    return `/case/${entityId}`
  }

  return null
}

export function routeFromNotification(
  router: Router,
  data: NotificationRouteData,
) {
  const href = getNotificationHref(data)
  if (!href) return false

  router.push(href as never)
  return true
}
