import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { apiPost } from '@valuation-os/api'
import { getExpoPushToken, setExpoPushToken } from '@/lib/storage'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

function getProjectId() {
  return process.env.EXPO_PUBLIC_EAS_PROJECT_ID
}

export async function registerForPushNotifications() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    }

    const permissions = await Notifications.getPermissionsAsync()
    let status = permissions.status

    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync()
      status = requested.status
    }

    if (status !== 'granted') {
      return null
    }

    const projectId = getProjectId()
    const expoToken = (
      await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      )
    ).data

    if (!expoToken) {
      return null
    }

    if (getExpoPushToken() === expoToken) {
      return expoToken
    }

    await apiPost('/api/v1/users/push-token', { token: expoToken })
    setExpoPushToken(expoToken)
    return expoToken
  } catch {
    return null
  }
}
