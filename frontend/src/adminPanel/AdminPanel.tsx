import { useEffect, useState } from 'react';
import * as apiService from '.././apiService';
import { createRoot } from 'react-dom/client';
import './AdminPanel.css';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'User',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('getting users');
    fetchUsers();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1. Проверяем, есть ли access token
        const accessTokenResponse = await apiService.check();

        if (accessTokenResponse.status !== 200) {
          // 2. Если access token невалиден, пробуем обновить токены
          // const refreshResponse = await fetch(
          //   'https://localhost:5001/api/auth/refresh-token',
          //   {
          //     method: 'POST',
          //     credentials: 'include',
          //   }
          // )
          const refreshResponse = await apiService.refreshToken();

          if (refreshResponse.status !== 200) {
            throw new Error('Refresh failed');
          }

          // 3. Повторно проверяем после обновления
          const recheckResponse = await apiService.check();

          if (recheckResponse.status !== 200) {
            throw new Error('Still not authenticated after refresh');
          }
        }

        // 4. Проверяем роль пользователя
        const userResponse = await apiService.me();
        if (userResponse.data.role != '0') {
          throw new Error('Access denied');
        }

        // 5. Загружаем пользователей
        fetchUsers();
      } catch (error) {
        console.error('Authentication check failed:', error);
        //window.location.href = chrome.runtime.getURL('popup.html');
      }
    };

    checkAuth();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // 1. Проверяем основной статус
      const checkResponse = await apiService.check();

      if (checkResponse.status === 200) {
        // 2. Получаем информацию о пользователе
        await apiService.me();
        return;
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
          console.log('recheckResponse.status: ', recheckResponse.status);

          if (recheckResponse.status === 200) {
            const userResponse = await apiService.me();
            console.log('who is: ', userResponse);
            return;
          }
        }
      } catch (refreshError) {
        console.log('Refresh token failed:', refreshError);
      }
    }
    // Если все проверки не прошли
  };

  const fetchUsers = async () => {

    try{
      await apiService.check();
    }
    catch(error){
      console.error('check failed: ', error);
      const refreshResponse = await apiService.refreshToken();
      if(refreshResponse.status === 200 )
        console.error('refresh token succeed');
      else
        console.error('refresh token failed');
    }
    try {
      const response = await apiService.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };


  const createUser = async () => {
    console.log("newUser: ", newUser);

    const response = await apiService.registerUser(newUser);

    if (response.status === 200)  {
      setNewUser({ username: '', password: '', role: 'User' });
      fetchUsers();
    } else {
      checkAuthStatus();
      setError(await response.data);
    }
  };

  const deleteUser = async (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить пользователя?')) {
      await fetch(`https://localhost:5001/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      fetchUsers();
    }
  };

  const refreshPassword = async (id: number) => {
    {
      var refreshPassword = {
        username: '',
        newPassword: '',
      };

      await fetch(`https://localhost:5001/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(refreshPassword),
      });
      fetchUsers();
    }
  };
  return (
    <div className="admin-container">
      <h1>Менеджмент пользователей</h1>

      <div className="create-user-form">
        <h2 className="ms-1 me-1">Новый пользователь</h2>
        <div className="user-form-container">
          <input
            className="form-control ms-1 me-1"
            type="text"
            placeholder="Имя пользователя"
            value={newUser.username}
            onChange={(e) =>
              setNewUser({ ...newUser, username: e.target.value })
            }
          />
          <input
            className="form-control ms-1 me-1"
            type="password"
            placeholder="Пароль"
            value={newUser.password}
            onChange={(e) =>
              setNewUser({ ...newUser, password: e.target.value })
            }
          />
          <select
            className="form-select ms-1 me-1"
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            <option value="User">Пользователь</option>
            <option value="Admin">Администратор</option>
          </select>
        </div>
        <button className="btn btn-primary ms-1 me-1 mt-2" onClick={createUser}>
          Создать нового пользователя
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <table className="table m-3">
        <thead className="thead-light">
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Имя пользователя</th>
            {/* <th scope="col">Password</th> */}
            <th scope="col">Роль</th>
            <th scope="col">Действия</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user: any) => (
            <tr key={user.id}>
              <td width="10px">{user.id}</td>
              <td width="30%">{user.username}</td>
              <td width="20%">{user.role == '0' ? 'Admin' : 'User'}</td>
              <td width="40%">
                <button
                  className="btn btn-primary m-1"
                  onClick={() => deleteUser(user.id)}
                >
                  Удалить
                </button>

                {/* <button
                  className="btn btn-primary m-1"
                  onClick={() => refreshPassword(user.id)}
                >
                  Refresh Password
                </button> */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminPanel;

const root = createRoot(document.getElementById('root')!);
root.render(<AdminPanel />);
