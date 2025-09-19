const API_BASE = "https://localhost:5001/api";

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
    const response = await fetch(API_BASE + "/copartAuth/auth", {
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

// Слушаем сообщения от content script
// chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
//   if (request.type === "BID_PLACED") {
//     console.log("Bid message received in background:", request.data);

//     // Добавляем userId к данным ставки
//     const payload = {
//       actionType: request.data.actionType ? request.data.actionType : "",
//       lotNumber: request.data.lotNumber ? request.data.lotNumber : "",
//       details: request.data.details ? request.data.details : "",
//       timestamp: request.data.timestamp ? request.data.timestamp : "",
//       url: request.data.url ? request.data.url : "",
//       bidAmount: request.data.bidAmount ? request.data.bidAmount : "",
//       action: request.data.action ? request.data.action : "",
//       lotName: request.data.lotName ? request.data.lotName : "",
//       userBidAmount: request.data.userBidAmount
//         ? request.data.userBidAmount
//         : "",
//       pageUrl: request.data.pageUrl ? request.data.pageUrl : "",
//       pageTitle: request.data.pageTitle ? request.data.pageTitle : "",
//       referrer: request.data.referrer ? request.data.referrer : "",
//       elementText: request.data.elementText ? request.data.elementText : "",
//       elementClasses: request.data.elementClasses
//         ? request.data.elementClasses
//         : "",
//       userEmail: request.data.userEmail ? request.data.userEmail : "",
//       extensionVersion: request.data.extensionVersion
//         ? request.data.extensionVersion
//         : "",
//     };

//     console.log("payload: ", payload);

//     // Отправляем данные на ваш бэкенд

//     const response = await fetch("https://localhost:5001/api/actions/add", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(payload),
//     });

//     console.log("response: ", response);

//     // fetch("https://localhost:5001/api/actions/add", {
//     //   method: "POST",
//     //   headers: {
//     //     "Content-Type": "application/json",
//     //   },
//     //   body: JSON.stringify(payload),
//     // })
//     //   .then((response) => {
//     //     if (!response.ok) {
//     //       console.log("response: ", response);
//     //       throw new Error("Network response was not ok");
//     //     }
//     //     return response.json();
//     //   })
//     //   .then((data) => {
//     //     console.log("Successfully saved bid to DB:", data);
//     //     sendResponse({ status: "success", data: data });
//     //   })
//     //   .catch((error) => {
//     //     console.error("Error saving bid to DB:", error);
//     //     sendResponse({ status: "error", message: error.message });
//     //   });
//     // Возвращаем true для асинхронного ответа (sendResponse будет вызван позже)
//     return true;
//   }
// });

let actionQueue = [];
let isSending = false;
const BATCH_INTERVAL = 10000;
const MAX_BATCH_SIZE = 50;

// Восстановление очереди при запуске
chrome.storage.local.get(["actionQueue"], (result) => {
  if (result.actionQueue && Array.isArray(result.actionQueue)) {
    actionQueue = result.actionQueue;
    console.log("Queue restored from storage. Length:", actionQueue.length);

    // Немедленно пытаемся отправить восстановленные данные
    if (actionQueue.length > 0) {
      processQueue();
    }
  }
});

// Функция для сохранения очереди в хранилище
function saveQueue() {
  chrome.storage.local.set({ actionQueue: actionQueue }, () => {
    console.log("Queue saved to storage. Length:", actionQueue.length);
  });
}

// Функция для добавления действия в очередь с немедленным сохранением
function addToQueue(actionData) {
  actionQueue.push(actionData);
  console.log("Action added to queue. Queue length:", actionQueue.length);

  // Немедленно сохраняем очередь
  saveQueue();

  // Запускаем отправку, если она еще не запущена
  if (!isSending) {
    startSendingBatch();
  }
}

// Функция для запуска периодической отправки
function startSendingBatch() {
  if (isSending) return;

  isSending = true;

  setInterval(() => {
    if (actionQueue.length === 0) {
      console.log("Queue is empty, skipping send.");
      return;
    }

    processQueue();
  }, BATCH_INTERVAL);
}

// Функция для обработки очереди
async function processQueue() {
  // Копируем часть очереди для отправки
  const actionsToSend = actionQueue.slice(0, MAX_BATCH_SIZE);
  const remainingActions = actionQueue.slice(MAX_BATCH_SIZE);

  console.log(`Preparing to send batch of ${actionsToSend.length} actions.`);

  actionsToSend.forEach(function (item, index, arr) {
    actionsToSend[index] = {
      actionType: item.actionType ? item.actionType : "",
      lotNumber: item.lotNumber ? item.lotNumber : "",
      details: item.details ? item.details : "",
      timestamp: item.timestamp ? item.timestamp : "",
      url: item.url ? item.url : "",
      bidAmount: item.bidAmount ? item.bidAmount : "",
      action: item.action ? item.action : "",
      lotName: item.lotName ? item.lotName : "",
      userBidAmount: item.userBidAmount ? item.userBidAmount : "",
      pageUrl: item.pageUrl ? item.pageUrl : "",
      pageTitle: item.pageTitle ? item.pageTitle : "",
      referrer: item.referrer ? item.referrer : "",
      elementText: item.elementText ? item.elementText : "",
      elementClasses: item.elementClasses ? item.elementClasses : "",
      userEmail: item.userEmail ? item.userEmail : "",
      extensionVersion: item.extensionVersion ? item.extensionVersion : "",
    };
  });

  try {
    const response = await fetch(API_BASE + "/actions/add-bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ actions: actionsToSend }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Batch send successful:", result);

    // Удаляем отправленные действия из очереди
    actionQueue = remainingActions;

    // Сохраняем обновленную очередь
    saveQueue();

    // Если в очереди еще есть действия, планируем следующую отправку
    if (actionQueue.length > 0) {
      setTimeout(processQueue, 1000);
    }
  } catch (error) {
    console.error("Error sending batch:", error);

    // В случае ошибки оставляем действия в очереди для повторной попытки
    // Увеличиваем интервал перед следующей попыткой (экспоненциальная задержка)
    setTimeout(processQueue, 30000); // Повторная попытка через 30 секунд
  }
}

// Попытка отправить все данные при закрытии/приостановке расширения
chrome.runtime.onSuspend.addListener(() => {
  console.log(
    "Extension is about to suspend. Trying to send all pending actions..."
  );

  if (actionQueue.length > 0) {
    // Используем синхронный XMLHttpRequest для отправки перед закрытием
    const userToken = getAuthTokenSync(); // Нужно реализовать синхронное получение токена

    const xhr = new XMLHttpRequest();
    xhr.open("POST", API_BASE + "/actions/add-bulk", false); // Синхронный запрос
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Authorization", `Bearer ${userToken}`);
    xhr.send(JSON.stringify({ actions: actionQueue }));

    if (xhr.status === 200) {
      console.log("All pending actions sent successfully before suspend");
      // Очищаем очередь
      actionQueue = [];
      chrome.storage.local.remove("actionQueue");
    } else {
      console.error("Failed to send all actions before suspend:", xhr.status);
      // Сохраняем очередь для следующего запуска
      saveQueue();
    }
  }
});

// Слушатель сообщений от content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "BID_PLACED") {
    console.log("Received action from content script:", message.data);

    // Добавляем действие в очередь
    addToQueue(message.data);

    sendResponse({ status: "queued" });
  }
  return true;
});

//#endregion
