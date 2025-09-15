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

// Функция для отправки сообщения в background script

function sendBidDataToBackground(bidData) {
  chrome.runtime.sendMessage(
    {
      type: "BID_PLACED",
      data: bidData,
    },
    (response) => {
      console.log("Response from background:", response);
    }
  );
}

// Слушаем клики по всей странице (делегирование событий)
document.addEventListener("click", function (event) {
  // 1. Определяем цель клика
  const target = event.target;

  console.log("Clicked: ", target);
  // 2. Поиск кнопки ставки (ЭТО ПРИМЕР, НУЖНО УТОЧНИТЬ НА САЙТЕ!)
  // Это самый сложный момент. Селектор нужно подобрать точно для кнопки на Copart.
  // Это может быть id, класс, data-атрибут или текст кнопки.
  // Пример: если кнопка имеет класс "bid-button"
  if (target.closest(".bid-button")) {
    // 3. Собираем данные (их тоже нужно извлечь со страницы)
    const lotNumber =
      document.querySelector(".lot-number")?.innerText || "unknown";
    const bidAmount = document.querySelector(".bid-amount")?.value || "unknown";

    const bidData = {
      lotNumber: lotNumber,
      bidAmount: bidAmount,
      timestamp: new Date().toISOString(),
      // userId будет добавлен в background.js из хранилища
    };

    console.log("Bid button clicked, data:", bidData);
    sendBidDataToBackground(bidData);
  }

  if (
    target.matches(
      'a[aria-controls="serverSideDataTable_mylots"][data-dt-idx="0"]'
    )
  ) {
    // 3. Собираем данные (их тоже нужно извлечь со страницы)

    const bidData = {
      actionType: "BID_ACTION",
      action: "Click_Button",
      lotNumber: "lotNumber",
      bidAmount: "bidAmount",
      pageUrl: "https://www.copart.com/",
      timestamp: new Date().toISOString(),
      details: "string",
      lotName: "string",
      userBidAmount: "string",
      pageTitle: "string",
      referrer: "string",
      elementText: "string",
      elementClasses: "string",
      userEmail: "string",
      extensionVersion: "string",
    };

    console.log("Bid button clicked, data:", bidData);
    sendBidDataToBackground(bidData);
  }

  // Добавьте здесь другие условия для отслеживания других важных кнопок
  // if (target.closest('.another-important-button')) { ... }
});

// Также можно отслеживать изменения в полях ввода, формы и т.д.
console.log("Content script loaded and ready on Copart.");
