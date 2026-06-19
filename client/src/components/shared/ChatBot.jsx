/**
 * SkillBridge AI Chatbot — Frontend
 * ───────────────────────────────────
 * Connects to /api/chat (Gemini AI backend)
 * Renders real task cards, stats, and navigation actions
 * from live MongoDB data fetched by Gemini tool calls
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate }  from 'react-router-dom';
import { useAuth }      from '../../context/AuthContext';
import { usePortal }    from '../../context/PortalContext';
import api              from '../../services/api';
import './ChatBot.css';

// ── Dynamic suggestions based on conversation topic ────────
const getSmartSuggestions = (text) => {
  const t = text.toLowerCase();
  if (t.includes('task') || t.includes('frontend') || t.includes('react') || t.includes('python'))
    return ['Show paid tasks', 'Show beginner tasks', 'Show React tasks', 'How to apply?'];
  if (t.includes('job') || t.includes('career') || t.includes('hire'))
    return ['Find remote jobs', 'Find internships', 'View job listings', 'My job applications'];
  if (t.includes('internship'))
    return ['View all internships', 'How to get an offer?', 'Browse tasks first'];
  if (t.includes('profile') || t.includes('skill') || t.includes('resume'))
    return ['Open my profile', 'What skills should I add?', 'How to stand out?'];
  if (t.includes('offer') || t.includes('accept'))
    return ['View my offers', 'My job applications', 'How offers work?'];
  if (t.includes('report') || t.includes('workspace'))
    return ['My active tasks', 'How to submit reports?', 'View workspace'];
  return ['Show me tasks', 'Find jobs', 'My applications', 'Platform stats'];
};

const Chatbot = () => {
  const { mongoUser }        = useAuth();
  const { switchPortal }     = usePortal();
  const navigate             = useNavigate();
  const firstName            = mongoUser?.name?.split(' ')[0] || 'there';

  const [open,        setOpen]        = useState(false);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [suggestions, setSuggestions] = useState([
    '🔍 Browse tasks',
    '📊 Platform stats',
    '💼 Find jobs',
    '👤 View my profile',
    '❓ How it works?',
    '🛠️ Show React tasks',
  ]);

  const [messages, setMessages] = useState([{
    role:    'assistant',
    content: `Hi ${firstName}! 👋 I'm SkillBot powered by Gemini AI.\n\nI can find real tasks from the platform, check live stats, navigate pages, and give career advice. What would you like to do?`,
    action:  null,
    tasks:   null,
    stats:   null,
  }]);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // Execute navigation action from Gemini response
  const executeAction = useCallback((action) => {
    if (!action?.path) return;
    if (action.portal === 'jobs')        switchPortal('jobs');
    if (action.portal === 'skillbridge') switchPortal('skillbridge');
    navigate(action.path);
    setOpen(false);
  }, [navigate, switchPortal]);

  // Clear chat history
  const clearChat = () => {
    setMessages([{
      role:    'assistant',
      content: `Chat cleared! How can I help you today, ${firstName}?`,
      action:  null, tasks: null, stats: null,
    }]);
    setSuggestions(['Show me tasks', 'Find jobs', 'My applications', 'Platform stats']);
  };

  // Main send function
  const sendMessage = useCallback(async (text) => {
    const msgText = (text || input).trim();
    if (!msgText || loading) return;

    // Add user message to UI immediately
    const updatedMessages = [
      ...messages,
      { role: 'user', content: msgText, action: null, tasks: null, stats: null }
    ];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Build context from last 10 messages for Gemini
      const contextMessages = updatedMessages
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      // Call your Express backend which calls Gemini with real data
      const res = await api.post('/chat', {
        messages: contextMessages,
        userContext: {
          name:           mongoUser?.name,
          role:           mongoUser?.role,
          skills:         mongoUser?.skills           || [],
          activeTasks:    mongoUser?.activeTasks?.length    || 0,
          completedTasks: mongoUser?.completedTasks?.length || 0,
        }
      });

      const { text: replyText, action, toolResults } = res.data;
const models = await genAI.listModels();
console.log(models);
      // Extract structured data from tool results
      const taskResult  = toolResults?.find(t => t.name === 'search_tasks')?.result;
      const statsResult = toolResults?.find(t => t.name === 'get_platform_stats')?.result;

      // Add Gemini's response to chat
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: replyText || "I'm here to help! Ask me about tasks, jobs, or career advice.",
        action:  action       || null,
        tasks:   taskResult?.tasks || null,
        stats:   statsResult  || null,
      }]);

      // Update contextual suggestions
      setSuggestions(getSmartSuggestions(replyText || ''));

      // Auto-navigate if Gemini decided to send user somewhere
      if (action?.path) {
        setTimeout(() => executeAction(action), 1200);
      }

    } catch (err) {
      console.error('SkillBot error:', err);

      // Show meaningful error to user
      const errMsg = err?.response?.data?.message || '';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errMsg.includes('GEMINI_API_KEY')
          ? '⚠️ SkillBot is not configured yet. The server is missing the GEMINI_API_KEY environment variable.'
          : errMsg.includes('quota')
          ? '⚠️ Gemini API quota reached. Please try again in a moment.'
          : "I'm having trouble connecting right now. Please try again! 🔄",
        action: null, tasks: null, stats: null,
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

  return (
    <div className="chatbot-wrap">
      {open && (
        <div className="chatbot-window">

          {/* ── Header ─────────────────────────────────── */}
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
                  Gemini AI · Live data
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="chatbot-icon-btn" onClick={clearChat} title="Clear chat">🗑</button>
              <button className="chatbot-icon-btn" onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

          {/* ── Messages ───────────────────────────────── */}
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

                  {/* Real platform stats from MongoDB */}
                  {msg.stats && (
                    <div className="msg-stats">
                      <div className="msg-stat-item">
                        <span className="msg-stat-num">{msg.stats.openTasks}</span>
                        <span className="msg-stat-label">Open Tasks</span>
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

                  {/* Real task cards from MongoDB */}
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
                            <span>💰 {task.compensation}</span>
                            <span>🏢 {task.postedBy}</span>
                            <span>📅 {task.deadline}</span>
                          </div>
                          {task.skills?.length > 0 && (
                            <div className="msg-task-skills">
                              {task.skills.map(s => (
                                <span key={s} className="msg-skill-tag">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Navigation action button — pulses to draw attention */}
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

            {/* Typing indicator while Gemini is thinking */}
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

          {/* ── Smart suggestion chips ─────────────────── */}
          <div className="chatbot-quick">
            {suggestions.slice(0, 4).map((s, i) => (
              <button
                key={i}
                className="quick-reply"
                onClick={() => sendMessage(s)}
                disabled={loading}
              >
                {s}
              </button>
            ))}
          </div>

          {/* ── Input area ─────────────────────────────── */}
          <div className="chatbot-input-wrap">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask me anything... (Enter to send)"
              className="chatbot-input"
              rows={1}
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

          <p style={{ textAlign:'center', fontSize:10, color:'var(--text-muted)', padding:'4px 0 8px' }}>
            Powered by Google Gemini AI · SkillBridge
          </p>
        </div>
      )}

      {/* ── Toggle button ───────────────────────────────── */}
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