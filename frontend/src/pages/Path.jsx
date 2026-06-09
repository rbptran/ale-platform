import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/client';

const LEVEL_COLOR = { Beginner: '#dcfce7', Intermediate: '#dbeafe', Advanced: '#fce7f3' };
const LEVEL_TEXT  = { Beginner: '#166534', Intermediate: '#1d4ed8', Advanced: '#9d174d' };

function ProgressRing({ pct, size = 48 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={pct >= 100 ? '#10b981' : '#4f46e5'} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset .6s ease' }} />
    </svg>
  );
}

export default function Path() {
  const [pollingJobId, setPollingJobId] = useState(null);
  const queryClient = useQueryClient();

  // Fetch active path
  const { data: pathData, isLoading } = useQuery({
    queryKey: ['learning-path'],
    queryFn: () => api.get('/path').then(r => r.data),
    staleTime: 30_000,
  });

  // Poll job status
  const { data: jobData } = useQuery({
    queryKey: ['path-job', pollingJobId],
    queryFn: () => api.get(`/path/generate/${pollingJobId}`).then(r => r.data),
    enabled: !!pollingJobId,
    refetchInterval: (data) => {
      if (data?.status === 'complete' || data?.status === 'failed') return false;
      return 2000;
    },
  });

  // Stop polling + refresh path when job completes
  useEffect(() => {
    if (jobData?.status === 'complete') {
      setPollingJobId(null);
      queryClient.invalidateQueries(['learning-path']);
    }
    if (jobData?.status === 'failed') {
      setPollingJobId(null);
    }
  }, [jobData?.status]);

  // Generate path
  const generateMutation = useMutation({
    mutationFn: () => api.post('/path/generate'),
    onSuccess: (res) => setPollingJobId(res.data.jobId),
  });

  // Reorder
  const reorderMutation = useMutation({
    mutationFn: (courseIds) => api.put('/path/reorder', { course_ids: courseIds }),
    onSuccess: () => queryClient.invalidateQueries(['learning-path']),
  });

  const isGenerating = !!pollingJobId || generateMutation.isPending;
  const path = pathData?.path;
  const items = path?.items || [];

  const moveItem = (idx, dir) => {
    const newItems = [...items];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= newItems.length) return;
    [newItems[idx], newItems[swapIdx]] = [newItems[swapIdx], newItems[idx]];
    reorderMutation.mutate(newItems.map(i => i.courseId));
    // Optimistic update
    queryClient.setQueryData(['learning-path'], (old) => ({
      ...old,
      path: { ...old.path, items: newItems },
    }));
  };

  return (
    <div style={{ padding: 28, maxWidth: 900, margin: '0 auto' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Learning Path</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
            {path
              ? `AI-generated for you · ${items.length} courses · Est. completion: ${path.estimatedCompletionDate ?? 'TBD'}`
              : 'No path yet — generate one to get started.'}
          </p>
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={isGenerating}
          style={{ padding: '10px 22px', borderRadius: 10, border: 'none',
                   background: isGenerating ? '#94a3b8' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                   color: '#fff', fontWeight: 700, fontSize: 14, cursor: isGenerating ? 'not-allowed' : 'pointer',
                   display: 'flex', alignItems: 'center', gap: 8 }}>
          {isGenerating ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
              Generating…
            </>
          ) : path ? '⟳ Regenerate Path' : '✨ Generate My Path'}
        </button>
      </div>

      {/* ── Generating banner ────────────────────────────────────── */}
      {isGenerating && (
        <div style={{ background: '#e0e7ff', borderRadius: 12, padding: 20, marginBottom: 24,
                      display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #c7d2fe' }}>
          <div style={{ fontSize: 24, animation: 'spin 1.5s linear infinite' }}>🧠</div>
          <div>
            <div style={{ fontWeight: 600, color: '#3730a3', fontSize: 14 }}>
              ARIA is building your personalised learning path…
            </div>
            <div style={{ fontSize: 12, color: '#6366f1', marginTop: 2 }}>
              Analysing your goals, skills, and course catalogue. This takes ~10 seconds.
            </div>
          </div>
        </div>
      )}

      {/* ── Failed banner ────────────────────────────────────────── */}
      {jobData?.status === 'failed' && (
        <div style={{ background: '#fee2e2', borderRadius: 12, padding: 16, marginBottom: 24,
                      border: '1px solid #fca5a5', color: '#991b1b', fontSize: 14 }}>
          ⚠️ Path generation failed: {jobData.error ?? 'Unknown error'}. Try regenerating.
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────── */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>Loading your path…
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────── */}
      {!isLoading && !path && !isGenerating && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '60px 40px', textAlign: 'center',
                      border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🗺️</div>
          <h2 style={{ color: '#1e293b', fontSize: 20, marginBottom: 8 }}>No learning path yet</h2>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            Click "Generate My Path" and ARIA will analyse your career goal, current skills,
            and available courses to build a personalised sequence.
          </p>
          <button
            onClick={() => generateMutation.mutate()}
            style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                     color: '#fff', border: 'none', borderRadius: 10, fontSize: 15,
                     fontWeight: 700, cursor: 'pointer' }}>
            ✨ Generate My Path
          </button>
        </div>
      )}

      {/* ── Path items ───────────────────────────────────────────── */}
      {path && items.length > 0 && (
        <>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Total Courses',  value: items.length,
                sub: `${items.filter(i => i.enrolment?.status === 'completed').length} completed` },
              { label: 'Est. Completion', value: path.estimatedCompletionDate ?? '—',
                sub: 'based on daily commitment' },
              { label: 'In Progress',
                value: items.filter(i => i.enrolment?.status === 'active').length,
                sub: 'courses active' },
            ].map(({ label, value, sub }) => (
              <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px',
                                        border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{value}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginTop: 2 }}>{label}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Course cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {items.map((item, idx) => {
              const enrolment = item.enrolment;
              const pct = enrolment ? parseFloat(enrolment.progressPct) : 0;
              const isCompleted = enrolment?.status === 'completed';
              const isActive = enrolment?.status === 'active';

              return (
                <div key={item.id} style={{ display: 'flex', gap: 0 }}>
                  {/* ── Timeline connector ── */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                                width: 48, flexShrink: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: isCompleted ? '#10b981' : isActive ? '#4f46e5' : '#e2e8f0',
                                  color: '#fff', fontWeight: 700, fontSize: 12,
                                  border: `3px solid ${isCompleted ? '#d1fae5' : isActive ? '#e0e7ff' : '#f1f5f9'}`,
                                  marginTop: 20 }}>
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    {idx < items.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: isCompleted ? '#10b981' : '#e2e8f0',
                                    minHeight: 20, marginTop: 2 }} />
                    )}
                  </div>

                  {/* ── Card ── */}
                  <div style={{ flex: 1, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
                                boxShadow: '0 1px 3px rgba(0,0,0,.04)', marginBottom: 12, marginLeft: 12,
                                overflow: 'hidden', opacity: isCompleted ? .85 : 1 }}>
                    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>

                      {/* Progress ring */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <ProgressRing pct={pct} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                                      justifyContent: 'center', fontSize: 11, fontWeight: 700,
                                      color: isCompleted ? '#10b981' : '#4f46e5' }}>
                          {isCompleted ? '✓' : `${Math.round(pct)}%`}
                        </div>
                      </div>

                      {/* Course info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', lineHeight: 1.3 }}>
                            {item.course.title}
                          </span>
                          <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                                         background: LEVEL_COLOR[item.course.level],
                                         color: LEVEL_TEXT[item.course.level] }}>
                            {item.course.level}
                          </span>
                          {isCompleted && (
                            <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                                           background: '#d1fae5', color: '#065f46' }}>✓ Complete</span>
                          )}
                          {isActive && (
                            <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                                           background: '#e0e7ff', color: '#3730a3' }}>In Progress</span>
                          )}
                        </div>

                        {item.rationale && (
                          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 8px', lineHeight: 1.5 }}>
                            {item.rationale}
                          </p>
                        )}

                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#94a3b8', flexWrap: 'wrap' }}>
                          <span>🕐 {item.course.estimatedHours}h</span>
                          {item.estimatedWeeks && <span>📅 ~{item.estimatedWeeks} weeks</span>}
                          {item.weeksRemaining > 0 && <span>⏳ {item.weeksRemaining}w remaining</span>}
                        </div>

                        {/* Tags */}
                        {item.course.tags?.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                            {item.course.tags.slice(0, 4).map(t => (
                              <span key={t} style={{ padding: '2px 7px', background: '#f1f5f9',
                                                     borderRadius: 99, fontSize: 11, color: '#475569' }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                        {!isCompleted && (
                          <Link to={`/courses`}
                            style={{ padding: '7px 14px', background: '#4f46e5', color: '#fff',
                                     borderRadius: 8, fontSize: 12, fontWeight: 600,
                                     textDecoration: 'none', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {isActive ? 'Continue →' : 'Start →'}
                          </Link>
                        )}
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => moveItem(idx, -1)}
                            disabled={idx === 0 || reorderMutation.isPending}
                            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0',
                                     background: '#f8fafc', cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                     opacity: idx === 0 ? .4 : 1, fontSize: 14, color: '#475569' }}>
                            ↑
                          </button>
                          <button
                            onClick={() => moveItem(idx, 1)}
                            disabled={idx === items.length - 1 || reorderMutation.isPending}
                            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0',
                                     background: '#f8fafc',
                                     cursor: idx === items.length - 1 ? 'not-allowed' : 'pointer',
                                     opacity: idx === items.length - 1 ? .4 : 1, fontSize: 14, color: '#475569' }}>
                            ↓
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
            Generated {new Date(path.generatedAt).toLocaleDateString()} · Use ↑↓ to reorder · Regenerate anytime
          </p>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
