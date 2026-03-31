import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Chatbot.css';

const SYSTEM_PROMPT = `You are SkillBot, the helpful AI assistant for SkillBridge — a platform that connects students and employees with recruiters and teachers through real-world tasks, leading to internship and job opportunities.

You help users with:
- Finding and applying for tasks on Skill Bridge
- Understanding how the task → internship/job pipeline works
- Profile setup, resume tips, skill building
- Job and internship search advice
- Technical interview preparation
- How to write great cover notes for task applications
- Platform navigation and features

Keep answers concise, friendly, and practical. Use emojis sparingly. If asked about something unrelated to careers, skills, or the platform, gently redirect. Always be encouraging and supportive.`;

const Chatbot = () => {
  const { mongoUser } = useAuth();
  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${mongoUser?.name?.split(' ')[0] || 'there'}! 👋 I'm SkillBot, your AI career assistant. Ask me anything about tasks, jobs, internships, or how to make the most of SkillBridge!`
    }
  ]);
  const [loading, setLoading]   = useState(false);
  const [dots, setDots]         = useState(false);
  const messagesEndRef           = useRef(null);
  const inputRef                 = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setDots(true);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system:     SYSTEM_PROMPT,
          messages:   newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || "Sorry, I couldn't process that. Please try again!";

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment! 🔄"
      }]);
    } finally {
      setLoading(false);
      setDots(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickReplies = [
    'How do I apply for a task?',
    'How does the job offer pipeline work?',
    'Tips for writing a cover note?',
    'How to improve my profile?',
  ];

  return (
    <div className="chatbot-wrap">

      {/* Chat window */}
      {open && (
        <div className="chatbot-window">

          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">🤖</div>
              <div>
                <p className="chatbot-name">SkillBot</p>
                <p className="chatbot-status">
                  <span className="status-dot" />
                  AI Career Assistant
                </p>
              </div>
            </div>
            <button className="chatbot-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="msg-bot-avatar">🤖</div>
                )}
                <div className="msg-bubble">
                  <p>{msg.content}</p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {dots && (
              <div className="chat-msg assistant">
                <div className="msg-bot-avatar">🤖</div>
                <div className="msg-bubble typing-bubble">
                  <span /><span /><span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies — show only at start */}
          {messages.length === 1 && (
            <div className="chatbot-quick">
              {quickReplies.map((q, i) => (
                <button
                  key={i}
                  className="quick-reply"
                  onClick={() => { setInput(q); setTimeout(sendMessage, 0); }}
                >
                  {q}
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
              placeholder="Ask me anything about SkillBridge..."
              rows={1}
              className="chatbot-input"
              disabled={loading}
            />
            <button
              className="chatbot-send"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
            >
              {loading ? (
                <div className="send-spinner" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              )}
            </button>
          </div>

          <p className="chatbot-footer-note">Powered by Claude AI · SkillBridge</p>
        </div>
      )}

      {/* Toggle button */}
      <button
        className={`chatbot-toggle ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
        title="Chat with SkillBot"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          </svg>
        )}
        {!open && (
          <span className="chatbot-badge">AI</span>
        )}
      </button>

    </div>
  );
};

export default Chatbot;