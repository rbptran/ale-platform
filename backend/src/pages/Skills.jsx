import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

function SkillBar({ name, pct, color, assessed }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{name}</span>
        <span style={{ fontSize: 12, color: assessed ? '#1e293b' : '#94a3b8', fontWeight: 600 }}>
          {assessed ? `${pct.toFixed(0)}%` : 'Not assessed'}
        </span>
      </div>
      <div style={{ background: '#e2e8f0', borderRadius: 99, height: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: color, transition: 'width .6s ease' }} />
      </div>
    </div>
  );
}

const CATEGORY_META = {
  technical:    { label: 'Technical Skills',    icon: '⚙️', color: '#4f46e5' },
  professional: { label: 'Professional Skills', icon: '💼', color: '#06b6d4' },
  leadership:   { label: 'Leadership',          icon: '🏆', color: '#f59e0b' },
  industry:     { label: 'Industry Knowledge',  icon: '🏭', color: '#10b981' },
};

const COLORS = ['#4f46e5','#06b6d4','#f59e0b','#10b981','#8b5cf6','#ef4444','#0ea5e9','#d97706'];

export default function Skills() {
  const { data, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: () => api.get('/skills').then(r => r.data),
    staleTime: 30_000,
  });

  const skills      = data?.skills || [];
  const byCategory  = data?.byCategory || {};
  const domainAvgs  = data?.domainAverages || {};

  const totalAssessed = skills.filter(s => s.assessed).length;
  const overallAvg    = skills.length > 0
    ? (skills.reduce((sum, s) => sum + s.proficiencyPct, 0) / skills.length).toFixed(0)
    : 0;

  return (
    <div style={{ padding: 28, maxWidth: 1000, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Skills Profile</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          {totalAssessed} of {skills.length} skills assessed
        </p>
      </div>

      {/* Overview row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {Object.entries(CATEGORY_META).map(([cat, meta]) => {
          const avg = domainAvgs[cat] || 0;
          return (
            <div key={cat} style={{ background: '#fff', borderRadius: 12, padding: 16,
                                    border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{meta.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{avg}%</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{meta.label}</div>
              <div style={{ background: '#e2e8f0', borderRadius: 99, height: 4, marginTop: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${avg}%`, background: meta.color, borderRadius: 99 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Skill categories */}
      {isLoading ? (
        <p style={{ color: '#94a3b8' }}>Loading skills…</p>
      ) : skills.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center',
                      border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>No skills tracked yet</div>
          <p style={{ color: '#64748b', fontSize: 13 }}>
            Complete course assessments to start building your skill profile.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {Object.entries(byCategory).map(([cat, catSkills]) => {
            const meta = CATEGORY_META[cat] || { label: cat, icon: '📌', color: '#4f46e5' };
            return (
              <div key={cat} style={{ background: '#fff', borderRadius: 12, padding: 20,
                                      border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <span style={{ fontSize: 20 }}>{meta.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{meta.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>
                    avg {domainAvgs[cat] || 0}%
                  </span>
                </div>
                {catSkills.map((s, i) => (
                  <SkillBar
                    key={s.id}
                    name={s.name}
                    pct={s.proficiencyPct}
                    color={COLORS[i % COLORS.length]}
                    assessed={s.assessed}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
