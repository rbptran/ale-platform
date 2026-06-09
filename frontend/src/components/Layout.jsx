import { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import { BadgeToastProvider } from './BadgeToast';
import { useIsMobile } from '../hooks/useWindowSize';
import useInactivityTimeout from '../hooks/useInactivityTimeout';

const NAV = [
  { to: '/dashboard',    icon: '🏠', label: 'Dashboard' },
  { to: '/courses',      icon: '📚', label: 'My Courses' },
  { to: '/skills',       icon: '📊', label: 'Skills' },
  { to: '/achievements', icon: '🏆', label: 'Achievements' },
  { to: '/community',    icon: '💬', label: 'Community' },
  { to: '/tutor',        icon: '🤖', label: 'AI Tutor' },
  { to: '/path',         icon: '🗺️', label: 'Learning Path' },
  { to: '/mentors',      icon: '👨‍🏫', label: 'Mentors' },
  { to: '/leaderboard',  icon: '🏆', label: 'Leaderboard' },
  { to: '/profile',      icon: '⚙️', label: 'Profile' },
];

// Admin-only nav item shown below a divider when user.role === 'admin'
const ADMIN_NAV = [
  { to: '/admin/courses', icon: '🛠️', label: 'Manage Courses' },
];

export default function Layout() {
  useInactivityTimeout(); // session timeout — redirects to /login?reason=timeout after 30 min inactivity
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const user    = useAuthStore((s) => s.user);
  const logout  = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    try { await api.post('/auth/logout', { refreshToken }); } catch {}
    logout();
    navigate('/login');
  };

  // On mobile: sidebar is an overlay drawer
  // On desktop: sidebar is inline, collapsible
  const showSidebar = isMobile ? mobileOpen : true;
  const sbW = isMobile ? 260 : (collapsed ? 72 : 260);
  const showLabels = isMobile ? true : !collapsed;

  const navLink = ({ to, icon, label }) => (
    <NavLink key={to} to={to} style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: 12,
      padding: !showLabels ? '10px' : '10px 16px',
      color: isActive ? '#fff' : 'rgba(255,255,255,.6)',
      background: isActive ? '#4f46e5' : 'transparent',
      borderRadius: 8, margin: '2px 0', fontSize: 14,
      textDecoration: 'none', transition: 'all .15s',
      justifyContent: !showLabels ? 'center' : 'flex-start',
      boxShadow: isActive ? '0 2px 8px rgba(79,70,229,.4)' : 'none',
    })}>
      <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      {showLabels && <span>{label}</span>}
    </NavLink>
  );

  const sidebar = (
    <div style={{
      width: sbW, background: '#0f172a', display: 'flex', flexDirection: 'column',
      flexShrink: 0, transition: 'width .25s', overflow: 'hidden',
      ...(isMobile ? {
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 300,
        boxShadow: '4px 0 24px rgba(0,0,0,.4)',
      } : {}),
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12,
                    padding: (!showLabels) ? '20px 18px' : '20px 20px 16px',
                    borderBottom: '1px solid rgba(255,255,255,.08)',
                    justifyContent: (!showLabels) ? 'center' : 'flex-start' }}>
        <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#4f46e5,#06b6d4)',
                      borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0 }}>🧠</div>
        {showLabels && (
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>ALE Platform</div>
            <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 10, letterSpacing: '.5px' }}>AUTONOMOUS LEARNING</div>
          </div>
        )}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)',
                     fontSize: 20, cursor: 'pointer', padding: 4, flexShrink: 0 }}>✕</button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {showLabels && (
          <div style={{ padding: '4px 8px 8px', fontSize: 10, color: 'rgba(255,255,255,.3)',
                        letterSpacing: '1px', textTransform: 'uppercase' }}>MENU</div>
        )}
        {NAV.map(navLink)}

        {/* Admin section — visible only to admins */}
        {isAdmin && (
          <>
            <div style={{ margin: '12px 8px 8px', borderTop: '1px solid rgba(255,255,255,.08)' }} />
            {showLabels && (
              <div style={{ padding: '4px 8px 8px', fontSize: 10, color: 'rgba(255,255,255,.3)',
                            letterSpacing: '1px', textTransform: 'uppercase' }}>ADMIN</div>
            )}
            {ADMIN_NAV.map(navLink)}
          </>
        )}
      </nav>

      {/* User footer */}
      <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#7c3aed,#db2777)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
            {initials}
          </div>
          {showLabels && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                            overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 11 }}>{user?.role}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden',
                  fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Desktop inline sidebar */}
      {!isMobile && sidebar}

      {/* Mobile overlay sidebar + backdrop */}
      {isMobile && mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 299 }} />
          {sidebar}
        </>
      )}

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{ height: 56, background: '#fff', borderBottom: '1px solid #e2e8f0',
                      display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0 }}>
          <button onClick={() => isMobile ? setMobileOpen(o => !o) : setCollapsed(c => !c)}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
                     color: '#64748b', padding: 4, flexShrink: 0 }}>
            ☰
          </button>
          <div style={{ flex: 1 }} />
          {!isMobile && (
            <span style={{ fontSize: 13, color: '#64748b' }}>Welcome, {user?.name}</span>
          )}
          {isAdmin && (
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#ede9fe',
                           color: '#4f46e5', fontWeight: 700 }}>Admin</span>
          )}
          <div style={{ width: 34, height: 34, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#7c3aed,#db2777)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
            {initials}
          </div>
          <button onClick={handleLogout}
            style={{ padding: '6px 12px', borderRadius: 8, background: '#f1f5f9',
                     border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 13, color: '#64748b',
                     whiteSpace: 'nowrap' }}>
            {isMobile ? '↩' : 'Sign out'}
          </button>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#f1f5f9' }}>
          <BadgeToastProvider>
            <Outlet />
          </BadgeToastProvider>
        </div>
      </div>
    </div>
  );
}
