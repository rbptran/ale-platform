import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const setAuth  = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verified = searchParams.get('verified');
  const verifyMsg = searchParams.get('msg');
  const timedOut = searchParams.get('reason') === 'timeout';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0f172a,#1e1b4b)',
                  display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:40, width:'100%', maxWidth:400,
                    boxShadow:'0 25px 60px rgba(0,0,0,.4)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🧠</div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1e293b', margin:0 }}>ALE Platform</h1>
          <p style={{ color:'#64748b', fontSize:13, marginTop:4 }}>Sign in to continue learning</p>
        </div>
        {timedOut && (
          <div style={{ background:'#fffbeb', border:'1px solid #fde68a', color:'#92400e',
                        padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>
            ⏱ Your session expired due to inactivity. Please log in again.
          </div>
        )}
        {verified === 'true' && (
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#15803d',
                        padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>
            ✅ Email verified! You can now log in.
          </div>
        )}
        {verified === 'error' && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626',
                        padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>
            Verification failed ({verifyMsg?.replace(/_/g,' ')}). Please request a new link.
          </div>
        )}
        {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626',
                                padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          {[{label:'Email', type:'email', val:email, set:setEmail}, {label:'Password', type:'password', val:password, set:setPassword}].map(f => (
            <div key={f.label} style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>{f.label}</label>
              <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} required
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #e2e8f0', borderRadius:10,
                         fontSize:14, outline:'none', boxSizing:'border-box' }} />
            </div>
          ))}
          <div style={{ textAlign:'right', marginTop:-8, marginBottom:16 }}>
            <Link to="/forgot-password" style={{ fontSize:13, color:'#4f46e5', fontWeight:600 }}>
              Forgot password?
            </Link>
          </div>
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:13, background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
                     color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700,
                     cursor:loading?'not-allowed':'pointer', opacity:loading?.6:1 }}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>
        <p style={{ textAlign:'center', fontSize:13, color:'#64748b', marginTop:20 }}>
          No account? <Link to="/register" style={{ color:'#4f46e5', fontWeight:600 }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
