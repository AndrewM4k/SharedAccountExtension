// Extension Background Script
// This handles authentication, cookie management, and action queuing
// Get API base URL from chrome.storage or use default
// This should be set during extension installation or build
const getApiBase = async () => {
    const result = await chrome.storage.local.get(['apiBaseUrl']);
    return result.apiBaseUrl || 'https://localhost:5001/api';
};
// For immediate use, we'll use a default and update it on first run
let API_BASE = 'https://localhost:5001/api';
// Initialize API base URL from storage
chrome.storage.local.get(['apiBaseUrl'], (result) => {
    if (result.apiBaseUrl) {
        API_BASE = result.apiBaseUrl;
    }
});
//#region Connection
class CookieService {
    constructor() {
        this.copartDomain = 'https://www.copart.com';
    }
    // Установка кук полученных с бэкенда
    async setCookiesFromBackend(cookiesData) {
        try {
            console.log('Начало установки кук из бэкенда:', cookiesData);
            // Устанавливаем каждую куку отдельно
            for (const cookieData of cookiesData) {
                try {
                    await this.setBrowserCookie(cookieData);
                    console.log('Кука установлена:', cookieData.name);
                }
                catch (error) {
                    console.error('Ошибка установки куки:', cookieData.name, error);
                }
            }
            console.log('Все куки установлены успешно');
            return true;
        }
        catch (error) {
            console.error('Ошибка при установке кук:', error);
            return false;
        }
    }
    // Установка одной куки в браузер
    async setBrowserCookie(cookieData) {
        const cookieDetails = {
            url: this.copartDomain,
            name: cookieData.name,
            value: cookieData.value,
            domain: cookieData.domain || '.copart.com',
            path: cookieData.path || '/',
            secure: cookieData.secure !== false, // По умолчанию true
            httpOnly: cookieData.httpOnly || false,
            sameSite: cookieData.sameSite?.toLowerCase() || 'lax',
            expirationDate: cookieData.expirationDate || this.getDefaultExpirationDate(),
        };
        return new Promise((resolve, reject) => {
            chrome.cookies.set(cookieDetails, (cookie) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                }
                else if (cookie) {
                    resolve(cookie);
                }
                else {
                    reject(new Error('Не удалось установить куки'));
                }
            });
        });
    }
    // Получение даты истечения срока действия (по умолчанию +2 часа)
    getDefaultExpirationDate() {
        return Math.floor((Date.now() + 2 * 60 * 60 * 1000) / 1000);
    }
    // Проверка установленных кук
    async verifyCookies(cookieNames) {
        const verifiedCookies = [];
        for (const cookieName of cookieNames) {
            const cookie = await this.getCookie(cookieName);
            if (cookie) {
                verifiedCookies.push(cookie);
            }
        }
        return verifiedCookies;
    }
    // Получение конкретной куки
    async getCookie(name) {
        return new Promise((resolve) => {
            chrome.cookies.get({
                url: this.copartDomain,
                name: name,
            }, (cookie) => {
                resolve(cookie || null);
            });
        });
    }
    // Получение всех кук для домена Copart
    async getAllCopartCookies() {
        return new Promise((resolve) => {
            chrome.cookies.getAll({
                domain: 'copart.com',
            }, (cookies) => {
                resolve(cookies || []);
            });
        });
    }
    async clearAllCopartCookies() {
        try {
            console.log('Начало очистки кук Copart');
            const cookies = await this.getAllCopartCookies();
            for (const cookie of cookies) {
                try {
                    await this.removeCookie(cookie.name, cookie.domain || 'copart.com', cookie.path || '/');
                    console.log('Кука удалена:', cookie.name);
                }
                catch (error) {
                    console.error('Ошибка удаления куки:', cookie.name, error);
                }
            }
            console.log('Очистка кук завершена');
            return true;
        }
        catch (error) {
            console.error('Ошибка при очистке кук:', error);
            return false;
        }
    }
    // Удаление конкретной куки
    async removeCookie(name, domain, path = '/') {
        return new Promise((resolve, reject) => {
            chrome.cookies.remove({
                url: `https://${domain}${path}`,
                name: name,
            }, (details) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                }
                else {
                    resolve();
                }
            });
        });
    }
}
// Инициализация службы кук
const cookieService = new CookieService();
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'authAndSetCookies') {
        // Выполняем аутентификацию напрямую из background
        console.log('Выполняем аутентификацию напрямую из background');
        authenticateWithBackend()
            .then((result) => sendResponse(result))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true; // Указываем на асинхронный ответ
    }
    if (request.action === 'clearCookies') {
        cookieService.clearAllCopartCookies();
        fetch('https://www.copart.com/doLogout.html', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then(() => console.log('Logout finished'))
            .catch((error) => console.error('Logout error:', error));
    }
});
async function authenticateWithBackend() {
    try {
        // Get API base URL (may be from storage)
        const apiBase = await getApiBase();
        // Выполняем запрос к бэкенду
        const response = await fetch(apiBase + '/copartAuth/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success && result.cookies) {
            console.log('Попытка очистки кук Copart');
            // Удаляем куки
            await cookieService.clearAllCopartCookies();
            // Устанавливаем куки
            const success = await cookieService.setCookiesFromBackend(result.cookies);
            if (success) {
                // Сохраняем UserAgent
                if (result.userAgent) {
                    await chrome.storage.local.set({ copartUserAgent: result.userAgent });
                }
                return { success: true };
            }
            else {
                return { success: false, error: 'Не удалось установить куки' };
            }
        }
        else {
            return { success: false, error: result.Message || result.error || 'Unknown error' };
        }
    }
    catch (error) {
        console.error('Ошибка авторизации:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
//#endregion
//#region Authentication
// Function to ensure authentication before sending actions
async function ensureAuthenticated() {
    try {
        const apiBase = await getApiBase();
        // Check if token is valid
        const checkResponse = await fetch(apiBase + '/auth/check', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (checkResponse.ok) {
            return true;
        }
        // Token is invalid, try to refresh
        console.log('Token expired, attempting to refresh...');
        const refreshResponse = await fetch(apiBase + '/auth/refresh-token', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (refreshResponse.ok) {
            // Verify refresh worked
            const recheckResponse = await fetch(apiBase + '/auth/check', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (recheckResponse.ok) {
                console.log('Token refreshed successfully');
                return true;
            }
        }
        console.error('Failed to refresh token');
        return false;
    }
    catch (error) {
        console.error('Error checking/refreshing token:', error);
        return false;
    }
}
//#endregion
//#region Events
let actionQueue = [];
let isSending = false;
let isProcessing = false;
let batchIntervalId = null;
const BATCH_INTERVAL = 10000;
const MAX_BATCH_SIZE = 50;
// Helper function to merge pendingActions from content script into queue
async function mergePendingActionsFromStorage() {
    try {
        const result = await chrome.storage.local.get(['pendingActions']);
        const pendingActions = result.pendingActions || [];
        if (pendingActions.length > 0) {
            console.log(`Background: Found ${pendingActions.length} pending actions from content script, merging into queue`);
            // Add pending actions to queue
            actionQueue.push(...pendingActions);
            saveQueue();
            // Clear pendingActions from storage
            await chrome.storage.local.remove('pendingActions');
            console.log('Background: Pending actions merged and cleared from storage');
        }
    }
    catch (error) {
        console.error('Background: Error merging pending actions:', error);
    }
}
// Восстановление очереди при запуске
chrome.storage.local.get(['actionQueue'], async (result) => {
    if (result.actionQueue && Array.isArray(result.actionQueue)) {
        actionQueue = result.actionQueue;
        console.log('Queue restored from storage. Length:', actionQueue.length);
    }
    // Merge any pendingActions saved by content script (e.g., when extension context was invalidated)
    await mergePendingActionsFromStorage();
    // Немедленно пытаемся отправить восстановленные данные
    if (actionQueue.length > 0) {
        // Start the batch sending process
        startSendingBatch();
    }
});
// Process queue when extension starts up
chrome.runtime.onStartup.addListener(async () => {
    console.log('Extension started up, checking for pending actions...');
    const result = await chrome.storage.local.get(['actionQueue']);
    if (result.actionQueue && Array.isArray(result.actionQueue)) {
        actionQueue = result.actionQueue;
    }
    // Merge any pendingActions saved by content script
    await mergePendingActionsFromStorage();
    if (actionQueue.length > 0) {
        startSendingBatch();
    }
});
// Process queue when extension is installed or updated
chrome.runtime.onInstalled.addListener(async () => {
    console.log('Extension installed/updated, checking for pending actions...');
    const result = await chrome.storage.local.get(['actionQueue']);
    if (result.actionQueue && Array.isArray(result.actionQueue)) {
        actionQueue = result.actionQueue;
    }
    // Merge any pendingActions saved by content script
    await mergePendingActionsFromStorage();
    if (actionQueue.length > 0) {
        startSendingBatch();
    }
});
// Функция для сохранения очереди в хранилище
function saveQueue() {
    chrome.storage.local.set({ actionQueue: actionQueue }, () => {
        console.log('Queue saved to storage. Length:', actionQueue.length);
    });
}
// Функция для добавления действия в очередь с немедленным сохранением
function addToQueue(actionData) {
    actionQueue.push(actionData);
    console.log('Action added to queue. Queue length:', actionQueue.length);
    // Немедленно сохраняем очередь
    saveQueue();
    // Запускаем отправку, если она еще не запущена
    if (!isSending) {
        startSendingBatch();
    }
}
// Функция для запуска периодической отправки
function startSendingBatch() {
    if (isSending)
        return;
    isSending = true;
    // Clear any existing interval
    if (batchIntervalId !== null) {
        clearInterval(batchIntervalId);
    }
    batchIntervalId = setInterval(() => {
        if (actionQueue.length === 0) {
            console.log('Queue is empty, skipping send.');
            // Stop the interval if queue is empty
            if (batchIntervalId !== null) {
                clearInterval(batchIntervalId);
                batchIntervalId = null;
                isSending = false;
            }
            return;
        }
        // Only process if not already processing
        if (!isProcessing) {
            processQueue();
        }
    }, BATCH_INTERVAL);
}
// Функция для обработки очереди
async function processQueue() {
    // Prevent concurrent processing - set flag immediately to prevent race conditions
    if (isProcessing) {
        console.log('Queue processing already in progress, skipping...');
        return;
    }
    if (actionQueue.length === 0) {
        return;
    }
    // Set processing flag IMMEDIATELY to prevent concurrent calls
    isProcessing = true;
    // Remove actions from queue IMMEDIATELY to prevent duplicate sends
    const actionsToSend = actionQueue.slice(0, MAX_BATCH_SIZE);
    actionQueue = actionQueue.slice(MAX_BATCH_SIZE);
    // Save updated queue immediately
    saveQueue();
    console.log(`Preparing to send batch of ${actionsToSend.length} actions.`);
    // Нормализуем данные перед отправкой
    const normalizedActions = actionsToSend.map((item) => ({
        actionType: item.actionType || '',
        lotNumber: item.lotNumber || '',
        commentary: item.commentary || '',
        timestamp: item.timestamp || '',
        url: item.url || '',
        lotName: item.lotName || '',
        userBidAmount: item.userBidAmount || '',
        pageUrl: item.pageUrl || '',
        details: item.details || '',
    }));
    try {
        // Ensure authentication before sending
        const isAuthenticated = await ensureAuthenticated();
        if (!isAuthenticated) {
            throw new Error('Authentication failed');
        }
        const apiBase = await getApiBase();
        const response = await fetch(apiBase + '/actions/add-bulk', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ actions: normalizedActions }),
        });
        if (response.status === 401) {
            // Token expired, try to refresh and retry once
            console.log('Received 401, attempting token refresh and retry...');
            const refreshed = await ensureAuthenticated();
            if (refreshed) {
                // Retry the request
                const retryResponse = await fetch(apiBase + '/actions/add-bulk', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ actions: normalizedActions }),
                });
                if (!retryResponse.ok) {
                    throw new Error(`HTTP error! status: ${retryResponse.status}`);
                }
                const result = await retryResponse.json();
                console.log('Batch send successful after token refresh:', result);
            }
            else {
                throw new Error('Authentication failed after refresh attempt');
            }
        }
        else if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        else {
            const result = await response.json();
            console.log('Batch send successful:', result);
        }
        // If queue still has actions, schedule next send
        if (actionQueue.length > 0) {
            setTimeout(() => {
                isProcessing = false;
                processQueue();
            }, 1000);
        }
        else {
            isProcessing = false;
        }
    }
    catch (error) {
        console.error('Error sending batch:', error);
        // Put actions back in queue for retry (at the beginning to preserve order)
        actionQueue = [...actionsToSend, ...actionQueue];
        saveQueue();
        // Schedule retry with exponential backoff
        setTimeout(() => {
            isProcessing = false;
            processQueue();
        }, 30000); // Retry after 30 seconds
    }
}
// Попытка отправить все данные при закрытии/приостановке расширения
chrome.runtime.onSuspend.addListener(async () => {
    console.log('Extension is about to suspend. Trying to send all pending actions...');
    if (actionQueue.length > 0) {
        // Note: getAuthTokenSync was removed per user request
        // Using sendBeacon for reliable delivery before suspend
        const normalizedActions = actionQueue.map((item) => ({
            actionType: item.actionType || '',
            lotNumber: item.lotNumber || '',
            commentary: item.commentary || '',
            timestamp: item.timestamp || '',
            url: item.url || '',
            lotName: item.lotName || '',
            userBidAmount: item.userBidAmount || '',
            pageUrl: item.pageUrl || '',
        }));
        // Get API base (use cached value for speed)
        const apiBase = API_BASE; // Use the cached value set at initialization
        // Use sendBeacon for reliable delivery before suspend
        const blob = new Blob([JSON.stringify({ actions: normalizedActions })], {
            type: 'application/json',
        });
        navigator.sendBeacon(apiBase + '/actions/add-bulk', blob);
        console.log('Pending actions sent via sendBeacon before suspend');
        // Clear queue
        actionQueue = [];
        chrome.storage.local.remove('actionQueue');
    }
});
// Helper function to check and process queue when extension wakes up
async function checkAndProcessQueueOnWake() {
    // First, merge any pendingActions from content script
    await mergePendingActionsFromStorage();
    // Check if there are pending actions and process them
    if (actionQueue.length > 0 && !isProcessing) {
        console.log('Background: Extension woke up, processing pending queue...');
        startSendingBatch();
    }
}
// Слушатель сообщений от content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background: Message received:', message);
    // When any message is received, it means the extension is active - check queue
    // Use void to fire and forget (don't wait for async operation)
    void checkAndProcessQueueOnWake();
    if (message.type === 'BID_PLACED' && message.data) {
        console.log('Background: Received BID_PLACED action from content script:', message.data);
        try {
            // Добавляем действие в очередь
            addToQueue(message.data);
            console.log('Background: Action added to queue successfully');
            sendResponse({ status: 'queued' });
        }
        catch (error) {
            console.error('Background: Error adding action to queue:', error);
            sendResponse({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    else if (message.action === 'processQueue' || message.type === 'PROCESS_QUEUE') {
        // Handle request from popup to process queue immediately
        console.log('Background: Processing queue on request from popup');
        if (actionQueue.length > 0) {
            startSendingBatch();
            sendResponse({ status: 'processing', queueLength: actionQueue.length });
        }
        else {
            sendResponse({ status: 'empty' });
        }
        return true; // Async response
    }
    else {
        console.log('Background: Message ignored - type:', message.type, 'has data:', !!message.data);
    }
    // Return true to indicate we will send a response asynchronously
    return true;
});
export {};
//#endregion
