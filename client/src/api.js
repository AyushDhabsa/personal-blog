const API = import.meta.env.VITE_API_URL || 'https://personal-blog-5cfp.onrender.com';

function getHeaders() {
  const h = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function request(url, options = {}) {
  const res = await fetch(`${API}${url}`, {
    headers: getHeaders(),
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  verify: () => request('/api/auth/verify'),

  // Public articles
  getArticles: (category, search) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    const q = params.toString();
    return request(`/api/articles${q ? '?' + q : ''}`);
  },
  getArticle: (slug) => request(`/api/articles/slug/${slug}`),

  // Admin articles
  getAllArticles: () => request('/api/articles/admin/all'),
  getArticleById: (id) => request(`/api/articles/admin/${id}`),
  createArticle: (data) =>
    request('/api/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateArticle: (id, data) =>
    request(`/api/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteArticle: (id) =>
    request(`/api/articles/${id}`, { method: 'DELETE' }),

  // Image upload
  uploadImage: async (file) => {
    const form = new FormData();
    form.append('image', file);
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
};
