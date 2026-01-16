export default function Footer() {
  return (
    <footer className="footer">
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          <span style={{ fontSize: '20px' }}>⚡</span>
          <span
            className="font-serif footer-title"
            style={{
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            AI Daily Brief
          </span>
        </div>
        <p className="footer-desc">
          AI-curated news, delivered twice daily.
        </p>
        <div
          style={{
            display: 'flex',
            gap: '24px',
            justifyContent: 'center',
          }}
        >
          {['Twitter', 'LinkedIn', 'RSS'].map((item) => (
            <a
              key={item}
              href="#"
              className="footer-link"
            >
              {item}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
