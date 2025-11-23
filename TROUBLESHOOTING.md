# Troubleshooting Content Script Issues

## Problem
After building, clicking buttons shows no console messages, no data in database.

## Changes Made

### 1. Added Extensive Logging
- **Content Script**: Added console logs for:
  - Script loading confirmation
  - Event listener attachment
  - Every click detected
  - Message sending attempts
  - Response handling
  
- **Background Script**: Added console logs for:
  - All messages received
  - Message processing
  - Queue operations
  - Error handling

### 2. Added Test Button Handler
- Any button with "test" in text/id/class will trigger an action
- Helps verify the content script is working

### 3. Improved Error Handling
- Better try-catch blocks
- More detailed error messages
- Retry logic with logging

## How to Debug

### Step 1: Verify Extension is Loaded
1. Open Chrome/Edge Extensions page (`chrome://extensions/` or `edge://extensions/`)
2. Find "Shared Account" extension
3. Make sure it's **enabled**
4. Click **Reload** button to reload the extension

### Step 2: Check Content Script is Loading
1. Go to a Copart page (e.g., `https://www.copart.com`)
2. Open Developer Tools (F12)
3. Go to **Console** tab
4. Look for: `"Content script loaded and ready on Copart."`
5. Look for: `"Content script: Event listener attached, ready to track clicks"`

**If you don't see these messages:**
- The content script isn't loading
- Check the manifest.json matches pattern `https://*.copart.com/*`
- Try reloading the page
- Check for JavaScript errors in console

### Step 3: Test Click Detection
1. Click anywhere on the page
2. In console, you should see: `"Content script: Click detected on: ..."`
3. If you see this, the event listener is working

**If you don't see click logs:**
- The event listener might not be attached
- Check if page uses iframes (content scripts don't work in iframes)
- Check for JavaScript errors preventing execution

### Step 4: Test Button Click
1. Click any button (especially one with "test" in it)
2. In console, you should see:
   - `"Content script: Button clicked - ..."`
   - `"Content script: Sending action to background: ..."`
   - `"Content script: Action queued successfully in background"`

### Step 5: Check Background Script
1. Go to Extensions page
2. Click **"service worker"** link (or "background page" in MV2)
3. This opens the background script console
4. Look for: `"Background: Message received: ..."`
5. Look for: `"Background: Received BID_PLACED action from content script: ..."`

**If background doesn't receive messages:**
- Check if background script is running (should see logs on extension load)
- Check for errors in background script console
- Verify `chrome.runtime.onMessage.addListener` is set up

### Step 6: Check Queue Processing
1. In background script console, look for:
   - `"Action added to queue. Queue length: X"`
   - `"Queue saved to storage. Length: X"`
   - `"Processing queue, batch size: X"`

2. Actions should be sent to backend every 10 seconds or when queue reaches 50 items

### Step 7: Check Network Requests
1. In background script console, look for fetch requests to `/actions/add-bulk`
2. Or check Network tab in background script DevTools
3. Verify API endpoint is correct: `https://localhost:5001/api/actions/add-bulk`

## Common Issues

### Issue: No console messages at all
**Solution:**
- Reload the extension
- Reload the page
- Check if extension is enabled
- Check for JavaScript syntax errors

### Issue: Content script loads but no click detection
**Solution:**
- Page might be using iframes (content scripts don't work in iframes)
- Event listener might be attached too late
- Try changing `"run_at": "document_end"` to `"document_idle"` in manifest

### Issue: Messages sent but background doesn't receive
**Solution:**
- Check if background script is running (service worker might be suspended)
- Verify message format matches what background expects
- Check for errors in background script console

### Issue: Actions queued but not sent to backend
**Solution:**
- Check API endpoint URL in background script
- Verify backend is running
- Check CORS settings
- Check network errors in background script console

## Testing Checklist

- [ ] Extension is enabled and reloaded
- [ ] Page is reloaded after extension reload
- [ ] Content script console shows loading messages
- [ ] Click detection works (see click logs)
- [ ] Button clicks trigger action data
- [ ] Background script receives messages
- [ ] Actions are added to queue
- [ ] Queue is processed and sent to backend
- [ ] Backend receives and saves data

## Next Steps

If after all these checks you still have issues:

1. **Share the console logs** from:
   - Content script console (page DevTools)
   - Background script console (service worker)

2. **Check the manifest.json** matches your setup

3. **Verify the API endpoint** is correct and accessible

4. **Check browser console** for any CSP (Content Security Policy) errors



