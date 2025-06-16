import { useState } from 'react';
import axios from 'axios';
import { createRoot } from 'react-dom/client';
import './Popup.css';
import Alert from '../alert/Alert';

const Popup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<String | null>(null);

  let lastRequestTime = Date.now();

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
      const res = await axios.post(
        'http://localhost:5000/api/auth/login',
        { email: username, password: password }, // Используем username вместо email
        {
          headers: {
            'Content-Type': 'application/json',
          },
          validateStatus: (status) => status < 500, // Не бросать ошибку для 4xx
        }
      );

      // Обрабатываем разные статусы ответа
      if (res.status === 200) {
        // Успешный вход
        localStorage.setItem('token', res.data.token);
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
  return (
    <div className="popup-container">
      <div className="popup-header"> Вход в Shared Account</div>
      {isLoggedIn ? (
        <div> </div>
      ) : (
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="label" htmlFor="username">
              Имя пользователя:
            </label>
            <input
              className="input"
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <label className="label" htmlFor="password">
              Пароль:
            </label>
            <input
              className="input"
              id="password"
              type="password"
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
