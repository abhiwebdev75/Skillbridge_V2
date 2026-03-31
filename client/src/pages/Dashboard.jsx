import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth }   from '../context/AuthContext';
import { useTheme }  from '../context/ThemeContext';
import { usePortal } from '../context/PortalContext';
import api from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { mongoUser, firebaseUser }        = useAuth();
  const { activePortal, switchPortal }     = usePortal();
  const navigate                           = useNavigate();
  const { theme, toggleTheme, isDark }     = useTheme();
  const isRecruiter = mongoUser?.role === 'recruiter' || mongoUser?.role === 'teacher';

  // ── Live stats ──────────────────────────────────────────
  const { data: myApps = [] } = useQuery({
    queryKey: ['my-applications'],
    queryFn:  () => api.get('/tasks/my-applications').then(r => r.data),
    enabled:  !isRecruiter,
  });
  const { data: myOffers = [] } = useQuery({
    queryKey: ['my-offers'],
    queryFn:  () => api.get('/completions/my-offers').then(r => r.data),
    enabled:  !isRecruiter,
  });
  const { data: recruiterTasks = [] } = useQuery({
    queryKey: ['recruiter-tasks'],
    queryFn:  () => api.get('/tasks/recruiter').then(r => r.data),
    enabled:  isRecruiter,
  });
  const { data: taskData } = useQuery({
    queryKey: ['all-tasks-count'],
    queryFn:  () => api.get('/tasks', { params: { limit: 1 } }).then(r => r.data),
  });

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning'
    : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  const acceptedTasks = myApps.filter(a => a.status === 'accepted');
  const pendingApps   = myApps.filter(a => a.status === 'pending');

  return (
    <div className="dash-root">

      {/* ── Hero Section ──────────────────────────────── */}
      <section className="dash-hero">
        <div className="hero-bg-orb orb-1" />
        <div className="hero-bg-orb orb-2" />
        <div className="hero-bg-orb orb-3" />

        <div className="container">
          <div className="hero-inner">

            {/* Left — greeting + CTA */}
            <div className="hero-left">
              <div className="hero-badge">
                <span className="hero-badge-dot" />
                Platform v2.0 is live
              </div>

              <h1 className="hero-title">
                {greeting},<br />
                <span className="hero-name">
                  {mongoUser?.name?.split(' ')[0] || firebaseUser?.displayName?.split(' ')[0] || 'Welcome'}!
                </span>
              </h1>

              <p className="hero-sub">
                {isRecruiter
                  ? `Manage your tasks, review applicants, and offer opportunities on ${mongoUser?.organization || 'SkillBridge'}.`
                  : 'Bridge the gap between learning and industry. Find tasks, build skills, earn real opportunities.'
                }
              </p>

              <div className="hero-ctas">
                {isRecruiter ? (
                  <>
                    <Link to="/skillbridge/post-task" className="cta-primary">
                      Post a task <span>→</span>
                    </Link>
                    <Link to="/skillbridge/recruiter-dashboard" className="cta-secondary">
                      View dashboard
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/skillbridge/tasks" className="cta-primary">
                      Explore tasks <span>→</span>
                    </Link>
                    <Link to="/jobs" className="cta-secondary">
                      Browse jobs
                    </Link>
                  </>
                )}
              </div>

              {/* Portal switcher pill */}
              <div className="hero-portal-switch">
                <button
                  className={`portal-pill ${activePortal === 'skillbridge' ? 'active' : ''}`}
                  onClick={() => { switchPortal('skillbridge'); navigate('/skillbridge'); }}
                >
                  🎓 Skill Bridge
                </button>
                <button
                  className={`portal-pill ${activePortal === 'jobs' ? 'active' : ''}`}
                  onClick={() => { switchPortal('jobs'); navigate('/jobs'); }}
                >
                  💼 Job Portal
                </button>
              </div>
            </div>

            {/* Right — stats card */}
            <div className="hero-right">
              <div className="hero-card">
                <div className="hero-card-header">
                  <div className="hero-card-avatar">
                    {mongoUser?.avatar
                      ? <img src={mongoUser.avatar} alt="avatar" />
                      : <span>{mongoUser?.name?.charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  <div>
                    <p className="hero-card-name">{mongoUser?.name}</p>
                    <p className="hero-card-role">{mongoUser?.role} · {mongoUser?.organization || 'SkillBridge'}</p>
                  </div>
                  <Link to="/profile" className="hero-card-edit">✏️</Link>
                </div>

                <div className="hero-card-stats">
                  {isRecruiter ? (
                    <>
                      <div className="hcs">
                        <span className="hcs-num">{recruiterTasks.length}</span>
                        <span className="hcs-label">Tasks posted</span>
                      </div>
                      <div className="hcs">
                        <span className="hcs-num" style={{color:'#4ADE80'}}>
                          {recruiterTasks.filter(t => t.status === 'open').length}
                        </span>
                        <span className="hcs-label">Open</span>
                      </div>
                      <div className="hcs">
                        <span className="hcs-num" style={{color:'#FBBF24'}}>
                          {recruiterTasks.reduce((s,t) => s + (t.applicants?.length||0), 0)}
                        </span>
                        <span className="hcs-label">Applicants</span>
                      </div>
                      <div className="hcs">
                        <span className="hcs-num" style={{color:'#A78BFA'}}>
                          {recruiterTasks.filter(t => t.status === 'completed').length}
                        </span>
                        <span className="hcs-label">Completed</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="hcs">
                        <span className="hcs-num">{myApps.length}</span>
                        <span className="hcs-label">Applications</span>
                      </div>
                      <div className="hcs">
                        <span className="hcs-num" style={{color:'#FBBF24'}}>{pendingApps.length}</span>
                        <span className="hcs-label">Pending</span>
                      </div>
                      <div className="hcs">
                        <span className="hcs-num" style={{color:'#4ADE80'}}>{acceptedTasks.length}</span>
                        <span className="hcs-label">Active</span>
                      </div>
                      <div className="hcs">
                        <span className="hcs-num" style={{color:'#A78BFA'}}>
                          {mongoUser?.completedTasks?.length || 0}
                        </span>
                        <span className="hcs-label">Done</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Skills */}
                {mongoUser?.skills?.length > 0 && (
                  <div className="hero-card-skills">
                    {mongoUser.skills.slice(0, 5).map(s => (
                      <span key={s} className="hero-skill-tag">{s}</span>
                    ))}
                    {mongoUser.skills.length > 5 && (
                      <span className="hero-skill-tag">+{mongoUser.skills.length - 5}</span>
                    )}
                  </div>
                )}

                {/* Decorative blobs */}
                <div className="card-blob card-blob-1" />
                <div className="card-blob card-blob-2" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Offers Alert ──────────────────────────────── */}
      {myOffers.length > 0 && (
        <div className="container">
          <div className="offers-alert-banner">
            <div className="offers-alert-left">
              <span className="offers-alert-icon">🎉</span>
              <div>
                <p className="offers-alert-title">
                  You have {myOffers.length} pending offer{myOffers.length > 1 ? 's' : ''}!
                </p>
                <p className="offers-alert-sub">
                  Recruiters want to hire you based on your task performance
                </p>
              </div>
            </div>
            <Link to="/jobs/my-applications" className="offers-alert-btn">
              View offers →
            </Link>
          </div>
        </div>
      )}

      {/* ── Quick Actions ──────────────────────────────── */}
      <section className="dash-quick container">
        <h2 className="section-title">Quick actions</h2>
        <div className="quick-grid">
          {isRecruiter ? (
            <>
              <Link to="/skillbridge/post-task" className="quick-card quick-purple">
                <span className="quick-icon">📝</span>
                <p className="quick-label">Post task</p>
                <p className="quick-sub">Skill Bridge</p>
              </Link>
              <Link to="/skillbridge/recruiter-dashboard" className="quick-card quick-teal">
                <span className="quick-icon">📊</span>
                <p className="quick-label">Task dashboard</p>
                <p className="quick-sub">Review applicants</p>
              </Link>
              <Link to="/jobs/recruiter-dashboard" className="quick-card quick-blue">
                <span className="quick-icon">💼</span>
                <p className="quick-label">Job dashboard</p>
                <p className="quick-sub">Manage listings</p>
              </Link>
              <Link to="/profile" className="quick-card quick-orange">
                <span className="quick-icon">👤</span>
                <p className="quick-label">Profile</p>
                <p className="quick-sub">Edit your info</p>
              </Link>
            </>
          ) : (
            <>
              <Link to="/skillbridge/tasks" className="quick-card quick-purple">
                <span className="quick-icon">🔍</span>
                <p className="quick-label">Browse tasks</p>
                <p className="quick-sub">Find new work</p>
              </Link>
              <Link to="/skillbridge/my-applications" className="quick-card quick-teal">
                <span className="quick-icon">📋</span>
                <p className="quick-label">My applications</p>
                <p className="quick-sub">Track progress</p>
              </Link>
              <Link to="/jobs" className="quick-card quick-blue">
                <span className="quick-icon">💼</span>
                <p className="quick-label">Browse jobs</p>
                <p className="quick-sub">Find opportunities</p>
              </Link>
              <Link to="/jobs/internships" className="quick-card quick-green">
                <span className="quick-icon">🎓</span>
                <p className="quick-label">Internships</p>
                <p className="quick-sub">Short-term roles</p>
              </Link>
              <Link to="/jobs/my-applications" className="quick-card quick-orange">
                <span className="quick-icon">🚀</span>
                <p className="quick-label">My offers</p>
                <p className="quick-sub">Job & internship</p>
              </Link>
              <Link to="/profile" className="quick-card quick-pink">
                <span className="quick-icon">👤</span>
                <p className="quick-label">Profile</p>
                <p className="quick-sub">Edit your info</p>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── Trusted By (scrolling banner) ──────────────── */}
      <TrustedBySection />

      {/* ── Platform Stats ─────────────────────────────── */}
      <StatsSection
        taskTotal={taskData?.total || 0}
        isRecruiter={isRecruiter}
        recruiterTasks={recruiterTasks}
        myApps={myApps}
        mongoUser={mongoUser}
      />

      {/* ── Why SkillBridge ────────────────────────────── */}
      <WhyChooseSection />

      {/* ── FAQ Accordion ──────────────────────────────── */}
      <AccordionSection />

      {/* ── CTA Banner ─────────────────────────────────── */}
      <CTASection isRecruiter={isRecruiter} />

    </div>
  );
};

// ── Trusted By scrolling banner ────────────────────────────
const TrustedBySection = () => {
  const companies = [
    'TCS', 'Infosys', 'Wipro', 'HCL Tech', 'Tech Mahindra',
    'Cognizant', 'Mindtree', 'Capgemini', 'Coforge', 'Mphasis',
    'Persistent Systems', 'Larsen & Toubro',
  ];

  return (
    <section className="trusted-section">
      <p className="trusted-label">Trusted by professionals from</p>
      <div className="trusted-track-wrap">
        <div className="trusted-track">
          {[...companies, ...companies].map((c, i) => (
            <span key={i} className="trusted-chip">{c}</span>
          ))}
        </div>
      </div>
    </section>
  );
};

// ── Platform stats ─────────────────────────────────────────
const StatsSection = ({ taskTotal, isRecruiter, recruiterTasks, myApps, mongoUser }) => {
  const stats = isRecruiter ? [
    { value: recruiterTasks.length,                                                   label: 'Tasks posted',    icon: '📝', color: '#A78BFA' },
    { value: recruiterTasks.reduce((s,t) => s + (t.applicants?.length||0), 0),        label: 'Total applicants',icon: '👥', color: '#34D399' },
    { value: recruiterTasks.filter(t => t.status === 'completed').length,             label: 'Completed tasks', icon: '✅', color: '#FBBF24' },
    { value: mongoUser?.postedTasks?.length || recruiterTasks.length,                 label: 'All-time posts',  icon: '🚀', color: '#F472B6' },
  ] : [
    { value: taskTotal,                              label: 'Open tasks',        icon: '📋', color: '#A78BFA' },
    { value: myApps.length,                          label: 'My applications',   icon: '📨', color: '#34D399' },
    { value: myApps.filter(a => a.status === 'accepted').length, label: 'Accepted', icon: '🎯', color: '#FBBF24' },
    { value: mongoUser?.certificates?.length || 0,  label: 'Certificates',      icon: '🏅', color: '#F472B6' },
  ];

  return (
    <section className="stats-section container">
      <h2 className="section-title">Your snapshot</h2>
      <div className="stats-grid-dash">
        {stats.map((s, i) => (
          <div key={i} className="stat-dash-card" style={{'--accent': s.color}}>
            <span className="stat-dash-icon">{s.icon}</span>
            <p className="stat-dash-num">{s.value}</p>
            <p className="stat-dash-label">{s.label}</p>
            <div className="stat-dash-bar" />
          </div>
        ))}
      </div>
    </section>
  );
};

// ── Why SkillBridge feature cards ──────────────────────────
const WhyChooseSection = () => {
  const features = [
    {
      icon: '🧩',
      color: '#A78BFA',
      bg:    '#2D1B69',
      title: 'Real-World Tasks',
      desc:  'Work on industry-relevant projects posted by recruiters and teachers.',
    },
    {
      icon: '🧑‍🏫',
      color: '#34D399',
      bg:    '#064E3B',
      title: 'Expert Mentorship',
      desc:  'Learn directly from professionals working at top companies.',
    },
    {
      icon: '🏅',
      color: '#FBBF24',
      bg:    '#451A03',
      title: 'Skill Recognition',
      desc:  'Earn certificates and build a verified portfolio of completed work.',
    },
    {
      icon: '🚀',
      color: '#F472B6',
      bg:    '#500724',
      title: 'Career Pipeline',
      desc:  'Complete tasks and get directly offered internships and jobs.',
    },
  ];

  return (
    <section className="why-section container">
      <div className="why-header">
        <h2 className="section-title">Why SkillBridge?</h2>
        <p className="section-sub">
          We connect passionate learners with industry experts to create meaningful learning experiences
        </p>
      </div>
      <div className="why-grid">
        {features.map((f, i) => (
          <div key={i} className="why-card" style={{'--c': f.color, '--bg': f.bg}}>
            <div className="why-icon-wrap">
              <span className="why-icon">{f.icon}</span>
            </div>
            <h3 className="why-title">{f.title}</h3>
            <p className="why-desc">{f.desc}</p>
            <div className="why-glow" />
          </div>
        ))}
      </div>
    </section>
  );
};

// ── FAQ Accordion ──────────────────────────────────────────
const AccordionSection = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      q: 'How does the task pipeline work?',
      a: 'Recruiters and teachers post tasks. Students apply, get accepted, complete the work, submit daily reports, and chat in real time. After completion, recruiters can offer internships or jobs directly.'
    },
    {
      q: 'Is SkillBridge free to use?',
      a: 'Yes — completely free for students, employees, recruiters, and teachers. There are no hidden charges or premium tiers.'
    },
    {
      q: 'What kind of tasks are available?',
      a: 'Tasks span Web Development, Data Science, Mobile Apps, Cybersecurity, AI/ML, Design, Content, and more. New tasks are posted daily.'
    },
    {
      q: 'How do I get a job or internship offer?',
      a: 'Complete a task with excellent quality. The recruiter reviews your work and can directly offer an internship or full-time job from the Job Portal dashboard — no separate application needed.'
    },
    {
      q: 'How does real-time chat work?',
      a: 'Once a recruiter accepts your task application, a private chat room opens instantly. Use it to discuss requirements, share files, and submit daily reports — all in one place.'
    },
  ];

  return (
    <section className="faq-section container">
      <div className="faq-header">
        <h2 className="section-title">Frequently asked questions</h2>
        <p className="section-sub">Everything you need to know about the platform</p>
      </div>
      <div className="faq-list">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className={`faq-item ${openIndex === i ? 'open' : ''}`}
          >
            <button
              className="faq-question"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            >
              <span>{faq.q}</span>
              <span className={`faq-chevron ${openIndex === i ? 'rotated' : ''}`}>
                ▾
              </span>
            </button>
            <div className="faq-answer">
              <p>{faq.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// ── CTA Banner ─────────────────────────────────────────────
const CTASection = ({ isRecruiter }) => (
  <section className="cta-section container">
    <div className="cta-inner">
      <div className="cta-orb cta-orb-1" />
      <div className="cta-orb cta-orb-2" />
      <span className="cta-emoji">🚀</span>
      <h2 className="cta-title">
        {isRecruiter ? 'Find your next hire today' : 'Ready to start your journey?'}
      </h2>
      <p className="cta-sub">
        {isRecruiter
          ? 'Post a task and discover talented students ready to work on real problems.'
          : 'Join thousands of students already building the future on SkillBridge.'
        }
      </p>
      <div className="cta-btns">
        {isRecruiter ? (
          <Link to="/skillbridge/post-task" className="cta-btn-main">
            Post a task →
          </Link>
        ) : (
          <Link to="/skillbridge/tasks" className="cta-btn-main">
            Explore tasks →
          </Link>
        )}
        <Link to="/profile" className="cta-btn-ghost">
          Complete your profile
        </Link>
      </div>
    </div>
  </section>
);

export default Dashboard;