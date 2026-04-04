import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate }  from 'react-router-dom';
import { useAuth }      from '../../context/AuthContext';
import { usePortal }    from '../../context/PortalContext';
import api              from '../../services/api';
import './Chatbot.css';

// ── Smart suggestions based on conversation ────────────────
const getSuggestions = (text) => {
  const t = text.toLowerCase();
  if (t.includes('task') || t.includes('frontend') || t.includes('backend'))
    return ['Show React tasks', 'Show Python tasks', 'Show beginner tasks', 'Show paid tasks'];
  if (t.includes('job'))
    return ['Find remote jobs', 'Find full-time jobs', 'Go to job listings'];
  if (t.includes('internship'))
    return ['Show all internships', 'How to get internship offer?'];
  if (t.includes('profile') || t.includes('resume'))
    return ['Open my profile', 'What skills should I add?'];
  if (t.includes('application'))
    return ['Track my applications', 'Check my offers'];
  return ['Show frontend tasks', 'Find internships', 'Browse jobs', 'My applications'];
};

const Chatbot = () => {
  const { mongoUser }          = useAuth();
  const { switchPortal }       = usePortal();
  const navigate               = useNavigate();
  const firstName              = mongoUser?.name?.split(' ')[0] || 'there';

  const [open,        setOpen]        = useState(false);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [suggestions, setSuggestions] = useState([
    'Show frontend tasks',
    'Find paid tasks',
    'Browse internships',
    'How does SkillBridge work?',
  ]);
  const [messages, setMessages] = useState([{
    role:    'assistant',
    content: `Hi ${firstName}! 👋 I'm SkillBot powered by Gemini AI. I can find tasks, jobs, and navigate the platform for you. What would you like to do?`,
    action:  null,
    tasks:   null,
    stats:   null,
  }]);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // Execute navigation action
  const executeAction = useCallback((action) => {
    if (!action?.path) return;
    if (action.portal === 'jobs')        switchPortal('jobs');
    if (action.portal === 'skillbridge') switchPortal('skillbridge');
    navigate(action.path);
    setOpen(false);
  }, [navigate, switchPortal]);

  const sendMessage = useCallback(async (text) => {
    const msgText = (text || input).trim();
    if (!msgText || loading) return;

    setMessages(prev => [...prev, {
      role: 'user', content: msgText, action: null, tasks: null, stats: null
    }]);
    setInput('');
    setLoading(true);

    try {
      const contextMessages = [...messages, { role: 'user', content: msgText }]
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await api.post('/chat', {
        messages:    contextMessages,
        userContext: {
          name:           mongoUser?.name,
          role:           mongoUser?.role,
          skills:         mongoUser?.skills || [],
          activeTasks:    mongoUser?.activeTasks?.length || 0,
          completedTasks: mongoUser?.completedTasks?.length || 0,
        }
      });

      const { text: replyText, action, toolResults } = res.data;

      // Extract task search results if any
      const taskResult = toolResults?.find(t => t.name === 'search_tasks')?.result;
      const statsResult = toolResults?.find(t => t.name === 'get_platform_stats')?.result;

      setMessages(prev => [...prev, {
        role:    'assistant',
        content: replyText,
        action:  action || null,
        tasks:   taskResult?.tasks || null,
        stats:   statsResult || null,
      }]);

      setSuggestions(getSuggestions(msgText + ' ' + replyText));

      // Auto-navigate after short delay if action exists
      if (action?.path) {
        setTimeout(() => executeAction(action), 1200);
      }

    } catch (err) {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: "I'm having trouble right now. Please try again in a moment! 🔄",
        action:  null,
        tasks:   null,
        stats:   null,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, mongoUser, executeAction]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      role:    'assistant',
      content: `Chat cleared! How can I help you, ${firstName}?`,
      action:  null, tasks: null, stats: null,
    }]);
    setSuggestions(['Show frontend tasks', 'Find paid tasks', 'Browse jobs', 'My profile']);
  };

  return (
    <div className="chatbot-wrap">
      {open && (
        <div className="chatbot-window">

          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar-wrap">
                <div className="chatbot-avatar-inner">🤖</div>
                <span className="chatbot-online-dot" />
              </div>
              <div>
                <p className="chatbot-name">SkillBot</p>
                <p className="chatbot-status">
                  <span className="status-dot" />
                  Gemini AI · Full webapp access
                </p>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button className="chatbot-icon-btn" onClick={clearChat} title="Clear chat">🗑</button>
              <button className="chatbot-icon-btn" onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="msg-bot-icon">🤖</div>
                )}
                <div className="msg-content-wrap">

                  {/* Text bubble */}
                  <div className="msg-bubble">
                    <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  </div>

                  {/* Stats cards */}
                  {msg.stats && (
                    <div className="msg-stats">
                      <div className="msg-stat-item">
                        <span className="msg-stat-num">{msg.stats.openTasks}</span>
                        <span className="msg-stat-label">Open tasks</span>
                      </div>
                      <div className="msg-stat-item">
                        <span className="msg-stat-num">{msg.stats.activeJobs}</span>
                        <span className="msg-stat-label">Jobs</span>
                      </div>
                      <div className="msg-stat-item">
                        <span className="msg-stat-num">{msg.stats.totalUsers}</span>
                        <span className="msg-stat-label">Users</span>
                      </div>
                    </div>
                  )}

                  {/* Task results */}
                  {msg.tasks && msg.tasks.length > 0 && (
                    <div className="msg-tasks">
                      {msg.tasks.map((task, ti) => (
                        <div key={ti} className="msg-task-card">
                          <div className="msg-task-header">
                            <p className="msg-task-title">{task.title}</p>
                            <span className={`msg-task-badge ${task.difficulty}`}>
                              {task.difficulty}
                            </span>
                          </div>
                          <div className="msg-task-meta">
                            <span>🏢 {task.postedBy}</span>
                            <span>💰 {task.compensation}</span>
                            <span>📅 {task.deadline}</span>
                          </div>
                          <div className="msg-task-skills">
                            {task.skills.map(s => (
                              <span key={s} className="msg-skill-tag">{s}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Navigation action button */}
                  {msg.action?.path && (
                    <button
                      className="msg-action-btn"
                      onClick={() => executeAction(msg.action)}
                    >
                      {msg.action.label || 'Open →'}
                    </button>
                  )}

                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="chat-msg assistant">
                <div className="msg-bot-icon">🤖</div>
                <div className="msg-bubble typing-bubble">
                  <span /><span /><span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {!loading && (
            <div className="chatbot-suggestions">
              {suggestions.slice(0, 4).map((s, i) => (
                <button key={i} className="suggestion-btn"
                  onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="chatbot-input-wrap">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything — I can find tasks, jobs, navigate pages..."
              rows={1}
              className="chatbot-input"
              disabled={loading}
            />
            <button
              className="chatbot-send"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
            >
              {loading
                ? <div className="send-spinner" />
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
              }
            </button>
          </div>

          <p className="chatbot-footer-note">
            Powered by Gemini AI · Full webapp access
          </p>
        </div>
      )}

      {/* Toggle */}
      <button
        className={`chatbot-toggle ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Chat with SkillBot"
      >
        {open
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
        }
        {!open && <span className="chatbot-badge">AI</span>}
      </button>
    </div>
  );
};

export default Chatbot;