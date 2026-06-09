import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';

const NAV = [
  { to: '/dashboard',    icon: '🏠', label: 'Dashboard' },
  { to: '/courses',      icon: '📚', label: 'My Courses' },
  { to: '/skills',       icon: '📊', label: 'Skills' },
  { to: '/achievements', icon: '🏆', label: 'Achievements' },
  { to: '/community',    icon: '💬', label: 'Community' },
  { to: '/tutor',        icon: '🤖', label: 'AI Tutor' },
  { to: '/path',         icon: '🗺️', label: 'Learning Path' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const user    = useAuthStore((s) => s.user);
  const logout  = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    try { await api.post('/auth/logout', { refreshToken }); } catch {}
    logout();
    navigate('/login');
  };

  const sbW = collapsed ? 72 : 260;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Sidebar ── */}
      <div style={{ width: sbW, background: '#0f172a', display: 'flex', flexDirection: 'column',
                    flexShrink: 0, transition: 'width .25s', overflow: 'hidden' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: collapsed ? '20px 18px' : '20px 20px 16px',
                      borderBottom: '1px solid rgba(255,255,255,.08)', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#4f46e5,#06b6d4)',
                        borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, flexShrink: 0 }}>🧠</div>
          {!collapsed && (
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>ALE Platform</div>
              <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 10, letterSpacing: '.5px' }}>AUTONOMOUS LEARNING</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {!collapsed && <div style={{ padding: '4px 8px 8px', fontSize: 10, color: 'rgba(255,255,255,.3)', letterSpacing: '1px', textTransform: 'uppercase' }}>MENU</div>}
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: collapsed ? '10px' : '10px 16px',
              color: isActive ? '#fff' : 'rgba(255,255,255,.6)',
              background: isActive ? '#4f46e5' : 'transparent',
              borderRadius: 8, margin: '2px 0', fontSize: 14,
              textDecoration: 'none', transition: 'all .15s',
              justifyContent: collapsed ? 'center' : 'flex-start',
              boxShadow: isActive ? '0 2px 8px rgba(79,70,229,.4)' : 'none',
            })}>
              <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
               title={collapsed ? user?.name : undefined}>
            <div style={{ width: 36, height: 36, borderRadius: '50%',
                          background: 'linear-gradient(135deg,#7c3aed,#db2777)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {initials}
            </div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 11 }}>{user?.role}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{ height: 64, background: '#fff', borderBottom: '1px solid #e2e8f0',
                      display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, flexShrink: 0 }}>
          <button onClick={() => setCollapsed(c => !c)}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b', padding: 4 }}>
            ☰
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: '#64748b' }}>Welcome, {user?.name}</span>
          <div style={{ width: 36, height: 36, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#7c3aed,#db2777)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {initials}
          </div>
          <button onClick={handleLogout}
            style={{ padding: '6px 14px', borderRadius: 8, background: '#f1f5f9',
                     border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 13, color: '#64748b' }}>
            Sign out
          </button>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#f1f5f9' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
