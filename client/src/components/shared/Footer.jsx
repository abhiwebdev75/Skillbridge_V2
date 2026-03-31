import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Footer.css';

const Footer = () => {
  const { isLoggedIn, isRegistered } = useAuth();

  const links = {
    platform: [
      { label: 'Dashboard',       to: '/dashboard' },
      { label: 'Task Board',      to: '/skillbridge/tasks' },
      { label: 'Job Listings',    to: '/jobs' },
      { label: 'Internships',     to: '/jobs/internships' },
    ],
    account: [
      { label: 'Profile',         to: '/profile' },
      { label: 'My Applications', to: '/skillbridge/my-applications' },
      { label: 'My Offers',       to: '/jobs/my-applications' },
    ],
    recruiter: [
      { label: 'Post a Task',     to: '/skillbridge/post-task' },
      { label: 'Task Dashboard',  to: '/skillbridge/recruiter-dashboard' },
      { label: 'Job Dashboard',   to: '/jobs/recruiter-dashboard' },
    ],
  };

  return (
    <footer className="footer">
      <div className="footer-inner container">

        {/* Brand */}
        <div className="footer-brand">
          <div className="footer-logo">
            <div className="footer-logo-icon">SB</div>
            <span>SkillBridge</span>
          </div>
          <p className="footer-tagline">
            Bridge the gap between learning and industry. Real tasks. Real skills. Real opportunities.
          </p>
          <div className="footer-socials">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="social-btn" aria-label="GitHub">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.1.82-.26.82-.57v-2c-3.34.72-4.04-1.6-4.04-1.6-.54-1.38-1.33-1.74-1.33-1.74-1.08-.74.08-.73.08-.73 1.2.09 1.83 1.23 1.83 1.23 1.06 1.82 2.8 1.3 3.48.99.1-.77.41-1.3.75-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.68.82.57C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="social-btn" aria-label="Twitter">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="social-btn" aria-label="LinkedIn">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Links */}
        {isLoggedIn && isRegistered && (
          <>
            <div className="footer-col">
              <h4>Platform</h4>
              <ul>
                {links.platform.map(l => (
                  <li key={l.to}><Link to={l.to}>{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div className="footer-col">
              <h4>My account</h4>
              <ul>
                {links.account.map(l => (
                  <li key={l.to}><Link to={l.to}>{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div className="footer-col">
              <h4>For recruiters</h4>
              <ul>
                {links.recruiter.map(l => (
                  <li key={l.to}><Link to={l.to}>{l.label}</Link></li>
                ))}
              </ul>
            </div>
          </>
        )}

      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <p>© {new Date().getFullYear()} SkillBridge Platform. All rights reserved.</p>
          <div className="footer-bottom-links">
            <span>Built with ❤️ for learners everywhere</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;