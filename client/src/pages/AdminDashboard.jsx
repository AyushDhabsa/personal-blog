import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import toast from 'react-hot-toast';

const s = {
  container: { maxWidth: 1100, margin: '0 auto', padding: '48px 24px 80px' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: '1.8rem',
    fontWeight: 700,
    color: '#111827',
  },
  newBtn: {
    background: '#111827',
    color: '#fff',
    padding: '10px 24px',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: '0.85rem',
    textDecoration: 'none',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#9ca3af',
    borderBottom: '2px solid #e5e7eb',
  },
  td: {
    padding: '16px',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '0.9rem',
    color: '#374151',
  },
  articleTitle: {
    fontWeight: 600,
    color: '#111827',
  },
  badge: (published) => ({
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: '0.7rem',
    fontWeight: 600,
    background: published ? '#ecfdf5' : '#f3f4f6',
    color: published ? '#059669' : '#9ca3af',
  }),
  catBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: '0.7rem',
    fontWeight: 600,
    background: '#f3f4f6',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  actions: {
    display: 'flex',
    gap: 8,
  },
  editBtn: {
    padding: '6px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    fontSize: '0.8rem',
    fontWeight: 500,
    color: '#374151',
    background: '#fff',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  deleteBtn: {
    padding: '6px 14px',
    border: '1px solid #fecaca',
    borderRadius: 6,
    fontSize: '0.8rem',
    fontWeight: 500,
    color: '#dc2626',
    background: '#fff',
    cursor: 'pointer',
  },
  empty: { textAlign: 'center', color: '#9ca3af', padding: '60px 0' },
};

export default function AdminDashboard() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api.getAllArticles()
      .then(setArticles)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await api.deleteArticle(id);
      toast.success('Article deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.title}>Dashboard</h1>
        <Link to="/admin/new" style={s.newBtn}>+ New Article</Link>
      </div>

      {loading ? (
        <p style={s.empty}>Loading...</p>
      ) : articles.length === 0 ? (
        <p style={s.empty}>No articles yet. Create your first one.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Title</th>
                <th style={s.th}>Category</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Date</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a._id}>
                  <td style={s.td}>
                    <span style={s.articleTitle}>{a.title}</span>
                  </td>
                  <td style={s.td}>
                    <span style={s.catBadge}>{a.category}</span>
                  </td>
                  <td style={s.td}>
                    <span style={s.badge(a.published)}>
                      {a.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td style={s.td}>
                    {new Date(a.updatedAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </td>
                  <td style={s.td}>
                    <div style={s.actions}>
                      <Link to={`/admin/edit/${a._id}`} style={s.editBtn}>Edit</Link>
                      <button
                        onClick={() => handleDelete(a._id, a.title)}
                        style={s.deleteBtn}
                      >
                        Delete
                      </button>
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
