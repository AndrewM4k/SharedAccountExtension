import axios from 'axios';
const API_BASE = 'http://localhost:5000/api';

export const login = (username: string, password: string) => {
  return axios.post(
    `${API_BASE}/auth/login`,
    { email: username, password: password }, // Используем username вместо email
    {
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: (status) => status < 500, // Не бросать ошибку для 4xx
    }
  );
};

export const getUsers = (token: string) => {
  return axios.get(`${API_BASE}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
