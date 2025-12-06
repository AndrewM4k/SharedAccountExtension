// Shared types for extension files

export interface ActionData {
  actionType: string;
  lotNumber?: string;
  commentary?: string;
  timestamp: string;
  url?: string;
  lotName?: string;
  userBidAmount?: string;
  pageUrl?: string;
  bidAmount?: number;
  userId?: string;
  details?: string;
}

export interface RuntimeMessage {
  action?: string;
  type?: string;
  data?: ActionData;
}

export interface RuntimeResponse {
  status?: string;
}

export interface CookieData {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  expirationDate?: number;
}

export interface AuthResponse {
  success: boolean;
  cookies?: CookieData[];
  userAgent?: string;
  Message?: string;
  error?: string;
}

export interface BulkActionResponse {
  success: boolean;
  message?: string;
  processedCount?: number;
}



