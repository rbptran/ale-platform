import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;

const EMPLOYMENT_OPTIONS = [
  { value: 'employed_full',  label: 'Employed (full-time)' },
  { value: 'employed_part',  label: 'Employed (part-time)' },
  { value: 'self_employed',  label: 'Self-employed / Freelancer' },
  { value: 'student',        label: 'Student' },
  { value: 'unemployed',     label: 'Between roles' },
  { value: 'other',          label: 'Other' },
];

const EDUCATION_OPTIONS = [
  { value: 'high_school',    label: 'High school' },
  { value: 'some_college',   label: 'Some college' },
  { value: 'bachelors',      label: "Bachelor's degree" },
  { value: 'masters',        label: "Master's degree" },
  { value: 'doctorate',      label: 'Doctorate / PhD' },
  { value: 'professional',   label: 'Professional certification' },
  { value: 'self_taught',    label: 'Self-taught' },
];

const CORE_SKILLS = [
  { name: 'Technical Skills',   icon: '💻' },
  { name: 'Communication',      icon: '💬' },
  { name: 'Leadership',         icon: '🎯' },
  { name: 'Data Analysis',      icon: '📊' },
  { name: 'Project Management', icon: '📋' },
];

const SKILL_LEVELS = [
  { label: 'Beginner',     pct: 25,  color: '#94a3b8' },
  { label: 'Intermediate', pct: 50,  color: '#3b82f6' },
  { label: 'Advanced',     pct: 75,  color: '#8b5cf6' },
  { label: 'Expert',       pct: 100, color: '#10b981' },
];

const GOAL_TYPES = [
  { value: 'career_transition', label: 'Career transition',       icon: '🔄' },
  { value: 'promotion',         label: 'Promotion / advancement',  icon: '📈' },
  { value: 'certification',     label: 'Certification',            icon: '🏆' },
  { value: 'entrepreneurship',  label: 'Start a business',         icon: '🚀' },
  { value: 'enrichment',        label: 'Personal enrichment',      icon: '🌱' },
  { value: 'academic',          label: 'Academic advancement',     icon: '🎓' },
];

const MOTIVATION_TYPES = [
  { value: 'employer_requirement', label: 'Required by employer',   icon: '🏢' },
  { value: 'career_transition',    label: 'Career change',          icon: '🔄' },
  { value: 'promotion',            label: 'Promotion / raise',      icon: '📈' },
  { value: 'certification',        label: 'Get certified',          icon: '🏆' },
  { value: 'personal_enrichment',  label: 'Personal growth',        icon: '🌱' },
  { value: 'academic',             label: 'Academic requirement',   icon: '🎓' },
];

const URGENCY_LABELS = ['', 'No rush', 'Some urgency', 'Moderate', 'Quite urgent', 'Very urgent — deadline!'];

const LEARNING_STYLES = [
  { value: 'video',        label: 'Video lessons',        icon: '🎬' },
  { value: 'reading',      label: 'Reading / articles',   icon: '📖' },
  { value: 'interactive',  label: 'Interactive labs',     icon: '🧪' },
  { value: 'simulations',  label: 'Simulations',          icon: '🖥️' },
  { value: 'case_studies', label: 'Case studies',         icon: '📁' },
  { value: 'peer',         label: 'Peer discussion',      icon: '👥' },
  { value: 'coaching',     label: 'Coaching / mentoring', icon: '🎙️' },
];

const BUDGET_OPTIONS = [
  { value: 'free_only', label: 'Free only',      icon: '🆓' },
  { value: 'low',       label: 'Under $50/mo',   icon: '💵' },
  { value: 'medium',    label: '$50–$150/mo',     icon: '💳' },
  { value: 'high',      label: '$150+/mo',        icon: '💎' },
];

const HOURS_OPTIONS = [1, 2, 3, 5, 7, 10, 15, 20];

// The 3 AI interview questions
const INTERVIEW_QUESTIONS = [
  'Describe your current role and the biggest challenge you\'re facing right now.',
  'What does success look like for you 6 months from now? Be as specific as possible.',
  'What has held you back from developing the skills you need — time, resources, confidence, or something else?',
];

// ─── Style constants ──────────────────────────────────────────────────────────

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8,
};

const inputStyle = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0',
  borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  background: '#fff',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ step }) {
  const segments = TOTAL_STEPS - 1;
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
      {Array.from({ length: segments }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 4, borderRadius: 4,
          background: i < step - 1 ? 'linear-gradient(90deg,#4f46e5,#7c3aed)' : '#e2e8f0',
          transition: 'background .3s',
        }} />
      ))}
    </div>
  );
}

function StepHeading({ icon, title, subtitle }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <div style={{ fontSize: 44, marginBottom: 8 }}>{icon}</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>{subtitle}</p>}
    </div>
  );
}

function SelectGrid({ options, value, onChange, multi = false }) {
  const selected = multi ? (value || []) : value;
  const toggle = (v) => {
    if (multi) {
      onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
    } else {
      onChange(v === selected ? '' : v);
    }
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
      {options.map(({ value: v, label, icon }) => {
        const active = multi ? selected.includes(v) : selected === v;
        return (
          <button key={v} type="button" onClick={() => toggle(v)}
            style={{
              padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              border: active ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
              background: active ? '#eef2ff' : '#fff',
              color: active ? '#4f46e5' : '#374151',
              fontWeight: active ? 700 : 500, fontSize: 13, transition: 'all .15s',
            }}>
            {icon && <span style={{ marginRight: 6 }}>{icon}</span>}
            {label}
          </button>
        );
      })}
    </div>
  );
}

function SummaryRow({ label, value, last = false }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: last ? 'none' : '1px solid #e2e8f0' }}>
      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

// Animated circular readiness score ring
function ReadinessRing({ score }) {
  const radius = 56;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label = score >= 70 ? 'Ready to learn' : score >= 40 ? 'Almost there' : 'Let\'s get started';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
        <circle cx="70" cy="70" r={radius} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
        <text x="70" y="66" textAnchor="middle" fontSize="26" fontWeight="800" fill={color}>{score}</text>
        <text x="70" y="84" textAnchor="middle" fontSize="11" fill="#64748b">/ 100</text>
      </svg>
      <div style={{ fontSize: 14, fontWeight: 700, color, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Readiness Score</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate  = useNavigate();
  const user      = useAuthStore((s) => s.user);
  const setAuth   = useAuthStore((s) => s.setAuth);

  const [step, setStep]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Form state for steps 1–4
  const [form, setForm] = useState({
    // Step 1 — Personal Context
    employmentStatus: '',
    industry: '',
    currentRole: '',
    experienceYears: '',
    educationLevel: '',
    // Step 2 — Skills
    skillRatings: CORE_SKILLS.reduce((acc, s) => ({ ...acc, [s.name]: 25 }), {}),
    // Step 3 — Goals + Motivation
    goalType: '',
    careerGoal: '',
    sixMonthGoal: '',
    motivationType: '',
    careerUrgency: 3,
    // Step 4 — Preferences + Constraints
    learningStyles: [],
    weeklyHoursAvailable: 5,
    budgetRange: '',
    hasDeadline: false,
    targetCompletionDate: '',
    accessibilityNeeds: '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // ── Step 5 — AI Interview state ──────────────────────────────────────────
  const [interviewStep, setInterviewStep]   = useState(0); // 0,1,2 = current question; 3 = processing; 4 = done
  const [answers, setAnswers]               = useState(['', '', '']);
  const [currentAnswer, setCurrentAnswer]   = useState('');
  const [aiInsights, setAiInsights]         = useState(null);
  const [interviewError, setInterviewError] = useState('');
  const chatEndRef = useRef(null);

  // ── Step 6 — Summary / readiness ────────────────────────────────────────
  const [readinessScore, setReadinessScore] = useState(null);
  const [submitError, setSubmitError]       = useState('');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interviewStep, answers]);

  // Submit steps 1–4 data to backend
  const submitProfile = async () => {
    setLoading(true); setError('');
    try {
      const payload = {
        employmentStatus:     form.employmentStatus || undefined,
        industry:             form.industry || undefined,
        currentRole:          form.currentRole || undefined,
        experienceYears:      form.experienceYears ? Number(form.experienceYears) : undefined,
        educationLevel:       form.educationLevel || undefined,
        skillRatings:         Object.entries(form.skillRatings).map(([skillName, proficiencyPct]) => ({ skillName, proficiencyPct })),
        goalType:             form.goalType || undefined,
        careerGoal:           form.careerGoal || undefined,
        sixMonthGoal:         form.sixMonthGoal || undefined,
        motivationType:       form.motivationType || undefined,
        careerUrgency:        form.careerUrgency,
        learningStyles:       form.learningStyles,
        weeklyHoursAvailable: form.weeklyHoursAvailable,
        dailyCommitmentMins:  Math.round((form.weeklyHoursAvailable * 60) / 5),
        budgetRange:          form.budgetRange || undefined,
        hasDeadline:          form.hasDeadline || undefined,
        targetCompletionDate: form.targetCompletionDate || undefined,
        accessibilityNeeds:   form.accessibilityNeeds || undefined,
      };
      const { data } = await api.patch('/profile/onboarding', payload);
      setReadinessScore(data.profile?.readinessScore ?? null);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
      setLoading(false);
      return false;
    }
    setLoading(false);
    return true;
  };

  // Submit AI interview answers
  const submitInterview = async (finalAnswers) => {
    setInterviewStep(3); // "processing"
    setInterviewError('');
    try {
      const payload = {
        answers: INTERVIEW_QUESTIONS.map((q, i) => ({ question: q, answer: finalAnswers[i] })),
      };
      const { data } = await api.post('/profile/ai-interview', payload);
      setAiInsights(data.aiExtractedData);
      setReadinessScore(data.readinessScore);
      setInterviewStep(4); // done
    } catch (err) {
      setInterviewError('AI analysis failed — your answers were saved. You can continue.');
      setInterviewStep(4); // still advance
    }
  };

  const handleAnswerSubmit = () => {
    if (!currentAnswer.trim()) return;
    const updated = [...answers];
    updated[interviewStep] = currentAnswer.trim();
    setAnswers(updated);
    setCurrentAnswer('');

    if (interviewStep < 2) {
      setInterviewStep(s => s + 1);
    } else {
      submitInterview(updated);
    }
  };

  // Final "go to dashboard"
  const handleFinish = async () => {
    setLoading(true); setSubmitError('');
    try {
      const currentState = useAuthStore.getState();
      setAuth({ ...currentState, user: { ...currentState.user, onboardingCompleted: true } });
      navigate('/dashboard');
    } catch (err) {
      setSubmitError('Could not load your dashboard. Please refresh.');
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 1) return true;
    if (step === 2) return true;
    if (step === 3) return !!form.goalType;
    if (step === 4) return form.learningStyles.length > 0;
    return true;
  };

  const handleNext = async () => {
    if (step === 4) {
      // Before entering the interview, save profile data
      const ok = await submitProfile();
      if (!ok) return;
    }
    setStep(s => s + 1);
  };

  const card = {
    background: '#fff', borderRadius: 20, padding: 36,
    width: '100%', maxWidth: 580, boxShadow: '0 25px 60px rgba(0,0,0,.12)',
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a,#1e1b4b)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '40px 16px', fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={card}>
        <ProgressBar step={step} />

        {/* ── Step 1: Personal Context ──────────────────────────────────── */}
        {step === 1 && (
          <>
            <StepHeading icon="👤" title={`Welcome, ${user?.name?.split(' ')[0] || 'there'}!`}
              subtitle="Tell us about yourself so we can personalise your experience." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Employment status</label>
                <SelectGrid options={EMPLOYMENT_OPTIONS} value={form.employmentStatus}
                  onChange={v => set('employmentStatus', v)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Industry / Domain</label>
                  <input value={form.industry} onChange={e => set('industry', e.target.value)}
                    placeholder="e.g. Technology, Healthcare" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Current role / title</label>
                  <input value={form.currentRole} onChange={e => set('currentRole', e.target.value)}
                    placeholder="e.g. Software Engineer" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Years of experience</label>
                  <input type="number" min="0" max="50" value={form.experienceYears}
                    onChange={e => set('experienceYears', e.target.value)}
                    placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Education level</label>
                  <select value={form.educationLevel} onChange={e => set('educationLevel', e.target.value)}
                    style={inputStyle}>
                    <option value="">Select…</option>
                    {EDUCATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: Skill Self-Rating ──────────────────────────────────── */}
        {step === 2 && (
          <>
            <StepHeading icon="📊" title="Rate your current skills"
              subtitle="Honest self-assessment helps us tailor your path. AI will validate as you learn." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {CORE_SKILLS.map(({ name, icon }) => (
                <div key={name}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{icon}</span>
                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
                      {SKILL_LEVELS.find(l => l.pct === form.skillRatings[name])?.label || 'Beginner'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {SKILL_LEVELS.map(({ label, pct, color }) => {
                      const active = form.skillRatings[name] === pct;
                      return (
                        <button key={pct} type="button"
                          onClick={() => setForm(f => ({ ...f, skillRatings: { ...f.skillRatings, [name]: pct } }))}
                          style={{
                            padding: '8px 4px', borderRadius: 8, cursor: 'pointer',
                            fontSize: 12, fontWeight: active ? 700 : 500,
                            border: active ? `2px solid ${color}` : '1.5px solid #e2e8f0',
                            background: active ? color + '20' : '#fff',
                            color: active ? color : '#64748b',
                            transition: 'all .15s',
                          }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Step 3: Goals + Motivation ─────────────────────────────────── */}
        {step === 3 && (
          <>
            <StepHeading icon="🎯" title="Goals & Motivation"
              subtitle="Adults learn best when content aligns with immediate, real value." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>Primary goal</label>
                <SelectGrid options={GOAL_TYPES} value={form.goalType}
                  onChange={v => set('goalType', v)} />
              </div>
              <div>
                <label style={labelStyle}>What drives this goal? <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                <SelectGrid options={MOTIVATION_TYPES} value={form.motivationType}
                  onChange={v => set('motivationType', v)} />
              </div>
              <div>
                <label style={labelStyle}>
                  How urgent is this for you?&nbsp;
                  <span style={{ color: '#4f46e5', fontWeight: 700 }}>
                    {URGENCY_LABELS[form.careerUrgency]}
                  </span>
                </label>
                <input type="range" min="1" max="5" value={form.careerUrgency}
                  onChange={e => set('careerUrgency', Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#4f46e5' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  <span>No rush</span><span>Very urgent</span>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Career goal <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                <input value={form.careerGoal} onChange={e => set('careerGoal', e.target.value)}
                  placeholder="e.g. Become a data team lead" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>What do you want to achieve in the next 6 months?</label>
                <textarea value={form.sixMonthGoal} onChange={e => set('sixMonthGoal', e.target.value)}
                  rows={3} placeholder="Describe your 6-month aspiration…"
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
              </div>
            </div>
          </>
        )}

        {/* ── Step 4: Preferences + Constraints ─────────────────────────── */}
        {step === 4 && (
          <>
            <StepHeading icon="⚙️" title="Preferences & Constraints"
              subtitle="We'll design content around your schedule, budget, and needs." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>Learning preferences <span style={{ color: '#94a3b8', fontWeight: 400 }}>(pick all that apply)</span></label>
                <SelectGrid options={LEARNING_STYLES} value={form.learningStyles}
                  onChange={v => set('learningStyles', v)} multi />
              </div>
              <div>
                <label style={labelStyle}>
                  Hours available per week
                  <span style={{ marginLeft: 8, fontWeight: 700, color: '#4f46e5' }}>
                    {form.weeklyHoursAvailable}h
                  </span>
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {HOURS_OPTIONS.map(h => (
                    <button key={h} type="button" onClick={() => set('weeklyHoursAvailable', h)}
                      style={{
                        padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                        fontSize: 13, fontWeight: form.weeklyHoursAvailable === h ? 700 : 500,
                        border: form.weeklyHoursAvailable === h ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
                        background: form.weeklyHoursAvailable === h ? '#eef2ff' : '#fff',
                        color: form.weeklyHoursAvailable === h ? '#4f46e5' : '#374151',
                      }}>
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Learning budget</label>
                <SelectGrid options={BUDGET_OPTIONS} value={form.budgetRange}
                  onChange={v => set('budgetRange', v)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="checkbox" id="hasDeadline" checked={form.hasDeadline}
                  onChange={e => set('hasDeadline', e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#4f46e5', cursor: 'pointer' }} />
                <label htmlFor="hasDeadline" style={{ fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                  I have a target completion date
                </label>
              </div>
              {form.hasDeadline && (
                <div>
                  <label style={labelStyle}>Target completion date</label>
                  <input type="date" value={form.targetCompletionDate}
                    onChange={e => set('targetCompletionDate', e.target.value)}
                    style={inputStyle} />
                </div>
              )}
              <div>
                <label style={labelStyle}>Accessibility needs <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                <input value={form.accessibilityNeeds} onChange={e => set('accessibilityNeeds', e.target.value)}
                  placeholder="e.g. captions, screen reader, dyslexia-friendly fonts…" style={inputStyle} />
              </div>
            </div>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                            padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 16 }}>
                {error}
              </div>
            )}
          </>
        )}

        {/* ── Step 5: AI Conversational Interview ───────────────────────── */}
        {step === 5 && (
          <>
            <StepHeading icon="🤖" title="Quick AI Interview"
              subtitle="3 open-ended questions. Your answers help us build a personalised learning roadmap." />

            {/* Chat transcript */}
            <div style={{
              background: '#f8fafc', borderRadius: 14, padding: 16, minHeight: 220,
              maxHeight: 340, overflowY: 'auto', marginBottom: 16,
              border: '1.5px solid #e2e8f0',
            }}>
              {INTERVIEW_QUESTIONS.slice(0, Math.min(interviewStep + 1, 3)).map((q, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  {/* AI question bubble */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, flexShrink: 0, marginTop: 2,
                    }}>🤖</div>
                    <div style={{
                      background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '0 12px 12px 12px',
                      padding: '10px 14px', fontSize: 14, color: '#1e293b', lineHeight: 1.5, maxWidth: '85%',
                    }}>
                      {q}
                    </div>
                  </div>
                  {/* Learner answer bubble */}
                  {answers[i] && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <div style={{
                        background: '#eef2ff', border: '1.5px solid #c7d2fe', borderRadius: '12px 0 12px 12px',
                        padding: '10px 14px', fontSize: 14, color: '#3730a3', lineHeight: 1.5, maxWidth: '85%',
                      }}>
                        {answers[i]}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Processing state */}
              {interviewStep === 3 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                  }}>🤖</div>
                  <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
                    Analysing your responses…
                    <span style={{ display: 'inline-block', animation: 'pulse 1.5s infinite' }}> ●●●</span>
                  </div>
                </div>
              )}

              {/* AI insights after done */}
              {interviewStep === 4 && aiInsights && (
                <div style={{
                  display: 'flex', gap: 8, marginTop: 8,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, marginTop: 2,
                  }}>🤖</div>
                  <div style={{
                    background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '0 12px 12px 12px',
                    padding: '12px 16px', fontSize: 13, color: '#14532d', lineHeight: 1.6, maxWidth: '85%',
                  }}>
                    <strong>Thanks! Here's what I understood:</strong>
                    <p style={{ margin: '8px 0 4px 0' }}>{aiInsights.summary}</p>
                    {aiInsights.recommendedFocusAreas?.length > 0 && (
                      <>
                        <strong style={{ fontSize: 12 }}>Recommended focus areas:</strong>
                        <ul style={{ margin: '4px 0 0 0', paddingLeft: 18 }}>
                          {aiInsights.recommendedFocusAreas.slice(0, 4).map((area, i) => (
                            <li key={i} style={{ fontSize: 12 }}>{area}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              )}

              {interviewError && (
                <div style={{ fontSize: 12, color: '#dc2626', padding: '6px 0' }}>{interviewError}</div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Answer input — only shown while questions remain */}
            {interviewStep < 3 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  value={currentAnswer}
                  onChange={e => setCurrentAnswer(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAnswerSubmit(); }}
                  rows={3}
                  placeholder={`Type your answer… (Ctrl+Enter to submit, ${3 - interviewStep} question${3 - interviewStep !== 1 ? 's' : ''} remaining)`}
                  style={{ ...inputStyle, resize: 'none', flex: 1, lineHeight: 1.5 }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAnswerSubmit}
                  disabled={!currentAnswer.trim()}
                  style={{
                    padding: '0 18px', borderRadius: 10, border: 'none', cursor: currentAnswer.trim() ? 'pointer' : 'not-allowed',
                    background: currentAnswer.trim() ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#e2e8f0',
                    color: currentAnswer.trim() ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: 18, alignSelf: 'stretch',
                  }}>
                  ↑
                </button>
              </div>
            )}

            {/* Skip interview option */}
            {interviewStep < 3 && (
              <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 10 }}>
                <button type="button"
                  onClick={() => { setInterviewStep(4); setStep(6); }}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>
                  Skip interview
                </button>
              </p>
            )}
          </>
        )}

        {/* ── Step 6: Summary + Readiness Score ─────────────────────────── */}
        {step === 6 && (
          <>
            <StepHeading icon="🚀" title="You're all set!"
              subtitle="Here's a summary of your personalised learning profile." />

            {readinessScore !== null && <ReadinessRing score={readinessScore} />}

            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <SummaryRow label="Role" value={form.currentRole || '—'} />
              <SummaryRow label="Industry" value={form.industry || '—'} />
              <SummaryRow label="Experience" value={form.experienceYears ? `${form.experienceYears} years` : '—'} />
              <SummaryRow label="Goal" value={GOAL_TYPES.find(g => g.value === form.goalType)?.label || '—'} />
              <SummaryRow label="Urgency" value={URGENCY_LABELS[form.careerUrgency] || '—'} />
              <SummaryRow label="Hours/week" value={`${form.weeklyHoursAvailable}h`} />
              <SummaryRow label="Budget" value={BUDGET_OPTIONS.find(b => b.value === form.budgetRange)?.label || '—'} />
              <SummaryRow label="Learning styles"
                value={form.learningStyles.map(s => LEARNING_STYLES.find(l => l.value === s)?.label).join(', ') || '—'}
                last={!aiInsights?.summary} />
              {aiInsights?.summary && (
                <SummaryRow label="AI insight" value={aiInsights.summary} last />
              )}
            </div>

            {submitError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                            padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                {submitError}
              </div>
            )}
          </>
        )}

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, gap: 12 }}>
          {/* Back button — not shown on step 5 while interview is in progress */}
          {step > 1 && !(step === 5 && interviewStep > 0 && interviewStep < 4) ? (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{ padding: '11px 24px', borderRadius: 10, background: '#f1f5f9',
                       border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 14,
                       fontWeight: 600, color: '#475569' }}>
              ← Back
            </button>
          ) : (
            <div />
          )}

          {/* Forward / finish */}
          {step < 5 ? (
            <button
              onClick={handleNext}
              disabled={!canNext() || loading}
              style={{
                padding: '11px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                cursor: canNext() && !loading ? 'pointer' : 'not-allowed', border: 'none',
                background: canNext() && !loading ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#e2e8f0',
                color: canNext() && !loading ? '#fff' : '#94a3b8',
              }}>
              {loading ? 'Saving…' : 'Next →'}
            </button>
          ) : step === 5 ? (
            // On interview step, Next only appears when interview is complete
            interviewStep === 4 ? (
              <button
                onClick={() => setStep(6)}
                style={{ padding: '11px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                         cursor: 'pointer', border: 'none',
                         background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff' }}>
                View Profile →
              </button>
            ) : <div />
          ) : (
            // Step 6 — final "Start Learning"
            <button
              onClick={handleFinish}
              disabled={loading}
              style={{
                padding: '11px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', border: 'none',
                background: loading ? '#e2e8f0' : 'linear-gradient(135deg,#10b981,#059669)',
                color: loading ? '#94a3b8' : '#fff',
              }}>
              {loading ? 'Loading…' : '🚀 Start Learning'}
            </button>
          )}
        </div>

        {/* Skip link */}
        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 16 }}>
          <button type="button" onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
                     fontSize: 12, textDecoration: 'underline' }}>
            Skip for now
          </button>
        </p>
      </div>
    </div>
  );
}
