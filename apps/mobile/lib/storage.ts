import { MMKV } from 'react-native-mmkv'

export const storage = new MMKV({ id: 'valuation-os' })

export function getAccessToken(): string | undefined {
  return storage.getString('access_token')
}

export function getRefreshToken(): string | undefined {
  return storage.getString('refresh_token')
}

export function setSessionTokens(tokens: { accessToken: string; refreshToken?: string }) {
  storage.set('access_token', tokens.accessToken)
  if (tokens.refreshToken) {
    storage.set('refresh_token', tokens.refreshToken)
  }
}

export function clearSession() {
  storage.delete('access_token')
  storage.delete('refresh_token')
  storage.delete('user_id')
  storage.delete('firm_id')
  storage.delete('role')
}
