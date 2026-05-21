import type { AuthUser } from './types';

/**
 * Centralized API Service
 * - Base URL từ biến môi trường VITE_API_URL
 * - Tự động gắn JWT token vào header Authorization
 * - Xử lý lỗi 401 → dispatch event để App.tsx tự động logout
 * - Hỗ trợ upload file (multipart/form-data)
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function getHeaders(hasBody: boolean = false): HeadersInit {
  const headers: HeadersInit = {};
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

function handleUnauthorized(res: Response): void {
  if (res.status === 401) {
    // Token hết hạn hoặc không hợp lệ → dispatch event để App.tsx xử lý logout
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, options);

  if (!res.ok) {
    handleUnauthorized(res);
    const errorData = await res.json().catch(() => ({ message: 'Lỗi không xác định' }));
    throw new Error(errorData.message || `HTTP ${res.status}`);
  }

  return res.json();
}

const api = {
  get: <T = unknown>(endpoint: string) =>
    request<T>(endpoint, {
      method: 'GET',
      headers: getHeaders(),
    }),

  post: <T = unknown, TBody = unknown>(endpoint: string, data: TBody) =>
    request<T>(endpoint, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    }),

  put: <T = unknown, TBody = unknown>(endpoint: string, data: TBody) =>
    request<T>(endpoint, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    }),

  delete: <T = unknown>(endpoint: string) =>
    request<T>(endpoint, {
      method: 'DELETE',
      headers: getHeaders(),
    }),

  /**
   * Upload file — sử dụng multipart/form-data.
   * Không set Content-Type header để browser tự thêm boundary.
   */
  upload: async <T = unknown>(endpoint: string, formData: FormData): Promise<T> => {
    const headers: HeadersInit = {};
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Không set Content-Type — fetch tự thêm multipart/form-data + boundary
    return request<T>(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    });
  },

  /**
   * Login đặc biệt — không cần token
   */
  login: async (username: string, password: string): Promise<{ token: string; user: AuthUser }> => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Đăng nhập thất bại');
    }
    return data;
  },

  /** Helper: get base URL for constructing attachment links */
  getBaseUrl: () => BASE_URL,
};

export default api;
