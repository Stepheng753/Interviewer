import React from 'react';
import { VoiceChat } from './ui/ia-siri-chat';
import { Briefcase, Compass, Users, Activity, Power } from 'lucide-react';
import type { ChatLogEntry, UserProfile } from '../App';

interface ChatViewProps {
  dialogue: ChatLogEntry[];
  user: UserProfile | null;
  isVoiceActive: boolean;
  wsStatus: 'disconnected' | 'connecting' | 'connected';
  isSpeaking: boolean;
  startVoiceSession: (category: string) => void;
  stopVoiceSession: () => void;
  dialogueEndRef: React.RefObject<HTMLDivElement | null>;
  renderMessageText: (text: string) => React.ReactNode;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  resetConversation: () => void;
}

export default function ChatView({
  dialogue,
  user,
  isVoiceActive,
  wsStatus,
  isSpeaking,
  startVoiceSession,
  stopVoiceSession,
  dialogueEndRef,
  renderMessageText,
  selectedCategory,
  setSelectedCategory,
  resetConversation
}: ChatViewProps) {
  const categories = [
    {
      id: 'career',
      title: 'Career & Ambition',
      description: 'Preserve your career journey, professional achievements, and work philosophy.',
      icon: <Briefcase size={24} />,
      color: 'var(--chart-1, #3a5ba0)'
    },
    {
      id: 'life_advice',
      title: 'Life Advice & Wisdom',
      description: 'Document your personal values, life lessons, and wisdom for future generations.',
      icon: <Compass size={24} />,
      color: 'var(--secondary, #f7c873)'
    },
    {
      id: 'family',
      title: 'Family & Roots',
      description: 'Record your childhood memories, ancestral history, and family relationships.',
      icon: <Users size={24} />,
      color: 'var(--chart-3, #6ea3c1)'
    },
    {
      id: 'health',
      title: 'Health & Wellness',
      description: 'Share your personal health philosophy, active routines, and general well-being tips.',
      icon: <Activity size={24} />,
      color: 'var(--accent-color, #10b981)'
    }
  ];

  const handleSelectCategory = (id: string) => {
    setSelectedCategory(id);
    startVoiceSession(id);
  };

  // Render Category Selection Grid if no category has been chosen
  if (selectedCategory === null) {
    return (
      <div className="category-selection-container">
        <h2 className="category-title">Select Interview Track</h2>
        <p className="category-subtitle">Choose a focus area for your voice session to start archiving your legacy.</p>
        
        <div className="category-grid">
          {categories.map((cat) => (
            <button 
              key={cat.id} 
              className={`category-card ${cat.id}`}
              onClick={() => handleSelectCategory(cat.id)}
            >
              <div className="category-card-icon" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                {cat.icon}
              </div>
              <div className="category-card-info">
                <h3>{cat.title}</h3>
                <p>{cat.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Active chat interface when category is selected
  return (
    <div className="chat-view-container">
      {/* Dialogue Area */}
      <section className="dialogue-container">
        {dialogue.length === 0 ? (
          <div className="chat-empty-state">
            <p>Connecting with your AI interviewer...</p>
          </div>
        ) : (
          <>
            {dialogue.map((entry) => (
              <div key={entry.id} className={`dialogue-bubble ${entry.role}`}>
                <p>{renderMessageText(entry.text)}</p>
                <span className="bubble-meta">
                  {entry.role === 'interviewer' ? 'Gemini AI' : user?.name || 'User'} • {entry.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
            <div ref={dialogueEndRef} />
          </>
        )}
      </section>

      {/* Floating Centered Mic Control */}
      <div className="floating-mic-container">
        <VoiceChat
          isListening={isVoiceActive && wsStatus === 'connected' && !isSpeaking}
          isProcessing={wsStatus === 'connecting'}
          isSpeaking={isSpeaking}
          onClick={isVoiceActive ? stopVoiceSession : () => startVoiceSession(selectedCategory)}
          statusText={
            wsStatus === 'connecting'
              ? 'NEGOTIATING HANDSHAKE...'
              : wsStatus === 'connected'
                ? (isSpeaking ? 'GEMINI TALKING...' : 'STREAMING SOUND INPUT • CLICK TO FINISH')
                : 'CONSOLE PAUSED • CLICK MIC TO RESUME'
          }
          disabled={wsStatus === 'connecting'}
        />

        {/* End Session Action Button */}
        <button 
          className="end-convo-btn" 
          onClick={resetConversation}
          title="End Conversation & Reset"
        >
          <Power size={14} />
          <span>End</span>
        </button>
      </div>
    </div>
  );
}
