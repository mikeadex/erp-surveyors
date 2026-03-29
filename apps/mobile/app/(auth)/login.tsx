import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginSchema, type LoginInput } from '@valuation-os/utils'
import { apiPost } from '@valuation-os/api'
import { setSessionTokens, storage } from '@/lib/storage'

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
        user: { id: string; firmId: string; role: string }
      }>(
        '/api/v1/auth/login',
        data,
      )
      setSessionTokens({
        accessToken: res.accessToken,
        ...(res.refreshToken ? { refreshToken: res.refreshToken } : {}),
      })
      storage.set('user_id', res.user.id)
      storage.set('firm_id', res.user.firmId)
      storage.set('role', res.user.role)
      router.replace('/(tabs)/')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">
          <Text className="text-2xl font-bold text-gray-900 mb-1">Valuation OS</Text>
          <Text className="text-sm text-gray-500 mb-8">Sign in to your firm account</Text>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-3 text-sm text-gray-900"
                  placeholder="you@yourfirm.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {errors.email && (
              <Text className="mt-1 text-xs text-red-600">{errors.email.message}</Text>
            )}
          </View>

          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-1">Password</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-3 text-sm text-gray-900"
                  placeholder="••••••••••"
                  secureTextEntry
                  value={value}
                  onChangeText={onChange}
                />
              )}
            />
            {errors.password && (
              <Text className="mt-1 text-xs text-red-600">{errors.password.message}</Text>
            )}
          </View>

          {serverError && (
            <View className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <Text className="text-sm text-red-700">{serverError}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 py-3 items-center"
          >
            <Text className="text-sm font-semibold text-white">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
