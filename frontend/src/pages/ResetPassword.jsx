import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';

export default function ResetPassword() {
  const [searchParams]          = useSearchParams();
  const token                   = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);
  const navigate                = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return; }
    if (!token)               { setError('Invalid or missing reset token'); return; }
    setError(''); setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login?verified=true'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed. The link may have expired.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0f172a,#1e1b4b)',
                  display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:40, width:'100%', maxWidth:400,
                    boxShadow:'0 25px 60px rgba(0,0,0,.4)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🔒</div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1e293b', margin:0 }}>New Password</h1>
          <p style={{ color:'#64748b', fontSize:13, marginTop:4 }}>Choose a strong password</p>
        </div>

        {!token && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626',
                        padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>
            Invalid reset link. Please request a new one.{' '}
            <Link to="/forgot-password" style={{ color:'#dc2626', fontWeight:600 }}>Try again</Link>
          </div>
        )}

        {done ? (
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#15803d',
                        padding:'14px 16px', borderRadius:10, fontSize:14, textAlign:'center' }}>
            ✅ Password updated! Redirecting to sign in…
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
              {[
                { label:'New password', val:password, set:setPassword },
                { label:'Confirm password', val:confirm, set:setConfirm },
              ].map(f => (
                <div key={f.label} style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>
                    {f.label}
                  </label>
                  <input type="password" value={f.val} onChange={e => f.set(e.target.value)}
                    required minLength={8} placeholder="Min 8 characters"
                    style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #e2e8f0',
                             borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box' }} />
                </div>
              ))}
              <button type="submit" disabled={loading || !token}
                style={{ width:'100%', padding:13, background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
                         color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700,
                         cursor:(loading||!token)?'not-allowed':'pointer', opacity:(loading||!token)?0.6:1 }}>
                {loading ? 'Saving…' : 'Set New Password →'}
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
