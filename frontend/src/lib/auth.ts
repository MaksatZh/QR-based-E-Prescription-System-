import { User } from './types'

export function setCurrentUser(user: User, token: string) {
  localStorage.setItem('user', JSON.stringify(user))
  localStorage.setItem('token', token)
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function logout() {
  localStorage.removeItem('user')
  localStorage.removeItem('token')
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token')
}




/*import { User } from './types';

const AUTH_KEY = 'eprescription_auth';

export function setCurrentUser(user: User): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function getCurrentUser(): User | null {
  const data = localStorage.getItem(AUTH_KEY);
  return data ? JSON.parse(data) : null;
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export function hasRole(role: string): boolean {
  const user = getCurrentUser();
  return user?.role === role;
}*/
