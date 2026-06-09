import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { useBadgeToast } from '../components/BadgeToast';

export default function LessonViewer() {
  const { slug, lessonId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showBadges } = useBadgeToast() || {};
  const [startTime] = useState(Date.now());
  const [showComplete, setShowComplete] = useState(false);

  // Fetch lesson content
  const { data: lessonData, isLoading, error } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => api.get(`/lessons/${lessonId}`).then(r => r.data),
  });

  // Fetch course modules for navigation
  const { data: moduleData } = useQuery({
    queryKey: ['course-modules', slug],
    queryFn: () => api.get(`/courses/${slug}/modules`).then(r => r.data),
    enabled: !!slug,
  });

  // Mark complete mutation
  const completeMutation = useMutation({
    mutationFn: () => api.post(`/lessons/${lessonId}/complete`, {
      time_spent_secs: Math.floor((Date.now() - startTime) / 1000),
    }),
    onSuccess: (res) => {
      setShowComplete(true);
      queryClient.invalidateQueries(['lesson', lessonId]);
      queryClient.invalidateQueries(['course-modules', slug]);
      queryClient.invalidateQueries(['dashboard']);
      queryClient.invalidateQueries(['skills']);
      queryClient.invalidateQueries(['badges']);
      if (res.data?.newBadges?.length) showBadges?.(res.data.newBadges);
      // Auto-advance after 2s if there's a next lesson
      setTimeout(() => {
        const next = getNextLesson();
        if (next) navigate(`/courses/${slug}/lessons/${next.id}`);
      }, 2000);
    },
  });

  const lesson  = lessonData?.lesson;
  const isDone  = lessonData?.completed || completeMutation.isSuccess;

  // Build flat lesson list for prev/next navigation
  const allLessons = (moduleData?.modules || []).flatMap(m => m.lessons || []);
  const currentIdx  = allLessons.findIndex(l => l.id === lessonId);
  const prevLesson  = currentIdx > 0  ? allLessons[currentIdx - 1] : null;
  const nextLesson  = currentIdx >= 0 && currentIdx < allLessons.length - 1
    ? allLessons[currentIdx + 1] : null;
  function getNextLesson() { return nextLesson; }

  if (isLoading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>Loading lesson…
    </div>
  );

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
      {error.response?.status === 403 ? 'Please enrol in this course to view lessons.' : 'Failed to load lesson.'}
      <br /><Link to={`/courses`} style={{ color: '#4f46e5', marginTop: 12, display: 'inline-block' }}>← Back to Courses</Link>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100%' }}>

      {/* ── Sidebar: module/lesson list ──────────────────────────── */}
      <div style={{ width: 280, background: '#fff', borderRight: '1px solid #e2e8f0',
                    overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #e2e8f0' }}>
          <Link to={`/courses`} style={{ fontSize: 12, color: '#64748b', textDecoration: 'none',
                                          display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Back to Courses
          </Link>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginTop: 8 }}>
            {lesson?.course?.title}
          </div>
          {moduleData?.enrolment && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                <span>Course Progress</span>
                <span>{parseFloat(moduleData.enrolment.progressPct).toFixed(0)}%</span>
              </div>
              <div style={{ background: '#e2e8f0', borderRadius: 99, height: 4 }}>
                <div style={{ height: '100%', borderRadius: 99, width: `${moduleData.enrolment.progressPct}%`,
                              background: '#4f46e5' }} />
              </div>
            </div>
          )}
        </div>

        {(moduleData?.modules || []).map(mod => (
          <div key={mod.id}>
            <div style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#64748b',
                          textTransform: 'uppercase', letterSpacing: '.5px', background: '#f8fafc',
                          borderBottom: '1px solid #e2e8f0' }}>
              {mod.title}
            </div>
            {(mod.lessons || []).map((l, i) => {
              const isActive = l.id === lessonId;
              const isDoneLesson = l.completed;
              return (
                <Link key={l.id} to={`/courses/${slug}/lessons/${l.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                           textDecoration: 'none', borderBottom: '1px solid #f1f5f9',
                           background: isActive ? '#e0e7ff' : 'transparent',
                           borderLeft: isActive ? '3px solid #4f46e5' : '3px solid transparent' }}>
                  <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>
                    {isDoneLesson ? '✅' : l.type === 'video' ? '▶️' : l.type === 'quiz' ? '📝' : l.type === 'project' ? '🔨' : '📄'}
                  </span>
                  <span style={{ fontSize: 13, color: isActive ? '#4f46e5' : '#374151',
                                 fontWeight: isActive ? 600 : 400, lineHeight: 1.3 }}>
                    {l.title}
                  </span>
                  {l.estimatedMins && (
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                      {l.estimatedMins}m
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>

        {/* Completion banner */}
        {showComplete && (
          <div style={{ background: '#d1fae5', borderBottom: '1px solid #6ee7b7',
                        padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🎉</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#065f46' }}>
              Lesson complete! {completeMutation.data?.data?.xpEarned > 0 && `+${completeMutation.data.data.xpEarned} XP earned.`}
              {completeMutation.data?.data?.newBadgeIds?.length > 0 && ' 🏅 New badge earned!'}
              {nextLesson && ' Advancing to next lesson…'}
            </span>
          </div>
        )}

        <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 32px 80px' }}>

          {/* Lesson header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                             background: lesson?.type === 'video' ? '#dbeafe' : lesson?.type === 'project' ? '#fef3c7' : '#e0e7ff',
                             color: lesson?.type === 'video' ? '#1d4ed8' : lesson?.type === 'project' ? '#92400e' : '#4f46e5' }}>
                {lesson?.type?.toUpperCase()}
              </span>
              {lesson?.estimatedMins && (
                <span style={{ fontSize: 12, color: '#94a3b8' }}>🕐 {lesson.estimatedMins} min</span>
              )}
              {lesson?.xpReward && (
                <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>⚡ {lesson.xpReward} XP</span>
              )}
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', margin: '0 0 4px', lineHeight: 1.3 }}>
              {lesson?.title}
            </h1>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              {lesson?.module?.title} · {lesson?.course?.title}
            </div>
          </div>

          {/* ── Video lesson ───────────────────────────────────────── */}
          {lesson?.type === 'video' && lesson?.videoAssetId && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0,
                            borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${lesson.videoAssetId}?rel=0&modestbranding=1`}
                  title={lesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                />
              </div>
              {lesson.videoDurationSecs && (
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                  Duration: {Math.floor(lesson.videoDurationSecs / 60)}:{String(lesson.videoDurationSecs % 60).padStart(2,'0')}
                </div>
              )}
            </div>
          )}

          {/* ── Text / Project content ─────────────────────────────── */}
          {lesson?.contentBody && (
            <div style={{ background: '#fff', borderRadius: 12, padding: '28px 32px',
                          border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,.04)',
                          marginBottom: 28 }}>
              <MarkdownRenderer content={lesson.contentBody} />
            </div>
          )}

          {/* ── Navigation + Complete button ───────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
            {prevLesson ? (
              <Link to={`/courses/${slug}/lessons/${prevLesson.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                         borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff',
                         color: '#374151', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                ← Previous
              </Link>
            ) : <div />}

            {!isDone ? (
              <button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                style={{ padding: '11px 28px', background: '#4f46e5', color: '#fff', border: 'none',
                         borderRadius: 10, fontSize: 14, fontWeight: 700,
                         cursor: completeMutation.isPending ? 'not-allowed' : 'pointer',
                         opacity: completeMutation.isPending ? .7 : 1 }}>
                {completeMutation.isPending ? 'Saving…' : '✓ Mark Complete'}
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px',
                            background: '#d1fae5', borderRadius: 10, color: '#065f46', fontWeight: 700, fontSize: 13 }}>
                ✅ Completed
              </div>
            )}

            {nextLesson ? (
              <Link to={`/courses/${slug}/lessons/${nextLesson.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                         borderRadius: 10, background: nextLesson ? '#4f46e5' : '#f1f5f9',
                         color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                Next →
              </Link>
            ) : (
              <Link to={`/courses/${slug}/assessment`}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                         borderRadius: 10, background: '#f59e0b', color: '#fff',
                         textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                Take Assessment →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
