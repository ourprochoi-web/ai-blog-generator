export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid #E5E7EB',
        backgroundColor: '#FFFFFF',
        padding: '40px 24px',
      }}
    >
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
            className="font-serif"
            style={{
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            AI Daily Brief
          </span>
        </div>
        <p
          style={{
            fontSize: '14px',
            color: '#6B7280',
            marginBottom: '16px',
          }}
        >
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
              style={{
                fontSize: '13px',
                color: '#9CA3AF',
                textDecoration: 'none',
              }}
            >
              {item}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
