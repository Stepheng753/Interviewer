import { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import './App.css';
import InkReveal from './components/ui/ink-reveal';
import { parseColorToRgb, getContrastMaskColor } from './themes/registry';
import UserSettings from './components/UserSettings';
import ThemesView from './components/ThemesView';
import AuthView from './components/AuthView';
import HistoryView from './components/HistoryView';
import ChatView from './components/ChatView';

// Build-time environment config with fallback values
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
}

export interface QAPair {
  id: number;
  question: string;
  answer: string;
  timestamp: string;
}

export interface ChatLogEntry {
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
    if (!link) {
      link = document.createElement('link');
      link.id = 'dynamic-theme-stylesheet';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `/themes/${activeTheme}.css`;
    localStorage.setItem('activeTheme', activeTheme);
  }, [activeTheme]);

  // Dashboard Sub-Views State
  const [dashboardView, setDashboardView] = useState<'chat' | 'history' | 'themes' | 'settings'>('chat');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  // Auth Success Handler
  const handleAuthSuccess = (newToken: string, activeUser: UserProfile) => {
    setToken(newToken);
    setUser(activeUser);
  };

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

  const selectedCategoryRef = useRef<string | null>(null);

  useEffect(() => {
    selectedCategoryRef.current = selectedCategory;
  }, [selectedCategory]);

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
              answer: userMsg.text,
              category: selectedCategoryRef.current
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
    }
  }, [token]);

  // Load history when user is authenticated
  useEffect(() => {
    if (user) {
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

  const handleLogout = () => {
    stopVoiceSession();
    setToken(null);
    setUser(null);
    setDialogue([]);
    setSelectedCategory(null);
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

  const resetConversation = () => {
    stopVoiceSession();
    updateDialogueState([]);
    currentUserBubbleIdRef.current = null;
    currentInterviewerBubbleIdRef.current = null;
    savedPairsRef.current.clear();
    setSelectedCategory(null);
  };

  // --- Voice Streaming Logic (Web Audio API & WebSocket) ---

  const startVoiceSession = async (category: string) => {
    if (!token) return;
    setWsStatus('connecting');
    setIsVoiceActive(true);
    if (dialogueRef.current.length === 0) {
      savedPairsRef.current.clear();
    }
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
      const isResumeSession = dialogueRef.current.length > 0;
      let lastQuestionText = '';
      if (isResumeSession) {
        for (let i = dialogueRef.current.length - 1; i >= 0; i--) {
          if (dialogueRef.current[i].role === 'interviewer') {
            lastQuestionText = dialogueRef.current[i].text;
            break;
          }
        }
      }

      const wsUrl = `${WS_URL}?token=${token}&category=${category}&isResume=${isResumeSession}&lastQuestion=${encodeURIComponent(lastQuestionText)}`;
      const ws = new WebSocket(wsUrl);
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
              answer: next.text,
              category: selectedCategoryRef.current
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

  if (!token) {
    return (
      <AuthView
        apiURL={API_URL}
        computedMaskColor={computedMaskColor}
        onAuthSuccess={handleAuthSuccess}
      />
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
            <img src="/logo.svg" className="app-logo" alt="Logo" />
            <span>AIU</span>
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
                <ChatView
                  dialogue={dialogue}
                  user={user}
                  isVoiceActive={isVoiceActive}
                  wsStatus={wsStatus}
                  isSpeaking={isSpeaking}
                  startVoiceSession={startVoiceSession}
                  stopVoiceSession={stopVoiceSession}
                  dialogueEndRef={dialogueEndRef}
                  renderMessageText={renderMessageText}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  resetConversation={resetConversation}
                />
              )}

              {dashboardView === 'history' && (
                <HistoryView
                  isLoadingHistory={isLoadingHistory}
                  history={history}
                  deletePair={deletePair}
                  parseUTCTimestamp={parseUTCTimestamp}
                />
              )}

              {dashboardView === 'themes' && (
                <ThemesView
                  theme={theme}
                  setTheme={setTheme}
                  activeTheme={activeTheme}
                  setActiveTheme={setActiveTheme}
                />
              )}

              {dashboardView === 'settings' && (
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
