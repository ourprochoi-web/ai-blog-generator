interface AIInsightBoxProps {
  articlesScanned?: number;
}

export default function AIInsightBox({ articlesScanned = 2847 }: AIInsightBoxProps) {
  return (
    <div
      style={{
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '40px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          backgroundColor: '#E0E7FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          flexShrink: 0,
        }}
      >
        🤖
      </div>
      <div>
        <p
          style={{
            fontSize: '15px',
            lineHeight: '1.6',
            margin: 0,
            color: '#374151',
          }}
        >
          Good morning! I scanned{' '}
          <strong style={{ color: '#1a1a1a' }}>
            {articlesScanned.toLocaleString()} articles
          </strong>{' '}
          overnight and selected today&apos;s most important AI stories. Here&apos;s what
          matters.
        </p>
      </div>
    </div>
  );
}
