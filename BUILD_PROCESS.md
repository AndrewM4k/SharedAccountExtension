# Build Process Documentation

## Overview
The extension now uses TypeScript source files that are compiled to JavaScript during the build process.

## Source Files (TypeScript)
Located in `extention-files/`:
- `contentScript.ts` - **EDIT THIS FILE** for content script changes
- `background.ts` - **EDIT THIS FILE** for background script changes
- `authService.ts` - **EDIT THIS FILE** for auth service changes
- `types.ts` - Shared TypeScript type definitions
- `manifest.json` - Extension manifest

## Build Process

### Step 1: Compile Extension TypeScript
```bash
cd frontend
npm run build:extension
```
This:
- Compiles all `.ts` files from `extention-files/` to `extention-files/dist/`
- Creates JavaScript files: `contentScript.js`, `background.js`, `authService.js`

### Step 2: Build Frontend & Copy Extension Files
```bash
cd frontend
npm run build
```
This:
- Compiles frontend TypeScript
- Builds frontend with Vite
- Compiles extension TypeScript (via `build:extension`)
- Copies compiled extension files to `chrome-extension/`

## File Flow

```
extention-files/
  ├── contentScript.ts  (SOURCE - Edit this)
  ├── background.ts     (SOURCE - Edit this)
  └── dist/
      ├── contentScript.js  (COMPILED - Auto-generated)
      └── background.js     (COMPILED - Auto-generated)
           ↓
chrome-extension/
  ├── contentScript.js  (FINAL - Used by extension)
  └── background.js     (FINAL - Used by extension)
```

## Important Notes

1. **Always edit `.ts` files**, not `.js` files in `extention-files/`
2. The old `.js` files in `extention-files/` are deprecated but kept for reference
3. After editing TypeScript files, run `npm run build` to compile and copy
4. The `dist/` folder is automatically cleaned before each build

## Troubleshooting

### Changes not appearing in chrome-extension?
1. Make sure you edited the `.ts` file, not the `.js` file
2. Run `npm run build:extension` to compile TypeScript
3. Run `npm run build` to copy files to chrome-extension
4. Reload the extension in Chrome/Edge

### TypeScript compilation errors?
- Check `extention-files/tsconfig.json` configuration
- Ensure `@types/chrome` is installed in frontend (it should be)
- Check for duplicate interface declarations (should be in `types.ts`)



