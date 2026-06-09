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
