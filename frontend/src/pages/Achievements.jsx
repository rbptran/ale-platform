import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

export default function Achievements() {
  const { data, isLoading } = useQuery({
    queryKey: ['badges'],
    queryFn: () => api.get('/badges').then(r => r.data),
    staleTime: 30_000,
  });

  const badges = data?.badges || [];
  const earned = badges.filter(b => b.earned);
  const locked = badges.filter(b => !b.earned);

  const BG_CYCLE = ['#ede9fe','#dcfce7','#fef3c7','#dbeafe','#fee2e2','#f0fdf4','#fdf4ff','#f0f9ff','#fff7ed','#dbeafe'];

  function BadgeCard({ badge, dim }) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px 16px', textAlign: 'center',
                    border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,.05)',
                    opacity: dim ? .4 : 1, transition: 'transform .15s',
                    filter: dim ? 'grayscale(.8)' : 'none' }}
           onMouseEnter={e => !dim && (e.currentTarget.style.transform = 'translateY(-2px)')}
           onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: BG_CYCLE[badges.indexOf(badge) % 10],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28, margin: '0 auto 10px' }}>
          {badge.icon || '🏅'}
        </div>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>{badge.name}</div>
        <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{badge.description}</div>
        {badge.earned && badge.awardedAt && (
          <div style={{ marginTop: 8, fontSize: 10, color: '#10b981', fontWeight: 600 }}>
            ✓ {new Date(badge.awardedAt).toLocaleDateString()}
          </div>
        )}
        {!badge.earned && (
          <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>Locked</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 28, maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Achievements</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          {earned.length} of {badges.length} badges earned
        </p>
      </div>

      {/* Progress bar */}
      {badges.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,.05)', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>Collection Progress</span>
            <span style={{ fontSize: 13, color: '#64748b' }}>{earned.length}/{badges.length}</span>
          </div>
          <div style={{ background: '#e2e8f0', borderRadius: 99, height: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, width: `${(earned.length / badges.length) * 100}%`,
                          background: 'linear-gradient(90deg,#4f46e5,#06b6d4)', transition: 'width .6s ease' }} />
          </div>
        </div>
      )}

      {isLoading ? (
        <p style={{ color: '#94a3b8' }}>Loading badges…</p>
      ) : (
        <>
          {earned.length > 0 && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 14 }}>
                🏆 Earned ({earned.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14, marginBottom: 32 }}>
                {earned.map(b => <BadgeCard key={b.id} badge={b} dim={false} />)}
              </div>
            </>
          )}

          {locked.length > 0 && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#94a3b8', marginBottom: 14 }}>
                🔒 Locked ({locked.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14 }}>
                {locked.map(b => <BadgeCard key={b.id} badge={b} dim={true} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
