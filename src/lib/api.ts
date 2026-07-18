const TOKEN_KEY = 'admin_token';

function getHeaders(withAuth = false): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (withAuth) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `API Error: ${res.statusText}`);
  }
  return res.json();
}

export async function authFetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const merged: RequestInit = {
    ...options,
    headers: { ...getHeaders(true), ...(options?.headers as Record<string, string> || {}) },
  };
  const res = await fetch(url, merged);
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/admin/login';
    throw new Error('Token 已过期，请重新登录');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `API Error: ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login: (password: string) => fetcher<{ success: boolean; token: string }>('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  }),
  verifyToken: () => authFetcher<{ valid: boolean }>('/api/verify'),
  changePassword: (oldPassword: string, newPassword: string) => authFetcher<{ success: boolean; error?: string }>('/api/change-password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  }),
  logout: () => { localStorage.removeItem(TOKEN_KEY); },

  // Settings
  getSettings: () => fetcher<Record<string, string>>('/api/settings'),
  updateSettings: (settings: Record<string, string>) => authFetcher('/api/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  }),

  // Upload
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/admin/login';
      throw new Error('Token 已过期');
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || 'Upload failed');
    }
    return res.json();
  },
  getUploads: (page = 1, limit = 20) => authFetcher<{ data: any[]; total: number }>(`/api/uploads?page=${page}&limit=${limit}`),
  deleteUpload: (id: string) => authFetcher(`/api/uploads/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => fetcher<any[]>('/api/categories'),
  createCategory: (name: string) => authFetcher('/api/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),
  deleteCategory: (id: string) => authFetcher(`/api/categories/${id}`, { method: 'DELETE' }),

  // Tags
  getTags: () => fetcher<any[]>('/api/tags'),
  createTag: (name: string) => authFetcher('/api/tags', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),
  deleteTag: (id: string) => authFetcher(`/api/tags/${id}`, { method: 'DELETE' }),

  // Posts
  getPosts: (params?: { categoryId?: string; tagId?: string; page?: number; limit?: number; search?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
    if (params?.tagId) searchParams.append('tagId', params.tagId);
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status) searchParams.append('status', params.status);
    return fetcher<{ data: any[]; total: number; page: number; limit: number }>(`/api/posts?${searchParams.toString()}`);
  },
  getPost: (slugOrId: string) => fetcher<any>(`/api/posts/${slugOrId}`),
  getPostById: (id: string) => authFetcher<any>(`/api/posts/by-id/${id}`),
  exportPost: (id: string) => {
    const token = localStorage.getItem(TOKEN_KEY);
    return fetch(`/api/posts/export/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  importPosts: (posts: any[]) => authFetcher('/api/posts/import', {
    method: 'POST',
    body: JSON.stringify({ posts }),
  }),
  createPost: (data: any) => authFetcher('/api/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updatePost: (id: string, data: any) => authFetcher(`/api/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deletePost: (id: string) => authFetcher(`/api/posts/${id}`, { method: 'DELETE' }),
  bulkPosts: (ids: string[], action: string, value?: string) => authFetcher('/api/posts/bulk', {
    method: 'POST',
    body: JSON.stringify({ ids, action, value }),
  }),
  likePost: (id: string) => fetcher<{ likes: number }>(`/api/posts/${id}/like`, { method: 'POST' }),

  // Moments
  getMoments: (page = 1, limit = 20) => fetcher<{ data: any[]; total: number }>(`/api/moments?page=${page}&limit=${limit}`),
  createMoment: (data: any) => authFetcher('/api/moments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteMoment: (id: string) => authFetcher(`/api/moments/${id}`, { method: 'DELETE' }),
  likeMoment: (id: string) => fetcher<{ likes: number }>(`/api/moments/${id}/like`, { method: 'POST' }),

  // Comments
  getComments: (params?: { postId?: string; momentId?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.postId) searchParams.append('postId', params.postId);
    if (params?.momentId) searchParams.append('momentId', params.momentId);
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    return fetcher<{ data: any[]; total: number }>(`/api/comments?${searchParams.toString()}`);
  },
  createComment: (data: { postId?: string; momentId?: string; author: string; email: string; content: string; avatar?: string }) => fetcher('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  deleteComment: (id: string) => authFetcher(`/api/comments/${id}`, { method: 'DELETE' }),
  bulkDeleteComments: (ids: string[]) => authFetcher('/api/comments/bulk', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  }),

  // Music
  getMusicList: () => fetcher<any[]>('/api/music'),
  uploadMusic: async (formData: FormData) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch('/api/music', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/admin/login';
      throw new Error('Token 已过期');
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || 'Upload failed');
    }
    return res.json();
  },
  uploadMusicCover: async (id: string, formData: FormData) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch(`/api/music/cover/${id}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/admin/login';
      throw new Error('Token 已过期');
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || 'Upload failed');
    }
    return res.json();
  },
  updateMusic: (id: string, data: any) => authFetcher(`/api/music/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  deleteMusic: (id: string) => authFetcher(`/api/music/${id}`, { method: 'DELETE' }),

  // Stats
  getStats: () => fetcher<any>('/api/stats'),
};
