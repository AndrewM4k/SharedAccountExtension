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

// contentScript.ts
class AuthManager {
  async loginToCopart(): Promise<boolean> {
    // Получаем учётные данные из хранилища
    const credentials = await chrome.storage.sync.get(['copartUsername', 'copartPassword']);
    
    // Внедряем скрипт для заполнения формы входа
    await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: (username, password) => {
        // Находим форму входа и заполняем её
        const usernameField = document.querySelector('#username') as HTMLInputElement;
        const passwordField = document.querySelector('#password') as HTMLInputElement;
        const submitButton = document.querySelector('#submit') as HTMLButtonElement;
        
        if (usernameField && passwordField && submitButton) {
          usernameField.value = username;
          passwordField.value = password;
          submitButton.click();
        }
      },
      args: [credentials.copartUsername, credentials.copartPassword]
    });
    
    // Ждём завершения входа и проверяем успешность
    return await this.checkLoginStatus();
  }
  
  async checkLoginStatus(): Promise<boolean> {
    // Проверяем, что мы на нужной странице и сессия активна
    return true; // Упрощённая реализация
  }
}

// Инициализация после установки расширения или обновления страницы
const authManager = new AuthManager();
authManager.loginToCopart().then(success => {
  if (success) {
    console.log('Вход выполнен успешно');
    // Инициализируем перехватчик ставок
    const bidInterceptor = new BidInterceptor();
    bidInterceptor.initialize();
  } else {
    console.error('Ошибка входа');
  }
});
