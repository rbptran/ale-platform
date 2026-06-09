// src/pages/VerifyEmail.jsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link.');
      return;
    }

    fetch(`${API}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Could not reach the server. Please try again.');
      });
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f1f5f9', fontFamily: "'Segoe UI', Arial, sans-serif",
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
        padding: '40px 48px', maxWidth: 420, width: '100%', textAlign: 'center',
      }}>
        {/* Header gradient bar */}
        <div style={{
          background: 'linear-gradient(135deg,#4f46e5,#06b6d4)',
          borderRadius: 8, padding: '16px 24px', marginBottom: 28,
        }}>
          <h1 style={{ color: '#fff', margin: 0, fontSize: 20 }}>🧠 ALE Platform</h1>
        </div>

        {status === 'verifying' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <h2 style={{ color: '#374151', marginBottom: 8 }}>Verifying your email…</h2>
            <p style={{ color: '#94a3b8' }}>Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={{ color: '#374151', marginBottom: 8 }}>Email Verified!</h2>
            <p style={{ color: '#64748b', marginBottom: 24 }}>
              Your account is now active. You can log in and start learning.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8,
                padding: '12px 32px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >
              Go to Login →
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
            <h2 style={{ color: '#374151', marginBottom: 8 }}>Verification Failed</h2>
            <p style={{ color: '#ef4444', marginBottom: 24 }}>{message}</p>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
              The link may have expired (valid for 24 hours). Log in and use the resend button to get a new link.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8,
                padding: '12px 32px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
