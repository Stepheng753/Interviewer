require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const WebSocket = require('ws');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || process.env.GEMINI_API_KEY || 'fallback_secret';

// Security and middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Database Configuration
const dbPath = process.env.DATABASE_PATH || './interviewer.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
      if (pragmaErr) console.error('Failed to enable foreign keys:', pragmaErr);
    });
  }
});

// Promise Helpers for SQLite3
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function initDb() {
  try {
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbRun(`
      CREATE TABLE IF NOT EXISTS qa_pairs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
}
initDb();

// JWT Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// --- Auth Endpoints ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await dbRun(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, normalizedEmail, password_hash]
    );

    const user = await dbGet('SELECT id, name, email, created_at FROM users WHERE id = ?', [result.lastID]);
    res.status(201).json(user);
  } catch (err) {
    if (err.code !== 'SQLITE_CONSTRAINT' || process.env.NODE_ENV !== 'test') {
      console.error('Registration error:', err);
    }
    res.status(500).json({ error: 'Failed to register user (email might already exist)' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- REST Endpoints ---

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet('SELECT id, name, email FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/history', authenticateToken, async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM qa_pairs WHERE user_id = ? ORDER BY timestamp ASC', [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/pair', authenticateToken, async (req, res) => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }
    const result = await dbRun(
      'INSERT INTO qa_pairs (user_id, question, answer) VALUES (?, ?, ?)',
      [req.user.id, question, answer]
    );
    const pair = await dbGet('SELECT * FROM qa_pairs WHERE id = ?', [result.lastID]);
    res.status(201).json(pair);
  } catch (err) {
    console.error('Error saving QA pair:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/pair/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM qa_pairs WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting QA pair:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/history', authenticateToken, async (req, res) => {
  try {
    await dbRun('DELETE FROM qa_pairs WHERE user_id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error clearing history:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/transcribe', authenticateToken, async (req, res) => {
  try {
    const { audio } = req.body;
    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: 'audio/mp4',
                    data: audio
                  }
                },
                {
                  text: 'Please transcribe the following audio recording. If you cannot hear anything, return an empty string. Only return the transcription, nothing else.'
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ text: text.trim() });
  } catch (err) {
    console.error('Transcription error:', err);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

// --- BFF WebSocket Proxy to Gemini ---

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  // Authenticate WebSocket connection via query string
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  if (!token) {
    ws.close(1008, 'Auth token missing');
    return;
  }

  let userId;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.id;
  } catch (err) {
    ws.close(1008, 'Invalid token');
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not configured');
    ws.close(1011, 'Server configuration error');
    return;
  }

  const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${process.env.GEMINI_API_KEY}`;

  const geminiWs = new WebSocket(GEMINI_WS_URL);

  geminiWs.on('open', () => {
    ws.send(JSON.stringify({ type: 'proxy_status', status: 'connected' }));

    const setupMsg = {
      setup: {
        model: 'models/gemini-3.1-flash-live-preview',
        generationConfig: {
          responseModalities: ['AUDIO']
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: {
          parts: [{ text: 'You are a warm, conversational AI interviewer. Your goal is to interview the user about their life stories, career, and personal philosophy to help them preserve their knowledge. Ask one interesting and open-ended question at a time. Keep your questions relatively short, and wait for their response. Start by welcoming the user and asking the first question.' }]
        }
      }
    };
    geminiWs.send(JSON.stringify(setupMsg));

    const triggerMsg = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text: 'Please start the interview now. Welcome me and ask your first question.' }]
          }
        ],
        turnComplete: true
      }
    };
    geminiWs.send(JSON.stringify(triggerMsg));
  });

  geminiWs.on('message', (data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data.toString());
    }
  });

  geminiWs.on('close', (code, reason) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(code, reason);
    }
  });

  geminiWs.on('error', (err) => {
    console.error('Gemini WS error:', err);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'proxy_error', error: 'Gemini connection error' }));
    }
  });

  ws.on('message', (data) => {
    if (geminiWs.readyState === WebSocket.OPEN) {
      geminiWs.send(data.toString());
    }
  });

  ws.on('close', () => {
    if (geminiWs.readyState === WebSocket.OPEN) {
      geminiWs.close();
    }
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, '0.0.0.0', () => {
  });
}

module.exports = { app, server, db };
