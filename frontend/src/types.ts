export interface UserAction {
  id: number;
  action: string;
  timestamp: string;
  userId: number;
}

export interface User {
  id: number;
  email: string;
  isAdmin: boolean;
}
