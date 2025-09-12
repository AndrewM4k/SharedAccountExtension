// if (
//   window.location.href.includes("copart.com/ru/login") ||
//   window.location.href.includes("copart.com/en/login")
// ) {
//   console.log("script started");
//   chrome.runtime.sendMessage({ type: "GET_COPART_CREDS" }, (creds) => {
//     document.querySelector("#username").value = creds.login;
//     document.querySelector("#password").value = creds.password;
//     document.querySelector("#sign_in").click();
//   });
// }
// // Отслеживание покупок
// document.addEventListener("click", (e) => {
//   if (e.target.closest(".bid-btn")) {
//     const lot = document.querySelector(".lot-number").innerText;
//     chrome.runtime.sendMessage({
//       type: "RECORD_ACTION",
//       actionType: "BID",
//       lotNumber: lot,
//       details: { price: document.querySelector(".bid-price").value },
//     });
//   }
// });

// // chrome.runtime.onMessage.addListener((request) => {
// //   if (request.action === 'fillCredentials') {
// //     document.querySelector('input[name="login"]').value = request.login;
// //     document.querySelector('input[name="password"]').value = request.password;
// //   }
// // });

// chrome.runtime.onMessage.addListener((message) => {
//   if (message.type === "FILL_COPART_CREDS") {
//     const usernameInput = document.querySelector("#username");
//     const passwordInput = document.querySelector("#password");

//     if (usernameInput && passwordInput) {
//       usernameInput.value = message.login;
//       passwordInput.value = message.password;
//       document.querySelector("#sign_in").click();
//     }
//   }
// });
// contentScript.js
let trackingEnabled = false;

// Обработчик сообщений от background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startTracking") {
    console.log("startTracking");
    enableTracking();
    sendResponse({ success: true });
  }
});

function enableTracking() {
  if (trackingEnabled) return;
  trackingEnabled = true;

  console.log("Активация отслеживания на Copart");

  // Начинаем наблюдение за изменениями на странице
  const observer = new MutationObserver(checkForBids);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });

  // Также проверяем периодически
  setInterval(checkForBids, 3000);
}

function checkForBids() {
  // Ищем элементы, связанные со ставками
  const bidButtons = document.querySelectorAll('[class*="bid"], [id*="bid"]');

  bidButtons.forEach((button) => {
    if (!button.hasAttribute("data-tracked")) {
      button.setAttribute("data-tracked", "true");
      button.addEventListener("click", trackBid);
    }
  });
}

async function trackBid(event) {
  // Получаем данные о лоте
  const lotData = extractLotData();

  if (!lotData) return;

  // Получаем информацию о пользователе
  const userInfo = await getUserInfo();

  // Формируем данные для отправки
  const bidData = {
    userId: userInfo.id,
    userEmail: userInfo.email,
    lotNumber: lotData.lotNumber,
    lotName: lotData.lotName,
    bidAmount: lotData.bidAmount,
    bidTime: new Date().toISOString(),
    pageUrl: window.location.href,
  };

  console.log("Отслежена ставка:", bidData);

  // Отправляем данные в background script
  chrome.runtime.sendMessage({
    action: "trackBid",
    data: bidData,
  });
}

function extractLotData() {
  // Парсим страницу для извлечения данных о лоте
  // Эти селекторы可能需要 адаптировать под актуальную структуру сайта Copart
  const lotNumberElem = document.querySelector('[data-uname="lotNumber"]');
  const lotNameElem = document.querySelector("h1");
  const bidAmountElem = document.querySelector('[data-uname="currentBid"]');

  if (!lotNumberElem) return null;

  return {
    lotNumber: lotNumberElem.textContent.trim(),
    lotName: lotNameElem ? lotNameElem.textContent.trim() : "Неизвестно",
    bidAmount: bidAmountElem ? bidAmountElem.textContent.trim() : "Неизвестно",
  };
}

async function getUserInfo() {
  // Получаем информацию о пользователе из storage
  const { user } = await chrome.storage.local.get("user");
  return user || { id: "unknown", email: "unknown" };
}

class ActionTracker {
  constructor() {
    this.isTracking = false;
    this.observer = null;
    this.init();
  }

  init() {
    // Слушаем сообщения от background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "startTracking") {
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

    // Проверяем статус трекинга при загрузке
    chrome.runtime.sendMessage({ action: "getTrackingStatus" }, (response) => {
      if (response && response.isTracking) {
        this.startTracking();
      }
    });
  }

  startTracking() {
    if (this.isTracking) return;

    this.isTracking = true;
    console.log("Tracking started");

    // Начинаем отслеживание действий
    this.trackBidActions();
    this.trackPageViews();
    this.trackNavigation();
  }

  stopTracking() {
    if (!this.isTracking) return;

    this.isTracking = false;
    console.log("Tracking stopped");

    // Останавливаем отслеживание
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Удаляем все обработчики событий
    this.removeEventListeners();
  }

  trackBidActions() {
    // Отслеживание кнопок ставок
    const bidButtons = document.querySelectorAll(
      '[data-uname="bidButton"], .bid-button, [class*="bid"]'
    );

    bidButtons.forEach((button) => {
      button.addEventListener("click", this.handleBidClick.bind(this));
    });

    // Наблюдатель для динамически добавляемых кнопок
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              // Element node
              const newBidButtons = node.querySelectorAll
                ? node.querySelectorAll(
                    '[data-uname="bidButton"], .bid-button, [class*="bid"]'
                  )
                : [];

              newBidButtons.forEach((button) => {
                button.addEventListener(
                  "click",
                  this.handleBidClick.bind(this)
                );
              });
            }
          });
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  trackPageViews() {
    // Отслеживание просмотров страниц
    this.trackPageView();

    // Также отслеживаем изменения URL (для SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        this.trackPageView();
      }
    }).observe(document, { subtree: true, childList: true });
  }

  trackNavigation() {
    // Отслеживание навигации
    window.addEventListener("beforeunload", this.handlePageUnload.bind(this));
  }

  handleBidClick(event) {
    const button = event.target.closest("button");
    if (!button) return;

    // Получаем информацию о лоте
    const lotData = this.extractLotData();
    const bidData = this.extractBidData(button);

    // Формируем данные события
    const eventData = {
      type: "BID_ACTION",
      action: "BID_CLICK",
      timestamp: new Date().toISOString(),
      lotNumber: lotData.lotNumber,
      lotName: lotData.lotName,
      bidAmount: bidData.bidAmount,
      userBidAmount: bidData.userBidAmount,
      pageUrl: window.location.href,
      elementText: button.textContent.trim(),
      elementClasses: button.className,
    };

    // Отправляем данные в background script
    chrome.runtime.sendMessage({
      action: "trackEvent",
      data: eventData,
    });
  }

  trackPageView() {
    const eventData = {
      type: "PAGE_VIEW",
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href,
      pageTitle: document.title,
      referrer: document.referrer,
    };

    chrome.runtime.sendMessage({
      action: "trackEvent",
      data: eventData,
    });
  }

  handlePageUnload() {
    const eventData = {
      type: "PAGE_UNLOAD",
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href,
    };

    // Используем sendBeacon для надежной отправки при закрытии страницы
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(eventData)], {
        type: "application/json",
      });
      navigator.sendBeacon("https://your-backend.com/api/events", blob);
    } else {
      chrome.runtime.sendMessage({
        action: "trackEvent",
        data: eventData,
      });
    }
  }

  extractLotData() {
    // Извлекаем данные о лоте (адаптируйте под структуру Copart)
    const lotNumberElem = document.querySelector('[data-uname="lotNumber"]');
    const lotNameElem = document.querySelector("h1");

    return {
      lotNumber: lotNumberElem ? lotNumberElem.textContent.trim() : "Unknown",
      lotName: lotNameElem ? lotNameElem.textContent.trim() : "Unknown",
    };
  }

  extractBidData(button) {
    // Извлекаем данные о ставке
    const bidAmountElem = document.querySelector('[data-uname="currentBid"]');
    const userBidInput = document.querySelector(
      'input[type="number"], input[name="bidAmount"]'
    );

    return {
      bidAmount: bidAmountElem ? bidAmountElem.textContent.trim() : "Unknown",
      userBidAmount: userBidInput ? userBidInput.value : "Unknown",
    };
  }

  removeEventListeners() {
    // Удаляем все обработчики событий
    const bidButtons = document.querySelectorAll(
      '[data-uname="bidButton"], .bid-button, [class*="bid"]'
    );
    bidButtons.forEach((button) => {
      button.removeEventListener("click", this.handleBidClick);
    });

    window.removeEventListener("beforeunload", this.handlePageUnload);
  }
}

// Инициализация трекера
new ActionTracker();
