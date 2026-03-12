const styles = {
  footer: {
    borderTop: '1px solid #e5e7eb',
    padding: '40px 24px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '0.85rem',
    marginTop: 80,
  },
};

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <p>© {new Date().getFullYear()} Ayush. All rights reserved.</p>
    </footer>
  );
}
