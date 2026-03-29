import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiPost } from '@valuation-os/api'

const requestSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})

const confirmSchema = z.object({
  token: z.string().length(6, 'Reset code must be 6 digits'),
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

type RequestInput = z.infer<typeof requestSchema>
type ConfirmInput = z.infer<typeof confirmSchema>

export default function ResetPasswordScreen() {
  const router = useRouter()
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [requestError, setRequestError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const requestForm = useForm<RequestInput>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: '' },
  })

  const confirmForm = useForm<ConfirmInput>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { token: '', newPassword: '', confirmPassword: '' },
  })

  async function submitRequest(values: RequestInput) {
    setRequestError(null)

    try {
      await apiPost('/api/v1/auth/password/reset', values)
      setSubmittedEmail(values.email)
      confirmForm.reset()
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Unable to send reset code')
    }
  }

  async function submitConfirm(values: ConfirmInput) {
    setConfirmError(null)
    setSuccessMessage(null)

    try {
      await apiPost('/api/v1/auth/password/confirm', {
        email: submittedEmail,
        token: values.token,
        newPassword: values.newPassword,
      })
      setSuccessMessage('Password reset successfully. You can now sign in.')
      confirmForm.reset()
      setTimeout(() => router.replace('/(auth)/login'), 1200)
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Unable to reset password')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>
            Request a 6-digit code, then use it to set a new password.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>1. Send reset code</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <Controller
                control={requestForm.control}
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
              {requestForm.formState.errors.email ? (
                <Text style={styles.errorText}>
                  {requestForm.formState.errors.email.message}
                </Text>
              ) : null}
            </View>

            {requestError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{requestError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={requestForm.handleSubmit(submitRequest)}
              disabled={requestForm.formState.isSubmitting}
              style={[styles.primaryButton, requestForm.formState.isSubmitting ? styles.primaryButtonDisabled : null]}
            >
              <Text style={styles.primaryButtonText}>
                {requestForm.formState.isSubmitting ? 'Sending…' : 'Send reset code'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, styles.confirmCard]}>
            <Text style={styles.cardTitle}>2. Confirm reset</Text>
            <Text style={styles.helperText}>
              {submittedEmail
                ? `Enter the code sent to ${submittedEmail}.`
                : 'Request a code first, then complete the reset.'}
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>6-digit code</Text>
              <Controller
                control={confirmForm.control}
                name="token"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    placeholder="123456"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              {confirmForm.formState.errors.token ? (
                <Text style={styles.errorText}>
                  {confirmForm.formState.errors.token.message}
                </Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>New password</Text>
              <Controller
                control={confirmForm.control}
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
              {confirmForm.formState.errors.newPassword ? (
                <Text style={styles.errorText}>
                  {confirmForm.formState.errors.newPassword.message}
                </Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm password</Text>
              <Controller
                control={confirmForm.control}
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
              {confirmForm.formState.errors.confirmPassword ? (
                <Text style={styles.errorText}>
                  {confirmForm.formState.errors.confirmPassword.message}
                </Text>
              ) : null}
            </View>

            {confirmError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{confirmError}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successBox}>
                <Text style={styles.successBoxText}>{successMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={confirmForm.handleSubmit(submitConfirm)}
              disabled={!submittedEmail || confirmForm.formState.isSubmitting}
              style={[
                styles.primaryButton,
                !submittedEmail ? styles.disabledButton : null,
                confirmForm.formState.isSubmitting ? styles.primaryButtonDisabled : null,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {confirmForm.formState.isSubmitting ? 'Resetting…' : 'Reset password'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={styles.backLink}
          >
            <Text style={styles.backLinkText}>Back to sign in</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#64748b',
  },
  card: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    padding: 18,
  },
  confirmCard: {
    marginTop: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  helperText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#64748b',
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
  codeInput: {
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 6,
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
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  backLink: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
})
