const BASE_URL = '/api';

export function getToken(): string | null {
  return localStorage.getItem('ops_roster_token');
}

export function setToken(token: string): void {
  localStorage.setItem('ops_roster_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('ops_roster_token');
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorData.message || errorMsg;
      if (errorData.details) {
        errorMsg += `: ${JSON.stringify(errorData.details)}`;
      }
    } catch {
      // not JSON
    }
    throw new Error(errorMsg);
  }

  if (response.headers.get('Content-Type')?.includes('text/csv')) {
    return (await response.text()) as any;
  }

  return response.json();
}
