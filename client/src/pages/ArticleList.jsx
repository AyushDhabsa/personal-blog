import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';

const s = {
  container: { maxWidth: 1100, margin: '0 auto', padding: '60px 24px 80px' },
  header: { marginBottom: 48 },
  title: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: '2.2rem',
    fontWeight: 700,
    color: '#111827',
    marginBottom: 8,
  },
  desc: { color: '#6b7280', fontSize: '1rem' },
  controls: {
    display: 'flex',
    gap: 12,
    marginBottom: 40,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  search: {
    flex: 1,
    minWidth: 200,
    padding: '10px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: '0.9rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 32,
  },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
    transition: 'box-shadow 0.2s, transform 0.2s',
    background: '#fff',
  },
  cardImg: { width: '100%', height: 200, objectFit: 'cover', background: '#f3f4f6' },
  cardBody: { padding: 24 },
  tag: {
    display: 'inline-block',
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#6b7280',
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#111827',
    marginBottom: 8,
    lineHeight: 1.3,
  },
  cardExcerpt: { fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.6 },
  cardDate: { fontSize: '0.8rem', color: '#9ca3af', marginTop: 16 },
  empty: { textAlign: 'center', color: '#9ca3af', padding: '60px 0', fontSize: '1rem' },
  tags: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 },
  tagPill: {
    fontSize: '0.7rem',
    background: '#f3f4f6',
    color: '#6b7280',
    padding: '3px 10px',
    borderRadius: 20,
  },
};

export default function ArticleList({ category }) {
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const API = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    setLoading(true);
    api.getArticles(category, search || undefined)
      .then(setArticles)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category, search]);

  const isResearch = category === 'research';

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.title}>{isResearch ? 'Research' : 'Blog'}</h1>
        <p style={s.desc}>
          {isResearch
            ? 'Published research articles and papers.'
            : 'Thoughts, tutorials, and everything in between.'}
        </p>
      </div>

      <div style={s.controls}>
        <input
          type="text"
          placeholder="Search articles..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={s.search}
        />
      </div>

      {loading ? (
        <p style={s.empty}>Loading...</p>
      ) : articles.length === 0 ? (
        <p style={s.empty}>No articles found.</p>
      ) : (
        <div style={s.grid}>
          {articles.map((a) => (
            <Link to={`/article/${a.slug}`} key={a._id} style={{ textDecoration: 'none' }}>
              <article
                style={s.card}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                {a.coverImage && (
                  <img
                    src={a.coverImage.startsWith('http') ? a.coverImage : `${API}${a.coverImage}`}
                    alt={a.title}
                    style={s.cardImg}
                  />
                )}
                <div style={s.cardBody}>
                  <span style={s.tag}>{a.category}</span>
                  <h3 style={s.cardTitle}>{a.title}</h3>
                  <p style={s.cardExcerpt}>{a.excerpt}</p>
                  {a.tags?.length > 0 && (
                    <div style={s.tags}>
                      {a.tags.map((t, i) => <span key={i} style={s.tagPill}>{t}</span>)}
                    </div>
                  )}
                  <p style={s.cardDate}>
                    {new Date(a.publishedAt || a.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
