// useInactivityTimeout.js
// Logs the user out after a period of inactivity and redirects to /login.
// Activity is any mouse move, key press, click, scroll, or touch.

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes — change here to adjust
const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

export default function useInactivityTimeout() {
  const logout  = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const timer   = useRef(null);

  const reset = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      logout();
      navigate('/login?reason=timeout');
    }, TIMEOUT_MS);
  };

  useEffect(() => {
    reset(); // start timer on mount
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer.current);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);
}
