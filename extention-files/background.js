//#region Connection
class CookieService {
  constructor() {
    this.copartDomain = "https://www.copart.com";
  }

  // Установка кук полученных с бэкенда
  async setCookiesFromBackend(cookiesData) {
    try {
      console.log("Начало установки кук из бэкенда:", cookiesData);

      // Устанавливаем каждую куку отдельно
      for (const cookieData of cookiesData) {
        try {
          await this.setBrowserCookie(cookieData);
          console.log("Кука установлена:", cookieData.name);
        } catch (error) {
          console.error("Ошибка установки куки:", cookieData.name, error);
        }
      }

      console.log("Все куки установлены успешно");
      return true;
    } catch (error) {
      console.error("Ошибка при установке кук:", error);
      return false;
    }
  }

  // Установка одной куки в браузер
  async setBrowserCookie(cookieData) {
    const cookieDetails = {
      url: this.copartDomain,
      name: cookieData.name,
      value: cookieData.value,
      domain: cookieData.domain || ".copart.com",
      path: cookieData.path || "/",
      secure: cookieData.secure !== false, // По умолчанию true
      httpOnly: cookieData.httpOnly || false,
      sameSite: cookieData.sameSite || "lax",
      expirationDate:
        cookieData.expirationDate || this.getDefaultExpirationDate(),
    };

    return new Promise((resolve, reject) => {
      chrome.cookies.set(cookieDetails, (cookie) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (cookie) {
          resolve(cookie);
        } else {
          reject(new Error("Не удалось установить куки"));
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
      chrome.cookies.get(
        {
          url: this.copartDomain,
          name: name,
        },
        (cookie) => {
          resolve(cookie);
        }
      );
    });
  }

  // Получение всех кук для домена Copart
  async getAllCopartCookies() {
    return new Promise((resolve) => {
      chrome.cookies.getAll(
        {
          domain: "copart.com",
        },
        (cookies) => {
          resolve(cookies);
        }
      );
    });
  }

  async clearAllCopartCookies() {
    try {
      console.log("Начало очистки кук Copart");

      const cookies = await this.getAllCopartCookies();

      for (const cookie of cookies) {
        try {
          await this.removeCookie(cookie.name, cookie.domain, cookie.path);
          console.log("Кука удалена:", cookie.name);
        } catch (error) {
          console.error("Ошибка удаления куки:", cookie.name, error);
        }
      }

      console.log("Очистка кук завершена");
      return true;
    } catch (error) {
      console.error("Ошибка при очистке кук:", error);
      return false;
    }
  }
  // Удаление конкретной куки
  async removeCookie(name, domain, path = "/") {
    return new Promise((resolve) => {
      chrome.cookies.remove(
        {
          url: `https://${domain}${path}`,
          name: name,
        },
        (details) => {
          resolve(details);
        }
      );
    });
  }
}

// Инициализация службы кук
const cookieService = new CookieService();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "authAndSetCookies") {
    // Выполняем аутентификацию напрямую из background

    console.log("Выполняем аутентификацию напрямую из background");
    authenticateWithBackend()
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    return true; // Указываем на асинхронный ответ
  }

  if (request.action === "clearCookies") {
    cookieService.clearAllCopartCookies();
    const response = fetch("https://www.copart.com/doLogout.html", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    response.then(console.log("Logout finished"));
  }
});

async function authenticateWithBackend() {
  try {
    // Выполняем запрос к бэкенду
    const response = await fetch("https://localhost:5001/api/copartAuth/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log("Попытка очистки кук Copart");
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
        return { success: false, error: "Не удалось установить куки" };
      }
    } else {
      return { success: false, error: result.Message };
    }
  } catch (error) {
    console.error("Ошибка авторизации:", error);
    return { success: false, error: error.message };
  }
}
//#endregion

//#region Events

class EventService {
  constructor() {
    this.isTracking = false;
    this.eventQueue = [];
    this.retryAttempts = 3;
    this.init();
  }

  init() {
    // Обработчик сообщений от content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "trackEvent") {
        this.addToQueue(message.data);
        sendResponse({ success: true });
      } else if (message.action === "startTracking") {
        this.startTracking();
        sendResponse({ success: true });
      } else if (message.action === "stopTracking") {
        this.stopTracking();
        sendResponse({ success: true });
      } else if (message.action === "getTrackingStatus") {
        sendResponse({ isTracking: this.isTracking });
      }
      return true;
    });

    // Обработчик установки расширения
    chrome.runtime.onInstalled.addListener(() => {
      this.loadConfiguration();
    });

    // Периодическая отправка событий
    setInterval(() => {
      this.processQueue();
    }, 5000); // Отправляем каждые 5 секунд

    // Обработчик перед закрытием страницы
    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
      this.processQueue(); // Пытаемся отправить оставшиеся события
    });
  }

  startTracking() {
    this.isTracking = true;
    console.log("Event tracking started");
    this.notifyContentScripts("startTracking");
  }

  stopTracking() {
    this.isTracking = false;
    console.log("Event tracking stopped");
    this.notifyContentScripts("stopTracking");
    this.processQueue(); // Отправляем оставшиеся события
  }

  addToQueue(eventData) {
    if (!this.isTracking) return;

    // Добавляем информацию о пользователе
    chrome.storage.local.get(["user", "authToken"], (data) => {
      const enhancedEvent = {
        ...eventData,
        userId: data.user ? data.user.id : "unknown",
        userEmail: data.user ? data.user.email : "unknown",
        extensionVersion: chrome.runtime.getManifest().version,
      };

      this.eventQueue.push(enhancedEvent);

      // Если очередь становится большой, отправляем сразу
      if (this.eventQueue.length >= 10) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = []; // Очищаем очередь

    try {
      const { authToken } = await new Promise((resolve) => {
        chrome.storage.local.get(["authToken"], resolve);
      });

      const response = await fetch("https://your-backend.com/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ events: eventsToSend }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log(`Successfully sent ${eventsToSend.length} events`);
    } catch (error) {
      console.error("Failed to send events:", error);

      // Возвращаем события в очередь для повторной попытки
      this.eventQueue = [...eventsToSend, ...this.eventQueue];

      // Уменьшаем количество попыток для этих событий
      eventsToSend.forEach((event) => {
        event.retryCount = (event.retryCount || 0) + 1;
      });

      // Удаляем события, которые превысили лимит попыток
      this.eventQueue = this.eventQueue.filter(
        (event) => (event.retryCount || 0) < this.retryAttempts
      );
    }
  }

  notifyContentScripts(action) {
    // Уведомляем все вкладки Copart об изменении статуса трекинга
    chrome.tabs.query({ url: "*://*.copart.com/*" }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { action: action });
      });
    });
  }

  loadConfiguration() {
    // Загрузка конфигурации с сервера
    chrome.storage.local.get(["authToken"], async (data) => {
      if (data.authToken) {
        try {
          const response = await fetch(
            "https://your-backend.com/api/tracking-config",
            {
              headers: {
                Authorization: `Bearer ${data.authToken}`,
              },
            }
          );

          if (response.ok) {
            const config = await response.json();
            chrome.storage.local.set({ trackingConfig: config });

            if (config.trackingEnabled) {
              this.startTracking();
            }
          }
        } catch (error) {
          console.error("Failed to load tracking config:", error);
        }
      }
    });
  }
}

// Инициализация сервиса событий
const eventService = new EventService();

//#endregion
