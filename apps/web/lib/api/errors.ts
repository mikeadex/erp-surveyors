export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const Errors = {
  UNAUTHORIZED: () => new AppError('UNAUTHORIZED', 'Authentication required', 401),
  FORBIDDEN: (msg = 'Access denied') => new AppError('FORBIDDEN', msg, 403),
  NOT_FOUND: (entity = 'Resource') =>
    new AppError('NOT_FOUND', `${entity} not found`, 404),
  BAD_REQUEST: (msg: string) => new AppError('BAD_REQUEST', msg, 400),
  CONFLICT: (msg: string) => new AppError('CONFLICT', msg, 409),
  TOO_MANY_REQUESTS: (msg = 'Too many requests', retryAfterSeconds?: number) =>
    new AppError(
      'RATE_LIMITED',
      msg,
      429,
      retryAfterSeconds ? { retryAfter: [String(retryAfterSeconds)] } : undefined,
    ),
  VALIDATION: (details: Record<string, string[]>) =>
    new AppError('VALIDATION_ERROR', 'Validation failed', 422, details),
  INTERNAL: () => new AppError('INTERNAL_ERROR', 'An unexpected error occurred', 500),
} as const
