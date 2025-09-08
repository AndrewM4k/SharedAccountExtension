export class AuthService {
  constructor() {
    this.copartCredentials = {
      login: "331271", // Заменить на реальные данные
      password: "Kentucky$9598",
    };
  }

  async authOnCopart() {
    try {
      console.log("https://www.copart.com/login/");
      // Выполняем авторизацию на Copart
      const authUrl = "https://www.copart.com/login/";

      const response = await fetch(authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `username=${this.copartCredentials.login}&password=${this.copartCredentials.password}`,
      });

      if (response.ok) {
        // Сохраняем куки для дальнейшего использования
        const cookies = await chrome.cookies.getAll({ domain: ".copart.com" });
        await chrome.storage.local.set({ copartCookies: cookies });

        console.log("Успешная авторизация на Copart");
        return true;
      } else {
        console.error("Ошибка авторизации на Copart");
        return false;
      }
    } catch (error) {
      console.error("Ошибка при авторизации на Copart:", error);
      return false;
    }
  }
}

// Делаем класс доступным глобально для importScripts
window.AuthService = AuthService;
