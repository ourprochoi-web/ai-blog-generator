interface AIInsightBoxProps {
  totalSources?: number;
  newsSources?: number;
  paperSources?: number;
  articleSources?: number;
  storiesSelected?: number;
  edition: 'morning' | 'evening';
}

const EDITION_HEADLINES = {
  morning: {
    main: "Start your day informed.",
    sub: "Here's what happened in AI overnight.",
    icon: "🌅",
  },
  evening: {
    main: "End your day with clarity.",
    sub: "The AI stories that matter.",
    icon: "🌙",
  },
};

export default function AIInsightBox({
  totalSources = 0,
  newsSources = 0,
  paperSources = 0,
  articleSources = 0,
  storiesSelected = 1,
  edition,
}: AIInsightBoxProps) {
  const hasStats = totalSources > 0;
  const headline = EDITION_HEADLINES[edition];

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
            backgroundColor: edition === 'morning' ? '#FEF3C7' : '#E0E7FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            flexShrink: 0,
          }}
        >
          {headline.icon}
        </div>
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: '17px',
              lineHeight: '1.5',
              margin: 0,
              color: '#1a1a1a',
              fontWeight: '500',
            }}
          >
            {headline.main}
          </p>
          <p
            style={{
              fontSize: '15px',
              lineHeight: '1.5',
              margin: '4px 0 0 0',
              color: '#4B5563',
            }}
          >
            {headline.sub}
          </p>
          {hasStats && (
            <p
              style={{
                fontSize: '13px',
                lineHeight: '1.6',
                margin: '12px 0 0 0',
                color: '#6B7280',
              }}
            >
              AI analyzed{' '}
              <span style={{ color: '#3B82F6', fontWeight: '500' }}>{newsSources.toLocaleString()} news</span>,{' '}
              <span style={{ color: '#10B981', fontWeight: '500' }}>{paperSources.toLocaleString()} papers</span>, and{' '}
              <span style={{ color: '#F59E0B', fontWeight: '500' }}>{articleSources.toLocaleString()} articles</span>{' '}
              to curate today's{' '}
              <span style={{ color: '#374151', fontWeight: '600' }}>{storiesSelected} {storiesSelected === 1 ? 'story' : 'stories'}</span>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
