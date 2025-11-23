# Frontend & Extension Files Analysis

## Critical Issues

### 1. **Hard-coded API Base URL** ⚠️ CRITICAL
**Problem:** API base URL is hard-coded in multiple files:
- `frontend/src/apiService.ts`: `const API_BASE = 'https://localhost:5001/api'`
- `extention-files/background.js`: `const API_BASE = "https://localhost:5001/api"`
- `chrome-extension/authService.js`: Hard-coded credentials

**Impact:** 
- Cannot deploy to different environments without code changes
- Hard-coded credentials in source code (security risk)
- Inconsistent configuration across files

**Solution:**
- Create environment-based configuration
- Use Vite environment variables
- Store API URL in manifest or chrome.storage
- Move credentials to secure storage

---

### 2. **Hard-coded Credentials in Extension Files** 🔴 SECURITY RISK
**Problem:** 
- `chrome-extension/authService.js` contains hard-coded credentials:
  ```javascript
  login: "331271"
  password: "Kentucky$9598"
  ```
- `extention-files/background.js` has hard-coded API URL

**Impact:** Credentials exposed in source code

**Solution:**
- Remove credentials from source
- Fetch from backend API (already implemented in background.js)
- Use chrome.storage.encrypted for sensitive data

---

### 3. **Missing Function Implementation** ❌
**Problem:** `getAuthTokenSync()` is called but never implemented in `background.js:410`
```javascript
const userToken = getAuthTokenSync(); // Нужно реализовать синхронное получение токена
```

**Impact:** Extension will crash when trying to send actions before suspend

**Solution:** Implement token retrieval from cookies or chrome.storage

---

### 4. **Duplicate Permissions in Manifest** ⚠️
**Problem:** `manifest.json` has duplicate "cookies" permission (lines 10 and 15)

**Impact:** Redundant, but not breaking

**Solution:** Remove duplicate permission

---

### 5. **Inconsistent File Naming** ⚠️
**Problem:** 
- Folder named `extention-files` (typo: should be `extension-files`)
- Script references `extention-files` in `copy-extension.ts:27`

**Impact:** Confusing, potential for errors

**Solution:** Rename folder to `extension-files` and update references

---

### 6. **API Endpoint Mismatch** ⚠️
**Problem:** 
- `apiService.ts:29` uses `/CopartAuth/auth` (capital C)
- `background.js:176` uses `/copartAuth/auth` (lowercase c)
- Backend controller is `CopartAuthController` (capital C)

**Impact:** Potential 404 errors if backend route is case-sensitive

**Solution:** Standardize endpoint naming (use lowercase for REST conventions)

---

### 7. **Missing Error Handling in Background Script** ⚠️
**Problem:** 
- `background.js:163` - `clearCookies` action doesn't await the fetch
- No error handling for cookie operations
- `onSuspend` uses deprecated synchronous XHR

**Impact:** 
- Race conditions
- Silent failures
- Poor user experience

**Solution:** 
- Add proper async/await
- Implement error handling
- Use async fetch instead of XHR

---

### 8. **TypeScript/JavaScript Inconsistencies** ⚠️
**Problem:**
- Frontend uses TypeScript with types
- Extension files are plain JavaScript
- No type checking for extension code
- `apiService.ts` has typo: `сopartAuth` (Cyrillic 'с' instead of 'c')

**Impact:**
- Runtime errors not caught at build time
- Inconsistent code quality

**Solution:**
- Convert extension files to TypeScript
- Add type definitions
- Fix typo in function name

---

### 9. **Build Script Issues** ⚠️
**Problem:**
- `copy-extension.ts` references `extention-files` (typo)
- `update-extension-files.ts` references wrong path (`extension-files` vs `extention-files`)
- No validation that files exist before copying

**Impact:**
- Build failures
- Missing files in extension

**Solution:**
- Fix path references
- Add file existence checks
- Add error handling

---

### 10. **Content Script Issues** ⚠️
**Problem:**
- `contentScript.js` has commented-out code (lines 1-72)
- Hard-coded test data (lines 188-196)
- No actual event tracking implementation
- Uses localStorage instead of chrome.storage

**Impact:**
- No real functionality
- Data loss if localStorage is cleared
- Inconsistent storage mechanism

**Solution:**
- Implement proper event tracking
- Use chrome.storage for persistence
- Remove test data
- Clean up commented code

---

### 11. **Missing CORS Configuration in Frontend** ⚠️
**Problem:**
- Frontend makes requests to `localhost:5001` but no CORS configuration
- Extension files use different API base than frontend

**Impact:**
- CORS errors in browser
- Inconsistent behavior

**Solution:**
- Configure Vite proxy for development
- Use environment variables for API URL

---

### 12. **No Environment Configuration** ⚠️
**Problem:**
- No `.env` files for different environments
- No build-time configuration
- Hard-coded values everywhere

**Impact:**
- Cannot deploy to staging/production easily
- Configuration scattered across files

**Solution:**
- Create `.env.development`, `.env.production`
- Use Vite's `import.meta.env`
- Create config utility

---

## Recommended Fix Priority

### High Priority (Security & Functionality)
1. Remove hard-coded credentials
2. Implement `getAuthTokenSync()`
3. Fix API endpoint inconsistencies
4. Add environment configuration

### Medium Priority (Code Quality)
5. Fix folder naming typo
6. Convert extension files to TypeScript
7. Fix build scripts
8. Remove duplicate permissions

### Low Priority (Polish)
9. Clean up commented code
10. Implement proper content script
11. Add error handling everywhere
12. Standardize storage mechanisms

---

## Quick Wins

1. **Fix typo in folder name:** `extention-files` → `extension-files`
2. **Remove duplicate permission** in manifest.json
3. **Fix function name typo:** `сopartAuth` → `copartAuth`
4. **Standardize API endpoint:** Use lowercase `/copartAuth/auth`
5. **Add environment variables** for API_BASE



