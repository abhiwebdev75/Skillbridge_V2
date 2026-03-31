import { useState, useEffect, useRef } from 'react';
import useChat from '../../hooks/useChat';
import { useAuth } from '../../context/AuthContext';
import './ChatBox.css';

const ChatBox = ({ roomId, taskTitle, isActive = true }) => {
  const { mongoUser }  = useAuth();
  const {
    messages, sendMessage, sendFileMessage,
    handleTyping, isTyping, typingUser
  } = useChat(roomId);

  const [input, setInput]     = useState('');
  const bottomRef             = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const isOwn = (msg) => msg.senderId === mongoUser?.firebaseUid;
  const isSystem = (msg) => msg.type === 'system' || msg.senderId === 'system';

  return (
    <div className="chatbox">
      <div className="chatbox-header">
        <div className="chatbox-title">
          <span className="chat-dot" />
          {taskTitle || 'Task Chat'}
        </div>
        {!isActive && (
          <span className="chat-closed-badge">Chat closed</span>
        )}
      </div>

      <div className="chatbox-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>No messages yet.</p>
            <p>Start the conversation!</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`
            chat-message
            ${isSystem(msg) ? 'system' : isOwn(msg) ? 'own' : 'other'}
          `}>
            {isSystem(msg) ? (
              <div className="system-message">{msg.text}</div>
            ) : (
              <>
                {!isOwn(msg) && (
                  <span className="msg-sender">{msg.senderName}</span>
                )}
                <div className="msg-bubble">
                  {msg.type === 'file' ? (
                    <a href={msg.fileUrl} target="_blank" rel="noreferrer"
                       className="msg-file">
                      📎 {msg.fileName || 'View file'}
                    </a>
                  ) : (
                    <p>{msg.text}</p>
                  )}
                  <span className="msg-time">{formatTime(msg.timestamp)}</span>
                </div>
              </>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="typing-indicator">
            <span /><span /><span />
            <p>{typingUser} is typing...</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {isActive && (
        <div className="chatbox-input">
          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
            rows={1}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim()}
          >
            ➤
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatBox;