import axios from 'axios';

const api = axios.create({
  baseURL: 'https://localhost:5001/api',
  withCredentials: true,
});

// Перехватчик для автоматического обновления токенов
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Если ошибка 401 и это не запрос обновления токена
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Пытаемся обновить токены
        await axios.post(
          'https://localhost:5001/api/auth/refresh-token',
          {},
          { withCredentials: true }
        );

        // Повторяем исходный запрос
        return api(originalRequest);
      } catch (refreshError) {
        console.log('refreshError: ', refreshError);

        // Если обновление не удалось - перенаправляем на логин
        //window.location.href = chrome.runtime.getURL('popup.html');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
