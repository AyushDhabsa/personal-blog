import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api';
import toast from 'react-hot-toast';

const s = {
  container: { maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px' },
  title: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: '1.8rem',
    fontWeight: 700,
    color: '#111827',
    marginBottom: 32,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 24 },
  group: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    padding: '11px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: '0.95rem',
    outline: 'none',
    width: '100%',
  },
  textarea: {
    padding: '14px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%',
    minHeight: 350,
    fontFamily: "'Inter', monospace",
    lineHeight: 1.6,
    resize: 'vertical',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  select: {
    padding: '11px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: '0.9rem',
    outline: 'none',
    background: '#fff',
    width: '100%',
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    accentColor: '#111827',
  },
  checkLabel: {
    fontSize: '0.9rem',
    color: '#374151',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
    paddingTop: 8,
  },
  saveBtn: {
    padding: '12px 32px',
    background: '#111827',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '12px 24px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontWeight: 500,
    fontSize: '0.9rem',
    color: '#6b7280',
    cursor: 'pointer',
    background: '#fff',
  },
  tabs: {
    display: 'flex',
    gap: 0,
    borderBottom: '1px solid #e5e7eb',
    marginBottom: 0,
  },
  tab: (active) => ({
    padding: '10px 20px',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: active ? '#111827' : '#9ca3af',
    borderBottom: active ? '2px solid #111827' : '2px solid transparent',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid #111827' : '2px solid transparent',
    marginBottom: -1,
  }),
  preview: {
    border: '1px solid #e5e7eb',
    borderRadius: '0 0 8px 8px',
    padding: 24,
    minHeight: 350,
    background: '#fafafa',
  },
  hint: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    marginTop: 2,
  },
};

export default function ArticleEditor() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'blog',
    tags: '',
    coverImage: '',
    published: false,
  });
  const [tab, setTab] = useState('write');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.getArticleById(id).then((a) => {
        setForm({
          title: a.title,
          excerpt: a.excerpt,
          content: a.content,
          category: a.category,
          tags: (a.tags || []).join(', '),
          coverImage: a.coverImage || '',
          published: a.published,
        });
      }).catch(console.error);
    }
  }, [id]);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim() || !form.excerpt.trim()) {
      toast.error('Title, excerpt, and content are required');
      return;
    }
    setSaving(true);
    try {
      const data = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      if (isEdit) {
        await api.updateArticle(id, data);
        toast.success('Article updated');
      } else {
        await api.createArticle(data);
        toast.success('Article created');
      }
      navigate('/admin');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.container}>
      <h1 style={s.title}>{isEdit ? 'Edit Article' : 'New Article'}</h1>

      <form onSubmit={handleSubmit} style={s.form}>
        <div style={s.group}>
          <label style={s.label}>Title</label>
          <input
            style={s.input}
            value={form.title}
            onChange={e => update('title', e.target.value)}
            placeholder="Article title"
            required
          />
        </div>

        <div style={s.group}>
          <label style={s.label}>Excerpt</label>
          <input
            style={s.input}
            value={form.excerpt}
            onChange={e => update('excerpt', e.target.value)}
            placeholder="Brief summary shown in cards"
            required
          />
        </div>

        <div style={s.row}>
          <div style={s.group}>
            <label style={s.label}>Category</label>
            <select
              style={s.select}
              value={form.category}
              onChange={e => update('category', e.target.value)}
            >
              <option value="blog">Blog</option>
              <option value="research">Research</option>
            </select>
          </div>
          <div style={s.group}>
            <label style={s.label}>Tags</label>
            <input
              style={s.input}
              value={form.tags}
              onChange={e => update('tags', e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
            <p style={s.hint}>Comma separated</p>
          </div>
        </div>

        <div style={s.group}>
          <label style={s.label}>Cover Image URL</label>
          <input
            style={s.input}
            value={form.coverImage}
            onChange={e => update('coverImage', e.target.value)}
            placeholder="https://... or /uploads/..."
          />
        </div>

        <div style={s.group}>
          <label style={s.label}>Content</label>
          <div style={s.tabs}>
            <button type="button" style={s.tab(tab === 'write')} onClick={() => setTab('write')}>Write</button>
            <button type="button" style={s.tab(tab === 'preview')} onClick={() => setTab('preview')}>Preview</button>
          </div>
          {tab === 'write' ? (
            <textarea
              style={{ ...s.textarea, borderRadius: '0 0 8px 8px' }}
              value={form.content}
              onChange={e => update('content', e.target.value)}
              placeholder="Write your article in Markdown..."
            />
          ) : (
            <div style={s.preview} className="prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {form.content || '*Nothing to preview*'}
              </ReactMarkdown>
            </div>
          )}
          <p style={s.hint}>Supports Markdown formatting</p>
        </div>

        <div style={s.checkRow}>
          <input
            type="checkbox"
            checked={form.published}
            onChange={e => update('published', e.target.checked)}
            style={s.checkbox}
            id="published"
          />
          <label htmlFor="published" style={s.checkLabel}>
            Publish immediately
          </label>
        </div>

        <div style={s.actions}>
          <button type="button" style={s.cancelBtn} onClick={() => navigate('/admin')}>
            Cancel
          </button>
          <button type="submit" style={s.saveBtn} disabled={saving}>
            {saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
          </button>
        </div>
      </form>
    </div>
  );
}
