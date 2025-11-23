# Environment Setup Guide

## Frontend Environment Variables

Create these files in the `frontend/` directory:

### `.env.development`
```env
VITE_API_BASE_URL=https://localhost:5001/api
VITE_ENVIRONMENT=development
```

### `.env.production`
```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_ENVIRONMENT=production
```

### `.env.example` (already created)
This file serves as a template and should be committed to git.

## Extension Configuration

The extension background script uses `chrome.storage.local` to store the API base URL.

### Setting API URL for Extension

You can set the API URL programmatically:

```javascript
// In popup or background script
chrome.storage.local.set({ 
  apiBaseUrl: 'https://localhost:5001/api' 
});
```

Or inject it during build by modifying `build-extension.ts` to read from environment and inject into the compiled code.

## Build Process

1. **Frontend Build:**
   ```bash
   cd frontend
   npm run build
   ```
   This will:
   - Compile frontend TypeScript
   - Build with Vite (uses .env files)
   - Compile extension TypeScript files
   - Copy everything to chrome-extension folder

2. **Extension Only:**
   ```bash
   cd frontend
   npm run build:extension
   ```

## Notes

- Vite only exposes variables prefixed with `VITE_` to client code
- Extension service workers can't use `import.meta.env` directly
- Extension uses `chrome.storage.local` for runtime configuration
- Default fallback is `https://localhost:5001/api` for development



