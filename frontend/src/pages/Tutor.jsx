import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

// ── Simple inline markdown for ARIA responses ────────────────────────────────
function MiniMarkdown({ text }) {
  const html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:#1e293b;padding:2px 6px;border-radius:4px;font-size:12px;font-family:monospace;color:#a5f3fc">$1</code>')
    .split('\n')
    .map(line => `<p style="margin:0 0 6px;last-child:margin:0">${line || '&nbsp;'}</p>`)
    .join('');
  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ fontSize: 14, lineHeight: 1.6, color: '#e2e8f0' }}
    />
  );
}

const ARIA_AVATAR = (
  <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#4f46e5,#06b6d4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18 }}>
    🤖
  </div>
);

export default function Tutor() {
  const [input, setInput]       = useState('');
  const [messages, setMessages] = useState(null); // null = loading from history
  const [isTyping, setIsTyping] = useState(false);
  const [contextCourse, setContextCourse] = useState('');
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const queryClient = useQueryClient();

  // Load conversation history
  const { data: historyData, isLoading: histLoading } = useQuery({
    queryKey: ['tutor-history'],
    queryFn: () => api.get('/tutor/history').then(r => r.data),
  });

  // Load enrolled courses for context selector
  const { data: enrolData } = useQuery({
    queryKey: ['enrolments'],
    queryFn: () => api.get('/courses/me/enrolments').then(r => r.data),
    staleTime: 60_000,
  });

  // Populate messages from history once loaded
  useEffect(() => {
    if (historyData && messages === null) {
      setMessages(historyData.messages || []);
    }
  }, [historyData]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMutation = useMutation({
    mutationFn: ({ message, contextCourseId }) =>
      api.post('/tutor/chat', { message, ...(contextCourseId ? { contextCourseId } : {}) }),
    onMutate: ({ message }) => {
      setIsTyping(true);
      setMessages(prev => [...(prev || []), { role: 'user', content: message, id: `tmp-${Date.now()}` }]);
      setInput('');
    },
    onSuccess: (res) => {
      setIsTyping(false);
      setMessages(prev => [...(prev || []), {
        role: 'assistant', content: res.data.response, id: `tmp-a-${Date.now()}`,
      }]);
      queryClient.invalidateQueries(['tutor-history']);
    },
    onError: () => {
      setIsTyping(false);
      setMessages(prev => [...(prev || []), {
        role: 'assistant', content: 'Sorry, I ran into an issue. Please try again.',
        id: `err-${Date.now()}`, isError: true,
      }]);
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => api.delete('/tutor/history'),
    onSuccess: () => {
      setMessages([]);
      queryClient.invalidateQueries(['tutor-history']);
    },
  });

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || sendMutation.isPending) return;
    const courseId = contextCourse || undefined;
    sendMutation.mutate({ message: msg, contextCourseId: courseId });
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const enrolments = enrolData?.enrolments || [];
  const displayMessages = messages ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,.08)',
                    display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%',
                      background: 'linear-gradient(135deg,#4f46e5,#06b6d4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
          🤖
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>ARIA</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>AI Learning Assistant · Powered by Groq</div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Course context selector */}
          {enrolments.length > 0 && (
            <select
              value={contextCourse}
              onChange={e => setContextCourse(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,.08)',
                       border: '1px solid rgba(255,255,255,.15)', color: '#e2e8f0', fontSize: 12,
                       cursor: 'pointer', outline: 'none' }}>
              <option value="">No course context</option>
              {enrolments.map(e => (
                <option key={e.courseId} value={e.courseId}>{e.course?.title}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending || displayMessages.length === 0}
            style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,.06)',
                     border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.5)',
                     fontSize: 12, cursor: 'pointer' }}>
            Clear history
          </button>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Loading skeleton */}
          {histLoading && messages === null && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: 13, paddingTop: 40 }}>
              Loading conversation…
            </div>
          )}

          {/* Empty state */}
          {!histLoading && displayMessages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🤖</div>
              <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Ask ARIA anything</div>
              <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, marginBottom: 28 }}>
                Your personal AI tutor — context-aware and career-focused.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {[
                  'Explain pandas DataFrames with an example',
                  'Quiz me on SQL JOINs',
                  'What should I learn next?',
                  'How does gradient descent work?',
                ].map(prompt => (
                  <button key={prompt} onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                    style={{ padding: '8px 14px', borderRadius: 99, background: 'rgba(79,70,229,.2)',
                             border: '1px solid rgba(79,70,229,.4)', color: '#a5b4fc',
                             fontSize: 13, cursor: 'pointer' }}>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {displayMessages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id || msg.createdAt} style={{
                display: 'flex', gap: 12, flexDirection: isUser ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
              }}>
                {/* Avatar */}
                {isUser ? (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                background: 'linear-gradient(135deg,#7c3aed,#db2777)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontWeight: 700, fontSize: 14 }}>
                    You
                  </div>
                ) : ARIA_AVATAR}

                {/* Bubble */}
                <div style={{
                  maxWidth: '72%',
                  padding: '12px 16px',
                  borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                  background: isUser
                    ? 'linear-gradient(135deg,#4f46e5,#7c3aed)'
                    : msg.isError ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.07)',
                  border: isUser ? 'none'
                    : msg.isError ? '1px solid rgba(239,68,68,.3)' : '1px solid rgba(255,255,255,.08)',
                }}>
                  {isUser ? (
                    <p style={{ margin: 0, fontSize: 14, color: '#fff', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </p>
                  ) : (
                    <MiniMarkdown text={msg.content} />
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isTyping && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {ARIA_AVATAR}
              <div style={{ padding: '14px 18px', borderRadius: '4px 18px 18px 18px',
                            background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.08)',
                            display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%', background: '#a5b4fc',
                    animation: `bounce 1.2s ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input area ─────────────────────────────────────────── */}
      <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,.08)', flexShrink: 0 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask ARIA anything… (Enter to send, Shift+Enter for new line)"
            rows={1}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 12,
              background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)',
              color: '#e2e8f0', fontSize: 14, outline: 'none', resize: 'none',
              fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
            }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            style={{
              width: 44, height: 44, borderRadius: 12, border: 'none', flexShrink: 0,
              background: input.trim() && !sendMutation.isPending
                ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'rgba(255,255,255,.1)',
              color: '#fff', fontSize: 18, cursor: input.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .2s',
            }}>
            ➤
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.2)', marginTop: 8 }}>
          ARIA uses Groq (llama-3.1-8b-instant) · Responses may be inaccurate — verify important facts
        </div>
      </div>

      {/* Bounce animation */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: .4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
