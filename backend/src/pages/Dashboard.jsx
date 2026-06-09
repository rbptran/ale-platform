import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';

// ── Tiny reusable components ──────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20,
                  border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,.05)', ...style }}>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color = '#4f46e5' }) {
  return (
    <Card style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 52, height: 52, borderRadius: 12, background: color + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: '#1e293b' }}>{value}</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginTop: 2 }}>{sub}</div>}
      </div>
    </Card>
  );
}

function ProgressBar({ pct, color = '#4f46e5' }) {
  return (
    <div style={{ background: '#e2e8f0', borderRadius: 99, height: 8, overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(pct, 100)}%`,
                    background: pct >= 100 ? '#10b981' : color, transition: 'width .6s ease' }} />
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  const { data: dash, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/profile/dashboard').then(r => r.data),
    staleTime: 30_000,
  });

  const { data: badgesData } = useQuery({
    queryKey: ['badges-earned'],
    queryFn: () => api.get('/badges/earned').then(r => r.data),
    staleTime: 60_000,
  });

  const profile         = dash?.profile;
  const activeEnrolments = dash?.activeEnrolments || [];
  const recentBadges    = badgesData?.badges?.slice(0, 4) || [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ padding: 28, maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>
          {greeting}, {user?.name} 👋
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          {profile?.careerGoal
            ? `On track to become: ${profile.careerGoal}`
            : 'Complete onboarding to set your career goal →'}
        </p>
      </div>

      {/* Stat cards */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ background: '#e2e8f0', borderRadius: 12, height: 92, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          <StatCard icon="⚡" label="Total XP"       value={(profile?.xpTotal || 0).toLocaleString()}   color="#4f46e5" />
          <StatCard icon="🏅" label="Level"          value={`Level ${profile?.level || 1}`}             color="#06b6d4" />
          <StatCard icon="🔥" label="Day Streak"     value={`${profile?.streakDays || 0} days`}          color="#f59e0b" />
          <StatCard icon="📚" label="Active Courses" value={activeEnrolments.length}                     color="#10b981" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>

        {/* Active Courses */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>Active Courses</div>
            <Link to="/courses" style={{ fontSize: 13, color: '#4f46e5', textDecoration: 'none' }}>Browse all →</Link>
          </div>

          {isLoading ? (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>Loading…</p>
          ) : activeEnrolments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
              <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>No courses started yet</div>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>Enrol in a course to track your progress here.</p>
              <Link to="/courses"
                style={{ background: '#4f46e5', color: '#fff', padding: '8px 20px',
                         borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                Browse Courses
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {activeEnrolments.map((e, i) => {
                const pct   = parseFloat(e.progressPct || 0);
                const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b'];
                const color  = pct >= 100 ? '#10b981' : colors[i % colors.length];
                return (
                  <div key={e.courseId || i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                        {e.course?.title || 'Course'}
                      </span>
                      <span style={{ fontSize: 12, color: pct >= 100 ? '#10b981' : '#64748b', fontWeight: 600 }}>
                        {pct >= 100 ? '✓ Complete' : `${pct.toFixed(0)}%`}
                      </span>
                    </div>
                    <ProgressBar pct={pct} color={color} />
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                      {e.course?.level} · {e.course?.estimatedHours}h estimated
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Recent Badges */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>Recent Badges</div>
              <Link to="/achievements" style={{ fontSize: 13, color: '#4f46e5', textDecoration: 'none' }}>All →</Link>
            </div>
            {recentBadges.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 13 }}>
                Complete your first lesson to earn a badge!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {recentBadges.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                                           background: '#f8fafc', borderRadius: 10, padding: '10px 12px' }}>
                    <span style={{ fontSize: 22 }}>{b.badge?.icon || '🏅'}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{b.badge?.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        {new Date(b.awardedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 14 }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { to: '/courses',      icon: '📚', label: 'Browse Courses',   color: '#e0e7ff', text: '#4f46e5' },
                { to: '/tutor',        icon: '🤖', label: 'Ask ARIA',         color: '#e0f2fe', text: '#0284c7' },
                { to: '/skills',       icon: '📊', label: 'View Skills',      color: '#dcfce7', text: '#16a34a' },
                { to: '/path',         icon: '🗺️', label: 'Learning Path',    color: '#fef9c3', text: '#ca8a04' },
              ].map(a => (
                <Link key={a.to} to={a.to}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                           borderRadius: 8, background: a.color, textDecoration: 'none', transition: 'opacity .15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  <span style={{ fontSize: 18 }}>{a.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: a.text }}>{a.label}</span>
                  <span style={{ marginLeft: 'auto', color: a.text, fontSize: 16 }}>→</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
