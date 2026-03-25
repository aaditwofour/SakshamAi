// App.js - Main Router
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import InterviewPage from './pages/InterviewPage';
import InterviewResult from './pages/InterviewResult';
import ResumePage from './pages/ResumePage';
import HistoryPage from './pages/HistoryPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminStudents from './pages/AdminStudents';
import AdminStudentReport from './pages/AdminStudentReport';

// Route Guards
const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Student Routes */}
      <Route path="/dashboard" element={<PrivateRoute role="student"><StudentDashboard /></PrivateRoute>} />
      <Route path="/interview" element={<PrivateRoute role="student"><InterviewPage /></PrivateRoute>} />
      <Route path="/interview/result/:id" element={<PrivateRoute role="student"><InterviewResult /></PrivateRoute>} />
      <Route path="/resume" element={<PrivateRoute role="student"><ResumePage /></PrivateRoute>} />
      <Route path="/history" element={<PrivateRoute role="student"><HistoryPage /></PrivateRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>} />
      <Route path="/admin/students" element={<PrivateRoute role="admin"><AdminStudents /></PrivateRoute>} />
      <Route path="/admin/students/:id" element={<PrivateRoute role="admin"><AdminStudentReport /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer
          position="top-left"
          autoClose={3000}
          theme="dark"
          toastStyle={{ background: '#131929', border: '1px solid #1e2d4a', color: '#f0f4ff' }}
        />
      </BrowserRouter>
      <style>{`
        .loading-screen {
          display: flex; align-items: center; justify-content: center;
          min-height: 100vh; background: var(--bg-primary);
        }
        .spinner {
          width: 40px; height: 40px;
          border: 3px solid var(--border);
          border-top-color: var(--accent-indigo);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </AuthProvider>
  );
}
