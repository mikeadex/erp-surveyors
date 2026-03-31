import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginSchema, type LoginInput } from '@valuation-os/utils'
import { apiPost } from '@valuation-os/api'
import { setSessionContext, setSessionTokens } from '@/lib/storage'

export default function LoginScreen() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  })

  async function onSubmit(data: LoginInput) {
    setServerError(null)
    try {
      const res = await apiPost<{
        accessToken: string
        refreshToken?: string
        user: { id: string; firmId: string; branchId?: string | null; role: string }
      }>(
        '/api/v1/auth/login',
        data,
      )
      setSessionTokens({
        accessToken: res.accessToken,
        ...(res.refreshToken ? { refreshToken: res.refreshToken } : {}),
      })
      setSessionContext({
        userId: res.user.id,
        firmId: res.user.firmId,
        role: res.user.role,
        branchId: res.user.branchId ?? null,
      })
      router.replace('/(tabs)')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.title}>ValuCore Africa</Text>
          <Text style={styles.subtitle}>Sign in to your firm account</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="you@yourfirm.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email.message}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="••••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password.message}</Text>
            )}
          </View>

          {serverError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{serverError}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            style={[styles.primaryButton, isSubmitting ? styles.primaryButtonDisabled : null]}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/reset-password')}
            style={styles.secondaryAction}
          >
            <Text style={styles.secondaryActionText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#64748b',
    marginBottom: 32,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
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
    marginBottom: 16,
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
  primaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#2563eb',
    paddingVertical: 15,
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryAction: {
    alignItems: 'center',
    marginTop: 18,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
})
