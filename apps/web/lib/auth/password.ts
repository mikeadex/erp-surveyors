import bcrypt from 'bcryptjs'

const COST_FACTOR = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST_FACTOR)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export function getPasswordValidationErrors(password: string): string[] {
  const errors: string[] = []

  if (password.length < 10) {
    errors.push('Password must be at least 10 characters')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit')
  }

  return errors
}
