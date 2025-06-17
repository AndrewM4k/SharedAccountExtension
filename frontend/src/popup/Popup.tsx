import { useState } from 'react';
import axios from 'axios';
import { createRoot } from 'react-dom/client';
import './Popup.css';
import Alert from '../alert/Alert';
import * as helpers from '.././helpers';
import { jwtDecode } from 'jwt-decode';
import * as apiService from '.././apiService';

const Popup = () => {
  let token = helpers.getCookie('accessToken');
  let role = getRoleByToken(token);
  let lastRequestTime = Date.now();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(
    token ? token != '' : false
  );
  const [error, setError] = useState<String | null>(null);
  const [isAdmin, setIsAdmin] = useState(role == 'Admin');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Защита от частых запросов (не чаще 1 раза в 2 секунды)
    const now = Date.now();
    if (now - lastRequestTime < 500) return;
    lastRequestTime = now;

    // Сбрасываем предыдущие ошибки
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiService.login(username, password);

      // Обрабатываем разные статусы ответа
      if (res.status === 200) {
        // Успешный вход
        const date = new Date(Date.now() + 31536000e3).toUTCString();
        document.cookie =
          encodeURIComponent('accessToken') +
          '=' +
          encodeURIComponent(res.data.token) +
          '; expires=' +
          date;

        document.cookie =
          encodeURIComponent('username') +
          '=' +
          encodeURIComponent(username) +
          '; expires=' +
          date;

        const userRole = getRoleByToken(res.data.token);

        setIsAdmin(userRole === 'Admin');
        setIsLoggedIn(true);
      } else if (res.status === 401) {
        setError('Неверное имя пользователя или пароль');
        setIsLoggedIn(false);
      } else if (res.status === 400) {
        setError('Некорректный запрос: ' + (res.data.message || ''));
        setIsLoggedIn(false);
      } else {
        setError(`Ошибка сервера: ${res.status} - ${res.statusText}`);
        setIsLoggedIn(false);
      }
    } catch (err) {
      // Обрабатываем сетевые ошибки и исключения
      if (axios.isAxiosError(err)) {
        setError(`Сетевая ошибка: ${err.message}`);
      } else {
        setError('Неизвестная ошибка при входе');
        console.error('Login error:', err);
      }
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const openAdminPanel = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('admin.html') });
  };

  const logOut = () => {
    const date = Date.now();
    document.cookie =
      encodeURIComponent('accessToken') +
      '=' +
      encodeURIComponent('') +
      '; expires=' +
      date;

    document.cookie =
      encodeURIComponent('username') +
      '=' +
      encodeURIComponent('') +
      '; expires=' +
      date;

    setIsLoggedIn(false);
  };

  function getRoleByToken(token: string) {
    if (token) {
      try {
        const payload = jwtDecode(token) as { [key: string]: any };
        const roleValue =
          payload[
            'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
          ];
        if (payload && roleValue) {
          return roleValue;
        } else {
          return undefined;
        }
      } catch (error) {
        console.log('Ошибка при расшифровке токена:', error);
        //  Обработать ошибку, например, перенаправить на страницу входа
      }
    } else {
      // Токен не найден, перенаправить на страницу входа
      console.log('Токен не найден');
    }
  }

  return (
    <div className="popup-container">
      <div className="popup-header"> Вход в Shared Account</div>
      {isLoggedIn ? (
        <div className="logged-container">
          <div className="logged-text">выполнен успешно</div>

          <div className="logged-btn">
            {isAdmin && (
              <button
                type="button"
                onClick={openAdminPanel}
                className="btn btn-primary"
              >
                Данные пользователей
              </button>
            )}
          </div>

          <div className="logged-btn">
            <button
              type="button"
              onClick={logOut}
              className="btn btn-outline-secondary"
            >
              Выйти
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleLogin}>
          <div className="input-group mb-3">
            {/* <label className="label" htmlFor="username">
              Имя пользователя:
            </label> */}

            <input
              className="form-control input"
              id="username"
              aria-label="Имя пользователя"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="input-group mb-3">
            {/* <label className="label" htmlFor="password">
              Пароль:
            </label> */}
            <input
              className="form-control input"
              id="password"
              type="password"
              aria-label="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Блок отображения ошибок */}
          {error && <Alert>{error}</Alert>}

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);
