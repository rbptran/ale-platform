import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function Register() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/register', { name, email, password });
      setRegistered(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  if (registered) {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0f172a,#1e1b4b)',
                    display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
        <div style={{ background:'#fff', borderRadius:20, padding:40, width:'100%', maxWidth:400,
                      boxShadow:'0 25px 60px rgba(0,0,0,.4)', textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📧</div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1e293b', margin:'0 0 12px' }}>Check your email</h1>
          <p style={{ color:'#64748b', fontSize:14, lineHeight:1.6, marginBottom:24 }}>
            We sent a verification link to <strong>{email}</strong>.<br/>
            Click the link in the email to activate your account, then log in.
          </p>
          <Link to="/login" style={{ display:'inline-block', padding:'12px 32px',
            background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff',
            borderRadius:10, fontWeight:700, fontSize:14, textDecoration:'none' }}>
            Go to Login →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0f172a,#1e1b4b)',
                  display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:40, width:'100%', maxWidth:400,
                    boxShadow:'0 25px 60px rgba(0,0,0,.4)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🧠</div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1e293b', margin:0 }}>Create Account</h1>
          <p style={{ color:'#64748b', fontSize:13, marginTop:4 }}>Start your learning journey</p>
        </div>
        {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626',
                                padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          {[{label:'Full Name', type:'text', val:name, set:setName}, {label:'Email', type:'email', val:email, set:setEmail}, {label:'Password (min 8 chars)', type:'password', val:password, set:setPassword}].map(f => (
            <div key={f.label} style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>{f.label}</label>
              <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} required
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #e2e8f0', borderRadius:10,
                         fontSize:14, outline:'none', boxSizing:'border-box' }} />
            </div>
          ))}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:13, background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
                     color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700,
                     cursor:loading?'not-allowed':'pointer', opacity:loading?.6:1 }}>
            {loading ? 'Creating account…' : 'Create Account →'}
          </button>
        </form>
        <p style={{ textAlign:'center', fontSize:13, color:'#64748b', marginTop:20 }}>
          Have an account? <Link to="/login" style={{ color:'#4f46e5', fontWeight:600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
