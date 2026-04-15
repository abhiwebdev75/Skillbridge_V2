import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense, useEffect } from 'react';

import { AuthProvider, useAuth } from './context/AuthContext';
import { PortalProvider } from './context/PortalContext';
import { ThemeProvider } from './context/ThemeContext';
import ReactGA from "react-ga4";

// 🔥 Lazy Loading
const Login      = lazy(() => import('./pages/auth/Login'));
const Register   = lazy(() => import('./pages/auth/Register'));
const RoleSelect = lazy(() => import('./pages/auth/RoleSelect'));
const Dashboard  = lazy(() => import('./pages/Dashboard'));
const Profile    = lazy(() => import('./pages/Profile'));
const NotFound   = lazy(() => import('./pages/NotFound'));

const TaskBoard         = lazy(() => import('./pages/skillbridge/TaskBoard'));
const TaskDetail        = lazy(() => import('./pages/skillbridge/TaskDetail'));
const TaskWorkspace     = lazy(() => import('./pages/skillbridge/TaskWorkspace'));
const PostTask          = lazy(() => import('./pages/skillbridge/PostTask'));
const RecruiterTaskDash = lazy(() => import('./pages/skillbridge/RecruiterTaskDash'));
const MyApplications    = lazy(() => import('./pages/skillbridge/MyApplications'));

const JobListings       = lazy(() => import('./pages/jobportal/JobListings'));
const InternshipList    = lazy(() => import('./pages/jobportal/InternshipList'));
const JobDetail         = lazy(() => import('./pages/jobportal/JobDetail'));
const RecruiterJobDash  = lazy(() => import('./pages/jobportal/RecruiterJobDash'));
const MyJobApplications = lazy(() => import('./pages/jobportal/MyJobApplications'));

// Layout
import Navbar  from './components/shared/Navbar';
import Footer  from './components/shared/Footer';
import Chatbot from './components/shared/ChatBot';

// 🔄 Loader
const PageLoader = () => (
  <div className="page-loader">
    <div className="spinner" />
  </div>
);

// 🔐 Route Guards
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <PageLoader />;
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

const RegisteredRoute = ({ children }) => {
  const { isLoggedIn, isRegistered, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isLoggedIn)   return <Navigate to="/login" replace />;
  if (!isRegistered) return <Navigate to="/role-select" replace />;
  return children;
};

const RecruiterRoute = ({ children }) => {
  const { role } = useAuth();
  const allowedRoles = ['recruiter', 'teacher'];
  return allowedRoles.includes(role) ? children : <Navigate to="/dashboard" replace />;
};

// 🚀 Routes Logic + GA4
const AppRoutes = () => {
  const { isLoggedIn, isRegistered, loading } = useAuth();
  const location = useLocation();

  // ✅ Initialize GA4 once
  useEffect(() => {
    ReactGA.initialize("G-RGY0CBH44N");
  }, []);

  // ✅ Track page views on route change
  useEffect(() => {
    ReactGA.send({
      hitType: "pageview",
      page: location.pathname,
    });
  }, [location]);

  if (loading) return <PageLoader />;

  const showLayout = isLoggedIn && isRegistered;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {showLayout && <Navbar />}

      <main style={{ flex: 1 }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>

            <Route
              path="/"
              element={
                !isLoggedIn
                  ? <Navigate to="/login" replace />
                  : isRegistered
                    ? <Navigate to="/dashboard" replace />
                    : <Navigate to="/role-select" replace />
              }
            />

            <Route
              path="/login"
              element={isLoggedIn && isRegistered ? <Navigate to="/dashboard" replace /> : <Login />}
            />

            <Route
              path="/register"
              element={isLoggedIn && isRegistered ? <Navigate to="/dashboard" replace /> : <Register />}
            />

            <Route
              path="/role-select"
              element={
                <ProtectedRoute>
                  {isRegistered ? <Navigate to="/dashboard" replace /> : <RoleSelect />}
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <RegisteredRoute>
                  <Dashboard />
                </RegisteredRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <RegisteredRoute>
                  <Profile />
                </RegisteredRoute>
              }
            />

            {/* SkillBridge */}
            <Route path="/skillbridge">
              <Route index element={<RegisteredRoute><TaskBoard /></RegisteredRoute>} />
              <Route path="tasks" element={<RegisteredRoute><TaskBoard /></RegisteredRoute>} />
              <Route path="tasks/:id" element={<RegisteredRoute><TaskDetail /></RegisteredRoute>} />
              <Route path="tasks/:id/workspace" element={<RegisteredRoute><TaskWorkspace /></RegisteredRoute>} />

              <Route path="post-task" element={
                <RegisteredRoute>
                  <RecruiterRoute><PostTask /></RecruiterRoute>
                </RegisteredRoute>
              } />

              <Route path="recruiter-dashboard" element={
                <RegisteredRoute>
                  <RecruiterRoute><RecruiterTaskDash /></RecruiterRoute>
                </RegisteredRoute>
              } />

              <Route path="my-applications" element={<RegisteredRoute><MyApplications /></RegisteredRoute>} />
            </Route>

            {/* Job Portal */}
            <Route path="/jobs">
              <Route index element={<RegisteredRoute><JobListings /></RegisteredRoute>} />
              <Route path="internships" element={<RegisteredRoute><InternshipList /></RegisteredRoute>} />
              <Route path=":id" element={<RegisteredRoute><JobDetail /></RegisteredRoute>} />

              <Route path="recruiter-dashboard" element={
                <RegisteredRoute>
                  <RecruiterRoute><RecruiterJobDash /></RecruiterRoute>
                </RegisteredRoute>
              } />

              <Route path="my-applications" element={<RegisteredRoute><MyJobApplications /></RegisteredRoute>} />
            </Route>

            <Route
              path="*"
              element={isLoggedIn ? <NotFound /> : <Navigate to="/login" replace />}
            />

          </Routes>
        </Suspense>
      </main>

      {showLayout && <Footer />}
      {showLayout && <Chatbot />}
    </div>
  );
};

// 🌐 Main App
const App = () => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <PortalProvider>

          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                fontSize: '14px',
              }
            }}
          />

          <AppRoutes />

        </PortalProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

export default App;