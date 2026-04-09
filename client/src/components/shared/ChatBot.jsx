import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate }  from 'react-router-dom';
import { useAuth }      from '../../context/AuthContext';
import { usePortal }    from '../../context/PortalContext';
import './ChatBot.css';

// ── Mock Database ──────────────────────────────────────────
const MOCK_DB = {
  tasks: [
    { _id: '1', title: 'React Dashboard UI', difficulty: 'intermediate', compensation: 'Paid', skills: ['React', 'Tailwind'], postedBy: 'Pixel Studio', deadline: '12/05/2026' },
    { _id: '2', title: 'Python Web Scraper', difficulty: 'advanced', compensation: 'Stipend', skills: ['Python', 'BS4'], postedBy: 'DataFlow Inc', deadline: '15/05/2026' },
    { _id: '3', title: 'Landing Page Design', difficulty: 'beginner', compensation: 'Certificate', skills: ['Figma', 'UI/UX'], postedBy: 'Creative Co', deadline: '20/05/2026' }
  ],
  stats: { openTasks: 42, activeJobs: 128, totalUsers: 850 },
  jobs: [
    { title: 'Frontend Developer', company: 'Google', type: 'Full-time', location: 'Remote' },
    { title: 'Backend Intern', company: 'Amazon', type: 'Internship', location: 'Bangalore' }
  ]
};

const Chatbot = () => {
  const { mongoUser } = useAuth();
  const { switchPortal } = usePortal();
  const navigate = useNavigate();
  const firstName = mongoUser?.name?.split(' ')[0] || 'Abhinash'; // Fallback to your name

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // ── Expanded Mock Questions ──────────────────────────────
  const [suggestions, setSuggestions] = useState([
    "🔍 Browse tasks",
    "📊 Platform stats",
    "💼 Find jobs",
    "👤 View my profile",
    "❓ How it works?",
    "🛠️ Show React tasks"
  ]);

  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `Hi ${firstName}! 👋 I'm SkillBot. I can help you find tasks, track jobs, or navigate SkillBridge. What are you looking for today?`,
    action: null, tasks: null, stats: null,
  }]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const executeAction = useCallback((action) => {
    if (!action?.path) return;
    if (action.portal === 'jobs') switchPortal('jobs');
    if (action.portal === 'skillbridge') switchPortal('skillbridge');
    navigate(action.path);
    setOpen(false);
  }, [navigate, switchPortal]);

  // ── Mock Logic Engine ────────────────────────────────────
  const getMockResponse = (text) => {
    const t = text.toLowerCase();
    let res = { content: "I'm here to help! Try asking about 'tasks', 'jobs', or 'stats'.", action: null, tasks: null, stats: null };

    if (t.includes('task')) {
      res.content = "Here are the top trending tasks available for you right now:";
      res.tasks = MOCK_DB.tasks;
      res.action = { label: "View Task Board", path: "/skillbridge/tasks", portal: "skillbridge" };
    } 
    else if (t.includes('stat')) {
      res.content = "SkillBridge is growing fast! Here is our current platform activity:";
      res.stats = MOCK_DB.stats;
    }
    else if (t.includes('job') || t.includes('internship')) {
      res.content = "I found several high-growth job opportunities and internships. Would you like to see them?";
      res.action = { label: "Open Job Portal", path: "/jobs", portal: "jobs" };
    }
    else if (t.includes('profile')) {
      res.content = "Opening your profile... You can update your skills and resume there.";
      res.action = { label: "Go to Profile", path: "/profile" };
    }
    else if (t.includes('how it works') || t.includes('help')) {
      res.content = "It's simple: \n1. Pick a Task \n2. Complete it to earn badges \n3. Get noticed by recruiters for Jobs!";
    }
    else if (t.includes('hi') || t.includes('hello')) {
      res.content = `Hello ${firstName}! Ready to boost your portfolio today?`;
    }

    return res;
  };

  const sendMessage = useCallback(async (text) => {
    const msgText = (text || input).trim();
    if (!msgText || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: msgText }]);
    setInput('');
    setLoading(true);

    // Simulate Network Latency
    setTimeout(() => {
      const mockRes = getMockResponse(msgText);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: mockRes.content,
        action: mockRes.action,
        tasks: mockRes.tasks,
        stats: mockRes.stats,
      }]);
      setLoading(false);
    }, 800);
  }, [input, loading, firstName]);

  return (
    <div className="chatbot-wrap">
      {open && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar-wrap">
                <div className="chatbot-avatar-inner">🤖</div>
                <span className="status-dot" />
              </div>
              <div>
                <p className="chatbot-name">SkillBot</p>
                <p className="chatbot-status">Always Active</p>
              </div>
            </div>
            <button className="chatbot-icon-btn" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                <div className="msg-content-wrap">
                  <div className="msg-bubble">
                    <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  </div>

                  {msg.stats && (
                    <div className="msg-stats">
                      <div className="msg-stat-item">
                        <span className="msg-stat-num">{msg.stats.openTasks}</span>
                        <span className="msg-stat-label">Tasks</span>
                      </div>
                      <div className="msg-stat-item">
                        <span className="msg-stat-num">{msg.stats.activeJobs}</span>
                        <span className="msg-stat-label">Jobs</span>
                      </div>
                    </div>
                  )}

                  {msg.tasks && (
                    <div className="msg-tasks">
                      {msg.tasks.map((task, ti) => (
                        <div key={ti} className="msg-task-card">
                          <p className="msg-task-title">{task.title}</p>
                          <div className="msg-task-meta">
                            <span>💰 {task.compensation}</span>
                            <span>🏢 {task.postedBy}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.action && (
                    <button className="msg-action-btn" onClick={() => executeAction(msg.action)}>
                      {msg.action.label}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && <div className="typing-bubble"><span /><span /><span /></div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-quick">
            {suggestions.map((s, i) => (
              <button key={i} className="quick-reply" onClick={() => sendMessage(s)}>{s}</button>
            ))}
          </div>

          <div className="chatbot-input-wrap">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask me anything..."
              className="chatbot-input"
              rows={1}
            />
            <button className="chatbot-send" onClick={() => sendMessage()}>Send</button>
          </div>
        </div>
      )}

      <button className={`chatbot-toggle ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
};

export default Chatbot;