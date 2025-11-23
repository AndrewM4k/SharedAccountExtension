# Click Tracking Implementation

## Overview
The content script now tracks clicks on multiple Copart button types and extracts relevant data (lot number, bid amount) from the page.

## Detected Buttons

### 1. Pay Button
**Selector:** `button.cprt.cprt-btn-blue` or button with class `cprt-btn-blue`
**HTML Example:**
```html
<button class="cprt cprt-btn-blue ng-star-inserted">Pay</button>
```

### 2. Bid Now Link (Search Results)
**Selector:** `a.cprt-btn-lblue-content.search_result_btn`
**HTML Example:**
```html
<a class="cprt-btn-lblue-content search_result_btn ng-star-inserted" href="/lot/85749135/...">Bid now</a>
```

### 3. Buy It Now Link
**Selector:** `a#buyItNowBtn` or `a.cprt-btn-green-content`
**HTML Example:**
```html
<a id="buyItNowBtn" class="cprt-btn-green-content search_result_btn" href="/lot/81747535/..."> Buy it now </a>
```

### 4. Bid Now Button (Prelim Modal)
**Selector:** `button.btn.btn-yellow-rd` or button with `ng-click="openPrelimBidModal()"`
**HTML Example:**
```html
<button class="btn btn-yellow-rd" ng-click="openPrelimBidModal()">
  Bid now
  <i class="lotdetails-icons-redesign arrow-right-rd-icon right"></i>
</button>
```

### 5. Legacy Test Selector (Kept)
**Selector:** `a[aria-controls="serverSideDataTable_mylots"][data-dt-idx="0"]`
- Kept for backward compatibility
- Now extracts real data instead of test data

## Data Extraction

### Lot Number
Extracted from multiple sources (in priority order):
1. `<span id="LotNumber">` element text content
2. URL pattern: `/lot/{number}/...`
3. Falls back to "Unknown" if not found

### Bid Amount
Extracted from:
1. `<input id="start-bid">` value
2. `<input name="startBid">` value (fallback)
3. Falls back to "0" if not found

### Lot Name
Extracted from:
1. Page title/heading (`h1`, `.lot-title`, `[data-uname="lotdetailTitle"]`)
2. URL pattern: `/lot/{number}/{name-slug}`
3. Falls back to empty string

## Data Structure

Each click creates an `ActionData` object:
```typescript
{
  actionType: 'Bid',           // Always 'Bid' for backend enum compatibility
  lotNumber: string,           // Extracted lot number
  userBidAmount: string,      // Bid amount from input field
  timestamp: string,           // ISO timestamp
  pageUrl: string,            // Current page URL or link href
  lotName: string,            // Lot name/title
  commentary: string          // Detailed description (e.g., "Pay button clicked")
}
```

## Backend Compatibility

- All action types are mapped to `'Bid'` for backend enum compatibility
- Detailed action type is preserved in `commentary` field
- Backend stores the full `ActionType` string in database

## Testing

To test the implementation:

1. **Build the extension:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Load extension in Chrome/Edge:**
   - Go to `chrome://extensions/` or `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

3. **Test on Copart:**
   - Navigate to a lot detail page
   - Click any of the tracked buttons
   - Check browser console for log messages
   - Verify data is sent to background script
   - Check database for saved actions

## Console Logging

The script logs detailed information for debugging:
- Button type detected
- Extracted data (lot number, bid amount, etc.)
- Success/failure of sending to background

Example log:
```
Pay button clicked, data: {
  actionType: 'Bid',
  lotNumber: '82267275',
  userBidAmount: '500',
  timestamp: '2024-01-15T10:30:00.000Z',
  pageUrl: 'https://www.copart.com/lot/82267275/...',
  lotName: '2024 Chevrolet Trax',
  commentary: 'Pay button clicked'
}
```

## Error Handling

- If background script is unavailable, actions are saved to `chrome.storage.local`
- Saved actions are retried on next page load
- Multiple retry attempts (3 by default) before falling back to storage

## Future Improvements

1. Add more button selectors if Copart changes their UI
2. Extract additional data (vehicle details, images, etc.)
3. Add visual feedback when action is tracked
4. Implement action deduplication (prevent duplicate entries)



