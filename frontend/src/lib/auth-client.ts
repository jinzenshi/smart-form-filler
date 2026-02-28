export interface AuthData {
  token: string | null
  username: string | null
}

const TOKEN_KEY = 'auth_token'
const USERNAME_KEY = 'username'

export function getAuthData(): AuthData {
  if (typeof window === 'undefined') {
    return { token: null, username: null }
  }
  return {
    token: localStorage.getItem(TOKEN_KEY),
    username: localStorage.getItem(USERNAME_KEY)
  }
}

export function setAuthData(token: string, username: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USERNAME_KEY, username)
}

export function clearAuthData() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
}
