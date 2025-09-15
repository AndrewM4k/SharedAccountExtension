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
//let trackingEnabled = false;

// Обработчик сообщений от background script
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "startTracking") {
//     console.log("startTracking");
//     enableTracking();
//     sendResponse({ success: true });
//   }
// });

// function enableTracking() {
//   if (trackingEnabled) return;
//   trackingEnabled = true;

//   console.log("Активация отслеживания на Copart");

//   // Начинаем наблюдение за изменениями на странице
//   const observer = new MutationObserver(checkForBids);
//   observer.observe(document.body, {
//     childList: true,
//     subtree: true,
//     attributes: true,
//     characterData: true,
//   });

//   // Также проверяем периодически
//   setInterval(checkForBids, 3000);
// }

// function checkForBids() {
//   // Ищем элементы, связанные со ставками
//   const bidButtons = document.querySelectorAll('[class*="bid"], [id*="bid"]');

//   bidButtons.forEach((button) => {
//     if (!button.hasAttribute("data-tracked")) {
//       button.setAttribute("data-tracked", "true");
//       button.addEventListener("click", trackBid);
//     }
//   });
// }

// async function trackBid(event) {
//   // Получаем данные о лоте
//   const lotData = extractLotData();

//   if (!lotData) return;

//   // Получаем информацию о пользователе
//   const userInfo = await getUserInfo();

//   // Формируем данные для отправки
//   const bidData = {
//     userId: userInfo.id,
//     userEmail: userInfo.email,
//     lotNumber: lotData.lotNumber,
//     lotName: lotData.lotName,
//     bidAmount: lotData.bidAmount,
//     bidTime: new Date().toISOString(),
//     pageUrl: window.location.href,
//   };

//   console.log("Отслежена ставка:", bidData);

//   // Отправляем данные в background script
//   chrome.runtime.sendMessage({
//     action: "trackBid",
//     data: bidData,
//   });
// }

// function extractLotData() {
//   // Парсим страницу для извлечения данных о лоте
//   // Эти селекторы可能需要 адаптировать под актуальную структуру сайта Copart
//   const lotNumberElem = document.querySelector('[data-uname="lotNumber"]');
//   const lotNameElem = document.querySelector("h1");
//   const bidAmountElem = document.querySelector('[data-uname="currentBid"]');

//   if (!lotNumberElem) return null;

//   return {
//     lotNumber: lotNumberElem.textContent.trim(),
//     lotName: lotNameElem ? lotNameElem.textContent.trim() : "Неизвестно",
//     bidAmount: bidAmountElem ? bidAmountElem.textContent.trim() : "Неизвестно",
//   };
// }

// async function getUserInfo() {
//   // Получаем информацию о пользователе из storage
//   const { user } = await chrome.storage.local.get("user");
//   return user || { id: "unknown", email: "unknown" };
// }

// contentScript.js

class ActionTracker {
  constructor() {
    this.isActive = true; // Всегда активно
    this.observer = null;
    this.init();
  }

  init() {
    console.log("ActionTracker initialized - tracking is always active");
    this.startTracking();

    // Слушаем сообщения (на будущее, если добавим управление)
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === "forceEventSend") {
        this.sendAllEvents();
      }
    });
  }

  startTracking() {
    if (!this.isActive) return;

    console.log("Starting to track user actions");
    this.trackBidActions();
    this.trackPageViews();
    this.trackNavigation();
    this.trackImportantClicks();
  }

  trackBidActions() {
    // Отслеживание кнопок ставок
    this.setupObserverForBidButtons();

    // Также отслеживаем существующие кнопки
    this.addListenersToExistingButtons();
  }

  setupObserverForBidButtons() {
    // Наблюдатель для динамически добавляемых кнопок
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          this.addListenersToNewButtons(mutation.addedNodes);
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  addListenersToExistingButtons() {
    const bidButtons = this.findBidButtons();
    bidButtons.forEach((button) => {
      button.addEventListener("click", this.handleBidClick.bind(this));
    });
  }

  addListenersToNewButtons(nodes) {
    nodes.forEach((node) => {
      if (node.nodeType === 1) {
        // Element node
        const newBidButtons = node.querySelectorAll
          ? this.findBidButtons(node)
          : [];

        newBidButtons.forEach((button) => {
          button.addEventListener("click", this.handleBidClick.bind(this));
        });
      }
    });
  }

  findBidButtons(root = document) {
    // Ищем кнопки ставок по различным селекторам
    // Базовые CSS-селекторы
    const baseSelectors = [
      '[data-uname="bidButton"]',
      ".bid-button",
      '[class*="bid"]',
      '[aria-label*="bid"]',
      '[aria-label*="ставка"]',
      '[data-testid*="bid"]',
      '[id*="bid"]',
    ];

    // Поиск по селекторам
    const buttons = root.querySelectorAll(baseSelectors.join(","));

    // Дополнительная фильтрация по тексту для кнопок без четких селекторов
    const allButtons = root.querySelectorAll("button");
    const textFilteredButtons = Array.from(allButtons).filter((button) => {
      const text = button.textContent.toLowerCase();
      return (
        text.includes("bid") ||
        text.includes("ставк") ||
        text.includes("place bid") ||
        text.includes("сделать ставку")
      );
    });

    // Объединение результатов
    return [...buttons, ...textFilteredButtons];
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

  trackImportantClicks() {
    // Отслеживание других важных кликов
    document.addEventListener(
      "click",
      this.handleImportantClick.bind(this),
      true
    );
  }

  handleBidClick(event) {
    if (!this.isActive) return;

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
    this.sendEventToBackground(eventData);
  }

  handleImportantClick(event) {
    if (!this.isActive) return;

    const target = event.target;
    const isImportant = this.isImportantClick(target);

    if (isImportant) {
      const eventData = {
        type: "IMPORTANT_CLICK",
        action: "CLICK",
        timestamp: new Date().toISOString(),
        pageUrl: window.location.href,
        elementTag: target.tagName,
        elementText: target.textContent.trim().substring(0, 100),
        elementClasses: target.className,
        elementId: target.id || "none",
      };

      this.sendEventToBackground(eventData);
    }
  }

  isImportantClick(element) {
    // Определяем, является ли клик важным
    const importantSelectors = [
      'a[href*="makeBid"]',
      'a[href*="bid"]',
      'a[href*="ставк"]',
      ".important-button",
      '[data-important="true"]',
      ".buy-now",
      ".place-bid",
      ".watchlist",
    ];

    return importantSelectors.some((selector) => element.matches(selector));
  }

  trackPageView() {
    const eventData = {
      type: "PAGE_VIEW",
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href,
      pageTitle: document.title,
      referrer: document.referrer,
    };

    this.sendEventToBackground(eventData);
  }

  handlePageUnload() {
    const eventData = {
      type: "PAGE_UNLOAD",
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href,
    };

    // Используем sendBeacon для надежной отправки при закрытии страницы
    if (navigator.sendBeacon) {
      console.log("Sending data...");
      const blob = new Blob([JSON.stringify(eventData)], {
        type: "application/json",
      });
      navigator.sendBeacon("https://localhost:5001/api/Actions", blob);
    } else {
      this.sendEventToBackground(eventData);
    }
  }

  sendEventToBackground(eventData) {
    chrome.runtime.sendMessage(
      {
        action: "trackEvent",
        data: eventData,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "Could not send event to background:",
            chrome.runtime.lastError
          );
        }
      }
    );
  }

  sendAllEvents() {
    // Метод для принудительной отправки всех событий
    // Пока не реализовано накопление событий, но можно добавить
    console.log("Force send events called");
  }

  extractLotData() {
    // Извлекаем данные о лоте (адаптируйте под структуру Copart)
    try {
      const lotNumberElem = document.querySelector('[data-uname="lotNumber"]');
      const lotNameElem = document.querySelector("h1");
      const vinElem = document.querySelector('[data-uname="lotVIN"]');

      return {
        lotNumber: lotNumberElem ? lotNumberElem.textContent.trim() : "Unknown",
        lotName: lotNameElem ? lotNameElem.textContent.trim() : "Unknown",
        vin: vinElem ? vinElem.textContent.trim() : "Unknown",
      };
    } catch (error) {
      console.error("Error extracting lot data:", error);
      return { lotNumber: "Error", lotName: "Error", vin: "Error" };
    }
  }

  extractBidData(button) {
    // Извлекаем данные о ставке
    try {
      const bidAmountElem = document.querySelector('[data-uname="currentBid"]');
      const userBidInput = document.querySelector(
        'input[type="number"], input[name="bidAmount"]'
      );

      return {
        bidAmount: bidAmountElem ? bidAmountElem.textContent.trim() : "Unknown",
        userBidAmount: userBidInput ? userBidInput.value : "Unknown",
      };
    } catch (error) {
      console.error("Error extracting bid data:", error);
      return { bidAmount: "Error", userBidAmount: "Error" };
    }
  }
}

// Инициализация трекера
new ActionTracker();
