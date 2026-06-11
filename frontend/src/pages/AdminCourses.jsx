// frontend/src/pages/AdminCourses.jsx
// Phase B — Admin Course Management UI
// Multi-step wizard: Course Basics → Modules → Lessons → Questions → Review & Publish
// Features: enrolment count badges, publish confirmation, maintenance mode, learner notifications

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
    ai:        { background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', border: 'none' },
    ai2:       { background: 'linear-gradient(135deg,#10b981,#0ea5e9)', color: '#fff', border: 'none' },
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
const defaultLesson   = () => ({ id: null, title: '', type: 'text', displayOrder: 1, estimatedMins: 20, xpReward: 10, contentBody: '', videoUrl: '', simulationUrl: '', videoAssetId: '' });
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
                  options={['text', 'video', 'project', 'simulation', 'quiz'].map(t => ({ value: t, label: t }))} />
                <Input label="Est. Minutes" type="number" value={les.estimatedMins}
                  onChange={v => updateLesson(activeModIdx, j, 'estimatedMins', Number(v))} />
                <Input label="XP Reward" type="number" value={les.xpReward}
                  onChange={v => updateLesson(activeModIdx, j, 'xpReward', Number(v))} />
              </div>
              {les.type === 'video' && (
                <Input label="YouTube / Vimeo Embed URL" value={les.videoUrl || ''}
                  onChange={v => updateLesson(activeModIdx, j, 'videoUrl', v)}
                  placeholder="https://www.youtube.com/embed/VIDEO_ID"
                  hint="Use the embed URL (youtube.com/embed/...). Leave blank if not yet found." />
              )}
              {les.type === 'simulation' && (
                <Input label="Simulation Embed URL" value={les.simulationUrl || ''}
                  onChange={v => updateLesson(activeModIdx, j, 'simulationUrl', v)}
                  placeholder="https://... (H5P, Articulate Rise, Adobe Captivate, etc.)"
                  hint="Paste the embed/iframe URL from your simulation tool." />
              )}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  {les.type === 'video' ? 'Notes / Transcript (optional)' :
                   les.type === 'simulation' ? 'Instructions / Context (optional)' :
                   <>Lesson Content <span style={{ fontWeight: 400, color: '#94a3b8' }}>(Markdown)</span></>}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <textarea value={les.contentBody} rows={les.type === 'video' || les.type === 'simulation' ? 6 : 12}
                    onChange={e => updateLesson(activeModIdx, j, 'contentBody', e.target.value)}
                    placeholder={
                      les.type === 'video'
                        ? '## What You Will Learn\n\nAdd notes, key takeaways, or a transcript here...'
                        : les.type === 'simulation'
                        ? '## Instructions\n\nDescribe what learners should do in the simulation...'
                        : '## Introduction\n\nWrite your lesson content in **Markdown** here.'
                    }
                    style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8,
                             fontSize: 13, fontFamily: 'monospace', resize: 'vertical' }} />
                  <div style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8,
                                background: '#fafafa', overflowY: 'auto', maxHeight: 280 }}>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>Preview</p>
                    <MiniMD src={les.contentBody} />
                  </div>
                </div>
              </div>
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

// ── Generate with AI modal (topic-based) ─────────────────────────────────────
function GenerateModal({ onClose, onDone }) {
  const [topic, setTopic]       = useState('');
  const [level, setLevel]       = useState('Beginner');
  const [hours, setHours]       = useState(4);
  const [modules, setModules]   = useState(4);
  const [generating, setGenerating] = useState(false);
  const [error, setError]       = useState('');

  const generate = async () => {
    if (!topic.trim()) { setError('Topic is required'); return; }
    setGenerating(true); setError('');
    try {
      await api.post('/admin/courses/generate', {
        topic: topic.trim(), level, estimatedHours: hours, modulesCount: modules,
      });
      onDone('✅ Course generated and saved as draft!');
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Generation failed');
      setGenerating(false);
    }
  };

  return (
    <Modal title="🤖 Generate Course with AI" onClose={onClose}>
      {generating ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚙️</div>
          <p style={{ color: '#4f46e5', fontWeight: 600, fontSize: 15 }}>Generating course content…</p>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>This can take 20–40 seconds</p>
        </div>
      ) : (
        <>
          <Input label="Topic" value={topic} onChange={setTopic} required
            placeholder="e.g. Introduction to Machine Learning" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '12px 0' }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Level</label>
              <select value={level} onChange={e => setLevel(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}>
                {['Beginner','Intermediate','Advanced'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Est. Hours</label>
              <input type="number" min={1} max={40} value={hours} onChange={e => setHours(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Number of modules</label>
            <input type="number" min={1} max={12} value={modules} onChange={e => setModules(Number(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn onClick={onClose} variant="secondary" small>Cancel</Btn>
            <Btn onClick={generate} small>🤖 Generate Course</Btn>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Generate for Learner modal ────────────────────────────────────────────────
function GenerateForLearnerModal({ onClose, onDone }) {
  const [users, setUsers]       = useState([]);
  const [userId, setUserId]     = useState('');
  const [context, setContext]   = useState(null);
  const [topic, setTopic]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    api.get('/admin/users').then(({ data }) => {
      setUsers((data.users || []).filter(u => u.role !== 'admin'));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const loadContext = async (uid) => {
    setUserId(uid); setContext(null);
    if (!uid) return;
    try {
      const { data } = await api.get(`/admin/courses/learner-context/${uid}`);
      setContext(data);
    } catch {}
  };

  const generate = async () => {
    if (!userId) { setError('Select a learner'); return; }
    setGenerating(true); setError('');
    try {
      await api.post(`/admin/courses/generate-for-learner/${userId}`, { topic: topic.trim() || undefined });
      onDone('✅ Personalised course generated and saved as draft!');
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Generation failed');
      setGenerating(false);
    }
  };

  return (
    <Modal title="🎯 Generate Course for Learner" onClose={onClose}>
      {generating ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚙️</div>
          <p style={{ color: '#4f46e5', fontWeight: 600, fontSize: 15 }}>Generating personalised course…</p>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>Analysing learner profile and skill gaps…</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Select learner</label>
            {loading ? <p style={{ color: '#94a3b8', fontSize: 13 }}>Loading users…</p>
              : users.length === 0 ? (
                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8,
                              padding: '10px 14px', fontSize: 13, color: '#92400e' }}>
                  No learner accounts yet. Users need to register first before you can generate personalised courses for them.
                </div>
              ) : (
              <select value={userId} onChange={e => loadContext(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}>
                <option value="">— choose a learner —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            )}
          </div>

          {context && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
                          padding: '12px 16px', marginBottom: 14, fontSize: 13 }}>
              <strong style={{ color: '#1e293b' }}>{context.name}</strong>
              {context.profile && (
                <div style={{ color: '#64748b', marginTop: 4 }}>
                  {[context.profile.currentRole, context.profile.industry, context.profile.goalType && `Goal: ${context.profile.goalType}`]
                    .filter(Boolean).join(' · ')}
                </div>
              )}
              {context.topSkillGaps?.length > 0 && (
                <div style={{ marginTop: 6, color: '#7c3aed' }}>
                  Top gaps: {context.topSkillGaps.map(g => g.skill).join(', ')}
                </div>
              )}
            </div>
          )}

          <Input label="Topic override (optional)" value={topic} onChange={setTopic}
            placeholder="Leave blank to auto-select from skill gaps" />

          {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <Btn onClick={onClose} variant="secondary" small>Cancel</Btn>
            <Btn onClick={generate} disabled={!userId} small>🎯 Generate for Learner</Btn>
          </div>
        </>
      )}
    </Modal>
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
  const [deleteTarget, setDeleteTarget]           = useState(null);
  const [deleteError, setDeleteError]             = useState('');
  const [deleting, setDeleting]                   = useState(false);
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
          videoUrl: l.videoUrl || '', simulationUrl: l.simulationUrl || '',
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

  const handleDelete = async (force = false) => {
    if (!deleteTarget) return;
    setDeleting(true); setDeleteError('');
    try {
      await api.delete(`/admin/courses/${deleteTarget.id}${force ? '?force=true' : ''}`);
      setDeleteTarget(null);
      setSuccessMsg(`🗑️ "${deleteTarget.title}" deleted.`);
      loadCourses();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e) {
      setDeleteError(e.response?.data?.error || 'Delete failed.');
    } finally { setDeleting(false); }
  };

  const handleSave = async (status) => {
    setSaving(true);
    setSaveError('');
    try {
      let courseId = course.id;
      if (isEdit && courseId) {
        await api.put(`/admin/courses/${courseId}`, { ...course, status });
      } else {
        const { data } = await api.post('/admin/courses', { ...course, status });
        courseId = data.course.id;
      }
      for (const mod of modules) {
        let modId = mod.id;
        const modPayload = {
          title: mod.title, displayOrder: mod.displayOrder,
          estimatedMins: mod.estimatedMins, isFreePreview: mod.isFreePreview,
        };
        if (modId) {
          await api.put(`/admin/modules/${modId}`, modPayload);
        } else {
          const { data } = await api.post(`/admin/courses/${courseId}/modules`, modPayload);
          modId = data.module.id;
        }
        for (const les of (mod.lessons || [])) {
          const lessonPayload = {
            title: les.title, type: les.type, displayOrder: les.displayOrder,
            estimatedMins: les.estimatedMins, xpReward: les.xpReward,
            contentBody: les.contentBody, videoUrl: les.videoUrl || '',
            simulationUrl: les.simulationUrl || '', videoAssetId: les.videoAssetId,
          };
          if (les.id) {
            await api.put(`/admin/lessons/${les.id}`, lessonPayload);
          } else {
            await api.post(`/admin/modules/${modId}/lessons`, lessonPayload);
          }
        }
      }
      for (const q of questions) {
        if (!q._saved) {
          await api.post('/admin/questions', {
            courseId, text: q.text,
            options: q.options.map((text, i) => ({ id: String.fromCharCode(97 + i), text })),
            correctAnswer: [q.correctAnswer],
            explanation: q.explanation, difficulty: 'medium',
            skillTags: q.skillTag ? [q.skillTag] : [], xpReward: q.xpReward,
          });
        }
      }
      setSuccessMsg(status === 'published' ? '🎉 Course published!' : '✅ Draft saved!');
      setView('list');
      loadCourses();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e) {
      const details = e.response?.data?.details;
      const fieldMsg = details?.map(d => `${d.path?.join('.')}: ${d.message}`).join('; ');
      setSaveError(fieldMsg || e.response?.data?.error || e.message || 'Save failed');
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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Btn onClick={() => setShowGenerate(true)} variant="ai">🤖 Generate with AI</Btn>
              <Btn onClick={() => setShowGenerateForLearner(true)} variant="ai2">🎯 Generate for Learner</Btn>
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
                          <Btn onClick={() => { setDeleteTarget({ id: c.id, title: c.title, enrolCount }); setDeleteError(''); }} variant="danger" small>🗑️ Delete</Btn>
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
      {showGenerate && (
        <GenerateModal
          onClose={() => setShowGenerate(false)}
          onDone={(msg) => { setShowGenerate(false); setSuccessMsg(msg); loadCourses(); setTimeout(() => setSuccessMsg(''), 5000); }}
        />
      )}
      {showGenerateForLearner && (
        <GenerateForLearnerModal
          onClose={() => setShowGenerateForLearner(false)}
          onDone={(msg) => { setShowGenerateForLearner(false); setSuccessMsg(msg); loadCourses(); setTimeout(() => setSuccessMsg(''), 5000); }}
        />
      )}
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

      {/* ── Delete confirmation ─────────────────────────────────────────── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 500,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 440, width: '100%',
                        boxShadow: '0 25px 60px rgba(0,0,0,.3)' }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', textAlign: 'center', marginBottom: 8 }}>
              Delete course?
            </h3>
            <p style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 8 }}>
              <strong>"{deleteTarget.title}"</strong> will be permanently removed including all modules, lessons, and questions.
            </p>
            {deleteTarget.enrolCount > 0 && (
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8,
                            padding: '10px 14px', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>
                ⚠️ This course has <strong>{deleteTarget.enrolCount} active enrolment(s)</strong>.
                Learner progress will be permanently lost. Use <em>Force Delete</em> to proceed anyway.
              </div>
            )}
            {deleteError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                            padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
              <Btn onClick={() => { setDeleteTarget(null); setDeleteError(''); }} variant="secondary">
                Cancel
              </Btn>
              {deleteTarget.enrolCount > 0 ? (
                <Btn onClick={() => handleDelete(true)} variant="danger" disabled={deleting}>
                  {deleting ? 'Deleting…' : '⚠️ Force Delete'}
                </Btn>
              ) : (
                <Btn onClick={() => handleDelete(false)} variant="danger" disabled={deleting}>
                  {deleting ? 'Deleting…' : '🗑️ Delete permanently'}
                </Btn>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
