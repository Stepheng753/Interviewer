import { useState, useEffect, useRef, useContext } from 'react';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, getRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { AuthContext } from '../context/AuthContext';

export function useInterviewManager() {
  const [transcript, setTranscript] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const currentQuestionRef = useRef('');
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { token, logout } = useContext(AuthContext);

  const connectToBFF = async () => {
    try {
      if (!token) return;
      
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      const historyRes = await fetch(`${API_URL}/history`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Bypass-Tunnel-Reminder': 'true'
        }
      });
      
      if (historyRes.ok) {
        const history = await historyRes.json();
        const formattedHistory = history.flatMap(item => [
          { id: `q_${item.id}`, role: 'ai', text: item.question },
          { id: `a_${item.id}`, role: 'user', text: item.answer, dbId: item.id }
        ]);
        setTranscript(formattedHistory);
      } else if (historyRes.status === 401 || historyRes.status === 403) {
        logout();
        return;
      }

      const WS_URL = process.env.EXPO_PUBLIC_WS_URL;
      wsRef.current = new WebSocket(`${WS_URL}?token=${token}`);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('Connected to BFF WS');
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'proxy_status') return;

        // Parse Gemini Live API output transcription (for AUDIO modality)
        if (data.serverContent?.outputTranscription?.text) {
          const textChunk = data.serverContent.outputTranscription.text;
          setTranscript(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'ai') {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...last,
                text: last.text + textChunk
              };
              currentQuestionRef.current = updated[updated.length - 1].text;
              return updated;
            } else {
              currentQuestionRef.current = textChunk;
              return [...prev, { id: `q_${Date.now()}`, role: 'ai', text: textChunk }];
            }
          });
        }

        // Parse standard text content (fallback or TEXT modality)
        if (data.serverContent?.modelTurn?.parts) {
          const text = data.serverContent.modelTurn.parts
            .map(part => part.text)
            .filter(Boolean)
            .join('');
          
          if (text) {
            currentQuestionRef.current = text;
            setTranscript(prev => {
              if (prev.length > 0 && prev[prev.length - 1].role === 'ai' && prev[prev.length - 1].text === text) {
                return prev;
              }
              return [...prev, { id: `q_${Date.now()}`, role: 'ai', text }];
            });
          }
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
      };
    } catch (err) {
      console.error('Failed to connect', err);
    }
  };

  useEffect(() => {
    connectToBFF();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [token]);

  const removePair = async (dbId) => {
    if (wsRef.current) wsRef.current.close();
    
    const API_URL = process.env.EXPO_PUBLIC_API_URL;
    await fetch(`${API_URL}/pair/${dbId}`, { 
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Bypass-Tunnel-Reminder': 'true'
      }
    });

    await connectToBFF();
  };

  const startRecording = async () => {
    try {
      const permission = await getRecordingPermissionsAsync();
      if (!permission.granted) {
        const request = await requestRecordingPermissionsAsync();
        if (!request.granted) {
          console.log('Permission to access microphone was denied');
          return;
        }
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    try {
      const uri = recorder.uri;
      await recorder.stop();
      console.log('Recording saved to', uri);

      if (uri && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Add a temporary transcribing state
        const tempId = `temp_${Date.now()}`;
        setTranscript(prev => [
          ...prev,
          { id: tempId, role: 'user', text: '🎙️ Transcribing answer...' }
        ]);

        // Read audio file as base64
        const base64Data = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });

        // Call backend transcribe endpoint
        const API_URL = process.env.EXPO_PUBLIC_API_URL;
        const transcribeRes = await fetch(`${API_URL}/transcribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Bypass-Tunnel-Reminder': 'true'
          },
          body: JSON.stringify({ audio: base64Data })
        });

        if (transcribeRes.ok) {
          const { text } = await transcribeRes.json();
          
          if (text) {
            // Send user response to Gemini Live API over WebSocket
            const clientMsg = {
              clientContent: {
                turns: [
                  {
                    role: 'user',
                    parts: [{ text }]
                  }
                ],
                turnComplete: true
              }
            };
            wsRef.current.send(JSON.stringify(clientMsg));

            // Save QA Pair to the DB
            const pairRes = await fetch(`${API_URL}/pair`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Bypass-Tunnel-Reminder': 'true'
              },
              body: JSON.stringify({
                question: currentQuestionRef.current || 'Introduction',
                answer: text
              })
            });

            let dbId = null;
            if (pairRes.ok) {
              const savedPair = await pairRes.json();
              dbId = savedPair.id;
            }

            // Replace transcribing state with actual answer
            setTranscript(prev => 
              prev.map(item => 
                item.id === tempId ? { ...item, id: `a_${Date.now()}`, text, dbId } : item
              )
            );
          } else {
            // Remove the temporary message if no text detected
            setTranscript(prev => prev.filter(item => item.id !== tempId));
          }
        } else {
          // Remove the temporary message on transcription failure
          setTranscript(prev => prev.filter(item => item.id !== tempId));
        }
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const clearHistory = async () => {
    try {
      setTranscript([]);
      if (wsRef.current) wsRef.current.close();
      
      const API_URL = process.env.EXPO_PUBLIC_API_URL;
      await fetch(`${API_URL}/history`, { 
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Bypass-Tunnel-Reminder': 'true'
        }
      });

      await connectToBFF();
    } catch (err) {
      console.error('Failed to clear history', err);
    }
  };

  return {
    transcript,
    isConnected,
    isRecording,
    startRecording,
    stopRecording,
    removePair,
    clearHistory,
    logout
  };
}
