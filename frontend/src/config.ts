export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://localhost:5001/api',
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
} as const;



