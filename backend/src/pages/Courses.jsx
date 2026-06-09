import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, useQuery as useQ } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/client';

const LEVEL_COLOR = { Beginner: '#dcfce7', Intermediate: '#dbeafe', Advanced: '#fce7f3' };
const LEVEL_TEXT  = { Beginner: '#166534', Intermediate: '#1d4ed8', Advanced: '#9d174d' };
const COURSE_EMOJI = (title) => {
  const t = title.toLowerCase();
  if (t.includes('python'))  return '🐍';
  if (t.includes('sql'))     return '🗄️';
  if (t.includes('machine')) return '🤖';
  if (t.includes('data'))    return '📊';
  if (t.includes('stat'))    return '📐';
  if (t.includes('deep'))    return '🧠';
  return '📚';
};
const COURSE_BG = (title) => {
  const t = title.toLowerCase();
  if (t.includes('python'))  return '#ede9fe';
  if (t.includes('sql'))     return '#dcfce7';
  if (t.includes('machine')) return '#fee2e2';
  if (t.includes('data'))    return '#fef3c7';
  if (t.includes('stat'))    return '#dbeafe';
  return '#f1f5f9';
};

function ProgressBar({ pct }) {
  const color = pct >= 100 ? '#10b981' : '#4f46e5';
  return (
    <div style={{ background: '#e2e8f0', borderRadius: 99, height: 6, overflow: 'hidden', margin: '8px 0 4px' }}>
      <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  );
}

export default function Courses() {
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');
  const queryClient = useQueryClient();

  const { data: catalogData, isLoading } = useQuery({
    queryKey: ['courses', search],
    queryFn: () => api.get('/courses', { params: search ? { search } : {} }).then(r => r.data),
    staleTime: 30_000,
  });

  const { data: enrolData } = useQuery({
    queryKey: ['enrolments'],
    queryFn: () => api.get('/courses/me/enrolments').then(r => r.data),
    staleTime: 15_000,
  });

  const enrolMutation = useMutation({
    mutationFn: (slug) => api.post(`/courses/${slug}/enrol`),
    onSuccess: () => {
      queryClient.invalidateQueries(['enrolments']);
      queryClient.invalidateQueries(['dashboard']);
    },
  });

  const enrolMap = {};
  (enrolData?.enrolments || []).forEach(e => { enrolMap[e.courseId] = e; });

  const courses = (catalogData?.courses || []).map(c => ({
    ...c,
    enrolment: enrolMap[c.id] || null,
    pct: enrolMap[c.id] ? parseFloat(enrolMap[c.id].progressPct) : 0,
    status: enrolMap[c.id]?.status === 'completed' ? 'Completed'
          : enrolMap[c.id] ? 'In Progress'
          : 'Not Started',
  }));

  const filtered = courses.filter(c => {
    if (filter === 'active')    return c.status === 'In Progress';
    if (filter === 'completed') return c.status === 'Completed';
    if (filter === 'new')       return c.status === 'Not Started';
    return true;
  });

  const FILTERS = ['all', 'active', 'completed', 'new'];

  return (
    <div style={{ padding: 28, maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Course Catalogue</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          {courses.length} courses available · {Object.keys(enrolMap).length} enrolled
        </p>
      </div>

      {/* Filters + search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                       background: filter === f ? '#4f46e5' : 'transparent',
                       color: filter === f ? '#fff' : '#64748b', transition: '.15s',
                       textTransform: f === 'all' ? 'capitalize' : undefined }}>
              {f === 'all' ? 'All' : f === 'active' ? 'In Progress' : f === 'completed' ? 'Completed' : 'New'}
            </button>
          ))}
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search courses…"
          style={{ flex: 1, padding: '8px 16px', borderRadius: 10, border: '1px solid #e2e8f0',
                   fontSize: 13, outline: 'none', background: '#fff', minWidth: 160 }} />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ background: '#e2e8f0', borderRadius: 12, height: 220 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 600, color: '#64748b' }}>No courses found</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 20 }}>
          {filtered.map(c => (
            <div key={c.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
                                     boxShadow: '0 1px 3px rgba(0,0,0,.05)', overflow: 'hidden',
                                     display: 'flex', flexDirection: 'column' }}>
              {/* Thumb */}
              <div style={{ height: 110, background: COURSE_BG(c.title),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 52, position: 'relative' }}>
                {COURSE_EMOJI(c.title)}
                <div style={{ position: 'absolute', top: 10, right: 10, padding: '3px 10px',
                              borderRadius: 99, fontSize: 11, fontWeight: 700,
                              background: LEVEL_COLOR[c.level], color: LEVEL_TEXT[c.level] }}>
                  {c.level}
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 6, lineHeight: 1.3 }}>
                  {c.title}
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                  <span>🕐 {c.estimatedHours}h</span>
                  <span style={{ padding: '1px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                                 background: c.status === 'Completed' ? '#dcfce7'
                                           : c.status === 'In Progress' ? '#dbeafe' : '#f1f5f9',
                                 color: c.status === 'Completed' ? '#166534'
                                      : c.status === 'In Progress' ? '#1d4ed8' : '#475569' }}>
                    {c.status}
                  </span>
                </div>

                {c.pct > 0 && (
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                      <span>Progress</span><span>{c.pct.toFixed(0)}%</span>
                    </div>
                    <ProgressBar pct={c.pct} />
                  </div>
                )}

                {/* Tags */}
                {c.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                    {c.tags.slice(0, 3).map(t => (
                      <span key={t} style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: 99, fontSize: 11, color: '#475569' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {!c.enrolment ? (
                    <button
                      disabled={enrolMutation.isPending}
                      onClick={() => enrolMutation.mutate(c.slug)}
                      style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: 'none',
                               background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 13,
                               cursor: enrolMutation.isPending ? 'not-allowed' : 'pointer', opacity: enrolMutation.isPending ? .7 : 1 }}>
                      {enrolMutation.isPending ? 'Enrolling…' : 'Start Learning →'}
                    </button>
                  ) : (
                    <>
                      <CourseModules slug={c.slug} courseId={c.id} />
                      <Link to={`/courses/${c.slug}/assessment`}
                        style={{ display: 'block', padding: '8px 0', borderRadius: 8, border: '1px solid #f59e0b',
                                 background: '#fef9c3', color: '#92400e', fontWeight: 700, fontSize: 12,
                                 textDecoration: 'none', textAlign: 'center' }}>
                        📝 Take Assessment
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Expandable module/lesson list shown on enrolled courses ──────────────────
function CourseModules({ slug }) {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['course-modules', slug],
    queryFn: () => api.get(`/courses/${slug}/modules`).then(r => r.data),
    enabled: open,
  });

  const modules      = data?.modules || [];
  const totalLessons = modules.reduce((s, m) => s + (m.lessons?.length || 0), 0);
  const doneLessons  = modules.reduce((s, m) => s + (m.completedCount || 0), 0);

  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: '1px solid #4f46e5',
                 background: open ? '#e0e7ff' : '#fff', color: '#4f46e5', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
        {open ? '▲ Hide Lessons' : `▼ View Lessons (${doneLessons}/${totalLessons} done)`}
      </button>
      {open && (
        <div style={{ marginTop: 6, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8' }}>Loading…</div>
          ) : modules.map(mod => (
            <div key={mod.id}>
              <div style={{ padding: '8px 12px', background: '#f8fafc', fontSize: 11, fontWeight: 700,
                            color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px',
                            borderBottom: '1px solid #e2e8f0' }}>
                {mod.title}
              </div>
              {(mod.lessons || []).map(l => (
                <Link key={l.id} to={`/courses/${slug}/lessons/${l.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                           textDecoration: 'none', borderBottom: '1px solid #f1f5f9', background: '#fff' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <span style={{ fontSize: 13 }}>
                    {l.completed ? '✅' : l.type === 'video' ? '▶️' : l.type === 'project' ? '🔨' : '📄'}
                  </span>
                  <span style={{ fontSize: 12, color: '#1e293b', flex: 1, lineHeight: 1.3,
                                 textDecoration: l.completed ? 'line-through' : 'none' }}>
                    {l.title}
                  </span>
                  {l.estimatedMins && (
                    <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{l.estimatedMins}m</span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
