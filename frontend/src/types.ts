import React from 'react';

export interface UserAction {
  id: number;
  action: string;
  timestamp: string;
  userId: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
}

export interface CopartAction {
  id: number;
  userId: number;
  actionTime: string;
  actionType: 'BID' | 'PURCHASE' | 'LOGIN';
  lotNumber: string;
  details: string; // JSON string
}

export interface ApiResponse<T> {
  data: T;
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface AlertProps {
  variant?: 'success' | 'danger' | 'warning' | 'info';
  children: React.ReactNode;
}
