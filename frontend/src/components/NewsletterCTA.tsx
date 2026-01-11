'use client';

import { useState } from 'react';

export default function NewsletterCTA() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement newsletter subscription
    console.log('Subscribe:', email);
    setEmail('');
    alert('Thanks for subscribing!');
  };

  return (
    <div
      style={{
        marginTop: '64px',
        padding: '32px',
        backgroundColor: '#1a1a1a',
        borderRadius: '16px',
        textAlign: 'center',
      }}
    >
      <h3
        className="font-serif"
        style={{
          fontSize: '24px',
          fontWeight: '400',
          color: '#fff',
          marginBottom: '12px',
        }}
      >
        Never miss an edition
      </h3>
      <p
        style={{
          fontSize: '15px',
          color: '#9CA3AF',
          marginBottom: '24px',
        }}
      >
        Get AI Daily Brief delivered to your inbox, twice a day.
      </p>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: '8px',
          maxWidth: '400px',
          margin: '0 auto',
        }}
      >
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '15px',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '12px 24px',
            backgroundColor: '#fff',
            color: '#1a1a1a',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          Subscribe
        </button>
      </form>
    </div>
  );
}
