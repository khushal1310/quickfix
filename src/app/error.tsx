"use client";

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('QuickFix App Error:', error);
  }, [error]);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '40px', background: '#0f0f0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '600px', background: '#1a1a1a', borderRadius: '16px', padding: '32px', border: '1px solid #333', color: '#fff' }}>
        <h2 style={{ color: '#e1306c', marginBottom: '8px' }}>⚠️ QuickFix Error</h2>
        <p style={{ color: '#999', marginBottom: '16px', fontSize: '14px' }}>Error message (screenshot this for support):</p>
        <pre style={{ background: '#0a0a0a', padding: '16px', borderRadius: '8px', fontSize: '13px', color: '#ff6b6b', border: '1px solid #333', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '300px', overflowY: 'auto' }}>
          {error?.message || 'Unknown error'}
          {'\n\n'}
          {error?.stack?.slice(0, 1000) || ''}
        </pre>
        <button
          onClick={reset}
          style={{ marginTop: '24px', background: '#e1306c', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}
        >
          🔄 Try Again
        </button>
      </div>
    </div>
  );
}
