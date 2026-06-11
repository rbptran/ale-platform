import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useIsAuthenticated, useAuthStore } from './store/authStore';
import api from './api/client';

import Login          from './pages/Login';
import Register       from './pages/Register';
import Dashboard      from './pages/Dashboard';
import Courses        from './pages/Courses';
import Skills         from './pages/Skills';
import Achievements   from './pages/Achievements';
import LessonViewer   from './pages/LessonViewer';
import Assessment     from './pages/Assessment';
import Tutor          from './pages/Tutor';
import Path           from './pages/Path';
import Community      from './pages/Community';
import Profile        from './pages/Profile';
import Mentors        from './pages/Mentors';
import Leaderboard    from './pages/Leaderboard';
import VerifyEmail     from './pages/VerifyEmail';
import ForgotPassword  from './pages/ForgotPassword';
import ResetPassword   from './pages/ResetPassword';
import AdminCourses    from './pages/AdminCourses';
import Onboarding      from './pages/Onboarding';
import ProtectedRoute from './components/ProtectedRoute';
import Layout         from './components/Layout';

// Wrapper: if authenticated but onboarding incomplete, redirect to /onboarding
function OnboardingGate({ children }) {
  const [checked, setChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const location = useLocation();
  const isAuthenticated = useIsAuthenticated();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!isAuthenticated || location.pathname === '/onboarding') {
      setChecked(true);
      return;
    }
    // Admins skip onboarding
    if (user?.role === 'admin') { setChecked(true); return; }

    api.get('/profile')
      .then(({ data }) => {
        setNeedsOnboarding(!data.profile?.onboardingCompleted);
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, [isAuthenticated, location.pathname]);

  if (!checked) return null; // brief flash guard
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

export default function App() {
  const isAuthenticated = useIsAuthenticated();
  const user = useAuthStore((s) => s.user);

  return (
    <OnboardingGate>
      <Routes>
        {/* Public */}
        <Route path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
        <Route path="/verify-email"    element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />

        {/* Onboarding — protected but outside Layout */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<Onboarding />} />
        </Route>

        {/* Protected — inside Layout (sidebar + topbar) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard"    element={<Dashboard />} />
            <Route path="/courses"      element={<Courses />} />
            <Route path="/courses/:slug/lessons/:lessonId" element={<LessonViewer />} />
            <Route path="/courses/:slug/assessment"        element={<Assessment />} />
            <Route path="/skills"       element={<Skills />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/community"    element={<Community />} />
            <Route path="/tutor"        element={<Tutor />} />
            <Route path="/path"         element={<Path />} />
            <Route path="/profile"      element={<Profile />} />
            <Route path="/mentors"      element={<Mentors />} />
            <Route path="/leaderboard"  element={<Leaderboard />} />
            {/* Admin-only */}
            <Route path="/admin/courses"
              element={user?.role === 'admin' ? <AdminCourses /> : <Navigate to="/dashboard" replace />} />
          </Route>
        </Route>

        <Route path="*"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </OnboardingGate>
  );
}
