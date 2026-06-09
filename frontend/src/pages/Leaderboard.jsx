import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

const TABS = [
  { id: 'xp',     label: '⚡ XP',      sub: 'Total experience points' },
  { id: 'streak', label: '🔥 Streak',   sub: 'Current day streak' },
  { id: 'badges', label: '🏅 Badges',   sub: 'Badges earned' },
];

const RANK_STYLE = {
  1: { bg: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', label: '🥇' },
  2: { bg: 'linear-gradient(135deg,#94a3b8,#64748b)', color: '#fff', label: '🥈' },
  3: { bg: 'linear-gradient(135deg,#b45309,#92400e)', color: '#fff', label: '🥉' },
};

function RankBadge({ rank }) {
  const s = RANK_STYLE[rank];
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: s ? s.bg : '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: s ? 18 : 13, fontWeight: 700,
                  color: s ? s.color : '#64748b',
                  boxShadow: s ? '0 2px 8px rgba(0,0,0,.2)' : 'none' }}>
      {s ? s.label : rank}
    </div>
  );
}

function Avatar({ name, size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg,#4f46e5,#06b6d4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: size * 0.36 }}>
      {name?.[0] ?? '?'}
    </div>
  );
}

function LeaderRow({ entry, valueLabel, isMe }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px',
      background: isMe ? '#e0e7ff' : '#fff',
      border: `1px solid ${isMe ? '#c7d2fe' : '#f1f5f9'}`,
      borderRadius: 10, marginBottom: 6,
      boxShadow: isMe ? '0 2px 8px rgba(79,70,229,.15)' : '0 1px 2px rgba(0,0,0,.04)',
    }}>
      <RankBadge rank={entry.rank} />
      <Avatar name={entry.user?.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: isMe ? 700 : 600, fontSize: 14, color: '#1e293b',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.user?.name ?? 'Unknown'}
          {isMe && <span style={{ marginLeft: 8, fontSize: 11, color: '#4f46e5',
                                   fontWeight: 700, background: '#e0e7ff',
                                   padding: '1px 7px', borderRadius: 99 }}>You</span>}
        </div>
        {entry.level && (
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Level {entry.level}</div>
        )}
      </div>
      <div style={{ fontWeight: 700, fontSize: 16, color: isMe ? '#4f46e5' : '#1e293b',
                    flexShrink: 0 }}>
        {valueLabel}
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const [tab, setTab] = useState('xp');
  const currentUser   = useAuthStore(s => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.get('/leaderboard').then(r => r.data),
    staleTime: 60_000,
  });

  const me = data?.me;

  const rows = {
    xp:     (data?.topXp     || []).map(e => ({ ...e, valueLabel: `${e.xpTotal.toLocaleString()} XP` })),
    streak: (data?.topStreak || []).map(e => ({ ...e, valueLabel: `${e.streakDays}d` })),
    badges: (data?.topBadges || []).map(e => ({ ...e, valueLabel: `${e.badgeCount} 🏅` })),
  };

  const myRank = { xp: me?.xpRank, streak: me?.streakRank, badges: me?.badgeRank };
  const myValue = {
    xp:     `${(me?.xpTotal ?? 0).toLocaleString()} XP`,
    streak: `${me?.streakDays ?? 0}d`,
    badges: `${me?.badgeCount ?? 0} 🏅`,
  };

  // Check if current user is already visible in top list
  const myIdInList = rows[tab].some(e => e.user?.id === currentUser?.id);

  return (
    <div style={{ padding: 28, maxWidth: 720, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Leaderboard</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Top learners on the ALE platform.
        </p>
      </div>

      {/* My stats strip */}
      {me && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Your XP',     value: me.xpTotal.toLocaleString(), sub: `Rank #${me.xpRank}`,     icon: '⚡' },
            { label: 'Your Streak', value: `${me.streakDays}d`,         sub: `Rank #${me.streakRank}`, icon: '🔥' },
            { label: 'Your Badges', value: me.badgeCount,               sub: `Rank #${me.badgeRank}`,  icon: '🏅' },
          ].map(({ label, value, sub, icon }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px',
                                      border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ fontSize: 22 }}>{icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '4px 0 2px' }}>{value}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
                    overflow: 'hidden', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer',
                     background: tab === t.id ? '#4f46e5' : 'transparent',
                     color: tab === t.id ? '#fff' : '#64748b', transition: '.15s' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
            <div style={{ fontSize: 11, opacity: .8, marginTop: 1 }}>{t.sub}</div>
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ background: '#e2e8f0', borderRadius: 10, height: 60,
                                   animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : rows[tab].length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', background: '#fff',
                      borderRadius: 12, border: '1px solid #e2e8f0', color: '#94a3b8' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
          No data yet — complete lessons to appear here!
        </div>
      ) : (
        <>
          {rows[tab].map(entry => (
            <LeaderRow
              key={entry.user?.id ?? entry.rank}
              entry={entry}
              valueLabel={entry.valueLabel}
              isMe={entry.user?.id === currentUser?.id}
            />
          ))}

          {/* Show current user's rank if not in top list */}
          {!myIdInList && me && (
            <>
              <div style={{ textAlign: 'center', fontSize: 18, color: '#cbd5e1', margin: '6px 0' }}>⋯</div>
              <LeaderRow
                entry={{
                  rank: myRank[tab],
                  user: { id: currentUser?.id, name: currentUser?.name },
                  level: me.level,
                  valueLabel: myValue[tab],
                }}
                valueLabel={myValue[tab]}
                isMe
              />
            </>
          )}
        </>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:.5} }`}</style>
    </div>
  );
}
