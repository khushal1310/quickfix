"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ fontFamily: 'sans-serif', padding: '40px', background: '#0f0f0f', color: '#fff' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', background: '#1a1a1a', borderRadius: '16px', padding: '32px', border: '1px solid #333' }}>
          <h2 style={{ color: '#e1306c', marginBottom: '16px' }}>⚠️ QuickFix — Crash Detected</h2>
          <p style={{ color: '#999', marginBottom: '16px' }}>A client-side error occurred. Error details:</p>
          <pre style={{ background: '#0a0a0a', padding: '16px', borderRadius: '8px', overflowX: 'auto', fontSize: '13px', color: '#ff6b6b', border: '1px solid #333', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {error?.message || 'Unknown error'}
            {'\n\n'}
            {error?.stack || ''}
          </pre>
          <button
            onClick={reset}
            style={{ marginTop: '24px', background: '#e1306c', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
