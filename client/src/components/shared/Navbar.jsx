import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth }   from '../../context/AuthContext';
import { usePortal } from '../../context/PortalContext';
import { useTheme }  from '../../context/ThemeContext';
import './Navbar.css';

const Navbar = () => {
  const { isLoggedIn, isRegistered, mongoUser, logout } = useAuth();
  const { activePortal, switchPortal } = usePortal();
  const { theme, toggleTheme, isDark } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/login');
  };

  const handleSwitch = (portal) => {
    switchPortal(portal);
    navigate(portal === 'skillbridge' ? '/skillbridge' : '/jobs');
    setMobileOpen(false);
  };

  const isRecruiter = mongoUser?.role === 'recruiter' || mongoUser?.role === 'teacher';
  const isActive    = (path) => location.pathname.startsWith(path);

  if (!isLoggedIn || !isRegistered) return null;

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* Logo */}
        <Link to="/dashboard" className="navbar-logo">
          <div className="logo-icon-wrap">
            <span>
              <img src="\client\src\assets\skillbridge_logo.png" alt="SkillBridge logo" className="logo-img" height="30px" width="30px" />
            </span>
          </div>
          <span className="logo-text">SkillBridge</span>
        </Link>

        {/* Portal Switcher */}
        <div className="portal-switcher">
          <button
            className={`portal-btn ${activePortal === 'skillbridge' ? 'active' : ''}`}
            onClick={() => handleSwitch('skillbridge')}
          >
            <span>🎓</span> Dev Portal
          </button>
          <button
            className={`portal-btn ${activePortal === 'jobs' ? 'active' : ''}`}
            onClick={() => handleSwitch('jobs')}
          >
            <span>💼</span> Job Portal
          </button>
        </div>

        {/* Nav links */}
        <div className="navbar-links">
          {activePortal === 'skillbridge' ? (
            <>
              <Link to="/skillbridge/tasks"
                className={isActive('/skillbridge/tasks') ? 'active' : ''}>
                Tasks
              </Link>
              {isRecruiter ? (
                <>
                  <Link to="/skillbridge/post-task"
                    className={isActive('/skillbridge/post-task') ? 'active' : ''}>
                    Post task
                  </Link>
                  <Link to="/skillbridge/recruiter-dashboard"
                    className={isActive('/skillbridge/recruiter-dashboard') ? 'active' : ''}>
                    Dashboard
                  </Link>
                </>
              ) : (
                <Link to="/skillbridge/my-applications"
                  className={isActive('/skillbridge/my-applications') ? 'active' : ''}>
                  My applications
                </Link>
              )}
            </>
          ) : (
            <>
              <Link to="/jobs"
                className={location.pathname === '/jobs' ? 'active' : ''}>
                Jobs
              </Link>
              <Link to="/jobs/internships"
                className={isActive('/jobs/internships') ? 'active' : ''}>
                Internships
              </Link>
              {isRecruiter
                ? <Link to="/jobs/recruiter-dashboard"
                    className={isActive('/jobs/recruiter-dashboard') ? 'active' : ''}>
                    Dashboard
                  </Link>
                : <Link to="/jobs/my-applications"
                    className={isActive('/jobs/my-applications') ? 'active' : ''}>
                    My applications
                  </Link>
              }
            </>
          )}
        </div>

        {/* Right side controls */}
        <div className="navbar-right">

          {/* Theme toggle */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          {/* Avatar + dropdown */}
          <div className="navbar-user">
            <button
              className="avatar-btn"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {mongoUser?.avatar
                ? <img src={mongoUser.avatar} alt="avatar" className="avatar-img" />
                : <div className="avatar-placeholder">
                    {mongoUser?.name?.charAt(0).toUpperCase()}
                  </div>
              }
              <span className="avatar-online" />
            </button>

            {menuOpen && (
              <div className="user-menu">
                <div className="user-menu-header">
                  <p className="user-name">{mongoUser?.name}</p>
                  <p className="user-role">{mongoUser?.role} · {mongoUser?.organization || 'SkillBridge'}</p>
                </div>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)}>🏠 Dashboard</Link>
                <Link to="/profile"   onClick={() => setMenuOpen(false)}>👤 Profile</Link>
                {!isRecruiter && (
                  <Link to="/jobs/my-applications" onClick={() => setMenuOpen(false)}>
                    🚀 My offers
                  </Link>
                )}
                <div className="user-menu-divider" />
                <button onClick={handleLogout} className="logout-btn">
                  🚪 Sign out
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
            <span className={`hamburger ${mobileOpen ? 'open' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="mobile-nav">
          <div className="mobile-portal-switch">
            <button
              className={`portal-btn ${activePortal === 'skillbridge' ? 'active' : ''}`}
              onClick={() => handleSwitch('skillbridge')}
            >
              🎓 Dev Portal
            </button>
            <button
              className={`portal-btn ${activePortal === 'jobs' ? 'active' : ''}`}
              onClick={() => handleSwitch('jobs')}
            >
              💼 Job Portal
            </button>
          </div>
          <div className="mobile-links">
            {activePortal === 'skillbridge' ? (
              <>
                <Link to="/skillbridge/tasks"           onClick={() => setMobileOpen(false)}>Tasks</Link>
                <Link to="/skillbridge/my-applications" onClick={() => setMobileOpen(false)}>My applications</Link>
                {isRecruiter && <>
                  <Link to="/skillbridge/post-task"           onClick={() => setMobileOpen(false)}>Post task</Link>
                  <Link to="/skillbridge/recruiter-dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                </>}
              </>
            ) : (
              <>
                <Link to="/jobs"              onClick={() => setMobileOpen(false)}>Jobs</Link>
                <Link to="/jobs/internships"  onClick={() => setMobileOpen(false)}>Internships</Link>
                <Link to="/jobs/my-applications" onClick={() => setMobileOpen(false)}>My applications</Link>
                {isRecruiter && <Link to="/jobs/recruiter-dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>}
              </>
            )}
            <Link to="/profile"   onClick={() => setMobileOpen(false)}>Profile</Link>
            <Link to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
            <button onClick={handleLogout} className="mobile-logout">Sign out</button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;