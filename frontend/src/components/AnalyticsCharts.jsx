import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

// ── Helpers ──────────────────────────────────────────────────────────────────
function isoWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function weekLabel(date) {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

// ── XP Over Time — Line Chart ─────────────────────────────────────────────────
function XPLineChart({ events }) {
  const W = 520, H = 160, PAD = { t: 16, r: 16, b: 32, l: 48 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;

  // Last 30 days, daily XP
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const dailyXP = {};
  for (const ev of events) {
    if (ev.eventType !== 'lesson_completed') continue;
    const day = ev.occurredAt?.slice(0, 10);
    if (!day || !days.includes(day)) continue;
    dailyXP[day] = (dailyXP[day] || 0) + (ev.metadata?.xpEarned || 0);
  }

  // Cumulative
  let cum = 0;
  const points = days.map(d => {
    cum += dailyXP[d] || 0;
    return cum;
  });

  const maxVal = Math.max(...points, 1);
  const coords = points.map((v, i) => {
    const x = PAD.l + (i / (days.length - 1)) * chartW;
    const y = PAD.t + chartH - (v / maxVal) * chartH;
    return [x, y];
  });

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(' ');
  const areaD = pathD + ` L${coords[coords.length-1][0].toFixed(1)},${(PAD.t + chartH).toFixed(1)} L${PAD.l},${(PAD.t + chartH).toFixed(1)} Z`;

  // Y axis labels
  const yLabels = [0, Math.round(maxVal / 2), maxVal];

  // X axis: show every 7th day
  const xLabels = days.filter((_, i) => i % 7 === 0 || i === days.length - 1);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {yLabels.map((v, i) => {
        const y = PAD.t + chartH - (v / maxVal) * chartH;
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
              stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{v}</text>
          </g>
        );
      })}
      {/* Area fill */}
      <path d={areaD} fill="url(#xpGrad)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* X axis labels */}
      {xLabels.map(day => {
        const i = days.indexOf(day);
        const x = PAD.l + (i / (days.length - 1)) * chartW;
        return (
          <text key={day} x={x} y={H - 4} textAnchor="middle" fontSize="9" fill="#94a3b8">
            {formatDate(day)}
          </text>
        );
      })}
      {/* Dot at last point */}
      {coords.length > 0 && (
        <circle cx={coords[coords.length-1][0]} cy={coords[coords.length-1][1]}
          r="4" fill="#4f46e5" stroke="#fff" strokeWidth="2" />
      )}
    </svg>
  );
}

// ── Lessons Per Week — Bar Chart ──────────────────────────────────────────────
function LessonsBarChart({ events }) {
  const W = 520, H = 160, PAD = { t: 16, r: 16, b: 32, l: 36 };
  const NUM_WEEKS = 8;
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;

  // Build last 8 weeks
  const weeks = [];
  for (let i = NUM_WEEKS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    weeks.push({ label: weekLabel(d), weekKey: `${d.getFullYear()}-${isoWeek(d)}`, count: 0 });
  }

  for (const ev of events) {
    if (ev.eventType !== 'lesson_completed') continue;
    const d = new Date(ev.occurredAt);
    const key = `${d.getFullYear()}-${isoWeek(d)}`;
    const w = weeks.find(w => w.weekKey === key);
    if (w) w.count++;
  }

  const maxCount = Math.max(...weeks.map(w => w.count), 1);
  const barW = (chartW / NUM_WEEKS) * 0.6;
  const gap   = chartW / NUM_WEEKS;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {/* Grid */}
      {[0, Math.ceil(maxCount / 2), maxCount].map((v, i) => {
        const y = PAD.t + chartH - (v / maxCount) * chartH;
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
              stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />
            <text x={PAD.l - 4} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{v}</text>
          </g>
        );
      })}
      {/* Bars */}
      {weeks.map((w, i) => {
        const x = PAD.l + i * gap + gap * 0.2;
        const barH = (w.count / maxCount) * chartH;
        const y = PAD.t + chartH - barH;
        const isThisWeek = i === weeks.length - 1;
        return (
          <g key={w.weekKey}>
            <rect x={x} y={y} width={barW} height={Math.max(barH, 2)}
              rx="4" fill={isThisWeek ? '#4f46e5' : '#a5b4fc'} />
            <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="#94a3b8">
              {w.label}
            </text>
            {w.count > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="9" fill="#4f46e5" fontWeight="700">
                {w.count}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Skill Radar Chart ─────────────────────────────────────────────────────────
function SkillRadar({ skills }) {
  const SIZE = 200, CX = 100, CY = 100, R = 75;
  const top = skills.filter(s => s.proficiencyPct > 0).slice(0, 6);
  if (top.length < 3) return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: 13 }}>
      Complete assessments to build your radar chart.
    </div>
  );

  const n = top.length;
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const rings = [0.25, 0.5, 0.75, 1];
  const axes = top.map((_, i) => ({
    x: CX + R * Math.cos(angle(i)),
    y: CY + R * Math.sin(angle(i)),
  }));

  const dataPoints = top.map((s, i) => {
    const r = (s.proficiencyPct / 100) * R;
    return {
      x: CX + r * Math.cos(angle(i)),
      y: CY + r * Math.sin(angle(i)),
    };
  });

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';

  return (
    <svg width="100%" viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <defs>
        <linearGradient id="radarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {/* Concentric rings */}
      {rings.map(r => {
        const pts = top.map((_, i) => ({
          x: CX + R * r * Math.cos(angle(i)),
          y: CY + R * r * Math.sin(angle(i)),
        }));
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';
        return <path key={r} d={d} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
      })}
      {/* Axis lines */}
      {axes.map((a, i) => (
        <line key={i} x1={CX} y1={CY} x2={a.x} y2={a.y} stroke="#e2e8f0" strokeWidth="1" />
      ))}
      {/* Data polygon */}
      <path d={dataPath} fill="url(#radarGrad)" stroke="#4f46e5" strokeWidth="2" />
      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#4f46e5" stroke="#fff" strokeWidth="1.5" />
      ))}
      {/* Labels */}
      {top.map((s, i) => {
        const lx = CX + (R + 14) * Math.cos(angle(i));
        const ly = CY + (R + 14) * Math.sin(angle(i));
        const anchor = lx < CX - 5 ? 'end' : lx > CX + 5 ? 'start' : 'middle';
        return (
          <text key={i} x={lx} y={ly + 3} textAnchor={anchor} fontSize="9" fill="#475569" fontWeight="600">
            {s.name.length > 10 ? s.name.slice(0, 10) + '…' : s.name}
          </text>
        );
      })}
    </svg>
  );
}

// ── Main AnalyticsCharts component ────────────────────────────────────────────
export default function AnalyticsCharts() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: analyticsData, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get(`/profile/analytics?from=${thirtyDaysAgo.toISOString()}`).then(r => r.data),
    staleTime: 60_000,
  });

  const { data: skillsData } = useQuery({
    queryKey: ['skills'],
    queryFn: () => api.get('/skills').then(r => r.data),
    staleTime: 60_000,
  });

  const events = analyticsData?.events || [];
  const skills = skillsData?.skills || [];

  const totalLessons = events.filter(e => e.eventType === 'lesson_completed').length;
  const totalXP      = events.reduce((s, e) => s + (e.metadata?.xpEarned || 0), 0);

  const chartCard = (title, sub, children) => (
    <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px',
                  border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );

  if (loadingAnalytics) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginTop: 24 }}>
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{ background: '#e2e8f0', borderRadius: 12, height: 220,
                               animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  );

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>
          📈 Your Progress (Last 30 Days)
        </h2>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#64748b' }}>
          <span>⚡ <strong style={{ color: '#4f46e5' }}>{totalXP}</strong> XP earned</span>
          <span>📖 <strong style={{ color: '#4f46e5' }}>{totalLessons}</strong> lessons completed</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 220px', gap: 20 }}>
        {chartCard('XP Over Time', 'Cumulative XP earned from completed lessons',
          <XPLineChart events={events} />
        )}
        {chartCard('Lessons Per Week', 'Number of lessons completed each week',
          <LessonsBarChart events={events} />
        )}
        {chartCard('Skill Radar', 'Your top assessed skills',
          <SkillRadar skills={skills} />
        )}
      </div>
    </div>
  );
}
