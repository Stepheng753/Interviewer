require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const WebSocket = require('ws');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

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
        category TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Perform database migration: check if 'category' column exists on 'qa_pairs' table
    const columns = await dbAll("PRAGMA table_info(qa_pairs);");
    const hasCategory = columns.some(col => col.name === 'category');
    if (!hasCategory) {
      await dbRun("ALTER TABLE qa_pairs ADD COLUMN category TEXT;");
      console.log("Successfully migrated database schema: added category column to qa_pairs.");
    }
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

app.put('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const userId = req.user.id;

    const existingUser = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    let updateFields = [];
    let params = [];

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      updateFields.push('name = ?');
      params.push(trimmedName);
    }

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({ error: 'Email cannot be empty' });
      }
      // Check if email already in use by another user
      const emailUser = await dbGet('SELECT id FROM users WHERE email = ? AND id != ?', [normalizedEmail, userId]);
      if (emailUser) {
        return res.status(400).json({ error: 'Email is already in use' });
      }
      updateFields.push('email = ?');
      params.push(normalizedEmail);
    }

    if (password !== undefined && password !== '') {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      updateFields.push('password_hash = ?');
      params.push(password_hash);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(userId); // for WHERE id = ?

    const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await dbRun(sql, params);

    const updatedUser = await dbGet('SELECT id, name, email FROM users WHERE id = ?', [userId]);
    const token = jwt.sign({ id: updatedUser.id, name: updatedUser.name, email: updatedUser.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: updatedUser });
  } catch (err) {
    console.error('Error updating user profile:', err);
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
    const { question, answer, category } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }
    const result = await dbRun(
      'INSERT INTO qa_pairs (user_id, question, answer, category) VALUES (?, ?, ?, ?)',
      [req.user.id, question, answer, category || null]
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
  const category = url.searchParams.get('category') || 'career';
  const isResume = url.searchParams.get('isResume') === 'true';
  const lastQuestion = url.searchParams.get('lastQuestion') || '';

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

  geminiWs.on('open', async () => {
    ws.send(JSON.stringify({ type: 'proxy_status', status: 'connected' }));

    // Load configuration dynamically from YAML
    let config = {};
    try {
      const configPath = path.join(__dirname, '../model_config.yaml');
      const fileContents = fs.readFileSync(configPath, 'utf8');
      config = yaml.load(fileContents);
    } catch (err) {
      console.error('Error loading model_config.yaml, using defaults:', err);
    }

    const model = config.model || 'models/gemini-3.1-flash-live-preview';

    // Resolve category-specific settings
    let categoryConfig = {};
    if (config.categories && config.categories[category]) {
      categoryConfig = config.categories[category];
    } else {
      console.warn(`Category "${category}" not found in config, using first available category.`);
      const firstCategoryKey = config.categories ? Object.keys(config.categories)[0] : null;
      if (firstCategoryKey) {
        categoryConfig = config.categories[firstCategoryKey];
      }
    }

    // Clone global generation configuration
    const generationConfig = JSON.parse(JSON.stringify(config.generationConfig || { responseModalities: ['AUDIO'] }));

    // Apply track-specific voice model configuration if available
    const activeVoice = categoryConfig.voiceName || 
      (generationConfig.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName) || 
      "Aoede";

    if (!generationConfig.speechConfig) generationConfig.speechConfig = {};
    if (!generationConfig.speechConfig.voiceConfig) generationConfig.speechConfig.voiceConfig = {};
    if (!generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig) {
      generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig = {};
    }
    generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName = activeVoice;

    let systemInstructionText = '';
    if (categoryConfig.systemInstruction && categoryConfig.systemInstruction.parts && categoryConfig.systemInstruction.parts[0]) {
      systemInstructionText = categoryConfig.systemInstruction.parts[0].text;
    } else {
      systemInstructionText = 'You are a warm, conversational AI interviewer.';
    }

    // Fetch user details & QA pairs
    let userName = 'User';
    let qaPairs = [];
    try {
      const userRow = await dbGet('SELECT name FROM users WHERE id = ?', [userId]);
      userName = userRow ? userRow.name : 'User';
      qaPairs = await dbAll('SELECT question, answer, category FROM qa_pairs WHERE user_id = ?', [userId]);
    } catch (dbErr) {
      console.error('Error querying database during WebSocket initialization:', dbErr);
    }

    const sessionPrompts = config.sessionPrompts || {};
    const getPrompt = (type, key, defaultValue) => {
      return (sessionPrompts[type] && sessionPrompts[type][key]) !== undefined
        ? sessionPrompts[type][key]
        : defaultValue;
    };

    const formatCategory = category.replace('_', ' ');

    let triggerMsg;
    if (isResume) {
      const defaultSysInst = "Your instructions for Resuming:\n1. Do NOT start a new conversation, welcome the user, or introduce yourself. You are resuming an active conversation that was briefly paused.\n2. Say a brief transition (like \"Let's continue...\" or \"Picking up where we left off...\") and repeat your last question to get the user's response: \"{lastQuestion}\". Do not ask a new question yet; wait for the user to answer this question.";
      const defaultTrigger = 'I am ready to resume. Please state that we are continuing, and repeat your last question to get my response: "{lastQuestion}".';

      const sysInstTemplate = getPrompt('resume', 'systemInstruction', defaultSysInst);
      const triggerTemplate = getPrompt('resume', 'triggerMessage', defaultTrigger);

      const sysInst = sysInstTemplate.replace(/{lastQuestion}/g, lastQuestion);
      const triggerText = triggerTemplate.replace(/{lastQuestion}/g, lastQuestion);

      systemInstructionText += `\n\n${sysInst}`;

      triggerMsg = {
        clientContent: {
          turns: [
            {
              role: 'user',
              parts: [{ text: triggerText }]
            }
          ],
          turnComplete: true
        }
      };
    } else if (qaPairs && qaPairs.length > 0) {
      const defaultHeader = "\n\nHere is what you already know about the user {userName}:\n";
      const defaultSysInst = "Your instructions:\n1. Greet {userName} warmly.\n2. Acknowledge and briefly summarize some of the key things you already know about them in relation to the current interview category ({category}).\n3. Ask a mixture of follow-up questions referencing this existing knowledge to go deeper, and new open-ended questions in this category to go wider.";
      const defaultTrigger = "Please start the interview now. Welcome me by name ({userName}), mention what you already know about me from our past chats, and ask the first question.";

      const headerTemplate = getPrompt('returningUser', 'knowledgeHeader', defaultHeader);
      const sysInstTemplate = getPrompt('returningUser', 'systemInstruction', defaultSysInst);
      const triggerTemplate = getPrompt('returningUser', 'triggerMessage', defaultTrigger);

      // Split into current category and other categories
      const currentCategoryPairs = qaPairs.filter(pair => {
        const cat = pair.category || 'career';
        return cat === category;
      });

      const otherCategoryPairs = qaPairs.filter(pair => {
        const cat = pair.category || 'career';
        return cat !== category;
      });

      let knowledgeText = '';
      if (currentCategoryPairs.length > 0) {
        knowledgeText += headerTemplate.replace(/{userName}/g, userName);
        currentCategoryPairs.forEach((pair) => {
          knowledgeText += `- Question: "${pair.question}"\n  Answer: "${pair.answer}"\n`;
        });
      }

      if (otherCategoryPairs.length > 0) {
        knowledgeText += `\n\nWe also have general knowledge from other interview categories:\n`;
        const groupedOther = {};
        otherCategoryPairs.forEach(pair => {
          const catKey = pair.category || 'career';
          if (!groupedOther[catKey]) groupedOther[catKey] = [];
          groupedOther[catKey].push(`- Q: "${pair.question}" | A: "${pair.answer}"`);
        });
        for (const [cat, lines] of Object.entries(groupedOther)) {
          knowledgeText += `Category [${cat.replace('_', ' ')}]:\n${lines.join('\n')}\n`;
        }
      }

      const sysInst = sysInstTemplate
        .replace(/{userName}/g, userName)
        .replace(/{category}/g, formatCategory);
      
      const triggerText = triggerTemplate.replace(/{userName}/g, userName);

      systemInstructionText += `${knowledgeText}\n${sysInst}`;

      triggerMsg = {
        clientContent: {
          turns: [
            {
              role: 'user',
              parts: [{ text: triggerText }]
            }
          ],
          turnComplete: true
        }
      };
    } else {
      const defaultSysInst = "Your instructions:\n1. Greet the user warmly. Welcome them to Interview.ai and introduce the application. Explain that Interview.ai is a platform designed to conduct high-fidelity voice interviews to preserve their stories, wisdom, and life experiences, which will ultimately be used to fine-tune a personalized AI replica that authentically imitates them.\n2. Tell them you would love to get to know them and ask for their name.";
      const defaultTrigger = "Please start the interview now. Welcome me, introduce Interview.ai, and ask for my name.";

      const sysInst = getPrompt('newUser', 'systemInstruction', defaultSysInst);
      const triggerText = getPrompt('newUser', 'triggerMessage', defaultTrigger);

      systemInstructionText += `\n\n${sysInst}`;

      triggerMsg = {
        clientContent: {
          turns: [
            {
              role: 'user',
              parts: [{ text: triggerText }]
            }
          ],
          turnComplete: true
        }
      };
    }

    const systemInstruction = {
      parts: [{ text: systemInstructionText }]
    };

    const setupMsg = {
      setup: {
        model,
        generationConfig,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction
      }
    };
    geminiWs.send(JSON.stringify(setupMsg));

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
