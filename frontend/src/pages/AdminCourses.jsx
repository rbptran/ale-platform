// frontend/src/pages/AdminCourses.jsx
// Phase B + C — Admin Course Management UI
// Multi-step wizard: Course Basics → Modules → Lessons → Questions → Review & Publish
// Features: enrolment count badges, publish confirmation, maintenance mode, learner notifications
// Phase C: ✨ Generate with AI button — calls POST /admin/courses/generate (Gemini Flash)
//          Pre-fills wizard with generated course for review before publishing

import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

// ── Inline Markdown preview ───────────────────────────────────────────────────
function MiniMD({ src }) {
  if (!src) return <span style={{ color: '#94a3b8', fontSize: 13 }}>Nothing to preview yet.</span>;
  const html = src
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 style="margin:.4em 0">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="margin:.5em 0">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="margin:.6em 0">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:.9em">$1</code>')
    .replace(/```[\w]*\n([\s\S]*?)```/gm, '<pre style="background:#1e293b;color:#e2e8f0;padding:12px;border-radius:6px;overflow:auto;font-size:13px"><code>$1</code></pre>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul style="padding-left:20px;margin:.4em 0">$1</ul>')
    .replace(/\n\n/g, '<br/>');
  return <div style={{ fontSize: 13, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: html }} />;
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
const Input = ({ label, value, onChange, type = 'text', placeholder = '', required = false, hint }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
      {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
    </label>
    {hint && <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 4px' }}>{hint}</p>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8,
               fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
  </div>
);

const Select = ({ label, value, onChange, options, required = false }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
      {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
    </label>
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8,
               fontSize: 14, boxSizing: 'border-box', background: '#fff' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Textarea = ({ label, value, onChange, rows = 4, placeholder, hint }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>}
    {hint && <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 4px' }}>{hint}</p>}
    <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8,
               fontSize: 13, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'monospace' }} />
  </div>
);

const Btn = ({ onClick, children, variant = 'primary', disabled = false, small = false }) => {
  const styles = {
    primary:   { background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none' },
    secondary: { background: '#f1f5f9', color: '#374151', border: '1.5px solid #e2e8f0' },
    danger:    { background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca' },
    success:   { background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0' },
    warning:   { background: '#fffbeb', color: '#b45309', border: '1.5px solid #fcd34d' },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...styles[variant], padding: small ? '6px 12px' : '9px 18px', borderRadius: 8,
               fontSize: small ? 13 : 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
               opacity: disabled ? .5 : 1, whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
};

const Tag = ({ text, onRemove }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ede9fe',
                 color: '#4f46e5', borderRadius: 6, padding: '3px 8px', fontSize: 13, fontWeight: 600 }}>
    {text}
    {onRemove && <span onClick={onRemove} style={{ cursor: 'pointer', fontWeight: 700 }}>×</span>}
  </span>
);

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480,
                    boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20,
                                            cursor: 'pointer', color: '#94a3b8', padding: 4 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Step bar ──────────────────────────────────────────────────────────────────
const STEPS = ['Course Basics', 'Modules', 'Lessons', 'Questions', 'Review & Publish'];

function StepBar({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, gap: 0 }}>
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontWeight: 700, fontSize: 14,
                            background: done || active ? '#4f46e5' : '#e2e8f0',
                            color: done || active ? '#fff' : '#94a3b8' }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 11, color: active || done ? '#4f46e5' : '#94a3b8',
                             fontWeight: active ? 700 : 400, marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#4f46e5' : '#e2e8f0',
                            margin: '0 4px', marginBottom: 18 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Defaults ──────────────────────────────────────────────────────────────────
const defaultCourse   = () => ({ id: null, slug: '', title: '', description: '', level: 'Beginner',
                                  estimatedHours: 10, tags: [], status: 'draft',
                                  prerequisiteCourseIds: [], displayOrder: 1 });
const defaultModule   = () => ({ id: null, title: '', displayOrder: 1, estimatedMins: 60, isFreePreview: false, lessons: [] });
const defaultLesson   = () => ({ id: null, title: '', type: 'text', displayOrder: 1, estimatedMins: 20, xpReward: 10, contentBody: '', videoAssetId: '' });
const defaultQuestion = () => ({ text: '', options: ['', '', '', ''], correctAnswer: '', explanation: '', skillTag: '', xpReward: 5 });

// ── Step 1: Course Basics ─────────────────────────────────────────────────────
function StepBasics({ course, setCourse, allCourses }) {
  const [tagInput, setTagInput] = useState('');
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !course.tags.includes(t)) setCourse(c => ({ ...c, tags: [...c.tags, t] }));
    setTagInput('');
  };
  const autoSlug = title => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>Step 1 — Course Basics</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
        <Input label="Course Title" value={course.title} required
          onChange={v => setCourse(c => ({ ...c, title: v, slug: autoSlug(v) }))} placeholder="Python for Data Science" />
        <Input label="Slug" value={course.slug} required hint="Auto-derived from title. Lowercase, hyphens only."
          onChange={v => setCourse(c => ({ ...c, slug: v }))} placeholder="python-for-data-science" />
      </div>
      <Textarea label="Description" value={course.description} rows={3}
        placeholder="One or two sentences shown on the course card."
        onChange={v => setCourse(c => ({ ...c, description: v }))} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 24px' }}>
        <Select label="Level" value={course.level} required onChange={v => setCourse(c => ({ ...c, level: v }))}
          options={['Beginner', 'Intermediate', 'Advanced'].map(l => ({ value: l, label: l }))} />
        <Input label="Estimated Hours" type="number" value={course.estimatedHours}
          onChange={v => setCourse(c => ({ ...c, estimatedHours: Number(v) }))} />
        <Input label="Display Order" type="number" value={course.displayOrder}
          onChange={v => setCourse(c => ({ ...c, displayOrder: Number(v) }))} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Skill Tags</label>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 6px' }}>Must match skill definition names (Python, SQL, Statistics, etc.)</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {course.tags.map(tag => (
            <Tag key={tag} text={tag} onRemove={() => setCourse(c => ({ ...c, tags: c.tags.filter(t => t !== tag) }))} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            placeholder="Type a skill tag and press Enter or Add"
            style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14 }} />
          <Btn onClick={addTag} variant="secondary" small>Add</Btn>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Prerequisites</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {allCourses.filter(c => c.id !== course.id).map(c => {
            const selected = course.prerequisiteCourseIds.includes(c.id);
            return (
              <button key={c.id} onClick={() => setCourse(prev => ({
                ...prev,
                prerequisiteCourseIds: selected
                  ? prev.prerequisiteCourseIds.filter(id => id !== c.id)
                  : [...prev.prerequisiteCourseIds, c.id],
              }))}
                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: 600,
                         border: selected ? '1.5px solid #4f46e5' : '1.5px solid #e2e8f0',
                         background: selected ? '#ede9fe' : '#f8fafc',
                         color: selected ? '#4f46e5' : '#64748b' }}>
                {c.title}
              </button>
            );
          })}
          {allCourses.length === 0 && <span style={{ fontSize: 13, color: '#94a3b8' }}>No other courses yet.</span>}
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Modules ───────────────────────────────────────────────────────────
function StepModules({ modules, setModules }) {
  const add    = () => setModules(m => [...m, { ...defaultModule(), displayOrder: m.length + 1 }]);
  const remove = i  => setModules(m => m.filter((_, idx) => idx !== i).map((mod, idx) => ({ ...mod, displayOrder: idx + 1 })));
  const update = (i, field, val) => setModules(m => m.map((mod, idx) => idx === i ? { ...mod, [field]: val } : mod));
  const move   = (i, dir) => setModules(m => {
    const next = [...m], swap = i + dir;
    if (swap < 0 || swap >= next.length) return m;
    [next[i], next[swap]] = [next[swap], next[i]];
    return next.map((mod, idx) => ({ ...mod, displayOrder: idx + 1 }));
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>Step 2 — Modules</h3>
        <Btn onClick={add} small>+ Add Module</Btn>
      </div>
      {modules.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '2px dashed #e2e8f0' }}>
          No modules yet. Click "+ Add Module" to start.
        </div>
      )}
      {modules.map((mod, i) => (
        <div key={i} style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 12, background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Module {i + 1}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn onClick={() => move(i, -1)} variant="secondary" small disabled={i === 0}>↑</Btn>
              <Btn onClick={() => move(i, 1)} variant="secondary" small disabled={i === modules.length - 1}>↓</Btn>
              <Btn onClick={() => remove(i)} variant="danger" small>Remove</Btn>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0 16px' }}>
            <Input label="Module Title" value={mod.title} required
              onChange={v => update(i, 'title', v)} placeholder="Introduction to Python" />
            <Input label="Est. Minutes" type="number" value={mod.estimatedMins}
              onChange={v => update(i, 'estimatedMins', Number(v))} />
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Free Preview?</label>
              <button onClick={() => update(i, 'isFreePreview', !mod.isFreePreview)}
                style={{ padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                         border: mod.isFreePreview ? '1.5px solid #4f46e5' : '1.5px solid #e2e8f0',
                         background: mod.isFreePreview ? '#ede9fe' : '#f8fafc',
                         color: mod.isFreePreview ? '#4f46e5' : '#94a3b8' }}>
                {mod.isFreePreview ? '✓ Yes' : 'No'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Step 3: Lessons ───────────────────────────────────────────────────────────
function StepLessons({ modules, setModules }) {
  const [activeModIdx, setActiveModIdx] = useState(0);
  const [previewIdx, setPreviewIdx]     = useState(null);

  const addLesson    = modIdx => setModules(m => m.map((mod, i) => i === modIdx ? {
    ...mod, lessons: [...(mod.lessons || []), { ...defaultLesson(), displayOrder: (mod.lessons || []).length + 1 }],
  } : mod));
  const updateLesson = (modIdx, lesIdx, field, val) => setModules(m => m.map((mod, i) => i === modIdx ? {
    ...mod, lessons: mod.lessons.map((les, j) => j === lesIdx ? { ...les, [field]: val } : les),
  } : mod));
  const removeLesson = (modIdx, lesIdx) => setModules(m => m.map((mod, i) => i === modIdx ? {
    ...mod, lessons: mod.lessons.filter((_, j) => j !== lesIdx).map((l, j) => ({ ...l, displayOrder: j + 1 })),
  } : mod));

  if (modules.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Add modules in Step 2 first.</div>;
  }
  const mod = modules[activeModIdx] || modules[0];

  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Step 3 — Lessons</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {modules.map((m, i) => (
          <button key={i} onClick={() => { setActiveModIdx(i); setPreviewIdx(null); }}
            style={{ padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                     border: i === activeModIdx ? '1.5px solid #4f46e5' : '1.5px solid #e2e8f0',
                     background: i === activeModIdx ? '#ede9fe' : '#f8fafc',
                     color: i === activeModIdx ? '#4f46e5' : '#64748b' }}>
            {m.title || `Module ${i + 1}`}
            <span style={{ marginLeft: 6, fontSize: 11, opacity: .7 }}>({(m.lessons || []).length})</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{mod.title || `Module ${activeModIdx + 1}`}</span>
        <Btn onClick={() => addLesson(activeModIdx)} small>+ Add Lesson</Btn>
      </div>
      {(mod.lessons || []).length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '2px dashed #e2e8f0' }}>
          No lessons yet. Click "+ Add Lesson".
        </div>
      )}
      {(mod.lessons || []).map((les, j) => (
        <div key={j} style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 16px', background: '#f8fafc',
                        borderBottom: previewIdx === j ? '1.5px solid #e2e8f0' : 'none' }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
              Lesson {j + 1}: {les.title || <span style={{ color: '#94a3b8' }}>untitled</span>}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn onClick={() => setPreviewIdx(previewIdx === j ? null : j)} variant="secondary" small>
                {previewIdx === j ? 'Collapse' : 'Edit'}
              </Btn>
              <Btn onClick={() => removeLesson(activeModIdx, j)} variant="danger" small>Remove</Btn>
            </div>
          </div>
          {previewIdx === j && (
            <div style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0 16px' }}>
                <Input label="Lesson Title" value={les.title} required
                  onChange={v => updateLesson(activeModIdx, j, 'title', v)} placeholder="Introduction" />
                <Select label="Type" value={les.type}
                  onChange={v => updateLesson(activeModIdx, j, 'type', v)}
                  options={['text', 'video', 'project'].map(t => ({ value: t, label: t }))} />
                <Input label="Est. Minutes" type="number" value={les.estimatedMins}
                  onChange={v => updateLesson(activeModIdx, j, 'estimatedMins', Number(v))} />
                <Input label="XP Reward" type="number" value={les.xpReward}
                  onChange={v => updateLesson(activeModIdx, j, 'xpReward', Number(v))} />
              </div>
              {les.type === 'video' ? (
                <Input label="YouTube Video ID" value={les.videoAssetId}
                  onChange={v => updateLesson(activeModIdx, j, 'videoAssetId', v)}
                  placeholder="dQw4w9WgXcQ (the part after watch?v=)"
                  hint="Only the video ID, not the full URL." />
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    Lesson Content <span style={{ fontWeight: 400, color: '#94a3b8' }}>(Markdown)</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <textarea value={les.contentBody} rows={12}
                      onChange={e => updateLesson(activeModIdx, j, 'contentBody', e.target.value)}
                      placeholder="## Introduction&#10;&#10;Write your lesson content in **Markdown** here."
                      style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8,
                               fontSize: 13, fontFamily: 'monospace', resize: 'vertical' }} />
                    <div style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8,
                                  background: '#fafafa', overflowY: 'auto', maxHeight: 280 }}>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>Preview</p>
                      <MiniMD src={les.contentBody} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 4: Questions ─────────────────────────────────────────────────────────
function StepQuestions({ questions, setQuestions }) {
  const add          = () => setQuestions(q => [...q, defaultQuestion()]);
  const remove       = i  => setQuestions(q => q.filter((_, idx) => idx !== i));
  const update       = (i, field, val) => setQuestions(q => q.map((qst, idx) => idx === i ? { ...qst, [field]: val } : qst));
  const updateOption = (i, optIdx, val) => setQuestions(q => q.map((qst, idx) => idx === i ? {
    ...qst, options: qst.options.map((o, oi) => oi === optIdx ? val : o),
  } : qst));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>Step 4 — MCQ Questions</h3>
        <Btn onClick={add} small>+ Add Question</Btn>
      </div>
      {questions.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '2px dashed #e2e8f0' }}>
          No questions yet. Click "+ Add Question".
        </div>
      )}
      {questions.map((q, i) => (
        <div key={i} style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 12, background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, color: '#374151' }}>Question {i + 1}</span>
            <Btn onClick={() => remove(i)} variant="danger" small>Remove</Btn>
          </div>
          <Textarea label="Question Text" value={q.text} rows={2}
            onChange={v => update(i, 'text', v)} placeholder="What does Python's len() function return?" />
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Answer Options <span style={{ fontWeight: 400, color: '#94a3b8' }}>(click the radio to mark correct)</span>
            </label>
            {q.options.map((opt, oi) => (
              <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <input type="radio" name={`correct-${i}`} checked={q.correctAnswer === opt && opt !== ''}
                  onChange={() => update(i, 'correctAnswer', opt)}
                  style={{ accentColor: '#4f46e5', width: 16, height: 16, flexShrink: 0 }} />
                <input value={opt} onChange={e => updateOption(i, oi, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                  style={{ flex: 1, padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8,
                           fontSize: 13, outline: 'none',
                           borderColor: q.correctAnswer === opt && opt ? '#4f46e5' : '#e2e8f0',
                           background: q.correctAnswer === opt && opt ? '#ede9fe' : '#fff' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0 16px' }}>
            <Textarea label="Explanation" value={q.explanation} rows={2}
              onChange={v => update(i, 'explanation', v)} placeholder="Explain why the correct answer is right..." />
            <Input label="Skill Tag" value={q.skillTag}
              onChange={v => update(i, 'skillTag', v)} placeholder="Python" />
            <Input label="XP Reward" type="number" value={q.xpReward}
              onChange={v => update(i, 'xpReward', Number(v))} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Step 5: Review & Publish ──────────────────────────────────────────────────
function StepReview({ course, modules, questions, onSave, saving, error, isEdit, enrolmentCount }) {
  const totalLessons = modules.reduce((s, m) => s + (m.lessons || []).length, 0);
  const isPublished  = course.status === 'published';
  const hasEnrolees  = enrolmentCount > 0;

  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>Step 5 — Review & Publish</h3>

      {/* Warning for published courses with enrolees */}
      {isEdit && isPublished && hasEnrolees && (
        <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 10,
                      padding: '12px 16px', marginBottom: 20 }}>
          <p style={{ margin: 0, fontWeight: 700, color: '#92400e', fontSize: 14 }}>
            ⚠️ {enrolmentCount} learner{enrolmentCount !== 1 ? 's' : ''} enrolled
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#78350f' }}>
            Saving changes to a published course affects learners immediately. Changing the slug will break existing links.
            Consider notifying learners via the "📢 Notify Learners" button after saving.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[
          ['Title', course.title],
          ['Slug', course.slug],
          ['Level', course.level],
          ['Estimated Hours', course.estimatedHours],
          ['Tags', course.tags.join(', ') || '—'],
          ['Modules', modules.length],
          ['Total Lessons', totalLessons],
          ['Questions', questions.length],
        ].map(([k, v]) => (
          <div key={k} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>{k}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>

      {course.description && (
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, margin: '0 0 6px' }}>DESCRIPTION</p>
          <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>{course.description}</p>
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                      padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <Btn onClick={() => onSave('draft')} variant="secondary" disabled={saving}>
          {saving ? 'Saving…' : 'Save as Draft'}
        </Btn>
        <Btn onClick={() => onSave('published')} disabled={saving}>
          {saving ? 'Publishing…' : isEdit ? 'Update & Publish' : '🚀 Publish Course'}
        </Btn>
      </div>
    </div>
  );
}

// ── Maintenance modal ─────────────────────────────────────────────────────────
function MaintenanceModal({ course, onClose, onSaved }) {
  const [message, setMessage] = useState(course.maintenanceMessage || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post(`/admin/courses/${course.id}/maintenance`, { message: message.trim() || null });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally { setSaving(false); }
  };

  const clear = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post(`/admin/courses/${course.id}/maintenance`, { message: null });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal title="🔧 Maintenance Mode" onClose={onClose}>
      <p style={{ fontSize: 14, color: '#64748b', marginTop: 0 }}>
        When set, learners see an orange banner in the lesson viewer. Leave blank to clear maintenance mode.
      </p>
      <Textarea
        label="Maintenance Message"
        value={message}
        onChange={setMessage}
        rows={3}
        placeholder="This course is undergoing maintenance. Content will be back by Monday 9am."
      />
      {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        {course.maintenanceMessage && (
          <Btn onClick={clear} variant="danger" disabled={saving} small>Clear Maintenance</Btn>
        )}
        <Btn onClick={onClose} variant="secondary" disabled={saving} small>Cancel</Btn>
        <Btn onClick={save} disabled={saving} small>{saving ? 'Saving…' : 'Set Maintenance'}</Btn>
      </div>
    </Modal>
  );
}

// ── Notify modal ──────────────────────────────────────────────────────────────
function NotifyModal({ course, onClose }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');

  const send = async () => {
    if (!message.trim()) { setError('Message is required'); return; }
    setSending(true);
    setError('');
    try {
      const { data } = await api.post(`/admin/courses/${course.id}/notify-learners`, { message: message.trim() });
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally { setSending(false); }
  };

  if (result) {
    return (
      <Modal title="📢 Emails sent" onClose={onClose}>
        <p style={{ fontSize: 15, color: '#374151' }}>
          Sent to <strong>{result.sent}</strong> of <strong>{result.total}</strong> enrolled learner{result.total !== 1 ? 's' : ''}.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Btn onClick={onClose} small>Done</Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="📢 Notify Enrolled Learners" onClose={onClose}>
      <p style={{ fontSize: 14, color: '#64748b', marginTop: 0 }}>
        An email will be sent to every active enrolee in <strong>{course.title}</strong>.
      </p>
      <Textarea
        label="Message"
        value={message}
        onChange={setMessage}
        rows={4}
        placeholder="We've updated the course content with new lessons on X. All your progress is preserved."
      />
      {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn onClick={onClose} variant="secondary" disabled={sending} small>Cancel</Btn>
        <Btn onClick={send} disabled={sending} small>{sending ? 'Sending…' : 'Send Emails'}</Btn>
      </div>
    </Modal>
  );
}

// ── AI Generate Modal ─────────────────────────────────────────────────────────
function GenerateModal({ onClose, onGenerated }) {
  const [topic, setTopic]     = useState('');
  const [level, setLevel]     = useState('Beginner');
  const [numModules, setNumModules] = useState(3);
  const [audience, setAudience]    = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError]          = useState('');

  const generate = async () => {
    if (!topic.trim()) { setError('Topic is required'); return; }
    setGenerating(true);
    setError('');
    try {
      const { data } = await api.post('/admin/courses/generate', {
        topic: topic.trim(),
        level,
        numModules: parseInt(numModules),
        targetAudience: audience.trim() || undefined,
      });
      onGenerated(data.course);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Generation failed');
    } finally { setGenerating(false); }
  };

  return (
    <Modal title="✨ Generate Course with AI" onClose={onClose}>
      <p style={{ fontSize: 14, color: '#64748b', marginTop: 0, marginBottom: 16 }}>
        Describe a topic and Gemini will generate a full course structure — modules, lessons, content, and quiz questions — ready for you to review and publish.
      </p>
      <Input label="Topic" value={topic} onChange={setTopic} required
        placeholder="e.g. Python for Data Science, Agile Project Management, SQL fundamentals" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Select label="Level" value={level} onChange={setLevel}
          options={['Beginner', 'Intermediate', 'Advanced'].map(l => ({ value: l, label: l }))} />
        <Select label="Modules" value={String(numModules)} onChange={v => setNumModules(Number(v))}
          options={[2,3,4,5,6].map(n => ({ value: String(n), label: `${n} modules` }))} />
      </div>
      <Input label="Target Audience (optional)" value={audience} onChange={setAudience}
        placeholder="e.g. junior developers, marketing professionals" />
      {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {generating && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8,
                      padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#0369a1' }}>
          ✨ AI is generating your course… this takes 15-30 seconds.
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn onClick={onClose} variant="secondary" disabled={generating} small>Cancel</Btn>
        <Btn onClick={generate} disabled={generating} small>
          {generating ? '⏳ Generating…' : '✨ Generate Course'}
        </Btn>
      </div>
    </Modal>
  );
}

// ── Generate For Learner Modal ────────────────────────────────────────────────
function ProficiencyBar({ pct, label }) {
  const color = pct >= 70 ? '#16a34a' : pct >= 30 ? '#f59e0b' : '#dc2626';
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
        <span style={{ color: '#374151' }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ background: '#e2e8f0', borderRadius: 99, height: 6 }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: color, transition: 'width .3s' }} />
      </div>
    </div>
  );
}

function GenerateForLearnerModal({ onClose, onGenerated }) {
  const [users, setUsers]           = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch]         = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [context, setContext]       = useState(null);
  const [loadingCtx, setLoadingCtx] = useState(false);
  const [numModules, setNumModules] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState('');

  // Load all learners
  useEffect(() => {
    api.get('/admin/users').then(r => {
      setUsers(r.data.users || []);
      setLoadingUsers(false);
    }).catch(() => setLoadingUsers(false));
  }, []);

  // Load learner context when user selected
  const selectUser = async (user) => {
    setSelectedUser(user);
    setContext(null);
    setError('');
    setLoadingCtx(true);
    try {
      const { data } = await api.get(`/admin/courses/learner-context/${user.id}`);
      setContext(data.context);
    } catch (e) {
      setError('Failed to load learner profile: ' + (e.response?.data?.error || e.message));
    } finally { setLoadingCtx(false); }
  };

  const generate = async () => {
    if (!selectedUser) return;
    setGenerating(true);
    setError('');
    try {
      const { data } = await api.post(`/admin/courses/generate-for-learner/${selectedUser.id}`, {
        numModules: parseInt(numModules),
      });
      onGenerated(data.course, data.context);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Generation failed');
    } finally { setGenerating(false); }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 780,
                    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
              🎯 Generate Personalised Course for Learner
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              AI analyses skill gaps, assessment scores, and career goal to generate a targeted course.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20,
                                            cursor: 'pointer', color: '#94a3b8', padding: 4 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left: learner list */}
          <div style={{ width: 260, borderRight: '1px solid #e2e8f0', display: 'flex',
                        flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search learners…"
                style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0',
                         borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingUsers
                ? <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading…</div>
                : filtered.length === 0
                  ? <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No learners found</div>
                  : filtered.map(u => {
                      const isSelected = selectedUser?.id === u.id;
                      const enrolCount = u._count?.enrolments ?? 0;
                      const xp = u.profile?.xpTotal ?? 0;
                      return (
                        <div key={u.id} onClick={() => selectUser(u)}
                          style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                                   background: isSelected ? '#ede9fe' : 'transparent',
                                   borderLeft: isSelected ? '3px solid #4f46e5' : '3px solid transparent' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#4f46e5' : '#1e293b' }}>
                            {u.name}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            {u.email}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {enrolCount} course{enrolCount !== 1 ? 's' : ''} · {xp} XP
                          </div>
                        </div>
                      );
                    })
              }
            </div>
          </div>

          {/* Right: profile + generate */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {!selectedUser && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>👈</div>
                <div style={{ fontSize: 14 }}>Select a learner to see their profile and generate a course</div>
              </div>
            )}

            {selectedUser && loadingCtx && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: 14 }}>
                Loading profile…
              </div>
            )}

            {selectedUser && context && (
              <div>
                {/* Profile header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#ede9fe',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 18, fontWeight: 700, color: '#4f46e5' }}>
                    {context.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{context.name}</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      {context.currentRole || 'Role not set'} · Level {context.level} · {context.xp} XP
                    </div>
                  </div>
                </div>

                {/* Career goal */}
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8,
                              padding: '10px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase',
                                letterSpacing: '.5px', marginBottom: 4 }}>Career Goal</div>
                  <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600 }}>
                    {context.careerGoal || <em style={{ color: '#94a3b8', fontWeight: 400 }}>Not set — AI will infer from skills</em>}
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Completed', value: context.completedCourses.length, icon: '✅' },
                    { label: 'In Progress', value: context.activeCourses.length, icon: '📖' },
                    { label: 'Lessons Done', value: context.lessonsCompleted, icon: '📝' },
                    { label: 'Avg Score', value: context.avgAssessmentScore !== null ? `${context.avgAssessmentScore}%` : 'N/A', icon: '🎯' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 18 }}>{s.icon}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Skill proficiency */}
                {(context.proficientSkills.length + context.developingSkills.length + context.weakSkills.length) > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8,
                                  textTransform: 'uppercase', letterSpacing: '.5px' }}>Skill Proficiency</div>
                    {[...context.proficientSkills, ...context.developingSkills, ...context.weakSkills].map(s => (
                      <ProficiencyBar key={s.name} label={s.name} pct={s.pct} />
                    ))}
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                      🟢 Proficient ≥70% &nbsp;🟡 Developing 30–69% &nbsp;🔴 Weak &lt;30%
                    </div>
                  </div>
                )}

                {/* Completed courses */}
                {context.completedCourses.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6,
                                  textTransform: 'uppercase', letterSpacing: '.5px' }}>Completed Courses</div>
                    {context.completedCourses.map((c, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#64748b', marginBottom: 3 }}>
                        ✅ {c.title} <span style={{ color: '#94a3b8' }}>({c.tags.join(', ') || 'no tags'})</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* What AI will focus on */}
                <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 8,
                              padding: '10px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#854d0e', marginBottom: 4 }}>
                    🎯 AI will target:
                  </div>
                  <div style={{ fontSize: 13, color: '#78350f' }}>
                    {context.weakSkills.length > 0
                      ? `Weak skills: ${context.weakSkills.map(s => s.name).join(', ')}`
                      : context.developingSkills.length > 0
                        ? `Developing skills: ${context.developingSkills.map(s => s.name).join(', ')}`
                        : context.careerGoal
                          ? `Gaps between current skills and goal: "${context.careerGoal}"`
                          : 'Career-relevant topics inferred from their profile'
                    }
                  </div>
                </div>

                {/* Generate controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Select label="" value={String(numModules)} onChange={v => setNumModules(Number(v))}
                    options={[2,3,4,5,6].map(n => ({ value: String(n), label: `${n} modules` }))} />
                  <Btn onClick={generate} disabled={generating}>
                    {generating ? '⏳ Generating…' : '🎯 Generate Personalised Course'}
                  </Btn>
                </div>
                {generating && (
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8,
                                padding: '10px 14px', marginTop: 10, fontSize: 13, color: '#0369a1' }}>
                    ✨ AI is analysing {context.name}&#39;s profile and generating a targeted course… (~15-30 seconds)
                  </div>
                )}
                {error && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 10 }}>{error}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main AdminCourses page ────────────────────────────────────────────────────
export default function AdminCourses() {
  const [view, setView]         = useState('list'); // 'list' | 'wizard'
  const [step, setStep]         = useState(0);
  const [courses, setCourses]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isEdit, setIsEdit]     = useState(false);
  const [editEnrolCount, setEditEnrolCount] = useState(0);

  // Modals
  const [maintenanceTarget, setMaintenanceTarget] = useState(null);
  const [notifyTarget, setNotifyTarget]           = useState(null);
  const [showGenerate, setShowGenerate]           = useState(false);
  const [showGenerateForLearner, setShowGenerateForLearner] = useState(false);

  // Wizard state
  const [course, setCourse]     = useState(defaultCourse());
  const [modules, setModules]   = useState([]);
  const [questions, setQuestions] = useState([]);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/courses');
      setCourses(data.courses || []);
    } catch (e) {
      console.error('[AdminCourses] loadCourses failed:', e.response?.data || e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const startCreate = () => {
    setCourse(defaultCourse());
    setModules([]);
    setQuestions([]);
    setStep(0);
    setIsEdit(false);
    setEditEnrolCount(0);
    setSaveError('');
    setView('wizard');
  };

  // Called when either GenerateModal or GenerateForLearnerModal returns a course object
  // ctx is optional — only present for learner-personalised courses
  const startFromGenerated = (generated, ctx) => {
    // Coerce-safe slug: lowercase, only a-z 0-9 hyphens, no leading/trailing/consecutive hyphens
    const safeSlug = raw =>
      (raw || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')   // non-alphanumeric → hyphen
        .replace(/-{2,}/g, '-')         // collapse consecutive hyphens
        .replace(/^-+|-+$/g, '')        // strip leading/trailing hyphens
        .substring(0, 80) || 'ai-course';

    // Coerce-safe integer (AI may return strings or floats)
    const toInt  = (v, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 ? n : def; };
    const toNum  = (v, def) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : def; };

    // Validate level — AI occasionally returns unexpected values
    const validLevels = ['Beginner', 'Intermediate', 'Advanced'];
    const safeLevel   = validLevels.includes(generated.level) ? generated.level : 'Beginner';

    // Tags must all be strings
    const safeTags = (generated.tags || [])
      .map(t => String(t).trim())
      .filter(t => t.length > 0);

    setCourse({
      id: null,
      slug:        safeSlug(generated.slug || generated.title),
      title:       (generated.title || '').trim(),
      description: (generated.description || '').trim(),
      level:       safeLevel,
      estimatedHours: toNum(generated.estimatedHours, 10),
      tags:        safeTags,
      status:      'draft',
      prerequisiteCourseIds: [],
      displayOrder: courses.length + 1,
    });

    setModules((generated.modules || []).map((m, mi) => ({
      id: null,
      title:        (m.title || `Module ${mi + 1}`).trim(),
      displayOrder: mi + 1,
      estimatedMins: toInt(m.estimatedMins, 60),
      isFreePreview: mi === 0,
      lessons: (m.lessons || []).map((l, li) => ({
        id: null,
        title:        (l.title || `Lesson ${li + 1}`).trim(),
        type:         ['text','video','quiz','project','simulation'].includes(l.type) ? l.type : 'text',
        displayOrder: li + 1,
        estimatedMins: toInt(l.estimatedMins, 20),
        xpReward:      toInt(l.xpReward, 10),
        contentBody:   l.contentBody || '',
        videoAssetId:  '',
      })),
    })));

    setQuestions((generated.questions || []).map(q => {
      // Normalise options to plain strings for the wizard UI
      const opts = (q.options || []).map(o => (typeof o === 'string' ? o : o?.text || ''));

      // correctAnswer from AI is a letter ('a'-'d'); convert to the option text
      const resolveAnswer = (ca) => {
        if (typeof ca !== 'string') return opts[0] || '';
        const idx = ['a','b','c','d'].indexOf(ca.toLowerCase());
        return idx >= 0 ? (opts[idx] || ca) : ca;
      };
      const ca = Array.isArray(q.correctAnswer) ? (q.correctAnswer[0] || '') : (q.correctAnswer || '');

      return {
        _saved:       false,
        text:         (q.text || '').trim(),
        options:      opts,
        correctAnswer: resolveAnswer(ca),
        explanation:  (q.explanation || '').trim(),
        skillTag:     String((q.skillTags || [])[0] || '').trim(),
        xpReward:     toInt(q.xpReward, 5),
      };
    }));

    setStep(0);
    setIsEdit(false);
    setEditEnrolCount(0);
    setSaveError('');
    setSuccessMsg(ctx
      ? `🎯 Personalised for ${ctx.name}! Review each step, then publish.`
      : '✨ AI generated! Review and edit each step, then publish.');
    setView('wizard');
  };

  const startEdit = async (courseId) => {
    try {
      const { data } = await api.get(`/admin/courses/${courseId}`);
      const c = data.course;
      setCourse({
        id: c.id, slug: c.slug, title: c.title, description: c.description || '',
        level: c.level, estimatedHours: c.estimatedHours || 10,
        tags: c.tags || [], status: c.status || 'draft',
        prerequisiteCourseIds: c.prerequisiteCourseIds || [],
        displayOrder: c.displayOrder || 1,
      });
      setModules((c.modules || []).map(m => ({
        id: m.id, title: m.title, displayOrder: m.displayOrder,
        estimatedMins: m.estimatedMins || 60, isFreePreview: m.isFreePreview || false,
        lessons: (m.lessons || []).map(l => ({
          id: l.id, title: l.title, type: l.type || 'text',
          displayOrder: l.displayOrder, estimatedMins: l.estimatedMins || 20,
          xpReward: l.xpReward || 10, contentBody: l.contentBody || '',
          videoAssetId: l.videoAssetId || '',
        })),
      })));
      setQuestions((c.questions || []).map(q => ({
        _saved: true,
        text: q.text,
        options: (q.options || []).map(o => (typeof o === 'string' ? o : o.text)),
        correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer,
        explanation: q.explanation || '',
        skillTag: (q.skillTags || [])[0] || '',
        xpReward: q.xpReward || 5,
      })));
      // Capture enrolment count from the list (already loaded)
      const listItem = courses.find(co => co.id === courseId);
      setEditEnrolCount(listItem?._count?.enrolments ?? 0);
      setStep(0);
      setIsEdit(true);
      setSaveError('');
      setView('wizard');
    } catch (e) {
      alert('Failed to load course for editing: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleSave = async (status) => {
    setSaving(true);
    setSaveError('');
    try {
      // Coerce to correct types before posting — prevents Zod validation failures
      // (AI or user edits can leave numbers as strings)
      const toInt = (v, def) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 ? n : def; };
      const toNum = (v, def) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : def; };

      const coursePayload = {
        slug:                  String(course.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, ''),
        title:                 course.title,
        description:           course.description || undefined,
        level:                 course.level,
        estimatedHours:        toNum(course.estimatedHours, 10),
        tags:                  (course.tags || []).map(t => String(t).trim()).filter(Boolean),
        prerequisiteCourseIds: course.prerequisiteCourseIds || [],
        displayOrder:          toInt(course.displayOrder, 1),
        status,
      };

      let courseId = course.id;
      if (isEdit && courseId) {
        await api.put(`/admin/courses/${courseId}`, coursePayload);
      } else {
        const { data } = await api.post('/admin/courses', coursePayload);
        courseId = data.course.id;
      }
      for (const mod of modules) {
        let modId = mod.id;
        if (!modId) {
          const { data } = await api.post(`/admin/courses/${courseId}/modules`, {
            title: mod.title, displayOrder: toInt(mod.displayOrder, 1),
            estimatedMins: toInt(mod.estimatedMins, 60), isFreePreview: !!mod.isFreePreview,
          });
          modId = data.module.id;
        }
        for (const les of (mod.lessons || [])) {
          if (!les.id) {
            await api.post(`/admin/modules/${modId}/lessons`, {
              title: les.title,
              type: les.type || 'text',
              displayOrder: toInt(les.displayOrder, 1),
              estimatedMins: toInt(les.estimatedMins, 20),
              xpReward: toInt(les.xpReward, 10),
              contentBody: les.contentBody || undefined,
              videoAssetId: les.videoAssetId || undefined,
            });
          }
        }
      }
      for (const q of questions) {
        if (!q._saved) {
          // Ensure options are non-empty strings and text meets min(5) chars
          const cleanOptions = (q.options || [])
            .map((text, i) => ({ id: String.fromCharCode(97 + i), text: String(text || `Option ${i + 1}`) }));
          const questionText = String(q.text || '').trim();
          if (questionText.length < 5) continue; // skip malformed questions silently
          await api.post('/admin/questions', {
            courseId,
            text: questionText,
            type: 'mcq',
            options: cleanOptions,
            correctAnswer: [String(q.correctAnswer || cleanOptions[0]?.text || 'a')],
            explanation: q.explanation || undefined,
            difficulty: 'medium',
            skillTags: q.skillTag ? [String(q.skillTag).trim()] : [],
            xpReward: toInt(q.xpReward, 5),
          });
        }
      }
      setSuccessMsg(status === 'published' ? '🎉 Course published!' : '✅ Draft saved!');
      setView('list');
      loadCourses();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e) {
      setSaveError(e.response?.data?.error || e.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const canNext = () => {
    if (step === 0) return course.title.trim() && course.slug.trim();
    if (step === 1) return modules.every(m => m.title.trim());
    return true;
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 28, maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: 0 }}>
            {view === 'list' ? '📚 Course Management' : isEdit ? '✏️ Edit Course' : '➕ Create Course'}
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0' }}>
            {view === 'list' ? 'Create, edit, and publish courses' : 'Admin · Course Wizard'}
          </p>
        </div>
        {view === 'list'
          ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => setShowGenerateForLearner(true)}
                style={{ padding: '9px 18px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                         cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
                         background: 'linear-gradient(135deg,#059669,#0d9488)', color: '#fff' }}>
                🎯 Generate for Learner
              </button>
              <button onClick={() => setShowGenerate(true)}
                style={{ padding: '9px 18px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                         cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
                         background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff' }}>
                ✨ Generate with AI
              </button>
              <Btn onClick={startCreate}>+ Create New Course</Btn>
            </div>
          )
          : <Btn onClick={() => setView('list')} variant="secondary">← Back to List</Btn>
        }
      </div>

      {/* Success banner */}
      {successMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a',
                      padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14, fontWeight: 600 }}>
          {successMsg}
        </div>
      )}

      {/* ── List view ──────────────────────────────────────────────────────── */}
      {view === 'list' && (
        loading
          ? <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading courses…</div>
          : courses.length === 0
            ? (
              <div style={{ textAlign: 'center', padding: 60, background: '#f8fafc', borderRadius: 16, border: '2px dashed #e2e8f0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                <p style={{ color: '#64748b', fontSize: 16 }}>No courses yet. Create your first one!</p>
                <Btn onClick={startCreate}>+ Create Course</Btn>
              </div>
            )
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {courses.map(c => {
                  const enrolCount    = c._count?.enrolments ?? 0;
                  const moduleCount   = c._count?.modules ?? 0;
                  const hasMaintenance = !!c.maintenanceMessage;

                  return (
                    <div key={c.id} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12,
                                             padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        {/* Course info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{c.title}</span>
                            {/* Status badge */}
                            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                                           background: c.status === 'published' ? '#dcfce7' : '#fef9c3',
                                           color: c.status === 'published' ? '#16a34a' : '#854d0e' }}>
                              {c.status}
                            </span>
                            {/* Level badge */}
                            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20,
                                           background: '#ede9fe', color: '#4f46e5', fontWeight: 600 }}>
                              {c.level}
                            </span>
                            {/* Enrolment count badge */}
                            {enrolCount > 0 && (
                              <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20,
                                             background: '#fff7ed', color: '#c2410c', fontWeight: 600,
                                             border: '1px solid #fed7aa' }}>
                                👥 {enrolCount} enrolled
                              </span>
                            )}
                            {/* Maintenance badge */}
                            {hasMaintenance && (
                              <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20,
                                             background: '#fffbeb', color: '#b45309', fontWeight: 600,
                                             border: '1px solid #fcd34d' }}>
                                🔧 maintenance
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: '#64748b' }}>
                            {c.estimatedHours}h · {moduleCount} module{moduleCount !== 1 ? 's' : ''} · {(c.tags || []).join(', ') || 'No tags'} · Order #{c.displayOrder}
                          </div>
                          {hasMaintenance && (
                            <div style={{ fontSize: 12, color: '#92400e', marginTop: 4, fontStyle: 'italic' }}>
                              "{c.maintenanceMessage}"
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <Btn onClick={() => startEdit(c.id)} variant="secondary" small>✏️ Edit</Btn>
                          <Btn onClick={() => setMaintenanceTarget(c)} variant="warning" small>
                            {hasMaintenance ? '🔧 Maint. ON' : '🔧 Maintenance'}
                          </Btn>
                          {c.status === 'published' && enrolCount > 0 && (
                            <Btn onClick={() => setNotifyTarget(c)} variant="secondary" small>📢 Notify</Btn>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
      )}

      {/* ── Wizard view ────────────────────────────────────────────────────── */}
      {view === 'wizard' && (
        <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 16, padding: 32 }}>
          <StepBar current={step} />

          {step === 0 && <StepBasics course={course} setCourse={setCourse} allCourses={courses} />}
          {step === 1 && <StepModules modules={modules} setModules={setModules} />}
          {step === 2 && <StepLessons modules={modules} setModules={setModules} />}
          {step === 3 && <StepQuestions questions={questions} setQuestions={setQuestions} />}
          {step === 4 && (
            <StepReview course={course} modules={modules} questions={questions}
              onSave={handleSave} saving={saving} error={saveError}
              isEdit={isEdit} enrolmentCount={editEnrolCount} />
          )}

          {step < 4 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32,
                          borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
              <Btn onClick={() => setStep(s => s - 1)} variant="secondary" disabled={step === 0}>← Back</Btn>
              <Btn onClick={() => setStep(s => s + 1)} disabled={!canNext()}>Next →</Btn>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {maintenanceTarget && (
        <MaintenanceModal
          course={maintenanceTarget}
          onClose={() => setMaintenanceTarget(null)}
          onSaved={loadCourses}
        />
      )}
      {notifyTarget && (
        <NotifyModal
          course={notifyTarget}
          onClose={() => setNotifyTarget(null)}
        />
      )}
      {showGenerate && (
        <GenerateModal
          onClose={() => setShowGenerate(false)}
          onGenerated={startFromGenerated}
        />
      )}
      {showGenerateForLearner && (
        <GenerateForLearnerModal
          onClose={() => setShowGenerateForLearner(false)}
          onGenerated={(course, ctx) => startFromGenerated(course, ctx)}
        />
      )}
    </div>
  );
}
