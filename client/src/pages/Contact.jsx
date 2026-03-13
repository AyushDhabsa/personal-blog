const s = {
  container: { maxWidth: 600, margin: '0 auto', padding: '80px 24px' },
  title: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: '2.2rem',
    fontWeight: 700,
    color: '#111827',
    marginBottom: 12,
  },
  desc: { color: '#6b7280', fontSize: '1rem', marginBottom: 48, lineHeight: 1.7 },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 32,
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#9ca3af',
    marginBottom: 6,
  },
  value: {
    fontSize: '1rem',
    color: '#111827',
    marginBottom: 28,
  },
  link: {
    color: '#111827',
    borderBottom: '1px solid #d1d5db',
    transition: 'border-color 0.2s',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #e5e7eb',
    margin: '28px 0',
  },
  note: {
    fontSize: '0.85rem',
    color: '#9ca3af',
    lineHeight: 1.6,
  },
};

export default function Contact() {
  return (
    <div style={s.container}>
      <h1 style={s.title}>Contact</h1>
      <p style={s.desc}>
        Have a question, collaboration idea, or just want to say hello? 
        Feel free to reach out.
      </p>

      <div style={s.card}>
        <p style={s.label}>Email</p>
        <p style={s.value}>
          <a href="mailto:ayushdhabsa8@gmail.com" style={s.link}>
            ayushdhabsa8@gmail.com
          </a>
        </p>

        <p style={s.label}>Based in</p>
        <p style={s.value}>India</p>

        <hr style={s.divider} />

        <p style={s.note}>
          I typically respond within 24–48 hours. For research-related inquiries, 
          please include relevant context so I can respond more effectively.
        </p>
      </div>
    </div>
  );
}
