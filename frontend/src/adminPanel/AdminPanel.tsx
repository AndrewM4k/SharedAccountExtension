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
    console.log('Start');
    fetchUsers();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1. Проверяем, есть ли access token
        const accessTokenResponse = await apiService.check();

        if (accessTokenResponse.status !== 200) {
          // 2. Если access token невалиден, пробуем обновить токены
          const refreshResponse = await fetch(
            'https://localhost:5001/api/auth/refresh-token',
            {
              method: 'POST',
              credentials: 'include',
            }
          );

          if (!refreshResponse.ok) {
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
        const userResponse = await apiService.me();

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
    try {
      const response = await apiService.getUsers('/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const createUser = async () => {
    const response = await fetch(
      'https://localhost:5001/api/admin/users/register',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newUser),
      }
    );

    if (response.ok) {
      setNewUser({ username: '', password: '', role: 'User' });
      fetchUsers();
    } else {
      checkAuthStatus();
      setError(await response.text());
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
        newPAssword: '',
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
      <h1>User Management</h1>

      <div className="create-user-form">
        <h2 className="ms-1 me-1">Create New User</h2>
        <div className="user-form-container">
          <input
            className="form-control ms-1 me-1"
            type="text"
            placeholder="Username"
            value={newUser.username}
            onChange={(e) =>
              setNewUser({ ...newUser, username: e.target.value })
            }
          />
          <input
            className="form-control ms-1 me-1"
            type="password"
            placeholder="Password"
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
            <option value="User">User</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
        <button className="btn btn-primary ms-1 me-1 mt-1" onClick={createUser}>
          Create User
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <table className="table m-3">
        <thead className="thead-light">
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Username</th>
            {/* <th scope="col">Password</th> */}
            <th scope="col">Role</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user: any) => (
            <tr key={user.id}>
              <td width="10px">{user.id}</td>
              <td width="30%">{user.username}</td>
              {/* <td width="10px">{user.username}</td> */}
              <td width="20%">{user.role == '0' ? 'Admin' : 'User'}</td>
              <td width="40%">
                <button
                  className="btn btn-primary m-1"
                  onClick={() => deleteUser(user.id)}
                >
                  Delete
                </button>

                <button
                  className="btn btn-primary m-1"
                  onClick={() => refreshPassword(user.id)}
                >
                  Refresh Password
                </button>
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
