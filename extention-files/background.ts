// Extension Background Script
// This handles authentication, cookie management, and action queuing

interface CookieData {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  expirationDate?: number;
}

interface AuthResponse {
  success: boolean;
  cookies?: CookieData[];
  userAgent?: string;
  Message?: string;
  error?: string;
}

interface ActionData {
  actionType: string;
  lotNumber?: string;
  commentary?: string;
  timestamp: string;
  url?: string;
  lotName?: string;
  userBidAmount?: string;
  pageUrl?: string;
}

interface BulkActionResponse {
  success: boolean;
  message?: string;
  processedCount?: number;
}

interface RuntimeMessage {
  action?: string;
  type?: string;
  data?: ActionData;
}

// Get API base URL from chrome.storage or use default
// This should be set during extension installation or build
const getApiBase = async (): Promise<string> => {
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
  private copartDomain = 'https://www.copart.com';

  // Установка кук полученных с бэкенда
  async setCookiesFromBackend(cookiesData: CookieData[]): Promise<boolean> {
    try {
      console.log('Начало установки кук из бэкенда:', cookiesData);

      // Устанавливаем каждую куку отдельно
      for (const cookieData of cookiesData) {
        try {
          await this.setBrowserCookie(cookieData);
          console.log('Кука установлена:', cookieData.name);
        } catch (error) {
          console.error('Ошибка установки куки:', cookieData.name, error);
        }
      }

      console.log('Все куки установлены успешно');
      return true;
    } catch (error) {
      console.error('Ошибка при установке кук:', error);
      return false;
    }
  }

  // Установка одной куки в браузер
  async setBrowserCookie(cookieData: CookieData): Promise<chrome.cookies.Cookie> {
    const cookieDetails: chrome.cookies.SetDetails = {
      url: this.copartDomain,
      name: cookieData.name,
      value: cookieData.value,
      domain: cookieData.domain || '.copart.com',
      path: cookieData.path || '/',
      secure: cookieData.secure !== false, // По умолчанию true
      httpOnly: cookieData.httpOnly || false,
      sameSite: (cookieData.sameSite?.toLowerCase() as chrome.cookies.SameSiteStatus) || 'lax',
      expirationDate: cookieData.expirationDate || this.getDefaultExpirationDate(),
    };

    return new Promise((resolve, reject) => {
      chrome.cookies.set(cookieDetails, (cookie) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (cookie) {
          resolve(cookie);
        } else {
          reject(new Error('Не удалось установить куки'));
        }
      });
    });
  }

  // Получение даты истечения срока действия (по умолчанию +2 часа)
  private getDefaultExpirationDate(): number {
    return Math.floor((Date.now() + 2 * 60 * 60 * 1000) / 1000);
  }

  // Проверка установленных кук
  async verifyCookies(cookieNames: string[]): Promise<chrome.cookies.Cookie[]> {
    const verifiedCookies: chrome.cookies.Cookie[] = [];

    for (const cookieName of cookieNames) {
      const cookie = await this.getCookie(cookieName);
      if (cookie) {
        verifiedCookies.push(cookie);
      }
    }

    return verifiedCookies;
  }

  // Получение конкретной куки
  async getCookie(name: string): Promise<chrome.cookies.Cookie | null> {
    return new Promise((resolve) => {
      chrome.cookies.get(
        {
          url: this.copartDomain,
          name: name,
        },
        (cookie) => {
          resolve(cookie || null);
        }
      );
    });
  }

  // Получение всех кук для домена Copart
  async getAllCopartCookies(): Promise<chrome.cookies.Cookie[]> {
    return new Promise((resolve) => {
      chrome.cookies.getAll(
        {
          domain: 'copart.com',
        },
        (cookies) => {
          resolve(cookies || []);
        }
      );
    });
  }

  async clearAllCopartCookies(): Promise<boolean> {
    try {
      console.log('Начало очистки кук Copart');

      const cookies = await this.getAllCopartCookies();

      for (const cookie of cookies) {
        try {
          await this.removeCookie(cookie.name, cookie.domain || 'copart.com', cookie.path || '/');
          console.log('Кука удалена:', cookie.name);
        } catch (error) {
          console.error('Ошибка удаления куки:', cookie.name, error);
        }
      }

      console.log('Очистка кук завершена');
      return true;
    } catch (error) {
      console.error('Ошибка при очистке кук:', error);
      return false;
    }
  }

  // Удаление конкретной куки
  async removeCookie(name: string, domain: string, path = '/'): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.cookies.remove(
        {
          url: `https://${domain}${path}`,
          name: name,
        },
        (details) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        }
      );
    });
  }
}

// Инициализация службы кук
const cookieService = new CookieService();

chrome.runtime.onMessage.addListener((request: RuntimeMessage, sender, sendResponse) => {
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

async function authenticateWithBackend(): Promise<AuthResponse> {
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

    const result: AuthResponse = await response.json();

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
      } else {
        return { success: false, error: 'Не удалось установить куки' };
      }
    } else {
      return { success: false, error: result.Message || result.error || 'Unknown error' };
    }
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
//#endregion

//#region Events

let actionQueue: ActionData[] = [];
let isSending = false;
const BATCH_INTERVAL = 10000;
const MAX_BATCH_SIZE = 50;

// Восстановление очереди при запуске
chrome.storage.local.get(['actionQueue'], (result) => {
  if (result.actionQueue && Array.isArray(result.actionQueue)) {
    actionQueue = result.actionQueue as ActionData[];
    console.log('Queue restored from storage. Length:', actionQueue.length);

    // Немедленно пытаемся отправить восстановленные данные
    if (actionQueue.length > 0) {
      processQueue();
    }
  }
});

// Функция для сохранения очереди в хранилище
function saveQueue(): void {
  chrome.storage.local.set({ actionQueue: actionQueue }, () => {
    console.log('Queue saved to storage. Length:', actionQueue.length);
  });
}

// Функция для добавления действия в очередь с немедленным сохранением
function addToQueue(actionData: ActionData): void {
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
function startSendingBatch(): void {
  if (isSending) return;

  isSending = true;

  setInterval(() => {
    if (actionQueue.length === 0) {
      console.log('Queue is empty, skipping send.');
      return;
    }

    processQueue();
  }, BATCH_INTERVAL);
}

// Функция для обработки очереди
async function processQueue(): Promise<void> {
  // Копируем часть очереди для отправки
  const actionsToSend = actionQueue.slice(0, MAX_BATCH_SIZE);
  const remainingActions = actionQueue.slice(MAX_BATCH_SIZE);

  console.log(`Preparing to send batch of ${actionsToSend.length} actions.`);

  // Нормализуем данные перед отправкой
  const normalizedActions: ActionData[] = actionsToSend.map((item) => ({
    actionType: item.actionType || '',
    lotNumber: item.lotNumber || '',
    commentary: item.commentary || '',
    timestamp: item.timestamp || '',
    url: item.url || '',
    lotName: item.lotName || '',
    userBidAmount: item.userBidAmount || '',
    pageUrl: item.pageUrl || '',
  }));

  try {
    const apiBase = await getApiBase();
    const response = await fetch(apiBase + '/actions/add-bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ actions: normalizedActions }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: BulkActionResponse = await response.json();
    console.log('Batch send successful:', result);

    // Удаляем отправленные действия из очереди
    actionQueue = remainingActions;

    // Сохраняем обновленную очередь
    saveQueue();

    // Если в очереди еще есть действия, планируем следующую отправку
    if (actionQueue.length > 0) {
      setTimeout(processQueue, 1000);
    }
  } catch (error) {
    console.error('Error sending batch:', error);

    // В случае ошибки оставляем действия в очереди для повторной попытки
    // Увеличиваем интервал перед следующей попыткой (экспоненциальная задержка)
    setTimeout(processQueue, 30000); // Повторная попытка через 30 секунд
  }
}

// Попытка отправить все данные при закрытии/приостановке расширения
chrome.runtime.onSuspend.addListener(async () => {
  console.log('Extension is about to suspend. Trying to send all pending actions...');

  if (actionQueue.length > 0) {
    // Note: getAuthTokenSync was removed per user request
    // Using sendBeacon for reliable delivery before suspend
    const normalizedActions: ActionData[] = actionQueue.map((item) => ({
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

// Слушатель сообщений от content script
chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  if (message.type === 'BID_PLACED' && message.data) {
    console.log('Received action from content script:', message.data);

    // Добавляем действие в очередь
    addToQueue(message.data);

    sendResponse({ status: 'queued' });
  }
  return true;
});

//#endregion

