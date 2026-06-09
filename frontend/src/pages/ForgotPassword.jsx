import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0f172a,#1e1b4b)',
                  display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:40, width:'100%', maxWidth:400,
                    boxShadow:'0 25px 60px rgba(0,0,0,.4)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🔑</div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1e293b', margin:0 }}>Reset Password</h1>
          <p style={{ color:'#64748b', fontSize:13, marginTop:4 }}>
            Enter your email and we'll send a reset link
          </p>
        </div>

        {sent ? (
          <div>
            <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#15803d',
                          padding:'14px 16px', borderRadius:10, fontSize:14, marginBottom:24, textAlign:'center' }}>
              ✅ Check your inbox! If that email is registered, you'll receive a reset link shortly.
            </div>
            <p style={{ textAlign:'center', fontSize:13, color:'#64748b' }}>
              <Link to="/login" style={{ color:'#4f46e5', fontWeight:600 }}>← Back to Sign In</Link>
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626',
                            padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom:20 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>
                  Email address
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="you@example.com"
                  style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #e2e8f0',
                           borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box' }} />
              </div>
              <button type="submit" disabled={loading}
                style={{ width:'100%', padding:13, background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
                         color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700,
                         cursor:loading?'not-allowed':'pointer', opacity:loading?0.6:1 }}>
                {loading ? 'Sending…' : 'Send Reset Link →'}
              </button>
            </form>
            <p style={{ textAlign:'center', fontSize:13, color:'#64748b', marginTop:20 }}>
              <Link to="/login" style={{ color:'#4f46e5', fontWeight:600 }}>← Back to Sign In</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
