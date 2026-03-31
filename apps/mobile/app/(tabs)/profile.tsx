import { useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'expo-router'
import { apiGet, apiPost, queryKeys } from '@valuation-os/api'
import { formatDateTime, ROLE_LABELS } from '@valuation-os/utils'
import { clearSession } from '@/lib/storage'
import { z } from 'zod'

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain digit'),
  confirmPassword: z.string().min(1, 'Confirm your new password'),
}).refine((values) => values.newPassword === values.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>

interface MeResponse {
  id: string
  firmId: string
  branchId: string | null
  email: string
  firstName: string
  lastName: string
  role: keyof typeof ROLE_LABELS
  phone: string | null
  lastLoginAt: string | null
  expoPushToken: string | null
  branch: {
    id: string
    name: string
  } | null
  firm: {
    id: string
    name: string
    slug: string
  }
}

export default function ProfileTab() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const changePasswordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const { data, refetch, isLoading } = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: () => apiGet<MeResponse>('/api/v1/auth/me'),
  })

  async function onRefresh() {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  async function signOut() {
    setIsSigningOut(true)
    try {
      await apiPost('/api/v1/auth/logout')
    } finally {
      clearSession()
      router.replace('/(auth)/login')
      setIsSigningOut(false)
    }
  }

  async function changePassword(values: ChangePasswordInput) {
    setPasswordError(null)
    setPasswordMessage(null)

    try {
      await apiPost('/api/v1/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      setPasswordMessage('Password updated successfully.')
      changePasswordForm.reset()
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Unable to update password')
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.container}>
        <Text style={styles.heading}>Profile</Text>

        {data ? (
          <>
            <View style={styles.card}>
              <Text style={styles.name}>
                {data.firstName} {data.lastName}
              </Text>
              <Text style={styles.email}>{data.email}</Text>
              <Text style={styles.roleText}>{ROLE_LABELS[data.role]}</Text>
              <Text style={styles.firmName}>{data.firm.name}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Account details</Text>
              <Text style={styles.detailText}>
                Phone: {data.phone ?? 'Not set'}
              </Text>
              <Text style={styles.detailText}>
                Branch: {data.branch?.name ?? 'No branch assigned'}
              </Text>
              <Text style={styles.detailText}>
                Firm URL: app.valucore.africa/{data.firm.slug}
              </Text>
              <Text style={styles.detailText}>
                Last login: {formatDateTime(data.lastLoginAt)}
              </Text>
              <Text style={styles.detailText}>
                Push notifications: {data.expoPushToken ? 'Registered' : 'Not registered yet'}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Change password</Text>
              <Text style={styles.helperText}>
                Keep your account secure with a fresh password.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Current password</Text>
                <Controller
                  control={changePasswordForm.control}
                  name="currentPassword"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder="Current password"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
                {changePasswordForm.formState.errors.currentPassword ? (
                  <Text style={styles.errorText}>
                    {changePasswordForm.formState.errors.currentPassword.message}
                  </Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>New password</Text>
                <Controller
                  control={changePasswordForm.control}
                  name="newPassword"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder="New secure password"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
                {changePasswordForm.formState.errors.newPassword ? (
                  <Text style={styles.errorText}>
                    {changePasswordForm.formState.errors.newPassword.message}
                  </Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Confirm new password</Text>
                <Controller
                  control={changePasswordForm.control}
                  name="confirmPassword"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder="Repeat new password"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
                {changePasswordForm.formState.errors.confirmPassword ? (
                  <Text style={styles.errorText}>
                    {changePasswordForm.formState.errors.confirmPassword.message}
                  </Text>
                ) : null}
              </View>

              {passwordError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorBoxText}>{passwordError}</Text>
                </View>
              ) : null}

              {passwordMessage ? (
                <View style={styles.successBox}>
                  <Text style={styles.successBoxText}>{passwordMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={changePasswordForm.handleSubmit(changePassword)}
                disabled={changePasswordForm.formState.isSubmitting}
                style={[styles.primaryButton, changePasswordForm.formState.isSubmitting ? styles.primaryButtonDisabled : null]}
              >
                <Text style={styles.primaryButtonText}>
                  {changePasswordForm.formState.isSubmitting ? 'Updating…' : 'Update password'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={signOut}
              disabled={isSigningOut}
              style={[styles.signOutButton, isSigningOut ? styles.primaryButtonDisabled : null]}
            >
              <Text style={styles.primaryButtonText}>
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {isLoading ? 'Loading profile…' : 'Unable to load your profile.'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    padding: 16,
    gap: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  email: {
    marginTop: 4,
    fontSize: 14,
    color: '#64748b',
  },
  roleText: {
    marginTop: 12,
    fontSize: 14,
    color: '#334155',
  },
  firmName: {
    marginTop: 4,
    fontSize: 14,
    color: '#334155',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  helperText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#64748b',
  },
  detailText: {
    marginTop: 10,
    fontSize: 14,
    color: '#475569',
  },
  fieldGroup: {
    marginTop: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0f172a',
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: '#dc2626',
  },
  errorBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorBoxText: {
    fontSize: 14,
    color: '#b91c1c',
  },
  successBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  successBoxText: {
    fontSize: 14,
    color: '#15803d',
  },
  primaryButton: {
    marginTop: 18,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#2563eb',
    paddingVertical: 15,
  },
  signOutButton: {
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#dc2626',
    paddingVertical: 15,
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyState: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#64748b',
  },
})
