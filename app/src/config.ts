export const API_BASE_URL = 'https://api.prophone.biz/api';

let _authToken = '';

export function setAuthToken(token: string) {
  _authToken = token;
}

export function getAuthToken(): string {
  return _authToken;
}
