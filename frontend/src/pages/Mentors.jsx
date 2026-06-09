import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

const STARS = (rating) => {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
};

// ── Mentor Detail Modal ───────────────────────────────────────────────────────
function MentorModal({ mentorId, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['mentor', mentorId],
    queryFn: () => api.get(`/mentors/${mentorId}`).then(r => r.data),
  });

  const mentor = data?.mentor;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
         onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520,
                    maxHeight: '85vh', overflowY: 'auto',
                    boxShadow: '0 20px 60px rgba(0,0,0,.25)', padding: 28 }}>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading…</div>
        ) : mentor ? (
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                              background: 'linear-gradient(135deg,#4f46e5,#06b6d4)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: 700, fontSize: 22 }}>
                  {mentor.name[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#1e293b' }}>{mentor.name}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{mentor.title}</div>
                  <div style={{ color: '#f59e0b', fontSize: 14, marginTop: 4 }}>
                    {STARS(mentor.rating)}
                    <span style={{ color: '#64748b', fontSize: 12, marginLeft: 6 }}>
                      {mentor.rating} · {mentor.sessionCount} sessions
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={onClose}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8',
                         cursor: 'pointer', flexShrink: 0 }}>✕</button>
            </div>

            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, marginBottom: 20 }}>
              {mentor.bio}
            </p>

            {/* Expertise */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase',
                            letterSpacing: '.5px', marginBottom: 8 }}>Expertise</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {mentor.expertise.map(skill => (
                  <span key={skill} style={{ padding: '4px 12px', background: '#e0e7ff', borderRadius: 99,
                                             fontSize: 12, fontWeight: 600, color: '#3730a3' }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Available slots */}
            {mentor.availableSlots?.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase',
                              letterSpacing: '.5px', marginBottom: 8 }}>Available Slots</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {mentor.availableSlots.map(slot => (
                    <span key={slot} style={{ padding: '6px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0',
                                             borderRadius: 8, fontSize: 13, color: '#166534', fontWeight: 600 }}>
                      🕐 {slot}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Book button */}
            {mentor.calendarUrl ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151',
                              textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                  Book a Session
                </div>
                <iframe
                  src={`${mentor.calendarUrl}?hide_gdpr_banner=1&background_color=ffffff&text_color=1e293b&primary_color=4f46e5`}
                  width="100%" height="380"
                  frameBorder="0"
                  title={`Book with ${mentor.name}`}
                  style={{ borderRadius: 10, border: '1px solid #e2e8f0' }}
                />
              </>
            ) : (
              <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10,
                            padding: '12px 16px', fontSize: 13, color: '#92400e', textAlign: 'center' }}>
                📅 To enable booking, add this mentor&#x2019;s Calendly URL to your backend .env as
                <code style={{ display: 'block', marginTop: 4, fontSize: 11,
                               color: '#4f46e5' }}>MENTOR_001_CALENDLY_URL=https://calendly.com/...</code>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Mentor not found.</div>
        )}
      </div>
    </div>
  );
}

// ── Mentor Card ───────────────────────────────────────────────────────────────
function MentorCard({ mentor, onSelect }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,.05)', padding: '20px 20px 16px',
                  display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Avatar + name */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg,#4f46e5,#06b6d4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: 20 }}>
          {mentor.name[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 2 }}>{mentor.name}</div>
          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{mentor.title}</div>
          <div style={{ color: '#f59e0b', fontSize: 13, marginTop: 4 }}>
            {STARS(mentor.rating)}
            <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 6 }}>({mentor.sessionCount})</span>
          </div>
        </div>
      </div>

      {/* Bio */}
      <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: '0 0 14px',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden' }}>
        {mentor.bio}
      </p>

      {/* Expertise chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16 }}>
        {mentor.expertise.slice(0, 3).map(skill => (
          <span key={skill} style={{ padding: '3px 9px', background: '#e0e7ff', borderRadius: 99,
                                     fontSize: 11, fontWeight: 600, color: '#3730a3' }}>
            {skill}
          </span>
        ))}
        {mentor.expertise.length > 3 && (
          <span style={{ padding: '3px 9px', background: '#f1f5f9', borderRadius: 99,
                         fontSize: 11, color: '#64748b' }}>
            +{mentor.expertise.length - 3} more
          </span>
        )}
      </div>

      <button onClick={() => onSelect(mentor.id)}
        style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: '1px solid #4f46e5',
                 background: '#fff', color: '#4f46e5', fontSize: 13, fontWeight: 700,
                 cursor: 'pointer', marginTop: 'auto' }}>
        View Profile →
      </button>
    </div>
  );
}

// ── Main Mentors Page ─────────────────────────────────────────────────────────
export default function Mentors() {
  const [selectedId, setSelectedId] = useState(null);
  const [filterSkill, setFilterSkill] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['mentors'],
    queryFn: () => api.get('/mentors').then(r => r.data),
    staleTime: 60_000,
  });

  const mentors = data?.mentors || [];

  // Collect all unique skills across mentors
  const allSkills = [...new Set(mentors.flatMap(m => m.expertise))].sort();

  const filtered = filterSkill
    ? mentors.filter(m => m.expertise.includes(filterSkill))
    : mentors;

  return (
    <div style={{ padding: 28, maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Mentors</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Get 1:1 guidance from industry professionals. Book a session below.
        </p>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Filter by skill:</span>
        <button onClick={() => setFilterSkill('')}
          style={{ padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
                   background: !filterSkill ? '#4f46e5' : '#f1f5f9',
                   color: !filterSkill ? '#fff' : '#64748b', fontSize: 12, fontWeight: 600 }}>
          All
        </button>
        {allSkills.map(skill => (
          <button key={skill} onClick={() => setFilterSkill(skill === filterSkill ? '' : skill)}
            style={{ padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
                     background: filterSkill === skill ? '#4f46e5' : '#f1f5f9',
                     color: filterSkill === skill ? '#fff' : '#64748b', fontSize: 12, fontWeight: 600 }}>
            {skill}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 20 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ background: '#e2e8f0', borderRadius: 14, height: 220,
                                   animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#fff',
                      borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>No mentors for "{filterSkill}"</div>
          <button onClick={() => setFilterSkill('')}
            style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, border: 'none',
                     background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: 13 }}>
            Show all
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 20 }}>
          {filtered.map(m => <MentorCard key={m.id} mentor={m} onSelect={setSelectedId} />)}
        </div>
      )}



      {selectedId && <MentorModal mentorId={selectedId} onClose={() => setSelectedId(null)} />}

      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:.5} }`}</style>
    </div>
  );
}
