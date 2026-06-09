import { Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated } from './store/authStore';

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
import VerifyEmail    from './pages/VerifyEmail';
import ProtectedRoute from './components/ProtectedRoute';
import Layout         from './components/Layout';

export default function App() {
  const isAuthenticated = useIsAuthenticated();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Protected — all inside Layout (sidebar + topbar) */}
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
        </Route>
      </Route>

      <Route path="*"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
