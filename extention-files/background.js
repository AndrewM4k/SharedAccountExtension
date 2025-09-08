// chrome.omnibox.onInputEntered.addListener(() => {
//   chrome.tabs.create({ url: chrome.runtime.getURL('src/admin/admin.html') });
// });

// chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//   if (msg.type === 'GET_COPART_CREDS') {
//     // Запрос к вашему бэкенду
//     fetch('http://localhost:5000/api/sharedaccount')
//       .then((res) => res.json())
//       .then((creds) => sendResponse(creds));
//     return true;
//   }

//   if (msg.type === 'RECORD_ACTION') {
//     // Отправка действия на сервер
//     fetch('http://localhost:5000/api/action/record', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: 'Bearer ' + getCookie('token'),
//       },
//       body: JSON.stringify(msg),
//     });
//   }
// });

// export function getCookie(name) {
//   //const matches = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1")}=([^;]*)`));
//   const matches = document.cookie.match(
//     new RegExp(
//       `(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1')}=([^;]*)`
//     )
//   );
//   return matches ? decodeURIComponent(matches[1]) : '';
// }
// background.js

async function authOnCopart() {
  try {
    // Выполняем авторизацию на Copart
    const authUrl = "https://www.copart.com/login/";

    const copartCredentials = {
      login: "331271", // Заменить на запрос
      password: "Kentucky$9598",
    };

    const tab = await chrome.tabs.create({
      url: "https://www.copart.com/login/",
      active: false, // Открываем в фоне
    });

    // Ждем, пока вкладка загрузится
    await new Promise((resolve) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      });
    });

    // Вводим данные и отправляем форму
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (login, password) => {
        // Ищем форму и вводим данные
        const usernameField = document.querySelector('input[name="username"]');
        const passwordField = document.querySelector('input[name="password"]');
        const submitButton = document.querySelector('button[type="submit"]');

        if (usernameField && passwordField && submitButton) {
          usernameField.value = copartCredentials.login;
          passwordField.value = copartCredentials.password;
          submitButton.click();
        } else {
          throw new Error("Не найдены поля формы авторизации");
        }
      },
      args: [copartCredentials.login, copartCredentials.password],
    });

    // Ждем, пока вкладка перейдет на другую страницу (успешная авторизация)
    await new Promise((resolve) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      });
    });

    // Закрываем вкладку
    chrome.tabs.remove(tab.id);

    sendResponse({ success: true });
    // const response = await fetch(authUrl, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/x-www-form-urlencoded",
    //   },
    //   body: `username=${copartCredentials.login}&password=${copartCredentials.password}`,
    // });

    // if (response.ok) {
    //   // Сохраняем куки для дальнейшего использования
    //   const cookies = await chrome.cookies.getAll({ domain: ".copart.com" });
    //   await chrome.storage.local.set({ copartCookies: cookies });

    //   console.log("Успешная авторизация на Copart");
    //   return true;
    // } else {
    //   console.error("Ошибка авторизации на Copart");
    //   return false;
    // }
  } catch (error) {
    console.error("Ошибка при авторизации на Copart:", error);
    return false;
  }
}

async function authOnCopartThroughTab() {
  const credentials = {
    login: "331271", // Заменить на запрос
    password: "Kentucky$9598",
  };

  return new Promise((resolve, reject) => {
    // Создаем новую вкладку для авторизации
    chrome.tabs.create(
      {
        url: "https://www.copart.com/login/",
        active: false,
      },
      async (tab) => {
        const tabId = tab.id;
        chrome.tabs.onUpdated.addListener(function listener(
          tabIdUpdated,
          info
        ) {
          if (tabIdUpdated === tabId && info.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            fallbackAuthMethod(tabId, credentials, resolve, reject);
          }
        });
      }
    );
  });
}

async function fallbackAuthMethod(tabId, credentials, resolve, reject) {
  try {
    // Вводим данные в форму
    console.log("Вводим данные в форму");
    const success = await chrome.scripting.executeScript({
      target: { tabId },
      func: (login, password) => {
        console.log("Начало выполнения скрипта");

        setTimeout(() => {
          // Ищем форму и вводим данные
          const usernameField = document.getElementById("username");
          const passwordField = document.getElementById("password");
          const submitButton = document.querySelector(
            'button[data-uname="loginSigninmemberbutton"]'
          );

          console.log(
            "Найденные элементы:",
            usernameField,
            passwordField,
            submitButton
          );

          if (usernameField && passwordField && submitButton) {
            usernameField.value = login;
            passwordField.value = password;

            // Создаем и запускаем событие 'input'
            const inputEvent = new Event("input", { bubbles: true });
            usernameField.dispatchEvent(inputEvent);
            passwordField.dispatchEvent(inputEvent);

            // Также можно отправить событие 'change'
            const changeEvent = new Event("change", { bubbles: true });
            usernameField.dispatchEvent(changeEvent);
            passwordField.dispatchEvent(changeEvent);

            submitButton.click();
            console.log("Форма отправлена");
          } else {
            throw new Error("Не найдены поля формы авторизации");
          }

          console.log("Поля заполнены и события отправлены");
        }, 2000);
      },
      args: [credentials.login, credentials.password],
    });

    if (success) {
      setTimeout(() => {
        console.log("удаляем вкладку");
        chrome.tabs.remove(tabId);
        resolve(true);
      }, 3000);
    } else {
      reject(new Error("Не удалось найти форму авторизации"));
    }
  } catch (error) {
    reject(error);
  }
}

// Функция ожидания загрузки вкладки
function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    const listener = (tabIdUpdated, changeInfo) => {
      if (tabIdUpdated === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Обработчик сообщений от popup
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "authOnCopart") {
    const success = await authOnCopartThroughTab();
    sendResponse({ success });

    if (success) {
      // После успешной авторизации на Copart, активируем отслеживание
      chrome.tabs.query({ url: "*://*.copart.com/*" }, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs.sendMessage(tab.id, { action: "startTracking" });
        });
      });
    }
  }
  if (request.action === "logoutOnCopart") {
    fetch("https://www.copart.com/doLogout.html")
      .then((response) => {
        if (!response.ok) {
          console.log("ошибка запроса");
        }
      })
      .then((data) => {
        console.log(data);
      })
      .catch((error) => {
        console.error("Ошибка при выполнении GET-запроса:", error);
      });
  }
});

// При обновлении вкладки проверяем, если это Copart и пользователь авторизован
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url.includes("copart.com")) {
    const { authToken } = await chrome.storage.local.get("authToken");

    if (authToken) {
      // Пользователь авторизован, активируем отслеживание
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action: "startTracking" });
      }, 2000);
    }
  }
});
