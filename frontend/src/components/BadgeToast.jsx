import { createContext, useContext, useState, useCallback, useRef } from 'react';

// ── Context ──────────────────────────────────────────────────────────────────
const BadgeToastContext = createContext(null);

export function useBadgeToast() {
  return useContext(BadgeToastContext);
}

// ── Provider — mount once in Layout ─────────────────────────────────────────
export function BadgeToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timerRefs = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timerRefs.current[id]);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // badges: array of { id, name, description, icon, criteriaType }
  const showBadges = useCallback((badges) => {
    if (!badges?.length) return;
    badges.forEach((badge, i) => {
      const id = `${badge.id}-${Date.now()}-${i}`;
      const delay = i * 600; // stagger multiple badges

      setTimeout(() => {
        setToasts(prev => [...prev, { ...badge, toastId: id }]);
        timerRefs.current[id] = setTimeout(() => dismiss(id), 5000);
      }, delay);
    });
  }, [dismiss]);

  return (
    <BadgeToastContext.Provider value={{ showBadges }}>
      {children}

      {/* Toast container — bottom-right */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <BadgeToastCard key={toast.toastId} toast={toast} onDismiss={() => dismiss(toast.toastId)} />
        ))}
      </div>
    </BadgeToastContext.Provider>
  );
}

// ── Individual toast card ────────────────────────────────────────────────────
function BadgeToastCard({ toast, onDismiss }) {
  return (
    <div
      onClick={onDismiss}
      style={{
        pointerEvents: 'all',
        background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
        border: '1px solid rgba(165,180,252,.3)',
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        minWidth: 280,
        maxWidth: 340,
        boxShadow: '0 8px 32px rgba(0,0,0,.4)',
        cursor: 'pointer',
        animation: 'slideInToast .35s cubic-bezier(.34,1.56,.64,1)',
      }}
    >
      {/* Badge icon / emoji */}
      <div style={{
        width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg,#f59e0b,#d97706)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, boxShadow: '0 0 16px rgba(245,158,11,.5)',
      }}>
        {toast.icon || '🏅'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc',
                      textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 2 }}>
          🎉 Badge Earned!
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
          {toast.name}
        </div>
        {toast.description && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.4,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {toast.description}
          </div>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)',
                 fontSize: 16, cursor: 'pointer', padding: 4, flexShrink: 0 }}
      >
        ✕
      </button>

      <style>{`
        @keyframes slideInToast {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
