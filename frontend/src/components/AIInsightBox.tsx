interface AIInsightBoxProps {
  totalSources?: number;
  newsSources?: number;
  paperSources?: number;
  articleSources?: number;
  storiesSelected?: number;
}

export default function AIInsightBox({
  totalSources = 0,
  newsSources = 0,
  paperSources = 0,
  articleSources = 0,
  storiesSelected = 1,
}: AIInsightBoxProps) {
  const hasStats = totalSources > 0;

  return (
    <div
      style={{
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '40px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
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
        <div style={{ flex: 1 }}>
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
              {hasStats ? totalSources.toLocaleString() : '...'} sources
            </strong>{' '}
            and selected today&apos;s most important AI {storiesSelected === 1 ? 'story' : 'stories'}. Here&apos;s what
            matters.
          </p>
          {hasStats && (
            <div
              style={{
                display: 'flex',
                gap: '16px',
                marginTop: '12px',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ color: '#3B82F6' }}>●</span> {newsSources} news
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ color: '#10B981' }}>●</span> {paperSources} papers
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ color: '#F59E0B' }}>●</span> {articleSources} articles
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                → {storiesSelected} selected
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
