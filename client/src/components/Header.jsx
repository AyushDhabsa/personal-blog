import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const styles = {
  header: {
    borderBottom: '1px solid #e5e7eb',
    background: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  inner: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
  },
  logo: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: '1.4rem',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: '#111827',
  },
  nav: {
    display: 'flex',
    gap: 32,
    alignItems: 'center',
  },
  link: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#6b7280',
    transition: 'color 0.2s',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  activeLink: {
    color: '#111827',
  },
  adminBtn: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#fff',
    background: '#111827',
    padding: '6px 16px',
    borderRadius: 6,
    letterSpacing: '0.3px',
  },
  logoutBtn: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#6b7280',
    padding: '6px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
  },
};

export default function Header() {
  const { admin, logout } = useAuth();
  const location = useLocation();

  const navLink = (to, label) => {
    const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
    return (
      <Link to={to} style={{ ...styles.link, ...(active ? styles.activeLink : {}) }}>
        {label}
      </Link>
    );
  };

  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        <Link to="/" style={styles.logo}>Ayush.</Link>
        <nav style={styles.nav}>
          {navLink('/', 'Home')}
          {navLink('/blog', 'Blog')}
          {navLink('/research', 'Research')}
          {navLink('/contact', 'Contact')}
          {admin ? (
            <>
              <Link to="/admin" style={styles.adminBtn}>Dashboard</Link>
              <button onClick={logout} style={styles.logoutBtn}>Logout</button>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
