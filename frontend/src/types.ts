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
  userId: string;
  username?: string;
  actionTime: string;
  actionType: 'BID' | 'PURCHASE' | 'LOGIN';
  lotNumber: string;
  details: string; // JSON string (parsed from commentary, computed on frontend)
  commentary?: string; // JSON string from backend
  userBidAmount?: string;
  pageUrl?: string;
  lotName?: string;
  createdAt?: string;
  details?: string; // Extracted details from page elements (from backend Details field)
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
