import { useState } from 'react';
import { useBadgeToast } from '../components/BadgeToast';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

export default function Assessment() {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const { showBadges } = useBadgeToast() || {};

  const [answers, setAnswers]     = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult]       = useState(null);
  const [current, setCurrent]     = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['assessment', slug],
    queryFn: () => api.get(`/assessments/${slug}`).then(r => r.data),
  });

  const submitMutation = useMutation({
    mutationFn: (payload) => api.post(`/assessments/${slug}/submit`, payload),
    onSuccess: (res) => {
      setResult(res.data);
      setSubmitted(true);
      queryClient.invalidateQueries(['skills']);
      queryClient.invalidateQueries(['badges']);
      queryClient.invalidateQueries(['dashboard']);
      if (res.data?.newBadges?.length) showBadges?.(res.data.newBadges);
    },
  });

  const questions = data?.questions || [];
  const q         = questions[current];

  const handleSelect = (questionId, answer) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = () => {
    const unanswered = questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      alert(`Please answer all questions. ${unanswered.length} remaining.`);
      return;
    }
    submitMutation.mutate({ answers, timeTakenSecs: 0 });
  };

  if (isLoading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>Loading assessment…
    </div>
  );

  if (questions.length === 0) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
      <h2 style={{ color: '#1e293b' }}>No questions available for this course</h2>
      <Link to="/courses" style={{ color: '#4f46e5' }}>← Back to Courses</Link>
    </div>
  );

  // ── Results screen ──────────────────────────────────────────────────────────
  if (submitted && result) {
    const pct    = parseFloat(result.scorePct).toFixed(0);
    const passed = result.passed;
    const color  = passed ? '#10b981' : '#ef4444';
    const bg     = passed ? '#d1fae5' : '#fee2e2';

    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 32 }}>
        <div style={{ background: bg, borderRadius: 16, padding: 32, textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 52 }}>{passed ? '🎉' : '📚'}</div>
          <div style={{ fontSize: 48, fontWeight: 800, color, margin: '8px 0' }}>{pct}%</div>
          <div style={{ fontSize: 18, fontWeight: 700, color, marginBottom: 4 }}>
            {passed ? 'Passed!' : 'Not quite — keep learning!'}
          </div>
          <div style={{ fontSize: 14, color: '#475569' }}>
            {result.correct} of {result.total} correct
            {result.xpEarned > 0 && ` · +${result.xpEarned} XP earned`}
          </div>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Question Review</h2>
        {questions.map((q, i) => {
          const fb      = result.feedback?.[q.id];
          const isRight = fb?.isCorrect;
          const userAns = answers[q.id];
          return (
            <div key={q.id} style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 14,
                                      border: `1px solid ${isRight ? '#6ee7b7' : '#fca5a5'}`,
                                      borderLeft: `4px solid ${isRight ? '#10b981' : '#ef4444'}` }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>{isRight ? '✅' : '❌'}</span>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', lineHeight: 1.4 }}>
                  Q{i + 1}. {q.text}
                </span>
              </div>
              {(q.options || []).map(opt => {
                const correctAns = Array.isArray(fb?.correctAnswer) ? fb.correctAnswer : [fb?.correctAnswer];
                const isCorrect  = correctAns.includes(opt.id) || correctAns.includes(opt.text);
                const isSelected = userAns === opt.id || userAns === opt.text;
                let bgColor = 'transparent', border = '1px solid #e2e8f0', textColor = '#374151';
                if (isCorrect)                { bgColor = '#d1fae5'; border = '1px solid #6ee7b7'; textColor = '#065f46'; }
                if (isSelected && !isCorrect) { bgColor = '#fee2e2'; border = '1px solid #fca5a5'; textColor = '#991b1b'; }
                return (
                  <div key={opt.id} style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 4,
                                             background: bgColor, border, color: textColor, fontSize: 13 }}>
                    {isSelected && '→ '}{opt.text}{isCorrect && ' ✓'}
                  </div>
                );
              })}
              {fb?.explanation && (
                <div style={{ marginTop: 10, padding: '10px 12px', background: '#f0f9ff',
                              borderRadius: 8, fontSize: 13, color: '#0369a1', fontStyle: 'italic' }}>
                  💡 {fb.explanation}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <Link to="/courses"
            style={{ flex: 1, padding: 13, background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0',
                     borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
            ← Back to Courses
          </Link>
          <Link to="/skills"
            style={{ flex: 1, padding: 13, background: '#4f46e5', color: '#fff',
                     borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
            View Updated Skills →
          </Link>
        </div>
      </div>
    );
  }

  // ── Quiz screen ─────────────────────────────────────────────────────────────
  const answeredCount = Object.keys(answers).length;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <Link to="/courses" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>← Back to Courses</Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '8px 0 4px' }}>
          {data?.courseTitle} — Assessment
        </h1>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          {questions.length} questions · {answeredCount} answered
        </div>
        <div style={{ background: '#e2e8f0', borderRadius: 99, height: 6, marginTop: 10 }}>
          <div style={{ height: '100%', borderRadius: 99, width: `${(answeredCount / questions.length) * 100}%`,
                        background: '#4f46e5', transition: 'width .3s' }} />
        </div>
      </div>

      {/* Question number tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {questions.map((q, i) => (
          <button key={q.id} onClick={() => setCurrent(i)}
            style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                     background: current === i ? '#4f46e5' : answers[q.id] ? '#d1fae5' : '#f1f5f9',
                     color: current === i ? '#fff' : answers[q.id] ? '#065f46' : '#374151' }}>
            {i + 1}
          </button>
        ))}
      </div>

      {/* Current question card */}
      {q && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,.05)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Question {current + 1} of {questions.length}
            </span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                           background: q.difficulty === 'easy' ? '#dcfce7' : q.difficulty === 'hard' ? '#fee2e2' : '#fef9c3',
                           color: q.difficulty === 'easy' ? '#166534' : q.difficulty === 'hard' ? '#991b1b' : '#854d0e' }}>
              {q.difficulty}
            </span>
          </div>

          <p style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', lineHeight: 1.5, marginBottom: 20 }}>
            {q.text}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(q.options || []).map(opt => {
              const selected = answers[q.id] === opt.id || answers[q.id] === opt.text;
              return (
                <button key={opt.id}
                  onClick={() => handleSelect(q.id, opt.id || opt.text)}
                  style={{ padding: '12px 16px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                           fontSize: 14, lineHeight: 1.4,
                           background: selected ? '#e0e7ff' : '#f8fafc',
                           border: selected ? '2px solid #4f46e5' : '2px solid #e2e8f0',
                           color: selected ? '#3730a3' : '#374151',
                           fontWeight: selected ? 600 : 400, transition: 'all .15s' }}>
                  {opt.text}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Prev / Next / Submit */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
        <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
          style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0',
                   background: '#fff', cursor: current === 0 ? 'not-allowed' : 'pointer',
                   opacity: current === 0 ? .4 : 1, fontSize: 13, fontWeight: 600, color: '#374151' }}>
          ← Previous
        </button>
        {current < questions.length - 1 ? (
          <button onClick={() => setCurrent(c => c + 1)}
            style={{ padding: '10px 20px', borderRadius: 10, background: '#4f46e5',
                     color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Next →
          </button>
        ) : (
          <button onClick={handleSubmit}
            disabled={submitMutation.isPending || answeredCount < questions.length}
            style={{ padding: '10px 28px', borderRadius: 10,
                     background: answeredCount === questions.length ? '#10b981' : '#94a3b8',
                     color: '#fff', border: 'none', fontSize: 14, fontWeight: 700,
                     cursor: answeredCount < questions.length ? 'not-allowed' : 'pointer' }}>
            {submitMutation.isPending ? 'Submitting…' : `Submit (${answeredCount}/${questions.length})`}
          </button>
        )}
      </div>
    </div>
  );
}
