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

        tryingToLogInRecursive();
        let maxCountOfLogIn = 100;
        let countOfLogIn = 0;
        function tryingToLogInRecursive() {
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

            if (
              usernameField &&
              passwordField &&
              submitButton &&
              countOfLogIn <= maxCountOfLogIn
            ) {
              // Обезопашиваем форму ввода
              hidePasswordToggle();

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
              countOfLogIn++;
              console.log("Не загружена страница");
              console.log("countOfLogIn: ", countOfLogIn);
              tryingToLogInRecursive();
            }
            // Функция для скрытия кнопки показа пароля
            function hidePasswordToggle() {
              // Ищем все элементы, которые могут быть "глазиком"
              const selectors = [
                '[type="password"] + span',
                ".password-toggle",
                ".show-password",
                '[class*="eye"]',
                '[class*="visibility"]',
                'button[aria-label*="password"]',
                'button[title*="password"]',
              ];

              let passwordToggleFound = false;

              selectors.forEach((selector) => {
                const elements = document.querySelectorAll(selector);
                elements.forEach((element) => {
                  // Проверяем, находится ли элемент рядом с полем пароля
                  const passwordInput = element
                    .closest("form")
                    ?.querySelector('input[type="password"]');
                  if (passwordInput) {
                    element.style.display = "none";
                    element.style.visibility = "hidden";
                    element.style.opacity = "0";
                    element.setAttribute("data-hidden-by-extension", "true");
                    passwordToggleFound = true;
                    console.log("Скрыли элемент показа пароля:", element);
                  }
                });
              });

              // Дополнительная защита: делаем поле пароля readonly после заполнения
              const passwordInput = document.querySelector(
                'input[type="password"]'
              );
              if (passwordInput) {
                passwordInput.addEventListener("input", function () {
                  this.setAttribute("data-original-value", this.value);
                });

                // Запрещаем изменение пароля через интерфейс
                passwordInput.addEventListener("keydown", function (e) {
                  if (this.hasAttribute("data-original-value")) {
                    e.preventDefault();
                    this.value = this.getAttribute("data-original-value");
                  }
                });
              }

              return passwordToggleFound;
            }
          }, 100);
        }
      },
      args: [credentials.login, credentials.password],
    });

    if (success) {
      setTimeout(() => {
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

async function authThroughBackend() {
  try {
    // Запрашиваем авторизацию на Copart через наш бэкенд
    const response = await fetch("https://localhost:5001/api/CopartAuth/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const authData = await response.json();

      console.log("authData: ", authData);
      // Сохраняем полученные куки в браузер
      await setCookiesInBrowser(authData.cookies);

      // Сохраняем UserAgent для последующих запросов
      await chrome.storage.local.set({
        copartUserAgent: authData.userAgent,
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error("Ошибка авторизации через бэкенд:", error);
    return false;
  }
}

async function setCookiesInBrowser(cookies) {
  for (const [name, value] of Object.entries(cookies)) {
    await chrome.cookies.set({
      url: "https://www.copart.com/",
      name: name,
      value: value,
      domain: "www.copart.com",
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "no_restriction",
    });
  }
}

// Обработчик сообщений от popup
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "authOnCopart") {
    const success = await authThroughBackend();
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
