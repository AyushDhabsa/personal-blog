import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api';

const s = {
  hero: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '100px 24px 60px',
    textAlign: 'center',
  },
  greeting: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    marginBottom: 16,
  },
  title: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
    fontWeight: 700,
    lineHeight: 1.2,
    color: '#111827',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#6b7280',
    lineHeight: 1.7,
    maxWidth: 540,
    margin: '0 auto 40px',
  },
  links: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primary: {
    background: '#111827',
    color: '#fff',
    padding: '12px 32px',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: '0.9rem',
    transition: 'opacity 0.2s',
  },
  secondary: {
    border: '1px solid #d1d5db',
    color: '#374151',
    padding: '12px 32px',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  divider: {
    width: 60,
    height: 1,
    background: '#e5e7eb',
    margin: '0 auto 60px',
  },
  section: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '0 24px 80px',
  },
  sectionTitle: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: '1.6rem',
    fontWeight: 600,
    marginBottom: 40,
    color: '#111827',
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
  cardImg: {
    width: '100%',
    height: 200,
    objectFit: 'cover',
    background: '#f3f4f6',
  },
  cardBody: {
    padding: '24px',
  },
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
  cardExcerpt: {
    fontSize: '0.9rem',
    color: '#6b7280',
    lineHeight: 1.6,
  },
  cardDate: {
    fontSize: '0.8rem',
    color: '#9ca3af',
    marginTop: 16,
  },
};

export default function Home() {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    api.getArticles().then(setArticles).catch(console.error);
  }, []);

  const recent = articles.slice(0, 6);
  const API = import.meta.env.VITE_API_URL || '';

  return (
    <>
      <section style={s.hero}>
        <p style={s.greeting}>Welcome</p>
        <h1 style={s.title}>Thoughts, Research & Ideas</h1>
        <p style={s.subtitle}>
          A personal space where I write about things I care about — from technical deep-dives
          and research papers to everyday observations.
        </p>
        <div style={s.links}>
          <Link to="/blog" style={s.primary}>Read the Blog</Link>
          <Link to="/research" style={s.secondary}>View Research</Link>
        </div>
      </section>

      <div style={s.divider} />

      {recent.length > 0 && (
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Recent Posts</h2>
          <div style={s.grid}>
            {recent.map((a) => (
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
        </section>
      )}
    </>
  );
}
