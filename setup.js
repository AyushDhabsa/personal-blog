const fs = require('fs');
const path = require('path');
const BASE = 'C:/Projects/personal-blog';

function w(rel, content) {
  const full = path.join(BASE, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('wrote', rel);
}

// ============ SERVER ============

w('server/.env', `PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/personal-blog
JWT_SECRET=change_this_to_a_very_long_random_secret_string_2026
ADMIN_EMAIL=admin@blog.com
ADMIN_PASSWORD=admin123
CLIENT_URL=http://localhost:5173
`);

w('server/package.json', JSON.stringify({
  name: "personal-blog-server",
  version: "1.0.0",
  main: "index.js",
  scripts: { start: "node index.js", dev: "node index.js" },
  dependencies: {
    bcryptjs: "^3.0.3",
    cors: "^2.8.5",
    dotenv: "^16.4.7",
    express: "^4.21.2",
    jsonwebtoken: "^9.0.2",
    mongoose: "^8.10.0",
    multer: "^1.4.5-lts.1"
  }
}, null, 2));

w('server/models/Admin.js', `const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
`);

w('server/models/Article.js', `const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  excerpt: { type: String, required: true },
  category: { type: String, enum: ['blog', 'research'], default: 'blog' },
  tags: [String],
  coverImage: { type: String, default: '' },
  published: { type: Boolean, default: false },
  publishedAt: { type: Date },
}, { timestamps: true });

articleSchema.pre('save', function (next) {
  if (this.isModified('published') && this.published && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Article', articleSchema);
`);

w('server/middleware/auth.js', `const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    req.adminId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
`);

w('server/routes/auth.js', `const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin || !(await admin.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: admin.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/verify', require('../middleware/auth'), (req, res) => {
  res.json({ valid: true });
});

module.exports = router;
`);

w('server/routes/articles.js', `const router = require('express').Router();
const Article = require('../models/Article');
const auth = require('../middleware/auth');

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').substring(0, 120);
}

// Public: list published articles
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { published: true };
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }
    const articles = await Article.find(filter).sort({ publishedAt: -1 }).select('-content');
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: single article by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug, published: true });
    if (!article) return res.status(404).json({ error: 'Not found' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: list ALL articles
router.get('/admin/all', auth, async (req, res) => {
  try {
    const articles = await Article.find().sort({ updatedAt: -1 }).select('-content');
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: single article by id
router.get('/admin/:id', auth, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Not found' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: create
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, excerpt, category, tags, coverImage, published } = req.body;
    let slug = slugify(title);
    const existing = await Article.findOne({ slug });
    if (existing) slug += '-' + Date.now().toString(36);
    const article = await Article.create({
      title, slug, content, excerpt,
      category: category || 'blog',
      tags: tags || [],
      coverImage: coverImage || '',
      published: !!published,
      publishedAt: published ? new Date() : null,
    });
    res.status(201).json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: update
router.put('/:id', auth, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Not found' });
    const fields = ['title', 'content', 'excerpt', 'category', 'tags', 'coverImage', 'published'];
    fields.forEach((f) => { if (req.body[f] !== undefined) article[f] = req.body[f]; });
    if (req.body.title) {
      let slug = slugify(req.body.title);
      const dup = await Article.findOne({ slug, _id: { $ne: article._id } });
      if (dup) slug += '-' + Date.now().toString(36);
      article.slug = slug;
    }
    await article.save();
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: delete
router.delete('/:id', auth, async (req, res) => {
  try {
    await Article.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
`);

w('server/index.js', `require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Admin = require('./models/Admin');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/articles', require('./routes/articles'));

// Image upload
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\\s/g, '_'));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  },
});

app.post('/api/upload', require('./middleware/auth'), upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: '/uploads/' + req.file.filename });
});

// Health check for Uptime Robot
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    const adminExists = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    if (!adminExists) {
      await Admin.create({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
      console.log('Admin account created');
    }
    app.listen(PORT, () => console.log('Server running on port ' + PORT));
  })
  .catch((err) => console.error('MongoDB connection error:', err));
`);

// ============ CLIENT ============

w('client/package.json', JSON.stringify({
  name: "personal-blog-client",
  private: true,
  version: "1.0.0",
  type: "module",
  scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
  dependencies: {
    react: "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "react-markdown": "^9.0.1",
    "react-hot-toast": "^2.4.1",
    "remark-gfm": "^4.0.0"
  },
  devDependencies: {
    "@vitejs/plugin-react": "^4.3.4",
    vite: "^6.0.0"
  }
}, null, 2));

w('client/index.html', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ayush - Blog & Research</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
`);

w('client/vite.config.js', `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000'
    }
  }
})
`);

w('client/vercel.json', JSON.stringify({
  rewrites: [{ source: "/(.*)", destination: "/index.html" }]
}, null, 2));

w('client/src/main.jsx', `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`);

w('client/src/index.css', `*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --white: #ffffff;
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-serif: 'Playfair Display', Georgia, serif;
}

html { font-size: 16px; scroll-behavior: smooth; }

body {
  font-family: var(--font-sans);
  background: var(--white);
  color: var(--gray-900);
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; text-decoration: none; }
img { max-width: 100%; display: block; }
button { font-family: inherit; cursor: pointer; border: none; background: none; }

input, textarea, select {
  font-family: inherit; font-size: inherit;
  border: 1px solid var(--gray-200); border-radius: 6px;
  padding: 10px 14px; outline: none; width: 100%;
  background: var(--white); color: var(--gray-900);
  transition: border-color 0.2s;
}
input:focus, textarea:focus, select:focus { border-color: var(--gray-900); }
textarea { resize: vertical; min-height: 200px; }
::selection { background: var(--gray-900); color: var(--white); }

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--gray-300); border-radius: 3px; }

.prose h1 { font-family: var(--font-serif); font-size: 2rem; font-weight: 700; margin: 2rem 0 1rem; line-height: 1.3; }
.prose h2 { font-family: var(--font-serif); font-size: 1.5rem; font-weight: 600; margin: 1.8rem 0 0.8rem; }
.prose h3 { font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 0.6rem; }
.prose p { margin-bottom: 1.2rem; color: var(--gray-700); }
.prose ul, .prose ol { margin: 0 0 1.2rem 1.5rem; color: var(--gray-700); }
.prose li { margin-bottom: 0.4rem; }
.prose blockquote { border-left: 3px solid var(--gray-900); padding: 0.5rem 0 0.5rem 1.2rem; margin: 1.5rem 0; color: var(--gray-600); font-style: italic; }
.prose code { background: var(--gray-100); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
.prose pre { background: var(--gray-900); color: var(--gray-100); padding: 1.2rem; border-radius: 8px; overflow-x: auto; margin: 1.5rem 0; }
.prose pre code { background: none; padding: 0; color: inherit; }
.prose img { border-radius: 8px; margin: 1.5rem 0; }
.prose a { border-bottom: 1px solid var(--gray-400); }
.prose a:hover { border-color: var(--gray-900); }
.prose hr { border: none; border-top: 1px solid var(--gray-200); margin: 2rem 0; }
.prose table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
.prose th, .prose td { border: 1px solid var(--gray-200); padding: 8px 12px; text-align: left; }
.prose th { background: var(--gray-50); font-weight: 600; }
`);

w('client/src/api.js', `const API = import.meta.env.VITE_API_URL || '';

function getHeaders() {
  const h = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

async function request(url, options = {}) {
  const res = await fetch(API + url, { headers: getHeaders(), ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  verify: () => request('/api/auth/verify'),
  getArticles: (category, search) => {
    const p = new URLSearchParams();
    if (category) p.set('category', category);
    if (search) p.set('search', search);
    const q = p.toString();
    return request('/api/articles' + (q ? '?' + q : ''));
  },
  getArticle: (slug) => request('/api/articles/slug/' + slug),
  getAllArticles: () => request('/api/articles/admin/all'),
  getArticleById: (id) => request('/api/articles/admin/' + id),
  createArticle: (data) => request('/api/articles', { method: 'POST', body: JSON.stringify(data) }),
  updateArticle: (id, data) => request('/api/articles/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteArticle: (id) => request('/api/articles/' + id, { method: 'DELETE' }),
  uploadImage: async (file) => {
    const form = new FormData();
    form.append('image', file);
    const token = localStorage.getItem('token');
    const res = await fetch(API + '/api/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
};
`);

w('client/src/components/AuthContext.jsx', `import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    api.verify()
      .then(() => setAdmin({ token }))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem('token', data.token);
    setAdmin({ token: data.token, email: data.email });
  };

  const logout = () => { localStorage.removeItem('token'); setAdmin(null); };

  return (
    <AuthContext.Provider value={{ admin, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
`);

w('client/src/components/Header.jsx', `import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function Header() {
  const { admin, logout } = useAuth();
  const loc = useLocation();

  const nl = (to, label) => {
    const active = loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to));
    return (
      <Link to={to} style={{
        fontSize: '0.875rem', fontWeight: 500, letterSpacing: '0.5px',
        color: active ? '#111827' : '#6b7280', textTransform: 'uppercase', transition: 'color 0.2s',
      }}>{label}</Link>
    );
  };

  return (
    <header style={{ borderBottom: '1px solid #e5e7eb', background: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <Link to="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.5px', color: '#111827' }}>Ayush.</Link>
        <nav style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {nl('/', 'Home')}
          {nl('/blog', 'Blog')}
          {nl('/research', 'Research')}
          {nl('/contact', 'Contact')}
          {admin && <Link to="/admin" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', background: '#111827', padding: '6px 16px', borderRadius: 6 }}>Dashboard</Link>}
          {admin && <button onClick={logout} style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 6 }}>Logout</button>}
        </nav>
      </div>
    </header>
  );
}
`);

w('client/src/components/Footer.jsx', `export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid #e5e7eb', padding: '40px 24px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', marginTop: 80 }}>
      <p>&copy; {new Date().getFullYear()} Ayush. All rights reserved.</p>
    </footer>
  );
}
`);

w('client/src/pages/Home.jsx', `import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Home() {
  const [articles, setArticles] = useState([]);
  const API = import.meta.env.VITE_API_URL || '';

  useEffect(() => { api.getArticles().then(setArticles).catch(console.error); }, []);

  return (
    <>
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '100px 24px 60px', textAlign: 'center' }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 16 }}>Welcome</p>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 700, lineHeight: 1.2, color: '#111827', marginBottom: 24 }}>Thoughts, Research & Ideas</h1>
        <p style={{ fontSize: '1.1rem', color: '#6b7280', lineHeight: 1.7, maxWidth: 540, margin: '0 auto 40px' }}>
          A personal space where I write about things I care about &mdash; from technical deep-dives and research papers to everyday observations.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/blog" style={{ background: '#111827', color: '#fff', padding: '12px 32px', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem' }}>Read the Blog</Link>
          <Link to="/research" style={{ border: '1px solid #d1d5db', color: '#374151', padding: '12px 32px', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem' }}>View Research</Link>
        </div>
      </section>

      <div style={{ width: 60, height: 1, background: '#e5e7eb', margin: '0 auto 60px' }} />

      {articles.length > 0 && (
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.6rem', fontWeight: 600, marginBottom: 40, color: '#111827' }}>Recent Posts</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 32 }}>
            {articles.slice(0, 6).map((a) => (
              <Link to={'/article/' + a.slug} key={a._id} style={{ textDecoration: 'none' }}>
                <article style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', transition: 'box-shadow 0.2s, transform 0.2s', background: '#fff' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}>
                  {a.coverImage && <img src={a.coverImage.startsWith('http') ? a.coverImage : API + a.coverImage} alt={a.title} style={{ width: '100%', height: 200, objectFit: 'cover', background: '#f3f4f6' }} />}
                  <div style={{ padding: 24 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#6b7280', marginBottom: 8, display: 'inline-block' }}>{a.category}</span>
                    <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.2rem', fontWeight: 600, color: '#111827', marginBottom: 8, lineHeight: 1.3 }}>{a.title}</h3>
                    <p style={{ fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.6 }}>{a.excerpt}</p>
                    <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 16 }}>{new Date(a.publishedAt || a.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
`);

w('client/src/pages/ArticleList.jsx', `import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function ArticleList({ category }) {
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const API = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    setLoading(true);
    api.getArticles(category, search || undefined).then(setArticles).catch(console.error).finally(() => setLoading(false));
  }, [category, search]);

  const isR = category === 'research';

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px 80px' }}>
      <div style={{ marginBottom: 48 }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2.2rem', fontWeight: 700, color: '#111827', marginBottom: 8 }}>{isR ? 'Research' : 'Blog'}</h1>
        <p style={{ color: '#6b7280' }}>{isR ? 'Published research articles and papers.' : 'Thoughts, tutorials, and everything in between.'}</p>
      </div>
      <div style={{ marginBottom: 40 }}>
        <input type="text" placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400, padding: '10px 16px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.9rem', outline: 'none', width: '100%' }} />
      </div>
      {loading ? <p style={{ textAlign: 'center', color: '#9ca3af', padding: '60px 0' }}>Loading...</p>
        : articles.length === 0 ? <p style={{ textAlign: 'center', color: '#9ca3af', padding: '60px 0' }}>No articles found.</p>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 32 }}>
            {articles.map((a) => (
              <Link to={'/article/' + a.slug} key={a._id} style={{ textDecoration: 'none' }}>
                <article style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', transition: 'box-shadow 0.2s, transform 0.2s', background: '#fff' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}>
                  {a.coverImage && <img src={a.coverImage.startsWith('http') ? a.coverImage : API + a.coverImage} alt={a.title} style={{ width: '100%', height: 200, objectFit: 'cover', background: '#f3f4f6' }} />}
                  <div style={{ padding: 24 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#6b7280', display: 'inline-block', marginBottom: 8 }}>{a.category}</span>
                    <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.2rem', fontWeight: 600, color: '#111827', marginBottom: 8, lineHeight: 1.3 }}>{a.title}</h3>
                    <p style={{ fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.6 }}>{a.excerpt}</p>
                    {a.tags && a.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                        {a.tags.map((t, i) => <span key={i} style={{ fontSize: '0.7rem', background: '#f3f4f6', color: '#6b7280', padding: '3px 10px', borderRadius: 20 }}>{t}</span>)}
                      </div>
                    )}
                    <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 16 }}>{new Date(a.publishedAt || a.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}
`);

w('client/src/pages/ArticleView.jsx', `import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api';

export default function ArticleView() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const API = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    setLoading(true);
    api.getArticle(slug).then(setArticle).catch(() => setError(true)).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <p style={{ textAlign: 'center', color: '#9ca3af', padding: '100px 0' }}>Loading...</p>;
  if (error || !article) return (
    <div style={{ textAlign: 'center', padding: '100px 24px' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Article not found</h2>
      <Link to="/" style={{ color: '#6b7280' }}>&larr; Go home</Link>
    </div>
  );

  return (
    <article style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px 80px' }}>
      <Link to={article.category === 'research' ? '/research' : '/blog'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#6b7280', marginBottom: 40 }}>
        &larr; Back to {article.category === 'research' ? 'Research' : 'Blog'}
      </Link>
      <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#9ca3af', marginBottom: 12 }}>{article.category}</p>
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, lineHeight: 1.2, color: '#111827', marginBottom: 16 }}>{article.title}</h1>
      <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: 40 }}>{new Date(article.publishedAt || article.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      {article.coverImage && <img src={article.coverImage.startsWith('http') ? article.coverImage : API + article.coverImage} alt={article.title} style={{ width: '100%', borderRadius: 12, marginBottom: 40, maxHeight: 400, objectFit: 'cover' }} />}
      <div className="prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
      </div>
      {article.tags && article.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 48, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
          {article.tags.map((t, i) => <span key={i} style={{ fontSize: '0.75rem', background: '#f3f4f6', color: '#6b7280', padding: '4px 12px', borderRadius: 20 }}>{t}</span>)}
        </div>
      )}
    </article>
  );
}
`);

w('client/src/pages/Contact.jsx', `export default function Contact() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '80px 24px' }}>
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2.2rem', fontWeight: 700, color: '#111827', marginBottom: 12 }}>Contact</h1>
      <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: 48, lineHeight: 1.7 }}>
        Have a question, collaboration idea, or just want to say hello? Feel free to reach out.
      </p>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 32 }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', marginBottom: 6 }}>Email</p>
        <p style={{ fontSize: '1rem', color: '#111827', marginBottom: 28 }}>
          <a href="mailto:your.email@example.com" style={{ color: '#111827', borderBottom: '1px solid #d1d5db' }}>your.email@example.com</a>
        </p>
        <p style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', marginBottom: 6 }}>Based in</p>
        <p style={{ fontSize: '1rem', color: '#111827', marginBottom: 28 }}>India</p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '28px 0' }} />
        <p style={{ fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.6 }}>
          I typically respond within 24-48 hours. For research-related inquiries, please include relevant context so I can respond more effectively.
        </p>
      </div>
    </div>
  );
}
`);

w('client/src/pages/Login.jsx', `import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 380, margin: '0 auto', padding: '120px 24px 80px' }}>
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.8rem', fontWeight: 700, color: '#111827', marginBottom: 8, textAlign: 'center' }}>Admin Login</h1>
      <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem', marginBottom: 40 }}>Sign in to manage your content.</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@blog.com"
            style={{ width: '100%', padding: '11px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.9rem', outline: 'none' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="password"
            style={{ width: '100%', padding: '11px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.9rem', outline: 'none' }} />
        </div>
        {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>}
        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '12px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', marginTop: 8 }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
`);

w('client/src/pages/AdminDashboard.jsx', `import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); api.getAllArticles().then(setArticles).catch(console.error).finally(() => setLoading(false)); };
  useEffect(load, []);

  const handleDelete = async (id, title) => {
    if (!confirm('Delete "' + title + '"?')) return;
    try { await api.deleteArticle(id); toast.success('Deleted'); load(); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.8rem', fontWeight: 700, color: '#111827' }}>Dashboard</h1>
        <Link to="/admin/new" style={{ background: '#111827', color: '#fff', padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none' }}>+ New Article</Link>
      </div>
      {loading ? <p style={{ textAlign: 'center', color: '#9ca3af', padding: '60px 0' }}>Loading...</p>
        : articles.length === 0 ? <p style={{ textAlign: 'center', color: '#9ca3af', padding: '60px 0' }}>No articles yet.</p>
        : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Title', 'Category', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', borderBottom: '2px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {articles.map(a => (
                  <tr key={a._id}>
                    <td style={{ padding: 16, borderBottom: '1px solid #f3f4f6', fontWeight: 600, color: '#111827' }}>{a.title}</td>
                    <td style={{ padding: 16, borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, background: '#f3f4f6', color: '#6b7280', textTransform: 'capitalize' }}>{a.category}</span>
                    </td>
                    <td style={{ padding: 16, borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, background: a.published ? '#ecfdf5' : '#f3f4f6', color: a.published ? '#059669' : '#9ca3af' }}>
                        {a.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td style={{ padding: 16, borderBottom: '1px solid #f3f4f6', fontSize: '0.9rem', color: '#374151' }}>
                      {new Date(a.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ padding: 16, borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link to={'/admin/edit/' + a._id} style={{ padding: '6px 14px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: '0.8rem', fontWeight: 500, color: '#374151', textDecoration: 'none' }}>Edit</Link>
                        <button onClick={() => handleDelete(a._id, a.title)} style={{ padding: '6px 14px', border: '1px solid #fecaca', borderRadius: 6, fontSize: '0.8rem', fontWeight: 500, color: '#dc2626', background: '#fff', cursor: 'pointer' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
`);

w('client/src/pages/ArticleEditor.jsx', `import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api';
import toast from 'react-hot-toast';

export default function ArticleEditor() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState({ title: '', excerpt: '', content: '', category: 'blog', tags: '', coverImage: '', published: false });
  const [tab, setTab] = useState('write');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.getArticleById(id).then(a => {
        setForm({ title: a.title, excerpt: a.excerpt, content: a.content, category: a.category, tags: (a.tags || []).join(', '), coverImage: a.coverImage || '', published: a.published });
      }).catch(console.error);
    }
  }, [id]);

  const update = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim() || !form.excerpt.trim()) { toast.error('Title, excerpt, and content are required'); return; }
    setSaving(true);
    try {
      const data = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
      if (isEdit) { await api.updateArticle(id, data); toast.success('Updated'); }
      else { await api.createArticle(data); toast.success('Created'); }
      navigate('/admin');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const tabStyle = (active) => ({ padding: '10px 20px', fontSize: '0.85rem', fontWeight: 600, color: active ? '#111827' : '#9ca3af', borderBottom: active ? '2px solid #111827' : '2px solid transparent', cursor: 'pointer', background: 'none', border: 'none', borderBottom: active ? '2px solid #111827' : '2px solid transparent', marginBottom: -1 });

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px' }}>
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.8rem', fontWeight: 700, color: '#111827', marginBottom: 32 }}>{isEdit ? 'Edit Article' : 'New Article'}</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Title</label>
          <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="Article title" required
            style={{ padding: '11px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.95rem', outline: 'none', width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Excerpt</label>
          <input value={form.excerpt} onChange={e => update('excerpt', e.target.value)} placeholder="Brief summary" required
            style={{ padding: '11px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.95rem', outline: 'none', width: '100%' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Category</label>
            <select value={form.category} onChange={e => update('category', e.target.value)}
              style={{ padding: '11px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.9rem', outline: 'none', background: '#fff', width: '100%' }}>
              <option value="blog">Blog</option>
              <option value="research">Research</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Tags</label>
            <input value={form.tags} onChange={e => update('tags', e.target.value)} placeholder="tag1, tag2"
              style={{ padding: '11px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.9rem', outline: 'none', width: '100%' }} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Cover Image URL</label>
          <input value={form.coverImage} onChange={e => update('coverImage', e.target.value)} placeholder="https://..."
            style={{ padding: '11px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.9rem', outline: 'none', width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Content</label>
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb' }}>
            <button type="button" style={tabStyle(tab === 'write')} onClick={() => setTab('write')}>Write</button>
            <button type="button" style={tabStyle(tab === 'preview')} onClick={() => setTab('preview')}>Preview</button>
          </div>
          {tab === 'write'
            ? <textarea value={form.content} onChange={e => update('content', e.target.value)} placeholder="Write in Markdown..."
                style={{ padding: 14, border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 8px 8px', fontSize: '0.9rem', outline: 'none', width: '100%', minHeight: 350, fontFamily: "'Inter', monospace", lineHeight: 1.6, resize: 'vertical' }} />
            : <div className="prose" style={{ border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 24, minHeight: 350, background: '#fafafa' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.content || '*Nothing to preview*'}</ReactMarkdown>
              </div>
          }
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 4 }}>Supports Markdown</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" checked={form.published} onChange={e => update('published', e.target.checked)} id="pub" style={{ width: 18, height: 18, accentColor: '#111827' }} />
          <label htmlFor="pub" style={{ fontSize: '0.9rem', color: '#374151', fontWeight: 500 }}>Publish immediately</label>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button type="button" onClick={() => navigate('/admin')} style={{ padding: '12px 24px', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 500, fontSize: '0.9rem', color: '#6b7280', cursor: 'pointer', background: '#fff' }}>Cancel</button>
          <button type="submit" disabled={saving} style={{ padding: '12px 32px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>{saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}</button>
        </div>
      </form>
    </div>
  );
}
`);

w('client/src/App.jsx', `import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './components/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import ArticleList from './pages/ArticleList';
import ArticleView from './pages/ArticleView';
import Contact from './pages/Contact';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ArticleEditor from './pages/ArticleEditor';

function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return <p style={{ textAlign: 'center', padding: '100px 0', color: '#9ca3af' }}>Loading...</p>;
  if (!admin) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <Header />
      <main style={{ minHeight: 'calc(100vh - 180px)' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blog" element={<ArticleList category="blog" />} />
          <Route path="/research" element={<ArticleList category="research" />} />
          <Route path="/article/:slug" element={<ArticleView />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/new" element={<ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
          <Route path="/admin/edit/:id" element={<ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', borderRadius: 8 } }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
`);

w('render.yaml', `services:
  - type: web
    name: personal-blog-api
    runtime: node
    buildCommand: cd server && npm install
    startCommand: cd server && node index.js
    envVars:
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: ADMIN_EMAIL
        sync: false
      - key: ADMIN_PASSWORD
        sync: false
`);

console.log('\n=== ALL FILES WRITTEN SUCCESSFULLY ===');
