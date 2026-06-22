import React, { useState, useEffect, useRef } from 'react';
import {
  Trash2, Calendar, User, Lock, Mail,
  MessageSquare, RefreshCw, AlertCircle, Menu, X
} from 'lucide-react';
import './App.css';
import InkReveal from './components/ui/ink-reveal';
import { VoiceChat } from './components/ui/ia-siri-chat';
import { AVAILABLE_THEMES, parseColorToRgb, getContrastMaskColor } from './themes/registry';

// Build-time environment config with fallback values
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

interface UserProfile {
  id: number;
  name: string;
  email: string;
}

interface QAPair {
  id: number;
  question: string;
  answer: string;
  timestamp: string;
}

interface ChatLogEntry {
  id: string;
  role: 'interviewer' | 'user';
  text: string;
  timestamp: Date;
}

const parseUTCTimestamp = (ts: string) => {
  if (!ts) return new Date();
  let formatted = ts.trim();
  if (!formatted.includes('T')) {
    formatted = formatted.replace(' ', 'T');
  }
  const hasTimezone = formatted.endsWith('Z') || 
                      (formatted.includes('T') && (formatted.indexOf('+', formatted.indexOf('T')) !== -1 || formatted.indexOf('-', formatted.indexOf('T')) !== -1));
  if (!hasTimezone) {
    formatted += 'Z';
  }
  const date = new Date(formatted);
  return isNaN(date.getTime()) ? new Date(ts) : date;
};

const formatTranscriptText = (text: string): string => {
  if (!text) return '';

  // 1. Capitalize the first letter of the overall text and any letter following sentence-ending punctuation (. ? !)
  let formatted = text.replace(/(^\s*|[.!?]\s+)([a-z])/gi, (_match, prefix, char) => {
    return prefix + char.toUpperCase();
  });

  // Ensure the very first non-whitespace character is capitalized
  formatted = formatted.trim();
  if (formatted.length > 0) {
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  // 2. Wrap filler words in asterisks for italics formatting
  const fillerRegex = /\b(um|umm|uh|uhh|er|ah|err)\b/gi;
  formatted = formatted.replace(fillerRegex, (match) => {
    return `*${match}*`;
  });

  return formatted;
};

const renderMessageText = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={index} className="opacity-80 italic font-medium">{part.slice(1, -1)}</em>;
        }
        return part;
      })}
    </>
  );
};

function UserSettings({ user, token, apiURL, onUpdateProfile, onClearHistory, hasHistory }: { 
  user: UserProfile | null, 
  token: string | null, 
  apiURL: string, 
  onUpdateProfile: (user: UserProfile, token?: string) => void,
  onClearHistory: () => void,
  hasHistory: boolean
}) {
  const [editField, setEditField] = useState<'name' | 'email' | 'password' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = (field: 'name' | 'email' | 'password') => {
    setError('');
    setSuccess('');
    setEditField(field);
    if (field === 'name') {
      setEditValue(user?.name || '');
    } else if (field === 'email') {
      setEditValue(user?.email || '');
    } else {
      setEditValue('');
    }
  };

  const handleSave = async () => {
    if (!editField) return;
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const payload: any = {};
      if (editField === 'name') payload.name = editValue;
      if (editField === 'email') payload.email = editValue;
      if (editField === 'password') payload.password = editValue;

      const res = await fetch(`${apiURL}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        onUpdateProfile(data.user, data.token);
        setSuccess(`${editField === 'password' ? 'Password' : editField === 'name' ? 'Display Name' : 'Email Address'} updated successfully!`);
        setEditField(null);
      } else {
        setError(data.error || 'Failed to update user profile');
      }
    } catch (err) {
      setError('Network error updating user settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-container">
      {error && <div className="error-banner" style={{ margin: 0 }}>{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      {/* Name Field */}
      <div className="settings-field-group">
        <label className="settings-field-label">Display Name</label>
        {editField === 'name' ? (
          <div className="settings-input-group">
            <input 
              type="text" 
              className="settings-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Display Name"
              disabled={isSaving}
              autoFocus
            />
            <button className="settings-action-btn settings-save-btn" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button className="settings-action-btn settings-cancel-btn" onClick={() => setEditField(null)} disabled={isSaving}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="settings-field-row">
            <span className="settings-field-value">{user?.name}</span>
            <button className="settings-edit-btn" onClick={() => startEdit('name')}>Edit</button>
          </div>
        )}
      </div>

      {/* Email Field */}
      <div className="settings-field-group">
        <label className="settings-field-label">Email Address</label>
        {editField === 'email' ? (
          <div className="settings-input-group">
            <input 
              type="email" 
              className="settings-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="you@domain.com"
              disabled={isSaving}
              autoFocus
            />
            <button className="settings-action-btn settings-save-btn" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button className="settings-action-btn settings-cancel-btn" onClick={() => setEditField(null)} disabled={isSaving}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="settings-field-row">
            <span className="settings-field-value">{user?.email}</span>
            <button className="settings-edit-btn" onClick={() => startEdit('email')}>Edit</button>
          </div>
        )}
      </div>

      {/* Password Field */}
      <div className="settings-field-group">
        <label className="settings-field-label">Password</label>
        {editField === 'password' ? (
          <div className="settings-input-group">
            <input 
              type="password" 
              className="settings-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="••••••••"
              disabled={isSaving}
              autoFocus
            />
            <button className="settings-action-btn settings-save-btn" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button className="settings-action-btn settings-cancel-btn" onClick={() => setEditField(null)} disabled={isSaving}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="settings-field-row">
            <span className="settings-field-value">************</span>
            <button className="settings-edit-btn" onClick={() => startEdit('password')}>Edit</button>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      {hasHistory && (
        <div className="settings-field-group" style={{ borderBottom: 'none', marginTop: '10px' }}>
          <label className="settings-field-label" style={{ color: 'var(--destructive)' }}>Danger Zone</label>
          <div className="settings-field-row">
            <span className="settings-field-value" style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
              Permanently delete all question & answer pairs.
            </span>
            <button 
              className="settings-edit-btn" 
              style={{ color: 'var(--destructive)', borderColor: 'var(--destructive)' }}
              onClick={onClearHistory}
            >
              Clear History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  // Theme mode state (light/dark) defaulting to system theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Active theme state (maps to the custom CSS theme stylesheet)
  const [activeTheme, setActiveTheme] = useState<string>(() => {
    const val = localStorage.getItem('activeTheme');
    if (val === 'default') return 'starry-night'; // Migrate legacy default value to starry-night
    return val || 'starry-night';
  });

  // Computed high-contrast mask color for InkReveal
  const [computedMaskColor, setComputedMaskColor] = useState<[number, number, number]>(
    theme === 'dark' ? [24, 26, 36] : [245, 247, 250]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const bgVal = window.getComputedStyle(document.documentElement).getPropertyValue('--background');
      if (bgVal) {
        const rgb = parseColorToRgb(bgVal);
        if (rgb) {
          setComputedMaskColor(getContrastMaskColor(rgb));
          return;
        }
      }
      setComputedMaskColor(theme === 'dark' ? [24, 26, 36] : [245, 247, 250]);
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTheme, theme]);

  // Apply light/dark mode changes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Apply custom theme stylesheet link loading
  useEffect(() => {
    let link = document.getElementById('dynamic-theme-stylesheet') as HTMLLinkElement;
    if (activeTheme === 'classic') {
      if (link) {
        link.remove();
      }
    } else {
      if (!link) {
        link = document.createElement('link');
        link.id = 'dynamic-theme-stylesheet';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      link.href = `/themes/${activeTheme}.css`;
    }
    localStorage.setItem('activeTheme', activeTheme);
  }, [activeTheme]);

  // Navigation View
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'dashboard'>('login');

  // Dashboard Sub-Views State
  const [dashboardView, setDashboardView] = useState<'chat' | 'history' | 'themes' | 'settings'>('chat');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    if (!isMenuOpen) {
      stopVoiceSession();
      setIsMenuOpen(true);
    } else {
      setIsMenuOpen(false);
    }
  };

  // Auth State
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<UserProfile | null>(null);

  // Form Fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Dashboard & History States
  const [history, setHistory] = useState<QAPair[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [dialogue, setDialogue] = useState<ChatLogEntry[]>([]);

  // WebSocket Voice Session States
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingTimeoutRef = useRef<any>(null);

  // Web Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlaybackTimeRef = useRef<number>(0);

  // Socket ref
  const wsRef = useRef<WebSocket | null>(null);

  // Scroll Container ref
  const dialogueEndRef = useRef<HTMLDivElement | null>(null);

  // Transcription and Q&A persistence refs
  const dialogueRef = useRef<ChatLogEntry[]>([]);
  const recognitionRef = useRef<any>(null);
  const currentUserBubbleIdRef = useRef<string | null>(null);
  const currentInterviewerBubbleIdRef = useRef<string | null>(null);
  const savedPairsRef = useRef<Set<string>>(new Set());
  const isWaitingForModelResponseRef = useRef<boolean>(true);

  const updateDialogueState = (newDialogue: ChatLogEntry[]) => {
    dialogueRef.current = newDialogue;
    setDialogue(newDialogue);
  };

  const updateChatBubble = (role: 'interviewer' | 'user', text: string, mode: 'append' | 'replace' | 'new') => {
    const list = [...dialogueRef.current];
    if (mode === 'new') {
      const id = Math.random().toString(36).substring(2, 11);
      if (role === 'user') {
        currentUserBubbleIdRef.current = id;
      } else {
        currentInterviewerBubbleIdRef.current = id;
      }
      const newEntry: ChatLogEntry = {
        id,
        role,
        text,
        timestamp: new Date()
      };
      updateDialogueState([...list, newEntry]);
      return;
    }

    const targetId = role === 'user' ? currentUserBubbleIdRef.current : currentInterviewerBubbleIdRef.current;
    const index = list.findIndex(e => e.id === targetId);

    if (index !== -1) {
      if (mode === 'append') {
        list[index] = {
          ...list[index],
          text: list[index].text + text
        };
      } else if (mode === 'replace') {
        list[index] = {
          ...list[index],
          text: text
        };
      }
      updateDialogueState(list);
    } else {
      const id = Math.random().toString(36).substring(2, 11);
      if (role === 'user') {
        currentUserBubbleIdRef.current = id;
      } else {
        currentInterviewerBubbleIdRef.current = id;
      }
      const newEntry: ChatLogEntry = {
        id,
        role,
        text,
        timestamp: new Date()
      };
      updateDialogueState([...list, newEntry]);
    }
  };

  const saveLastQAPair = async () => {
    const list = dialogueRef.current;
    if (list.length < 2) return;

    let lastUserIdx = -1;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }

    if (lastUserIdx >= 0) {
      const userMsg = list[lastUserIdx];
      let interviewerMsg = null;
      for (let i = lastUserIdx - 1; i >= 0; i--) {
        if (list[i].role === 'interviewer') {
          interviewerMsg = list[i];
          break;
        }
      }

      if (interviewerMsg && userMsg.text.trim()) {
        const pairKey = `${interviewerMsg.id}-${userMsg.id}`;
        if (savedPairsRef.current.has(pairKey)) return;

        savedPairsRef.current.add(pairKey);

        try {
          const res = await fetch(`${API_URL}/pair`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              question: interviewerMsg.text,
              answer: userMsg.text
            })
          });
          if (res.ok) {
            fetchHistory();
          } else {
            const errBody = await res.json().catch(() => ({}));
            console.error('[saveLastQAPair] server save failed:', errBody);
          }
        } catch (err) {
          console.error('[saveLastQAPair] fetch network error saving QA pair:', err);
        }
      }
    }
  };

  // Load user profile if token is present
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchUserProfile();
    } else {
      localStorage.removeItem('token');
      setUser(null);
      setCurrentView('login');
    }
  }, [token]);

  // Load history when user is authenticated
  useEffect(() => {
    if (user) {
      setCurrentView('dashboard');
      fetchHistory();
    }
  }, [user]);

  // Scroll to bottom of chat bubbles
  useEffect(() => {
    dialogueEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogue]);

  const fetchUserProfile = async () => {
    try {
      if (!token) return;

      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        // Fallback to decode if API call is not successful
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          window.atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);
        setUser({
          id: decoded.id,
          email: decoded.email,
          name: decoded.name || 'Developer User'
        });
      }
    } catch (err) {
      console.error('Failed to retrieve user profile:', err);
      handleLogout();
    }
  };

  const fetchHistory = async () => {
    if (!token) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`${API_URL}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      } else {
        console.error('Failed to fetch QA history');
      }
    } catch (err) {
      console.error('Network error fetching history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword })
      });
      const data = await res.json();
      if (res.ok) {
        // Automatically transfer to login screen
        setLoginEmail(regEmail);
        setCurrentView('login');
        setRegName('');
        setRegEmail('');
        setRegPassword('');
      } else {
        setAuthError(data.error || 'Registration failed');
      }
    } catch (err) {
      setAuthError('Connection to server failed');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
      } else {
        setAuthError(data.error || 'Login failed');
      }
    } catch (err) {
      setAuthError('Connection to server failed');
    }
  };

  const handleLogout = () => {
    stopVoiceSession();
    setToken(null);
    setUser(null);
    setDialogue([]);
    setCurrentView('login');
  };

  const deletePair = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/pair/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setHistory(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete QA pair:', err);
    }
  };

  const clearHistory = async () => {
    if (!token || !window.confirm('Are you sure you want to clear your entire interview history?')) return;
    try {
      const res = await fetch(`${API_URL}/history`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setHistory([]);
      }
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  // --- Voice Streaming Logic (Web Audio API & WebSocket) ---

  const startVoiceSession = async () => {
    if (!token) return;
    setWsStatus('connecting');
    setIsVoiceActive(true);
    savedPairsRef.current.clear();
    isWaitingForModelResponseRef.current = true;

    try {
      // 1. Initialize Web Audio Context at 16000Hz (required input frequency)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
      audioContextRef.current = audioContext;

      // 2. Request mic access with standard echo cancellation filters
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      micStreamRef.current = stream;

      // 3. Initialize SpeechRecognition if available
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let accumulatedTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            accumulatedTranscript += event.results[i][0].transcript;
          }
          const fullTranscript = accumulatedTranscript.trim();
          if (fullTranscript) {
            const formatted = formatTranscriptText(fullTranscript);
            if (!currentUserBubbleIdRef.current) {
              updateChatBubble('user', formatted, 'new');
            } else {
              updateChatBubble('user', formatted, 'replace');
            }
          }
        };

        recognition.onerror = (e: any) => {
          console.error('[SpeechRecognition] error encountered:', e);
        };

        recognition.onend = () => {
        };

        recognitionRef.current = recognition;
      }

      // 4. Connect WebSocket to the BFF Server Proxy
      const ws = new WebSocket(`${WS_URL}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
      };

      ws.onmessage = async (event) => {
        try {
          const json = JSON.parse(event.data);

          if (json.type === 'proxy_status' && json.status === 'connected') {
            setWsStatus('connected');
            // Audio recording pipeline
            setupAudioProcessor(stream, audioContext);
          }

          // Handle incoming Gemini voice audio
          if (json.serverContent?.modelTurn) {
            if (isWaitingForModelResponseRef.current) {
              // Stop speech recognition when model starts speaking
              if (recognitionRef.current) {
                try {
                  recognitionRef.current.stop();
                } catch (e) { }
              }

              // Save the previous Q&A pair before starting new model turn
              saveLastQAPair();

              currentInterviewerBubbleIdRef.current = null;
              isWaitingForModelResponseRef.current = false;
            }
          }

          if (json.serverContent?.modelTurn?.parts) {
            for (const part of json.serverContent.modelTurn.parts) {
              if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
                playPCMChunk(part.inlineData.data);
              }
              if (part.text) {
                if (!currentInterviewerBubbleIdRef.current) {
                  updateChatBubble('interviewer', part.text, 'new');
                } else {
                  updateChatBubble('interviewer', part.text, 'append');
                }
              }
            }
          }

          // Handle Gemini input transcription (User's speech)
          if (json.serverContent?.inputTranscription?.text) {
            const rawText = json.serverContent.inputTranscription.text;
            console.log('[Gemini Input Transcription] Received:', rawText);
            const formatted = formatTranscriptText(rawText);
            if (formatted) {
              if (!currentUserBubbleIdRef.current) {
                updateChatBubble('user', formatted, 'new');
              } else {
                updateChatBubble('user', formatted, 'replace');
              }
            }
          }

          // Handle Gemini output transcription (AI Interviewer)
          if (json.serverContent?.outputTranscription?.text) {
            const text = json.serverContent.outputTranscription.text;
            if (!currentInterviewerBubbleIdRef.current) {
              updateChatBubble('interviewer', text, 'new');
            } else {
              updateChatBubble('interviewer', text, 'append');
            }
          }

          // Save dialogue turn to database when finalized
          if (json.serverContent?.turnComplete) {
            currentUserBubbleIdRef.current = null;
            isWaitingForModelResponseRef.current = true;
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) { }
            }
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        stopVoiceSession();
      };

      ws.onerror = (err) => {
        console.error('WebSocket proxy error:', err);
        stopVoiceSession();
      };

    } catch (err) {
      console.error('Failed to initialize audio inputs:', err);
      stopVoiceSession();
      alert('Could not access microphone. Ensure permissions are granted.');
    }
  };

  const setupAudioProcessor = (stream: MediaStream, audioContext: AudioContext) => {
    const source = audioContext.createMediaStreamSource(stream);

    // Create ScriptProcessor for capturing raw mic buffer chunks
    const processor = audioContext.createScriptProcessor(2048, 1, 1);
    scriptProcessorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;

      // Skip recording/streaming if Gemini speaker is currently playing audio response
      if (audioContext && audioContext.currentTime < nextPlaybackTimeRef.current) {
        return;
      }

      const inputBuffer = e.inputBuffer.getChannelData(0); // Float32Array
      const pcmBuffer = float32ToInt16(inputBuffer);
      const base64Audio = arrayBufferToBase64(pcmBuffer);

      // Stream media chunks upstream
      const payload = {
        realtimeInput: {
          audio: {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Audio
          }
        }
      };
      wsRef.current.send(JSON.stringify(payload));
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  };

  const stopVoiceSession = () => {
    setIsVoiceActive(false);
    setWsStatus('disconnected');
    setIsSpeaking(false);
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }

    // Tear down WebSocket connection
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { }
      recognitionRef.current = null;
    }

    // Terminate microphone tracks
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    // Stop audio processor
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    // Close Web Audio Context
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }

    nextPlaybackTimeRef.current = 0;

    // Check dialogue log for QA pairs, save to database
    saveDialoguePairs();
  };

  // Extract completed Q&A pairs from current dialogue list and save to SQLite
  const saveDialoguePairs = async () => {
    if (dialogueRef.current.length < 2 || !token) return;

    // Scan dialogue logs sequentially for adjacent Interviewer -> User pairs
    for (let i = 0; i < dialogueRef.current.length - 1; i++) {
      const current = dialogueRef.current[i];
      const next = dialogueRef.current[i + 1];

      if (current.role === 'interviewer' && next.role === 'user') {
        const pairKey = `${current.id}-${next.id}`;
        if (savedPairsRef.current.has(pairKey)) continue;

        savedPairsRef.current.add(pairKey);

        try {
          await fetch(`${API_URL}/pair`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              question: current.text,
              answer: next.text
            })
          });
        } catch (err) {
          console.error('Error saving QA pair:', err);
        }
      }
    }
    // Refresh sidebar history records
    fetchHistory();
  };

  const playPCMChunk = (base64Data: string) => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx || audioCtx.state === 'closed') return;

    try {
      const binaryString = window.atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM bytes to Float32 sample array
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      // Initialize buffer at 24000Hz (Gemini response sample rate)
      const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      // Create audio source node
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      // Schedule play timing to prevent overlaps
      const now = audioCtx.currentTime;
      if (nextPlaybackTimeRef.current < now) {
        nextPlaybackTimeRef.current = now;
      }

      source.start(nextPlaybackTimeRef.current);
      nextPlaybackTimeRef.current += audioBuffer.duration;

      // Handle isSpeaking state mapping
      setIsSpeaking(true);
      const timeRemainingMs = (nextPlaybackTimeRef.current - audioCtx.currentTime) * 1000;
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
      speakingTimeoutRef.current = setTimeout(() => {
        setIsSpeaking(false);
      }, timeRemainingMs);
    } catch (err) {
      console.error('Failed to play decoded PCM chunk:', err);
    }
  };

  const float32ToInt16 = (float32Array: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true); // little-endian
    }
    return buffer;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };



  // --- Render Functions ---

  if (currentView === 'login' || currentView === 'register') {
    return (
      <div className="auth-container">
        <InkReveal maskColor={computedMaskColor} />
        <div className="auth-card">
          <div className="auth-header">
            <div className="logo-container" style={{ justifyContent: 'center', marginBottom: '15px' }}>
              <MessageSquare className="logo-icon animate-pulse" size={36} />
              <h1 style={{ margin: 0 }}>Interview.ai</h1>
            </div>
            <p>{currentView === 'login' ? 'Preserve your Legacy & Knowledge' : 'Create your Secure Personal Vault'}</p>
          </div>

          {authError && (
            <div className="error-banner">
              <AlertCircle size={16} style={{ marginRight: '8px', verticalAlign: 'middle', display: 'inline' }} />
              <span>{authError}</span>
            </div>
          )}

          {currentView === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: '12px', top: '14px', color: '#6b7280' }} size={18} />
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    className="form-input"
                    style={{ paddingLeft: '40px' }}
                    placeholder="you@domain.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: '12px', top: '14px', color: '#6b7280' }} size={18} />
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    className="form-input"
                    style={{ paddingLeft: '40px' }}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="auth-btn">Log In</button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              {/* Dummy hidden inputs to prevent Chrome autofill from misaligning fields */}
              <input type="text" name="chrome_dummy_username" style={{ display: 'none' }} />
              <input type="password" name="chrome_dummy_password" style={{ display: 'none' }} />

              <div className="form-group">
                <label>Display Name</label>
                <div style={{ position: 'relative' }}>
                  <User style={{ position: 'absolute', left: '12px', top: '14px', color: '#6b7280' }} size={18} />
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    className="form-input"
                    style={{ paddingLeft: '40px' }}
                    placeholder="John Doe"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: '12px', top: '14px', color: '#6b7280' }} size={18} />
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    className="form-input"
                    style={{ paddingLeft: '40px' }}
                    placeholder="you@domain.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Secure Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: '12px', top: '14px', color: '#6b7280' }} size={18} />
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    className="form-input"
                    style={{ paddingLeft: '40px' }}
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="auth-btn">Register Account</button>
            </form>
          )}

          <div className="auth-footer">
            {currentView === 'login' ? (
              <>
                New to the platform?{' '}
                <span className="auth-link" onClick={() => { setCurrentView('register'); setAuthError(''); }}>
                  Register here
                </span>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <span className="auth-link" onClick={() => { setCurrentView('login'); setAuthError(''); }}>
                  Log In
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-viewport">
      <InkReveal maskColor={computedMaskColor} />
      <div className="app-card">
        {/* Top Header Bar */}
        <header className="app-header">
          <button 
            className="menu-toggle-btn" 
            onClick={toggleMenu} 
            title={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <h1 
            className="app-title clickable-title" 
            onClick={() => { setDashboardView('chat'); setIsMenuOpen(false); }}
          >
            Interviewer AI
          </h1>
          
          <button className="logout-action-btn" onClick={handleLogout} title="Log Out">
            Logout
          </button>
        </header>

        {/* Bottom Section */}
        <div className="app-body">
          {isMenuOpen ? (
            /* Navigation Menu Overlay */
            <div className="nav-menu-container" key="menu">
              <div 
                className={`nav-menu-item ${dashboardView === 'chat' ? 'active' : ''}`}
                onClick={() => { setDashboardView('chat'); setIsMenuOpen(false); }}
              >
                Current Convo
              </div>
              <div className="nav-menu-divider"></div>
              <div 
                className={`nav-menu-item ${dashboardView === 'history' ? 'active' : ''}`}
                onClick={() => { setDashboardView('history'); setIsMenuOpen(false); }}
              >
                Past Convos
              </div>
              <div className="nav-menu-divider"></div>
              <div 
                className={`nav-menu-item ${dashboardView === 'themes' ? 'active' : ''}`}
                onClick={() => { setDashboardView('themes'); setIsMenuOpen(false); }}
              >
                Themes
              </div>
              <div className="nav-menu-divider"></div>
              <div 
                className={`nav-menu-item ${dashboardView === 'settings' ? 'active' : ''}`}
                onClick={() => { setDashboardView('settings'); setIsMenuOpen(false); }}
              >
                User Settings
              </div>
            </div>
          ) : (
            /* Active view content */
            <>
              {dashboardView === 'chat' && (
                <div className="chat-view-container" key="chat">
                  {/* Dialogue Area */}
                  <section className="dialogue-container">
                    {dialogue.length === 0 ? null : (
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
                      onClick={isVoiceActive ? stopVoiceSession : startVoiceSession}
                      statusText={
                        wsStatus === 'connecting'
                          ? 'NEGOTIATING HANDSHAKE...'
                          : wsStatus === 'connected'
                            ? (isSpeaking ? 'GEMINI TALKING...' : 'STREAMING SOUND INPUT • CLICK TO FINISH')
                            : 'CONSOLE IDLE • UNMUTE MIC TO CHAT'
                      }
                      disabled={wsStatus === 'connecting'}
                    />
                  </div>
                </div>
              )}

              {dashboardView === 'history' && (
                <div className="history-view-container" key="history">
                  <div className="history-container">
                    {isLoadingHistory ? (
                      <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ display: 'inline', marginRight: '8px' }} />
                        <span>Loading history...</span>
                      </div>
                    ) : history.length === 0 ? (
                      <div className="empty-history" style={{ padding: '40px 20px' }}>
                        No conversation records. Start an interview to capture your thoughts!
                      </div>
                    ) : (
                      <div className="history-list-wrapper">
                        {history.map((item) => (
                          <div key={item.id} className="history-block">
                            <div className="history-block-q">Q: {item.question}</div>
                            <div className="history-block-a">A: {item.answer}</div>
                            <div className="history-block-footer">
                              <span>
                                <Calendar size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                                {parseUTCTimestamp(item.timestamp).toLocaleDateString()} {parseUTCTimestamp(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <button 
                              className="history-block-trash" 
                              onClick={() => deletePair(item.id)} 
                              title="Delete QA pair"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {dashboardView === 'themes' && (
                <div className="themes-view-container" key="themes">
                  <div className="themes-content-wrapper">
                    <div className="themes-header-section">
                      <span className="themes-section-title">Appearance Mode</span>
                      <div className="mode-toggle-group">
                        <button 
                          className={`mode-btn ${theme === 'light' ? 'active' : ''}`}
                          onClick={() => setTheme('light')}
                        >
                          Light
                        </button>
                        <button 
                          className={`mode-btn ${theme === 'dark' ? 'active' : ''}`}
                          onClick={() => setTheme('dark')}
                        >
                          Dark
                        </button>
                      </div>
                    </div>
                    
                    <div className="themes-divider"></div>
                    
                    <div className="themes-header-section">
                      <span className="themes-section-title">Color Palette</span>
                      <span className="themes-section-subtitle">Choose from 40 custom design theme profiles.</span>
                    </div>

                    <div className="themes-grid">
                      {AVAILABLE_THEMES.map((t) => (
                        <div 
                          key={t.id}
                          className={`theme-card ${activeTheme === t.id ? 'active' : ''}`}
                          onClick={() => setActiveTheme(t.id)}
                        >
                          <div className="theme-color-preview" style={{ backgroundColor: t.previewColor }}></div>
                          <div className="theme-meta-info">
                            <div className="theme-name">{t.name}</div>
                            <div className="theme-desc">{t.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {dashboardView === 'settings' && (
                <div className="settings-view-container" key="settings">
                  <UserSettings 
                    user={user} 
                    token={token} 
                    apiURL={API_URL} 
                    onUpdateProfile={(updatedUser, newToken) => {
                      setUser(updatedUser);
                      if (newToken) {
                        setToken(newToken);
                      }
                    }}
                    onClearHistory={clearHistory}
                    hasHistory={history.length > 0}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
