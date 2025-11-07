// Extension configuration
// This will be compiled to config.js and injected into extension

export const EXTENSION_CONFIG = {
  apiBaseUrl: process.env.VITE_API_BASE_URL || 'https://localhost:5001/api',
  environment: process.env.VITE_ENVIRONMENT || 'development',
} as const;

