// ⚠️ DEPRECATED: This file is kept for reference only.
// The active source is contentScript.ts which gets compiled to dist/contentScript.js
// Edit contentScript.ts instead of this file.

// Функция для отправки сообщения в background script
// function sendBidDataToBackground(bidData) {
//   chrome.runtime.sendMessage(
//     {
//       type: "BID_PLACED",
//       data: bidData,
//     },
//     (response) => {
//       console.log("Response from background:", response);
//     }
//   );
// }

// // Слушаем клики по всей странице (делегирование событий)
// document.addEventListener("click", function (event) {
//   // 1. Определяем цель клика
//   const target = event.target;

//   console.log("Clicked: ", target);
//   // 2. Поиск кнопки ставки (ЭТО ПРИМЕР, НУЖНО УТОЧНИТЬ НА САЙТЕ!)
//   // Это самый сложный момент. Селектор нужно подобрать точно для кнопки на Copart.
//   // Это может быть id, класс, data-атрибут или текст кнопки.
//   // Пример: если кнопка имеет класс "bid-button"
//   if (target.closest(".bid-button")) {
//     // 3. Собираем данные (их тоже нужно извлечь со страницы)
//     const lotNumber =
//       document.querySelector(".lot-number")?.innerText || "unknown";
//     const bidAmount = document.querySelector(".bid-amount")?.value || "unknown";

//     const bidData = {
//       lotNumber: lotNumber,
//       bidAmount: bidAmount,
//       timestamp: new Date().toISOString(),
//       // userId будет добавлен в background.js из хранилища
//     };

//     console.log("Bid button clicked, data:", bidData);
//     sendBidDataToBackground(bidData);
//   }

//   if (
//     target.matches(
//       'a[aria-controls="serverSideDataTable_mylots"][data-dt-idx="0"]'
//     )
//   ) {
//     // 3. Собираем данные (их тоже нужно извлечь со страницы)

//     const bidData = {
//       actionType: "BID_ACTION",
//       action: "Click_Button",
//       lotNumber: "lotNumber",
//       bidAmount: "bidAmount",
//       pageUrl: "https://www.copart.com/",
//       timestamp: new Date().toISOString(),
//       details: "string",
//       lotName: "string",
//       userBidAmount: "string",
//       pageTitle: "string",
//       referrer: "string",
//       elementText: "string",
//       elementClasses: "string",
//       userEmail: "string",
//       extensionVersion: "string",
//     };

//     console.log("Bid button clicked, data:", bidData);
//     sendBidDataToBackground(bidData);
//   }

//   // Добавьте здесь другие условия для отслеживания других важных кнопок
//   // if (target.closest('.another-important-button')) { ... }
// });

// Также можно отслеживать изменения в полях ввода, формы и т.д.
console.log("Content script loaded and ready on Copart.");

// Функция для отправки сообщения в background script с повторными попытками
function sendActionToBackground(actionData, retries = 3) {
  chrome.runtime.sendMessage(
    {
      type: "BID_PLACED",
      data: actionData,
    },
    (response) => {
      if (chrome.runtime.lastError) {
        // Ошибка отправки сообщения
        console.error(
          "Error sending message to background:",
          chrome.runtime.lastError
        );

        if (retries > 0) {
          // Повторная попытка через 1 секунду
          setTimeout(
            () => sendActionToBackground(actionData, retries - 1),
            1000
          );
        } else {
          // Все попытки исчерпаны - сохраняем действие в локальное хранилище страницы
          saveActionToLocalStorage(actionData);
        }
      } else if (response && response.status === "queued") {
        console.log("Action queued successfully");
      }
    }
  );
}

// Функция для сохранения действия в локальное хранилище страницы
function saveActionToLocalStorage(actionData) {
  try {
    // Получаем текущие действия из localStorage
    const savedActions = JSON.parse(
      localStorage.getItem("pendingActions") || "[]"
    );

    // Добавляем новое действие
    savedActions.push(actionData);

    // Сохраняем обратно
    localStorage.setItem("pendingActions", JSON.stringify(savedActions));

    console.log(
      "Action saved to localStorage. Total pending:",
      savedActions.length
    );

    // Пытаемся отправить сохраненные действия при следующей загрузке страницы
    window.addEventListener("load", trySendSavedActions);
  } catch (error) {
    console.error("Error saving action to localStorage:", error);
  }
}

// Функция для отправки сохраненных действий при загрузке страницы
function trySendSavedActions() {
  try {
    const savedActions = JSON.parse(
      localStorage.getItem("pendingActions") || "[]"
    );

    if (savedActions.length > 0) {
      console.log(
        "Trying to send",
        savedActions.length,
        "saved actions from localStorage"
      );

      // Отправляем каждое действие
      savedActions.forEach((action) => {
        sendActionToBackground(action);
      });

      // Очищаем localStorage после успешной отправки
      localStorage.removeItem("pendingActions");
    }
  } catch (error) {
    console.error("Error processing saved actions:", error);
  }
}

// Инициализация - пытаемся отправить сохраненные действия при загрузке страницы
trySendSavedActions();

// Остальной код отслеживания действий на странице остается без изменений
document.addEventListener("click", function (event) {
  if (event.target.closest(".bid-button")) {
    const lotNumber =
      document.querySelector(".lot-number")?.innerText || "unknown";
    const bidAmount = document.querySelector(".bid-amount")?.value || "unknown";

    const actionData = {
      lotNumber: lotNumber,
      bidAmount: Number(bidAmount),
      timestamp: new Date().toISOString(),
      userId: "current-user-id", // Будет заменено в background script
    };
    sendActionToBackground(actionData);
  }

  if (
    event.target.matches(
      'a[aria-controls="serverSideDataTable_mylots"][data-dt-idx="0"]'
    )
  ) {
    // 3. Собираем данные (их тоже нужно извлечь со страницы)
    const actionData = {
      actionType: "Bid",
      lotNumber: "Test Lot",
      bidAmount: "0",
      pageUrl: "https://www.copart.com/",
      timestamp: new Date().toISOString(),
      commentary: "No comment",
      lotName: "test",
      userBidAmount: "0",
    };

    console.log("Bid button clicked, data:", actionData);
    sendActionToBackground(actionData);
  }
});
