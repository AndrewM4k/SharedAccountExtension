// Content Script for Copart Extension
// Tracks user actions and sends them to background script
console.log('Content script loaded and ready on Copart.');
// Функция для отправки сообщения в background script с повторными попытками
function sendActionToBackground(actionData, retries = 3) {
    console.log('Content script: Sending action to background:', actionData);
    // Check if chrome.runtime is available
    if (typeof chrome === 'undefined' || !chrome.runtime) {
        console.warn('Content script: chrome.runtime not available, saving to storage instead');
        console.warn('Content script: This may happen if button is in an iframe or modal');
        console.warn('Content script: Window context:', {
            isTop: window.self === window.top,
            location: window.location.href,
            hasChrome: typeof chrome !== 'undefined',
            hasRuntime: typeof chrome !== 'undefined' && !!chrome.runtime
        });
        saveActionToChromeStorage(actionData);
        return;
    }
    console.log('Content script: chrome.runtime is available, attempting to send message');
    try {
        chrome.runtime.sendMessage({
            type: 'BID_PLACED',
            data: actionData,
        }, (response) => {
            if (chrome.runtime.lastError) {
                // Ошибка отправки сообщения
                const errorMessage = chrome.runtime.lastError.message || '';
                console.error('Content script: Error sending message to background:', chrome.runtime.lastError);
                console.error('Content script: Error details:', errorMessage);
                // Check if error is due to extension context invalidation
                if (errorMessage.includes('Extension context invalidated') ||
                    errorMessage.includes('context invalidated') ||
                    errorMessage.includes('message port closed') ||
                    errorMessage.includes('Receiving end does not exist')) {
                    console.warn('Content script: Extension context invalidated, saving to storage');
                    // Don't retry if context is invalidated - just save to storage
                    saveActionToChromeStorage(actionData);
                    return;
                }
                if (retries > 0) {
                    // Повторная попытка через 1 секунду
                    console.log(`Content script: Retrying... (${retries} retries left)`);
                    setTimeout(() => sendActionToBackground(actionData, retries - 1), 1000);
                }
                else {
                    // Все попытки исчерпаны - сохраняем действие в chrome.storage
                    console.log('Content script: All retries exhausted, saving to storage');
                    saveActionToChromeStorage(actionData);
                }
            }
            else if (response && response.status === 'queued') {
                console.log('Content script: Action queued successfully in background');
            }
            else {
                console.log('Content script: Response received:', response);
            }
        });
    }
    catch (error) {
        console.error('Content script: Exception sending message:', error);
        console.error('Content script: Exception type:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('Content script: Exception message:', error instanceof Error ? error.message : String(error));
        // Check if error is due to extension context invalidation
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Extension context invalidated') ||
            errorMessage.includes('context invalidated') ||
            errorMessage.includes('message port closed')) {
            console.warn('Content script: Extension context invalidated, saving to storage');
            // Don't retry if context is invalidated - just save to storage
            saveActionToChromeStorage(actionData);
            return;
        }
        if (retries > 0) {
            console.log(`Content script: Retrying after exception... (${retries} retries left)`);
            setTimeout(() => sendActionToBackground(actionData, retries - 1), 1000);
        }
        else {
            console.log('Content script: All retries exhausted after exception, saving to storage');
            saveActionToChromeStorage(actionData);
        }
    }
}
// Функция для сохранения действия в chrome.storage (более надежно, чем localStorage)
async function saveActionToChromeStorage(actionData) {
    try {
        // Получаем текущие действия из chrome.storage
        const result = await chrome.storage.local.get(['pendingActions']);
        const savedActions = result.pendingActions || [];
        // Добавляем новое действие
        savedActions.push(actionData);
        // Сохраняем обратно
        await chrome.storage.local.set({ pendingActions: savedActions });
        console.log('Action saved to chrome.storage. Total pending:', savedActions.length);
        // Пытаемся отправить сохраненные действия при следующей загрузке страницы
        window.addEventListener('load', trySendSavedActions);
    }
    catch (error) {
        console.error('Error saving action to chrome.storage:', error);
    }
}
// Функция для отправки сохраненных действий при загрузке страницы
async function trySendSavedActions() {
    try {
        const result = await chrome.storage.local.get(['pendingActions']);
        const savedActions = result.pendingActions || [];
        if (savedActions.length > 0) {
            console.log('Trying to send', savedActions.length, 'saved actions from chrome.storage');
            // Отправляем каждое действие
            savedActions.forEach((action) => {
                sendActionToBackground(action);
            });
            // Очищаем chrome.storage после отправки
            await chrome.storage.local.remove('pendingActions');
        }
    }
    catch (error) {
        console.error('Error processing saved actions:', error);
    }
}
// Инициализация - пытаемся отправить сохраненные действия при загрузке страницы
trySendSavedActions();
// Helper function to extract lot number from page
function extractLotNumber() {
    // Try multiple selectors for lot number
    const lotNumberElement = document.querySelector('#LotNumber');
    if (lotNumberElement) {
        const lotNumber = lotNumberElement.textContent?.trim() || '';
        // Extract just the number (remove any extra whitespace/newlines)
        return lotNumber.replace(/\s+/g, ' ').trim();
    }
    // Fallback: try to extract from URL if on lot detail page
    const urlMatch = window.location.pathname.match(/\/lot\/(\d+)/);
    if (urlMatch) {
        return urlMatch[1];
    }
    return 'Unknown';
}
// Helper function to extract bid amount from page
function extractBidAmount() {
    // Priority 1: Check for max bid input (your-max-bid)
    const maxBidInput = document.querySelector('#your-max-bid');
    if (maxBidInput && maxBidInput.value) {
        return maxBidInput.value.trim();
    }
    // Priority 2: Check for maxBid input by name
    const maxBidByName = document.querySelector('input[name="maxBid"]');
    if (maxBidByName && maxBidByName.value) {
        return maxBidByName.value.trim();
    }
    // Priority 3: Check for start-bid input (backward compatibility)
    const bidInput = document.querySelector('#start-bid');
    if (bidInput && bidInput.value) {
        return bidInput.value.trim();
    }
    // Priority 4: Try alternative selectors (backward compatibility)
    const altBidInput = document.querySelector('input[name="startBid"]');
    if (altBidInput && altBidInput.value) {
        return altBidInput.value.trim();
    }
    return '0';
}
// Helper function to determine action type based on button
// Returns the action type string that will be stored in DB
// Note: Backend enum only supports 'Bid' and 'View', but we store the full string
function getActionTypeFromButton(button) {
    // Pay button
    if (button.classList.contains('cprt-btn-blue') || button.textContent?.includes('Pay')) {
        return 'Bid'; // Map to Bid for backend enum, but commentary will indicate it's Pay
    }
    // Buy it now button
    if (button.id === 'buyItNowBtn' || button.textContent?.includes('Buy it now')) {
        return 'Bid'; // Map to Bid for backend enum, but commentary will indicate it's BuyItNow
    }
    // Bid now buttons
    if (button.textContent?.includes('Bid now') || button.textContent?.includes('Bid')) {
        return 'Bid';
    }
    return 'Bid'; // Default
}
// Helper function to get detailed action description for commentary
function getActionDescription(button) {
    if (button.classList.contains('cprt-btn-blue') || button.textContent?.includes('Pay')) {
        return 'Pay button clicked';
    }
    if (button.id === 'buyItNowBtn' || button.textContent?.includes('Buy it now')) {
        return 'Buy it now button clicked';
    }
    if (button.getAttribute('ng-click') === 'openIncreaseBidModal()') {
        return 'Bid now button clicked (increase bid modal)';
    }
    if (button.classList.contains('btn-yellow-rd') || button.getAttribute('ng-click') === 'openPrelimBidModal()') {
        return 'Bid now button clicked (prelim modal)';
    }
    if (button.classList.contains('cprt-btn-lblue-content')) {
        return 'Bid now link clicked';
    }
    return 'Bid action';
}
// Helper function to extract lot name from page
function extractLotName() {
    // Priority 1: Try to get from h1.title (first h1 tag with class "title")
    const titleElement = document.querySelector('h1.title');
    if (titleElement) {
        return titleElement.textContent?.trim() || '';
    }
    // Priority 2: Try other h1 tags or lot-title class
    const altTitleElement = document.querySelector('h1, .lot-title, [data-uname="lotdetailTitle"]');
    if (altTitleElement) {
        return altTitleElement.textContent?.trim() || '';
    }
    // Priority 3: Try to extract from URL
    const urlMatch = window.location.pathname.match(/\/lot\/\d+\/([^/]+)/);
    if (urlMatch) {
        return decodeURIComponent(urlMatch[1].replace(/-/g, ' '));
    }
    return '';
}
// Helper function to extract details from page elements
// For btn-yellow-rd: from closest h1.title in div.title-and-highlights
// For search result links: from h1.title OR span.search_result_lot_detail
function extractDetails(element) {
    // For btn-yellow-rd buttons: find closest div with class containing "title-and-highlights"
    if (element.closest('button.btn.btn-yellow-rd') ||
        element.classList.contains('btn-yellow-rd')) {
        const titleContainer = element.closest('div[class*="title-and-highlights"]');
        if (titleContainer) {
            const h1Title = titleContainer.querySelector('h1.title');
            if (h1Title) {
                return h1Title.textContent?.trim() || '';
            }
        }
        // Fallback: try to find h1.title anywhere nearby
        const h1Title = element.closest('div')?.querySelector('h1.title');
        if (h1Title) {
            return h1Title.textContent?.trim() || '';
        }
    }
    // For search result links (a.cprt-btn-lblue-content or a#buyItNowBtn)
    if (element.closest('a.cprt-btn-lblue-content') ||
        element.closest('a#buyItNowBtn') ||
        element.id === 'buyItNowBtn') {
        // Try to find h1.title in div.title-and-highlights first
        const titleContainer = element.closest('div[class*="title-and-highlights"]');
        if (titleContainer) {
            const h1Title = titleContainer.querySelector('h1.title');
            if (h1Title) {
                return h1Title.textContent?.trim() || '';
            }
        }
        // Fallback: try span.search_result_lot_detail
        const lotDetailSpan = element.closest('div')?.querySelector('span.search_result_lot_detail');
        if (lotDetailSpan) {
            return lotDetailSpan.textContent?.trim() || '';
        }
        // Try to find h1.title anywhere nearby
        const h1Title = element.closest('div')?.querySelector('h1.title');
        if (h1Title) {
            return h1Title.textContent?.trim() || '';
        }
    }
    return '';
}
// Test: Log when content script is ready and event listener is attached
console.log('Content script: Event listener attached, ready to track clicks');
// Click debouncing - prevent duplicate actions from rapid clicks
let lastActionTime = 0;
let lastActionKey = '';
const CLICK_DEBOUNCE_MS = 100; // Ignore duplicate actions within 100ms
function getActionKey(actionData) {
    return `${actionData.actionType}_${actionData.lotNumber}_${actionData.timestamp}`;
}
//#region Clicks
// Отслеживание действий на странице
document.addEventListener('click', function (event) {
    const target = event.target;
    let actionData = null;
    // Debug: Log all clicks to verify listener is working
    console.log('Content script: Click detected on:', target.tagName, target.className, target.id);
    // 1. Pay button: <button class="cprt cprt-btn-blue ng-star-inserted">Pay</button>
    if (target.closest('button.cprt.cprt-btn-blue') ||
        (target.tagName === 'BUTTON' && target.classList.contains('cprt-btn-blue'))) {
        const button = target.closest('button') || target;
        const lotNumber = extractLotNumber();
        const bidAmount = extractBidAmount();
        actionData = {
            actionType: getActionTypeFromButton(button), // Returns 'Bid' for backend enum compatibility
            lotNumber: lotNumber,
            userBidAmount: bidAmount,
            timestamp: new Date().toISOString(),
            pageUrl: window.location.href,
            lotName: extractLotName(),
            commentary: getActionDescription(button), // Detailed description
        };
        console.log('Pay button clicked, data:', actionData);
        // Debounce check
        const actionKey = getActionKey(actionData);
        const now = Date.now();
        if (now - lastActionTime < CLICK_DEBOUNCE_MS && lastActionKey === actionKey) {
            console.log('Content script: Duplicate action ignored (debounce)');
            event.stopPropagation();
            event.stopImmediatePropagation();
            return;
        }
        lastActionTime = now;
        lastActionKey = actionKey;
        sendActionToBackground(actionData);
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
    }
    // 2. Bid now link: <a class="cprt-btn-lblue-content search_result_btn ng-star-inserted" href="/lot/...">Bid now</a>
    if (target.closest('a.cprt-btn-lblue-content.search_result_btn') ||
        (target.tagName === 'A' && target.classList.contains('cprt-btn-lblue-content'))) {
        const link = target.closest('a') || target;
        const lotNumber = extractLotNumber();
        const bidAmount = extractBidAmount();
        const details = extractDetails(link);
        // Try to extract lot number from href if available
        let extractedLotNumber = lotNumber;
        if (link.href) {
            const hrefMatch = link.href.match(/\/lot\/(\d+)/);
            if (hrefMatch) {
                extractedLotNumber = hrefMatch[1];
            }
        }
        actionData = {
            actionType: 'Bid',
            lotNumber: extractedLotNumber,
            userBidAmount: bidAmount,
            timestamp: new Date().toISOString(),
            pageUrl: link.href || window.location.href,
            lotName: extractLotName(),
            commentary: getActionDescription(link),
            details: details,
        };
        console.log('Bid now link clicked, data:', actionData);
        // Debounce check
        const actionKey = getActionKey(actionData);
        const now = Date.now();
        if (now - lastActionTime < CLICK_DEBOUNCE_MS && lastActionKey === actionKey) {
            console.log('Content script: Duplicate action ignored (debounce)');
            event.stopPropagation();
            event.stopImmediatePropagation();
            return;
        }
        lastActionTime = now;
        lastActionKey = actionKey;
        sendActionToBackground(actionData);
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
    }
    // 3. Buy it now link: <a id="buyItNowBtn" class="cprt-btn-green-content search_result_btn" href="/lot/..."> Buy it now </a>
    if (target.closest('a#buyItNowBtn') ||
        target.id === 'buyItNowBtn' ||
        (target.tagName === 'A' && target.classList.contains('cprt-btn-green-content'))) {
        const link = target.closest('a') || target;
        const lotNumber = extractLotNumber();
        const bidAmount = extractBidAmount();
        const details = extractDetails(link);
        // Try to extract lot number from href if available
        let extractedLotNumber = lotNumber;
        if (link.href) {
            const hrefMatch = link.href.match(/\/lot\/(\d+)/);
            if (hrefMatch) {
                extractedLotNumber = hrefMatch[1];
            }
        }
        actionData = {
            actionType: 'Bid', // Map to Bid for backend enum compatibility
            lotNumber: extractedLotNumber,
            userBidAmount: bidAmount,
            timestamp: new Date().toISOString(),
            pageUrl: link.href || window.location.href,
            lotName: extractLotName(),
            commentary: 'Buy it now link clicked', // Detailed description in commentary
            details: details,
        };
        console.log('Buy it now link clicked, data:', actionData);
        // Debounce check
        const actionKey = getActionKey(actionData);
        const now = Date.now();
        if (now - lastActionTime < CLICK_DEBOUNCE_MS && lastActionKey === actionKey) {
            console.log('Content script: Duplicate action ignored (debounce)');
            event.stopPropagation();
            event.stopImmediatePropagation();
            return;
        }
        lastActionTime = now;
        lastActionKey = actionKey;
        sendActionToBackground(actionData);
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
    }
    // 4. Bid now button: <button class="btn btn-yellow-rd" ng-click="openPrelimBidModal()">Bid now</button>
    //    Also handles: <button class="btn btn-yellow-rd" ng-click="openIncreaseBidModal()">Bid now</button>
    if (target.closest('button.btn.btn-yellow-rd') ||
        (target.tagName === 'BUTTON' &&
            (target.classList.contains('btn-yellow-rd') ||
                target.getAttribute('ng-click') === 'openPrelimBidModal()' ||
                target.getAttribute('ng-click') === 'openIncreaseBidModal()'))) {
        const button = target.closest('button') || target;
        const lotNumber = extractLotNumber();
        const bidAmount = extractBidAmount();
        const details = extractDetails(button);
        actionData = {
            actionType: 'Bid',
            lotNumber: lotNumber,
            userBidAmount: bidAmount,
            timestamp: new Date().toISOString(),
            pageUrl: window.location.href,
            lotName: extractLotName(),
            commentary: getActionDescription(button),
            details: details,
        };
        console.log('Bid now button clicked, data:', actionData);
        // Debounce check
        const actionKey = getActionKey(actionData);
        const now = Date.now();
        if (now - lastActionTime < CLICK_DEBOUNCE_MS && lastActionKey === actionKey) {
            console.log('Content script: Duplicate action ignored (debounce)');
            event.stopPropagation();
            event.stopImmediatePropagation();
            return;
        }
        lastActionTime = now;
        lastActionKey = actionKey;
        sendActionToBackground(actionData);
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
    }
    // // 5. Test button handler - fires on ANY button click for testing
    // // This helps verify the content script is working
    // if (target.tagName === 'BUTTON' || target.closest('button')) {
    //   const button = target.closest('button') || target;
    //   console.log('Content script: Button clicked -', button.textContent?.trim() || 'no text', button.className);
    //   // If it's a test button or any button, create test action
    //   if (button.textContent?.toLowerCase().includes('test') || 
    //       button.id?.toLowerCase().includes('test') ||
    //       button.className?.toLowerCase().includes('test')) {
    //     actionData = {
    //       actionType: 'Bid',
    //       lotNumber: extractLotNumber(),
    //       userBidAmount: extractBidAmount(),
    //       timestamp: new Date().toISOString(),
    //       pageUrl: window.location.href,
    //       lotName: extractLotName() || 'Test Action',
    //       commentary: `Test button clicked: ${button.textContent?.trim() || 'unknown'}`,
    //     };
    //     console.log('Content script: Test button action data:', actionData);
    //     sendActionToBackground(actionData);
    //     return;
    //   }
    // }
    // 6. Legacy test selector - keep for backward compatibility
    if (target.matches('a[aria-controls="serverSideDataTable_mylots"][data-dt-idx="0"]')) {
        const lotNumber = extractLotNumber();
        const bidAmount = extractBidAmount();
        actionData = {
            actionType: 'Bid',
            lotNumber: lotNumber !== 'Unknown' ? lotNumber : 'Test Lot',
            userBidAmount: bidAmount !== '0' ? bidAmount : '0',
            timestamp: new Date().toISOString(),
            pageUrl: window.location.href,
            lotName: extractLotName() || 'test',
            commentary: 'Action triggered from table link',
        };
        console.log('Table link clicked, data:', actionData);
        // Debounce check
        const actionKey = getActionKey(actionData);
        const now = Date.now();
        if (now - lastActionTime < CLICK_DEBOUNCE_MS && lastActionKey === actionKey) {
            console.log('Content script: Duplicate action ignored (debounce)');
            event.stopPropagation();
            event.stopImmediatePropagation();
            return;
        }
        lastActionTime = now;
        lastActionKey = actionKey;
        sendActionToBackground(actionData);
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
    }
    // // 7. Fallback: generic bid button (if .bid-button class exists)
    // if (target.closest('.bid-button')) {
    //   const lotNumber = extractLotNumber();
    //   const bidAmount = extractBidAmount();
    //   actionData = {
    //     actionType: 'Bid',
    //     lotNumber: lotNumber,
    //     userBidAmount: bidAmount,
    //     timestamp: new Date().toISOString(),
    //     pageUrl: window.location.href,
    //     lotName: extractLotName(),
    //   };
    //   sendActionToBackground(actionData);
    //   return;
    // }
});
// Отслеживание изменений URL (SPA navigation)
// let lastUrl = location.href;
// new MutationObserver(() => {
//   const url = location.href;
//   if (url !== lastUrl) {
//     lastUrl = url;
//     const actionData: ActionData = {
//       actionType: 'Bid',
//       timestamp: new Date().toISOString(),
//       pageUrl: url,
//     };
//     sendActionToBackground(actionData);
//   }
// }).observe(document, { subtree: true, childList: true });
//#endregion 
