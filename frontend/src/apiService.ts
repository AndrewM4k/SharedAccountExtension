import axios from 'axios';
const API_BASE = 'https://localhost:5001/api';

export const login = (username: string, password: string) => {
  return axios.post(
    `${API_BASE}/auth/login`,
    { email: username, password: password }, // Используем username вместо email
    {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
      //validateStatus: (status) => status < 500, // Не бросать ошибку для 4xx
    }
  );
};

export const logout = () => {
  return axios.post(
    `${API_BASE}/auth/logout`,
    {
      withCredentials: true,
    }
  );
};

export const сopartAuth = () => {
  return axios.post(
    `${API_BASE}/CopartAuth/auth`,
    {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};

export const me = () => {
  return axios.get(`${API_BASE}/auth/me`, {
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const check = () => {
  return axios.get(`${API_BASE}/auth/check`, {
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const refreshToken = () => {
  return axios.post(`${API_BASE}/auth/refresh-token`, {
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export function getUsers() {
  return axios.get(`${API_BASE}/admin/users`, {
    headers: { 'Content-Type': 'application/json' },
  });
}

export function registerUser(newUser: any) {
  return axios.post(
    `${API_BASE}/admin/users/register`, 
    { role: newUser.role, password: newUser.password, username: newUser.username },
    {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
}

export function deleteUser(userId: any) {
  return axios.delete(
    `${API_BASE}/admin/users/${userId}`);
}

