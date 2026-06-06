export const API_BASE_URL = 'https://api.prophone.biz/api';

// Set this to your JWT token during development
// Will be replaced by proper auth flow in a later step
export let AUTH_TOKEN = '';

export function setAuthToken(token: string) {
  AUTH_TOKEN = token;
}
