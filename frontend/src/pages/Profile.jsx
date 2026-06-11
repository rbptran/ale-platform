import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

const LEARNING_STYLES = [
  { id: 'visual',        label: '👁️ Visual',        desc: 'Videos, diagrams, charts' },
  { id: 'reading',       label: '📖 Reading',       desc: 'Articles, docs, notes' },
  { id: 'hands_on',     label: '🛠️ Hands-on',      desc: 'Projects, exercises' },
  { id: 'audio',         label: '🎧 Audio',         desc: 'Podcasts, lectures' },
  { id: 'collaborative', label: '🤝 Collaborative', desc: 'Discussions, community' },
];

const COMMITMENT_OPTIONS = [
  { mins: 15,  label: '15 min/day',   sub: 'Casual learner' },
  { mins: 30,  label: '30 min/day',   sub: 'Regular pace' },
  { mins: 60,  label: '1 hour/day',   sub: 'Dedicated' },
  { mins: 120, label: '2+ hours/day', sub: 'Intensive' },
];

export default function Profile() {
  const user = useAuthStore(s => s.user);
  const setAuth = useAuthStore(s => s.setAuth);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/profile').then(r => r.data),
    staleTime: 30_000,
  });

  const [form, setForm] = useState(null); // null until data loads
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data && form === null) {
      setForm({
        name:                data.profile?.user?.name ?? user?.name ?? '',
        careerGoal:          data.profile?.careerGoal ?? '',
        currentRole:         data.profile?.currentRole ?? '',
        experienceYears:     data.profile?.experienceYears ?? 0,
        industry:            data.profile?.industry ?? '',
        educationLevel:      data.profile?.educationLevel ?? '',
        learningStyles:      data.profile?.learningStyles ?? [],
        dailyCommitmentMins: data.profile?.dailyCommitmentMins ?? 30,
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => api.put('/profile', {
      careerGoal:          form.careerGoal || undefined,
      currentRole:         form.currentRole || undefined,
      experienceYears:     form.experienceYears ? parseInt(form.experienceYears) : undefined,
      industry:            form.industry || undefined,
      educationLevel:      form.educationLevel || undefined,
      learningStyles:      form.learningStyles,
      dailyCommitmentMins: form.dailyCommitmentMins,
    }),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries(['profile']);
      queryClient.invalidateQueries(['dashboard']);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const toggleStyle = (id) => {
    setForm(prev => ({
      ...prev,
      learningStyles: prev.learningStyles.includes(id)
        ? prev.learningStyles.filter(s => s !== id)
        : [...prev.learningStyles, id],
    }));
  };

  if (isLoading || form === null) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>Loading profile…
    </div>
  );

  const profile = data?.profile;
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div style={{ padding: 28, maxWidth: 760, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%',
                      background: 'linear-gradient(135deg,#7c3aed,#db2777)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: 26, flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>
            {user?.name}
          </h1>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{user?.email}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <span style={{ padding: '3px 10px', background: '#e0e7ff', borderRadius: 99,
                           fontSize: 12, fontWeight: 600, color: '#3730a3' }}>
              Level {profile?.level ?? 1}
            </span>
            <span style={{ padding: '3px 10px', background: '#fef3c7', borderRadius: 99,
                           fontSize: 12, fontWeight: 600, color: '#92400e' }}>
              ⚡ {profile?.xpTotal ?? 0} XP
            </span>
            <span style={{ padding: '3px 10px', background: '#dcfce7', borderRadius: 99,
                           fontSize: 12, fontWeight: 600, color: '#166534' }}>
              🔥 {profile?.streakDays ?? 0} day streak
            </span>
          </div>
        </div>
      </div>

      {/* ── Save banner ── */}
      {saved && (
        <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10,
                      padding: '10px 16px', fontSize: 14, fontWeight: 600, color: '#065f46',
                      marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          ✅ Profile saved successfully
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Readiness Score + AI Insights ── */}
        {profile?.readinessScore != null && (
          <div style={{ display: 'grid', gridTemplateColumns: profile?.aiExtractedData ? '200px 1fr' : '1fr', gap: 16 }}>

            {/* Readiness ring */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px',
                          border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,.04)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <ReadinessRing score={profile.readinessScore} />
              {profile.motivationType && (
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Motivation</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', textTransform: 'capitalize' }}>
                    {profile.motivationType.replace(/_/g, ' ')}
                  </div>
                </div>
              )}
              {profile.careerUrgency && (
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Urgency</div>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ width: 8, height: 8, borderRadius: '50%',
                        background: i <= profile.careerUrgency ? '#f59e0b' : '#e2e8f0' }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI insights */}
            {profile?.aiExtractedData && (
              <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px',
                            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>
                  🤖 AI Learning Profile
                </div>
                {profile.aiInterviewSummary && (
                  <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: '0 0 14px 0',
                               background: '#f8fafc', borderRadius: 8, padding: '10px 14px',
                               borderLeft: '3px solid #4f46e5' }}>
                    {profile.aiInterviewSummary}
                  </p>
                )}
                {profile.aiExtractedData.recommendedFocusAreas?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
                      RECOMMENDED FOCUS AREAS
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {profile.aiExtractedData.recommendedFocusAreas.map((area, i) => (
                        <span key={i} style={{ padding: '4px 10px', background: '#eef2ff',
                                               borderRadius: 99, fontSize: 12, fontWeight: 600,
                                               color: '#4338ca' }}>
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.aiExtractedData.identifiedGaps?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
                      SKILL GAPS
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {profile.aiExtractedData.identifiedGaps.map((gap, i) => (
                        <span key={i} style={{ padding: '4px 10px', background: '#fef3c7',
                                               borderRadius: 99, fontSize: 12, fontWeight: 600,
                                               color: '#92400e' }}>
                          {gap}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.aiExtractedData.learnerPersona && (
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    Persona: <span style={{ fontWeight: 700, color: '#64748b', textTransform: 'capitalize' }}>
                      {profile.aiExtractedData.learnerPersona.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Basic info card ── */}
        <Section title="👤 Basic Info">
          <FormRow label="Career Goal"
            hint="What role or skill are you working towards?">
            <input
              value={form.careerGoal}
              onChange={e => setForm(p => ({ ...p, careerGoal: e.target.value }))}
              placeholder="e.g. Become a Data Scientist at a tech company"
              style={inputStyle}
            />
          </FormRow>
          <FormRow label="Current Role">
            <input
              value={form.currentRole}
              onChange={e => setForm(p => ({ ...p, currentRole: e.target.value }))}
              placeholder="e.g. Software Engineer"
              style={inputStyle}
            />
          </FormRow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormRow label="Industry">
              <input
                value={form.industry}
                onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
                placeholder="e.g. Finance, Healthcare, Tech"
                style={inputStyle}
              />
            </FormRow>
            <FormRow label="Experience (years)">
              <input
                type="number" min={0} max={50}
                value={form.experienceYears}
                onChange={e => setForm(p => ({ ...p, experienceYears: e.target.value }))}
                style={inputStyle}
              />
            </FormRow>
          </div>
          <FormRow label="Education Level">
            <select
              value={form.educationLevel}
              onChange={e => setForm(p => ({ ...p, educationLevel: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Select…</option>
              {['High School', 'Associate Degree', "Bachelor's Degree", "Master's Degree", 'PhD', 'Self-taught', 'Bootcamp'].map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </FormRow>
        </Section>

        {/* ── Learning styles ── */}
        <Section title="🧠 Learning Styles"
          hint="Select all that apply — ARIA uses these to tailor explanations.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 10 }}>
            {LEARNING_STYLES.map(({ id, label, desc }) => {
              const active = form.learningStyles.includes(id);
              return (
                <button key={id} onClick={() => toggleStyle(id)}
                  style={{ padding: '12px 14px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                           border: `2px solid ${active ? '#4f46e5' : '#e2e8f0'}`,
                           background: active ? '#e0e7ff' : '#f8fafc', transition: '.15s' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: active ? '#3730a3' : '#1e293b',
                                marginBottom: 2 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 11, color: active ? '#6366f1' : '#94a3b8' }}>{desc}</div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── Daily commitment ── */}
        <Section title="⏱️ Daily Commitment"
          hint="Used to calculate your estimated path completion date.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {COMMITMENT_OPTIONS.map(({ mins, label, sub }) => {
              const active = form.dailyCommitmentMins === mins;
              return (
                <button key={mins}
                  onClick={() => setForm(p => ({ ...p, dailyCommitmentMins: mins }))}
                  style={{ padding: '14px 10px', borderRadius: 10, textAlign: 'center',
                           cursor: 'pointer', border: `2px solid ${active ? '#4f46e5' : '#e2e8f0'}`,
                           background: active ? '#e0e7ff' : '#f8fafc', transition: '.15s' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: active ? '#3730a3' : '#1e293b',
                                marginBottom: 2 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 11, color: active ? '#6366f1' : '#94a3b8' }}>{sub}</div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── Save button ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            style={{ padding: '12px 32px', background: saveMutation.isPending ? '#94a3b8' : '#4f46e5',
                     color: '#fff', border: 'none', borderRadius: 10, fontSize: 15,
                     fontWeight: 700, cursor: saveMutation.isPending ? 'not-allowed' : 'pointer' }}>
            {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helper components ────────────────────────────────────────────────────────
function Section({ title, hint, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px',
                  border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{title}</div>
        {hint && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  );
}

function FormRow({ label, hint, children }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 6 }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
  fontSize: 14, outline: 'none', background: '#fafafa', boxSizing: 'border-box',
  fontFamily: 'inherit',
};

function ReadinessRing({ score }) {
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label = score >= 70 ? 'Ready' : score >= 40 ? 'Almost' : 'Getting there';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="55" cy="55" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 55 55)" />
        <text x="55" y="51" textAnchor="middle" fontSize="20" fontWeight="800" fill={color}>{score}</text>
        <text x="55" y="65" textAnchor="middle" fontSize="10" fill="#64748b">/ 100</text>
      </svg>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>Readiness Score</div>
    </div>
  );
}
