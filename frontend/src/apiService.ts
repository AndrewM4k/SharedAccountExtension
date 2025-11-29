import axios from 'axios';
import { config } from './config';

const API_BASE = config.apiBaseUrl;

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

export const copartAuth = () => {
  return axios.post(
    `${API_BASE}/copartAuth/auth`,
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

export interface GetActionsParams {
  page?: number;
  pageSize?: number;
  actionType?: string;
  search?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export function getActions(params?: GetActionsParams) {
  const queryParams = new URLSearchParams();
  
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.pageSize) {
    queryParams.append('pageSize', params.pageSize.toString());
  }
  if (params?.actionType) {
    queryParams.append('actionType', params.actionType);
  }
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  if (params?.userId) {
    queryParams.append('userId', params.userId);
  }
  if (params?.startDate) {
    queryParams.append('startDate', params.startDate);
  }
  if (params?.endDate) {
    queryParams.append('endDate', params.endDate);
  }

  const queryString = queryParams.toString();
  const url = queryString ? `${API_BASE}/actions?${queryString}` : `${API_BASE}/actions`;

  return axios.get(url, {
    withCredentials: true,
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
  return axios.delete(`${API_BASE}/admin/users/${userId}`);
}

