// server.js - Express server for the dashboard
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to serve leaderboard data
app.get('/api/leaderboard-data', (req, res) => {
  const dataPath = '/app/data/leaderboard_data.json';
  
  try {
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf-8');
      res.json(JSON.parse(data));
    } else {
      res.json({
        tweets: [],
        lastFetch: new Date().toISOString(),
        leaderboards: []
      });
    }
  } catch (error) {
    console.error('Error reading leaderboard data:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Dashboard server running on port ${PORT}`);
});