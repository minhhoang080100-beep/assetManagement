export function getErrorMessage(error: unknown, fallback = 'Đã xảy ra lỗi'): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}
