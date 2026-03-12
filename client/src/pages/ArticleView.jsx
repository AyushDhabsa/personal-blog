import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api';

const s = {
  container: { maxWidth: 720, margin: '0 auto', padding: '60px 24px 80px' },
  back: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: '0.85rem',
    color: '#6b7280',
    marginBottom: 40,
    transition: 'color 0.2s',
  },
  tag: {
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    color: '#9ca3af',
    marginBottom: 12,
  },
  title: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
    fontWeight: 700,
    lineHeight: 1.2,
    color: '#111827',
    marginBottom: 16,
  },
  meta: {
    fontSize: '0.85rem',
    color: '#9ca3af',
    marginBottom: 40,
  },
  cover: {
    width: '100%',
    borderRadius: 12,
    marginBottom: 40,
    maxHeight: 400,
    objectFit: 'cover',
  },
  tags: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 48, paddingTop: 24, borderTop: '1px solid #e5e7eb' },
  tagPill: {
    fontSize: '0.75rem',
    background: '#f3f4f6',
    color: '#6b7280',
    padding: '4px 12px',
    borderRadius: 20,
  },
  loading: { textAlign: 'center', color: '#9ca3af', padding: '100px 0' },
  notFound: { textAlign: 'center', padding: '100px 24px' },
};

export default function ArticleView() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const API = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    setLoading(true);
    api.getArticle(slug)
      .then(setArticle)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <p style={s.loading}>Loading...</p>;

  if (error || !article) {
    return (
      <div style={s.notFound}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Article not found</h2>
        <Link to="/" style={{ color: '#6b7280' }}>← Go home</Link>
      </div>
    );
  }

  return (
    <article style={s.container}>
      <Link to={article.category === 'research' ? '/research' : '/blog'} style={s.back}>
        ← Back to {article.category === 'research' ? 'Research' : 'Blog'}
      </Link>

      <p style={s.tag}>{article.category}</p>
      <h1 style={s.title}>{article.title}</h1>
      <p style={s.meta}>
        {new Date(article.publishedAt || article.createdAt).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        })}
      </p>

      {article.coverImage && (
        <img
          src={article.coverImage.startsWith('http') ? article.coverImage : `${API}${article.coverImage}`}
          alt={article.title}
          style={s.cover}
        />
      )}

      <div className="prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {article.content}
        </ReactMarkdown>
      </div>

      {article.tags?.length > 0 && (
        <div style={s.tags}>
          {article.tags.map((t, i) => <span key={i} style={s.tagPill}>{t}</span>)}
        </div>
      )}
    </article>
  );
}
