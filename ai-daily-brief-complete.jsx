import React, { useState } from 'react';

// ============================================
// AI Daily Brief - Complete Blog Design
// Style: Clean Editorial + AI Delivery Concept
// ============================================

// Sample Data
const sampleArticles = [
  {
    id: 1,
    edition: 'morning',
    date: 'January 11, 2026',
    category: 'Breakthrough',
    title: "OpenAI's New Reasoning Model Achieves Human-Level Performance on PhD-Level Science",
    subtitle: "A breakthrough that could reshape how we approach complex scientific problems — and why it matters for everyone.",
    readTime: '8 min read',
    featured: true
  },
  {
    id: 2,
    edition: 'morning',
    date: 'January 11, 2026',
    category: 'Industry',
    title: "Google DeepMind Unveils Gemini 2.5: The Race Intensifies",
    subtitle: "With enhanced multimodal capabilities and improved reasoning, Google fires back in the AI arms race.",
    readTime: '5 min read',
    featured: false
  },
  {
    id: 3,
    edition: 'morning',
    date: 'January 11, 2026',
    category: 'Regulation',
    title: "EU AI Act Takes Effect: What Companies Need to Know",
    subtitle: "The world's first comprehensive AI regulation is now law. Here's how it affects you.",
    readTime: '6 min read',
    featured: false
  }
];

// ============================================
// Components
// ============================================

const Header = ({ onNavigate, currentPage }) => (
  <header style={{
    borderBottom: '1px solid #E8E8E6',
    backgroundColor: '#FFFFFF',
    position: 'sticky',
    top: 0,
    zIndex: 100
  }}>
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      {/* Logo */}
      <div 
        onClick={() => onNavigate('home')}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
      >
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px'
        }}>
          ⚡
        </div>
        <div>
          <h1 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            margin: 0,
            letterSpacing: '-0.5px',
            fontFamily: "'Playfair Display', Georgia, serif",
            color: '#1a1a1a'
          }}>
            AI Daily Brief
          </h1>
          <p style={{ 
            fontSize: '11px', 
            color: '#888', 
            margin: 0,
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '0.5px'
          }}>
            Curated by AI, twice a day
          </p>
        </div>
      </div>

      {/* Edition Toggle */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '4px',
        backgroundColor: '#F5F5F4',
        borderRadius: '24px'
      }}>
        <button style={{
          padding: '8px 16px',
          backgroundColor: '#1a1a1a',
          color: '#fff',
          border: 'none',
          borderRadius: '20px',
          fontSize: '13px',
          fontFamily: "'Inter', sans-serif",
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span>☀️</span> Morning
        </button>
        <button style={{
          padding: '8px 16px',
          backgroundColor: 'transparent',
          color: '#666',
          border: 'none',
          borderRadius: '20px',
          fontSize: '13px',
          fontFamily: "'Inter', sans-serif",
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span>🌙</span> Evening
        </button>
      </div>

      {/* Subscribe */}
      <button style={{
        padding: '10px 20px',
        backgroundColor: '#1a1a1a',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontFamily: "'Inter', sans-serif",
        fontWeight: '500',
        cursor: 'pointer'
      }}>
        Subscribe
      </button>
    </div>
  </header>
);

const AIInsightBox = ({ articlesScanned = 2847 }) => (
  <div style={{
    backgroundColor: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '40px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      backgroundColor: '#E0E7FF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      flexShrink: 0
    }}>
      🤖
    </div>
    <div>
      <p style={{ 
        fontSize: '15px', 
        lineHeight: '1.6',
        margin: 0,
        color: '#374151',
        fontFamily: "'Inter', sans-serif"
      }}>
        Good morning! I scanned <strong style={{ color: '#1a1a1a' }}>{articlesScanned.toLocaleString()} articles</strong> overnight 
        and selected today's most important AI stories. Here's what matters.
      </p>
    </div>
  </div>
);

const FeaturedArticle = ({ article, onRead }) => (
  <article 
    onClick={() => onRead(article)}
    style={{
      marginBottom: '48px',
      cursor: 'pointer'
    }}
  >
    {/* Category & Date */}
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px',
      marginBottom: '16px'
    }}>
      <span style={{
        padding: '4px 10px',
        backgroundColor: '#FEF3C7',
        color: '#92400E',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontFamily: "'Inter', sans-serif"
      }}>
        {article.category}
      </span>
      <span style={{ 
        fontSize: '13px', 
        color: '#6B7280',
        fontFamily: "'Inter', sans-serif"
      }}>
        {article.date} · {article.readTime}
      </span>
    </div>

    {/* Title */}
    <h2 style={{
      fontSize: '36px',
      fontWeight: '400',
      lineHeight: '1.25',
      marginBottom: '16px',
      letterSpacing: '-0.5px',
      fontFamily: "'Playfair Display', Georgia, serif",
      color: '#1a1a1a'
    }}>
      {article.title}
    </h2>

    {/* Subtitle */}
    <p style={{
      fontSize: '18px',
      color: '#4B5563',
      lineHeight: '1.6',
      margin: 0,
      fontFamily: "'Inter', sans-serif",
      fontWeight: '400'
    }}>
      {article.subtitle}
    </p>

    {/* Read More */}
    <div style={{
      marginTop: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#1a1a1a',
      fontSize: '14px',
      fontWeight: '500',
      fontFamily: "'Inter', sans-serif"
    }}>
      Read full analysis
      <span style={{ fontSize: '18px' }}>→</span>
    </div>
  </article>
);

const ArticleCard = ({ article, onRead }) => (
  <article 
    onClick={() => onRead(article)}
    style={{
      padding: '24px 0',
      borderBottom: '1px solid #E5E7EB',
      cursor: 'pointer'
    }}
  >
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px',
      marginBottom: '12px'
    }}>
      <span style={{
        fontSize: '12px',
        color: '#6B7280',
        fontFamily: "'Inter', sans-serif"
      }}>
        {article.category}
      </span>
      <span style={{ color: '#D1D5DB' }}>·</span>
      <span style={{
        fontSize: '12px',
        color: '#6B7280',
        fontFamily: "'Inter', sans-serif"
      }}>
        {article.readTime}
      </span>
    </div>

    <h3 style={{
      fontSize: '22px',
      fontWeight: '400',
      lineHeight: '1.3',
      marginBottom: '8px',
      fontFamily: "'Playfair Display', Georgia, serif",
      color: '#1a1a1a'
    }}>
      {article.title}
    </h3>

    <p style={{
      fontSize: '15px',
      color: '#6B7280',
      lineHeight: '1.5',
      margin: 0,
      fontFamily: "'Inter', sans-serif"
    }}>
      {article.subtitle}
    </p>
  </article>
);

const HomePage = ({ onReadArticle }) => (
  <div style={{
    backgroundColor: '#FAFAF9',
    minHeight: '100vh'
  }}>
    <main style={{ 
      maxWidth: '720px', 
      margin: '0 auto', 
      padding: '48px 24px' 
    }}>
      {/* AI Insight Box */}
      <AIInsightBox />

      {/* Featured Article */}
      <FeaturedArticle 
        article={sampleArticles[0]} 
        onRead={onReadArticle}
      />

      {/* Divider */}
      <div style={{
        height: '1px',
        backgroundColor: '#E5E7EB',
        margin: '0 0 32px 0'
      }} />

      {/* More Stories Label */}
      <h3 style={{
        fontSize: '12px',
        fontWeight: '600',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '8px',
        fontFamily: "'Inter', sans-serif"
      }}>
        Also in today's brief
      </h3>

      {/* Article List */}
      {sampleArticles.slice(1).map(article => (
        <ArticleCard 
          key={article.id} 
          article={article} 
          onRead={onReadArticle}
        />
      ))}

      {/* Newsletter CTA */}
      <div style={{
        marginTop: '64px',
        padding: '32px',
        backgroundColor: '#1a1a1a',
        borderRadius: '16px',
        textAlign: 'center'
      }}>
        <h3 style={{
          fontSize: '24px',
          fontWeight: '400',
          color: '#fff',
          marginBottom: '12px',
          fontFamily: "'Playfair Display', Georgia, serif"
        }}>
          Never miss an edition
        </h3>
        <p style={{
          fontSize: '15px',
          color: '#9CA3AF',
          marginBottom: '24px',
          fontFamily: "'Inter', sans-serif"
        }}>
          Get AI Daily Brief delivered to your inbox, twice a day.
        </p>
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          <input 
            type="email"
            placeholder="your@email.com"
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '15px',
              fontFamily: "'Inter', sans-serif"
            }}
          />
          <button style={{
            padding: '12px 24px',
            backgroundColor: '#fff',
            color: '#1a1a1a',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif"
          }}>
            Subscribe
          </button>
        </div>
      </div>
    </main>
  </div>
);

const ArticlePage = ({ article, onBack }) => (
  <div style={{
    backgroundColor: '#FAFAF9',
    minHeight: '100vh'
  }}>
    <main style={{ 
      maxWidth: '680px', 
      margin: '0 auto', 
      padding: '48px 24px' 
    }}>
      {/* Back Button */}
      <button 
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#6B7280',
          fontSize: '14px',
          fontFamily: "'Inter', sans-serif",
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          marginBottom: '32px',
          padding: 0
        }}
      >
        <span>←</span> Back to all stories
      </button>

      {/* Article Header */}
      <header style={{ marginBottom: '40px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '20px'
        }}>
          <span style={{
            padding: '4px 10px',
            backgroundColor: '#FEF3C7',
            color: '#92400E',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontFamily: "'Inter', sans-serif"
          }}>
            {article.category}
          </span>
          <span style={{ 
            fontSize: '13px', 
            color: '#6B7280',
            fontFamily: "'Inter', sans-serif"
          }}>
            {article.date} · Morning Edition
          </span>
        </div>

        <h1 style={{
          fontSize: '42px',
          fontWeight: '400',
          lineHeight: '1.2',
          marginBottom: '20px',
          letterSpacing: '-1px',
          fontFamily: "'Playfair Display', Georgia, serif",
          color: '#1a1a1a'
        }}>
          {article.title}
        </h1>

        <p style={{
          fontSize: '20px',
          color: '#4B5563',
          lineHeight: '1.5',
          fontFamily: "'Inter', sans-serif",
          fontWeight: '300'
        }}>
          {article.subtitle}
        </p>
      </header>

      {/* Divider */}
      <div style={{
        height: '1px',
        backgroundColor: '#E5E7EB',
        margin: '0 0 40px 0'
      }} />

      {/* Article Body */}
      <article style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        fontSize: '18px',
        lineHeight: '1.8',
        color: '#374151'
      }}>
        <p style={{ marginBottom: '28px' }}>
          The landscape of artificial intelligence shifted dramatically this week with the announcement of a new reasoning model that has demonstrated unprecedented performance on complex scientific tasks. This isn't just another incremental improvement — it represents a fundamental change in what AI systems can accomplish.
        </p>

        <p style={{ marginBottom: '28px' }}>
          For years, researchers have been working toward systems that can truly reason rather than simply pattern-match. The difference matters: pattern matching finds answers in training data, while reasoning constructs solutions to novel problems. This new model appears to cross that threshold in meaningful ways.
        </p>

        <h2 style={{
          fontSize: '26px',
          fontWeight: '500',
          marginTop: '48px',
          marginBottom: '24px',
          fontFamily: "'Playfair Display', Georgia, serif",
          color: '#1a1a1a'
        }}>
          Why This Matters to You
        </h2>

        <p style={{ marginBottom: '28px' }}>
          For researchers, this means AI can now serve as a genuine collaborator in tackling problems that previously required years of specialized training. For businesses, it opens doors to applications that seemed impossibly far off just months ago. For everyone else, it signals a world where expert-level analysis becomes dramatically more accessible.
        </p>

        {/* Key Insight Box */}
        <div style={{
          backgroundColor: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px'
        }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: '#166534',
            marginBottom: '8px',
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '0.5px'
          }}>
            💡 KEY INSIGHT
          </div>
          <p style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#166534',
            margin: 0,
            fontFamily: "'Inter', sans-serif"
          }}>
            The real story isn't about AI replacing experts — it's about making expertise accessible to everyone. A startup founder can now get PhD-level scientific analysis. A student can explore complex problems with a patient tutor. The playing field is leveling.
          </p>
        </div>

        <p style={{ marginBottom: '28px' }}>
          The benchmarks are striking: 89.4% accuracy on PhD-level science questions, 78.2% on Math Olympiad problems, and near-perfect scores on complex multi-step reasoning tasks. But numbers only tell part of the story. What's more impressive is how the model handles uncertainty — acknowledging when it doesn't know something rather than confabulating an answer.
        </p>

        <blockquote style={{
          borderLeft: '3px solid #1a1a1a',
          paddingLeft: '24px',
          margin: '40px 0',
          fontStyle: 'italic',
          color: '#4B5563',
          fontSize: '20px',
          lineHeight: '1.6'
        }}>
          "We're seeing capabilities emerge that we didn't explicitly train for. The model is making connections across disciplines in ways that surprise even us."
          <footer style={{ 
            marginTop: '12px', 
            fontSize: '14px', 
            color: '#9CA3AF',
            fontStyle: 'normal',
            fontFamily: "'Inter', sans-serif"
          }}>
            — Senior AI Researcher
          </footer>
        </blockquote>

        <h2 style={{
          fontSize: '26px',
          fontWeight: '500',
          marginTop: '48px',
          marginBottom: '24px',
          fontFamily: "'Playfair Display', Georgia, serif",
          color: '#1a1a1a'
        }}>
          The Competitive Landscape
        </h2>

        <p style={{ marginBottom: '28px' }}>
          Google DeepMind has already announced an accelerated timeline for their next Gemini release. Anthropic remains characteristically quiet but is rumored to be close to a major announcement. The AI race, which some thought might be slowing, has clearly entered a new phase.
        </p>

        <p style={{ marginBottom: '28px' }}>
          What makes this moment different from previous cycles of AI hype is the tangible nature of the improvements. These aren't benchmarks that only matter to researchers — they translate directly into real-world capabilities that businesses and individuals can use today.
        </p>

        <h2 style={{
          fontSize: '26px',
          fontWeight: '500',
          marginTop: '48px',
          marginBottom: '24px',
          fontFamily: "'Playfair Display', Georgia, serif",
          color: '#1a1a1a'
        }}>
          Looking Ahead
        </h2>

        <p style={{ marginBottom: '28px' }}>
          The implications extend beyond the laboratory. Healthcare, climate science, materials engineering, drug discovery — virtually every field that relies on complex reasoning stands to benefit from these advances. The question is no longer whether AI will transform these fields, but how quickly the transformation will unfold.
        </p>

        <p style={{ marginBottom: '28px' }}>
          For now, the message is clear: the tools available to solve hard problems just got dramatically better. How we choose to use them will shape the next chapter of human progress.
        </p>
      </article>

      {/* Tags */}
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        marginTop: '48px',
        paddingTop: '24px',
        borderTop: '1px solid #E5E7EB'
      }}>
        {['#AI', '#OpenAI', '#MachineLearning', '#TechNews', '#FutureOfAI'].map(tag => (
          <span 
            key={tag}
            style={{
              padding: '6px 12px',
              backgroundColor: '#F3F4F6',
              borderRadius: '16px',
              fontSize: '13px',
              color: '#4B5563',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* References */}
      <div style={{
        marginTop: '32px',
        padding: '24px',
        backgroundColor: '#F9FAFB',
        borderRadius: '12px'
      }}>
        <h4 style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#6B7280',
          marginBottom: '12px',
          fontFamily: "'Inter', sans-serif",
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          References
        </h4>
        <ul style={{
          margin: 0,
          padding: 0,
          listStyle: 'none'
        }}>
          <li style={{
            fontSize: '14px',
            color: '#4B5563',
            marginBottom: '8px',
            fontFamily: "'Inter', sans-serif"
          }}>
            <a href="#" style={{ color: '#2563EB', textDecoration: 'none' }}>
              OpenAI Research Blog: Introducing O3
            </a>
          </li>
          <li style={{
            fontSize: '14px',
            color: '#4B5563',
            fontFamily: "'Inter', sans-serif"
          }}>
            <a href="#" style={{ color: '#2563EB', textDecoration: 'none' }}>
              arXiv: Advances in AI Reasoning Systems
            </a>
          </li>
        </ul>
      </div>

      {/* Share & Navigate */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '48px',
        paddingTop: '24px',
        borderTop: '1px solid #E5E7EB'
      }}>
        <button 
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#1a1a1a',
            fontSize: '14px',
            fontFamily: "'Inter', sans-serif",
            fontWeight: '500',
            background: 'none',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '10px 16px',
            cursor: 'pointer'
          }}
        >
          <span>←</span> All stories
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{
            padding: '10px 16px',
            backgroundColor: '#1a1a1a',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer'
          }}>
            Share
          </button>
        </div>
      </div>
    </main>
  </div>
);

const Footer = () => (
  <footer style={{
    borderTop: '1px solid #E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: '40px 24px'
  }}>
    <div style={{
      maxWidth: '720px',
      margin: '0 auto',
      textAlign: 'center'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '16px'
      }}>
        <span style={{ fontSize: '20px' }}>⚡</span>
        <span style={{
          fontSize: '16px',
          fontWeight: '600',
          fontFamily: "'Playfair Display', Georgia, serif"
        }}>
          AI Daily Brief
        </span>
      </div>
      <p style={{
        fontSize: '14px',
        color: '#6B7280',
        marginBottom: '16px',
        fontFamily: "'Inter', sans-serif"
      }}>
        AI-curated news, delivered twice daily.
      </p>
      <div style={{
        display: 'flex',
        gap: '24px',
        justifyContent: 'center'
      }}>
        {['Twitter', 'LinkedIn', 'RSS'].map(item => (
          <a 
            key={item}
            href="#"
            style={{
              fontSize: '13px',
              color: '#9CA3AF',
              textDecoration: 'none',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            {item}
          </a>
        ))}
      </div>
    </div>
  </footer>
);

// ============================================
// Main App
// ============================================

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedArticle, setSelectedArticle] = useState(null);

  const handleReadArticle = (article) => {
    setSelectedArticle(article);
    setCurrentPage('article');
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
    setSelectedArticle(null);
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600&display=swap');
      `}</style>

      <Header onNavigate={handleNavigate} currentPage={currentPage} />
      
      <div style={{ flex: 1 }}>
        {currentPage === 'home' && (
          <HomePage onReadArticle={handleReadArticle} />
        )}
        {currentPage === 'article' && selectedArticle && (
          <ArticlePage 
            article={selectedArticle} 
            onBack={() => handleNavigate('home')}
          />
        )}
      </div>

      <Footer />
    </div>
  );
}
