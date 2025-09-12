import { useState } from 'react';
import axios from 'axios';
import { createRoot } from 'react-dom/client';
import './Popup.css';
import Alert from '../alert/Alert';
import React from 'react';
import * as apiService from '.././apiService';
import { HttpError } from '@microsoft/signalr';

const Popup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<Boolean | null>(null);
  const [error, setError] = useState<String | null>(null);
  const [userRole, setUserRole] = useState('');

  React.useEffect(()=>{
    if(isAuthorized != null && !isAuthorized){
      console.log("Start auth");
      chrome.runtime.sendMessage({ 
      action: 'authOnCopart' 
      });
    }
  },[isAuthorized])

  const checkAuthStatus = async () => {
    try {
      // 1. Проверяем основной статус
      const checkResponse = await apiService.check();

      if (checkResponse.status === 200) {
        // 2. Получаем информацию о пользователе
        const userResponse = await apiService.me();

        setIsAuthorized(true);
        setIsLoggedIn(true);
        setUserRole(userResponse.data.role);
        setUsername(userResponse.data.username);
        return userResponse.data.role;
      }
    } catch (error) {
      console.log('Check failed');
      // 3. Если ошибка, пробуем обновить токены
      try {
        // Пытаемся обновить токены
        const refreshResponse = await apiService.refreshToken();

        if (refreshResponse.status === 200) {
          // Повторяем проверку после обновления
          const recheckResponse = await apiService.check();
          console.log('стату собновленяи токенов: ', recheckResponse.status);

          if (recheckResponse.status === 200) {
            const userResponse = await apiService.me();

            setIsLoggedIn(true);
            setUserRole(userResponse.data.role);
            setUsername(userResponse.data.username);
            return;
          }
        }
      } catch (refreshError) {
        console.log('Refresh token failed:', refreshError);
      }
    }
    
    // Если все проверки не прошли
    setIsLoggedIn(false);
    setUserRole('');
    console.log("logOut");
    chrome.runtime.sendMessage({ 
      action: 'logoutOnCopart' 
    });   
  };

  React.useEffect(() => {
    setIsLoading(true);
    if(!isLoggedIn){ checkAuthStatus();}
    setIsLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await apiService.login(username, password);

      if (response.status === 200) {
        setIsAuthorized(false);
        // Получаем информацию о пользователе и устанавливаем ее
        try {
          showStatus('Выполняется авторизация...');
          
          // Просто отправляем запрос в background script
          const response = await chrome.runtime.sendMessage({
              action: 'authAndSetCookies'
          });
          
          if (response && response.success) {
              showStatus('Авторизация успешна!');
              
              // Перенаправляем на Copart
              setTimeout(() => {
                  chrome.tabs.create({ url: 'https://www.copart.com' });
                  window.close();
              }, 1000);
          } else {
              showStatus('Ошибка: ' + (response?.error || 'Неизвестная ошибка'));
          }
        } catch (error:any) {
            console.error('Ошибка:', error);
            showStatus('Ошибка: ' + error.message);
        }
      checkAuthStatus();
      }
    } catch (err: any) {
      console.error('Full login error:', err);

      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Неверное имя пользователя или пароль');
        } else {
          setError(
            `Ошибка сервера: ${err.response?.status} - ${err.response?.statusText}`
          );
        }
      } else {
        setError('Неизвестная ошибка при входе');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для отображения статуса
  function showStatus(message: String) {
    //document.getElementById('status').textContent = message;
    console.log("message: ", message);
  }

  const handleLogout = async () => {
    try {
      await axios.post(
        'https://localhost:5001/api/auth/logout',
        {},
        { withCredentials: true }
      );
      
      console.log("logOut");
      chrome.runtime.sendMessage({ 
        action: 'clearCookies' 
      }); 
      setIsLoggedIn(false);
      setUserRole('');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const openAdminPanel = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('admin.html') });
  };

  if (isLoading) {
    return (
      <div className="popup-container">
        <div className="popup-text">Проверка авторизации...</div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <div className="popup-header"> Вход в Shared Account</div>
      {isLoggedIn ? (
        <div className="popup-container">
          <div className="popup-text">
            Вы вошли как: <strong>{username}</strong>
            <br />
            Роль:{' '}
            <strong>
              {userRole == '0' ? 'Администратор' : 'Пользователь'}
            </strong>
          </div>

          {userRole == '0' && (
            <button onClick={openAdminPanel} className="btn btn-primary">
              Панель администратора
            </button>
          )}

          <div className="logged-btn">
            <button
              onClick={handleLogout}
              className="btn btn-outline-secondary"
            >
              Выйти
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleLogin}>
          <div className="input-group mb-3">
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
