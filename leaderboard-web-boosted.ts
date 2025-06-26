import { Agent } from '@openserv-labs/sdk';
import TelegramBot from 'node-telegram-bot-api';
import { subDays, subMinutes } from 'date-fns';
import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import 'dotenv/config';

// Type definitions
interface Tweet {
  id: string;
  username: string;
  follower_count: number;
  created_at: string;
  likes: number;
  retweets: number;
  text: string;
  url: string;
}

interface UserStats {
  username: string;
  totalScore: number;
  tweetCount: number;
  avgLikes: number;
  avgRetweets: number;
  topTweet: Tweet;
  lastActive: string;
}

interface LeaderboardData {
  week: string;
  users: UserStats[];
  totalTweets: number;
  mostViralTweet: Tweet;
}

interface StorageData {
  tweets: Tweet[];
  lastFetch: string;
  leaderboards: LeaderboardData[];
}

interface TwitterResponse {
  data?: any[];
  includes?: {
    users?: any[];
  };
  meta?: {
    next_token?: string;
  };
}

const CONFIG = {
  OPENSERV_API_KEY: process.env.OPENSERV_API_KEY || '',
  WORKSPACE_ID: parseInt(process.env.WORKSPACE_ID || '0', 10),
  TWITTER_INTEGRATION_ID: process.env.TWITTER_INTEGRATION_ID || 'twitter-v2',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  DATA_DIR: process.env.DATA_DIR || './data',
  WEB_PORT: parseInt(process.env.PORT || '3000', 10), // Railway uses PORT env var
  WEB_ENABLED: process.env.WEB_ENABLED !== 'false', // Enable web server by default
};

// Validate required environment variables
if (!CONFIG.OPENSERV_API_KEY || !CONFIG.WORKSPACE_ID || !CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Create data directory if it doesn't exist
if (!fs.existsSync(CONFIG.DATA_DIR)) {
  fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
}

const twitterAgent = new Agent({
  systemPrompt: 'You are a Twitter integration agent for fetching OpenServ mentions and building community leaderboards.',
  apiKey: CONFIG.OPENSERV_API_KEY,
});

const telegramBot = new TelegramBot(CONFIG.TELEGRAM_BOT_TOKEN, { 
  polling: { interval: 1000, autoStart: true, params: { timeout: 10 } }
});

// Express app for web interface
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Type guard function to check if a tweet is valid
function isValidTweet(tweet: any): tweet is Tweet {
  return tweet && 
         typeof tweet === 'object' && 
         typeof tweet.id === 'string' && 
         typeof tweet.username === 'string' && 
         tweet.username !== 'unknown' && 
         tweet.username !== '';
}

class DataStorage {
  private filePath: string;

  constructor() {
    this.filePath = path.join(CONFIG.DATA_DIR, 'leaderboard_data.json');
  }

  load(): StorageData {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        return data as StorageData;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    return { tweets: [], lastFetch: new Date(0).toISOString(), leaderboards: [] };
  }

  save(data: StorageData): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  getWeeklyTweets(weekOffset: number = 0): Tweet[] {
    const data = this.load();
    const now = new Date();
    const weekStart = subDays(now, 7 + (weekOffset * 7));
    const weekEnd = subDays(now, weekOffset * 7);
    
    return data.tweets.filter(tweet => {
      const tweetDate = new Date(tweet.created_at);
      return tweetDate >= weekStart && tweetDate < weekEnd;
    });
  }
}

const storage = new DataStorage();

function safeNumber(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

function getWeekKey(date: Date = new Date()): string {
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay());
  return weekStart.toISOString().split('T')[0] || '';
}

async function fetchTwitterMentions(startTime: string, endTime: string, maxResults: number = 100): Promise<Tweet[]> {
  let allTweets: any[] = [];
  let allUsers: any[] = [];
  let nextToken: string | undefined;
  const maxPages = 10;
  let pageCount = 0;

  try {
    do {
      pageCount++;
      console.log(`Fetching page ${pageCount}...`);

      const searchQuery = encodeURIComponent('("OpenServ" OR "@OpenServAI" OR "#OpenServ" OR "openserv.ai") -is:retweet');
      const tweetFields = encodeURIComponent('created_at,public_metrics,author_id,text');
      const expansions = encodeURIComponent('author_id');
      const userFields = encodeURIComponent('username,public_metrics');

      let endpoint = `/2/tweets/search/recent?query=${searchQuery}&start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}&max_results=${maxResults}&sort_order=recency&tweet.fields=${tweetFields}&expansions=${expansions}&user.fields=${userFields}`;

      if (nextToken) endpoint += `&next_token=${encodeURIComponent(nextToken)}`;

      const response = await twitterAgent.callIntegration({
        workspaceId: CONFIG.WORKSPACE_ID,
        integrationId: CONFIG.TWITTER_INTEGRATION_ID,
        details: { endpoint, method: 'GET' },
      });

      const responseData: TwitterResponse = typeof response.output === 'string' ? JSON.parse(response.output) : response.output;

      if (responseData.data && Array.isArray(responseData.data)) allTweets.push(...responseData.data);
      if (responseData.includes?.users && Array.isArray(responseData.includes.users)) allUsers.push(...responseData.includes.users);

      nextToken = responseData.meta?.next_token;
      if (nextToken && pageCount < maxPages) await new Promise(r => setTimeout(r, 2000));
    } while (nextToken && pageCount < maxPages);

    console.log(`Found ${allTweets.length} tweets and ${allUsers.length} users`);

    const processedTweets: Tweet[] = allTweets.map(tweet => {
      const author = allUsers.find(user => user.id === tweet.author_id);
      return {
        id: tweet.id,
        username: author?.username || 'unknown',
        follower_count: safeNumber(author?.public_metrics?.follower_count),
        created_at: tweet.created_at,
        likes: safeNumber(tweet.public_metrics?.like_count),
        retweets: safeNumber(tweet.public_metrics?.retweet_count),
        text: tweet.text || '',
        url: `https://twitter.com/${author?.username}/status/${tweet.id}`
      };
    });

    return processedTweets.filter(tweet => tweet.username !== 'unknown');
  } catch (error) {
    console.error('Error fetching tweets:', error);
    return [];
  }
}

async function fetchAllMentionsHistorical(): Promise<void> {
  console.log('🔄 Running fetchAllMentionsHistorical...');
  
  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const startTime = sevenDaysAgo.toISOString();
  const endTime = new Date(now.getTime() - 30 * 1000).toISOString();

  const tweets = await fetchTwitterMentions(startTime, endTime);
  const data = storage.load();
  const existingIds = new Set(data.tweets.map(t => t.id));
  const newTweets = tweets.filter(t => !existingIds.has(t.id));
  
  data.tweets.push(...newTweets);
  data.lastFetch = new Date().toISOString();
  storage.save(data);
  console.log(`✅ Fetched ${newTweets.length} new tweets`);
  
  if (newTweets.length > 0) {
    console.log('📊 Auto-generating leaderboard...');
    await scoreAndStore();
  }
}

async function fetchLatestMentionsLive(): Promise<void> {
  console.log('🔄 Running fetchLatestMentionsLive...');
  
  const data = storage.load();
  const lastFetch = new Date(data.lastFetch);
  const now = new Date();
  const thirtyMinutesAgo = subMinutes(now, 30);
  
  const startTime = lastFetch > thirtyMinutesAgo ? lastFetch.toISOString() : thirtyMinutesAgo.toISOString();
  const endTime = new Date(now.getTime() - 30 * 1000).toISOString();

  const tweets = await fetchTwitterMentions(startTime, endTime, 50);
  const existingIds = new Set(data.tweets.map(t => t.id));
  const newTweets = tweets.filter(t => !existingIds.has(t.id));
  
  data.tweets.push(...newTweets);
  data.lastFetch = new Date().toISOString();
  storage.save(data);
  console.log(`✅ Live fetch: ${newTweets.length} new tweets`);
  
  if (newTweets.length > 0) await scoreAndStore();
}

function calculateUserScore(userTweets: Tweet[], previousWeekUsers: string[]): number {
  const sortedTweets = [...userTweets].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  let totalScore = 0;
  const username = userTweets[0]?.username;

  for (let i = 0; i < sortedTweets.length; i++) {
    const tweet = sortedTweets[i];
    if (!tweet) continue;

    const impactScore = (tweet.follower_count * 0.001) + tweet.likes + (tweet.retweets * 2);
    const freshnessMultiplier = i === 0 ? 3 : i === 1 ? 2 : 1;
    const decayFactor = i === 0 ? 1 : i === 1 ? 0.5 : 0.25;
    
    totalScore += impactScore * freshnessMultiplier * decayFactor;
  }

  const consistencyMultiplier = username && previousWeekUsers.includes(username) ? 1.25 : 1;
  return totalScore * consistencyMultiplier;
}

async function scoreAndStore(): Promise<void> {
  console.log('📊 Running scoreAndStore...');
  
  const currentWeekTweets = storage.getWeeklyTweets(0);
  const previousWeekTweets = storage.getWeeklyTweets(1);
  
  if (currentWeekTweets.length === 0) {
    console.log('No tweets found for current week');
    return;
  }

  const tweetsByUser: Record<string, Tweet[]> = {};
  
  // Filter valid tweets and group by user
  currentWeekTweets
    .filter(isValidTweet)
    .forEach(tweet => {
      if (!tweetsByUser[tweet.username]) {
        tweetsByUser[tweet.username] = [];
      }
      tweetsByUser[tweet.username]!.push(tweet);
    });

  const previousWeekUsers = [...new Set(previousWeekTweets.map(t => t.username))];

  const userStats: UserStats[] = Object.entries(tweetsByUser)
    .map(([username, tweets]) => {
      if (!tweets || tweets.length === 0) return null;
      
      const score = calculateUserScore(tweets, previousWeekUsers);
      const avgLikes = tweets.reduce((sum, t) => sum + t.likes, 0) / tweets.length;
      const avgRetweets = tweets.reduce((sum, t) => sum + t.retweets, 0) / tweets.length;
      const topTweet = tweets.reduce((best, current) => 
        (current.likes + current.retweets * 2) > (best.likes + best.retweets * 2) ? current : best
      );

      return {
        username,
        totalScore: score,
        tweetCount: tweets.length,
        avgLikes,
        avgRetweets,
        topTweet,
        lastActive: tweets[0]?.created_at || new Date().toISOString()
      };
    })
    .filter((stat): stat is UserStats => stat !== null && stat.totalScore > 0);

  userStats.sort((a, b) => b.totalScore - a.totalScore);

  let mostViralTweet: Tweet;
  if (currentWeekTweets.length > 0) {
    mostViralTweet = currentWeekTweets.reduce((best, current) => 
      (current.likes + current.retweets * 2) > (best.likes + best.retweets * 2) ? current : best
    );
  } else {
    mostViralTweet = {
      id: 'dummy', 
      username: 'none', 
      follower_count: 0, 
      created_at: new Date().toISOString(),
      likes: 0, 
      retweets: 0, 
      text: 'No tweets this week', 
      url: ''
    };
  }

  const leaderboardData: LeaderboardData = {
    week: getWeekKey(),
    users: userStats,
    totalTweets: currentWeekTweets.length,
    mostViralTweet
  };

  const data = storage.load();
  const existingIndex = data.leaderboards.findIndex(lb => lb.week === leaderboardData.week);
  if (existingIndex >= 0) {
    data.leaderboards[existingIndex] = leaderboardData;
  } else {
    data.leaderboards.push(leaderboardData);
  }
  
  data.leaderboards = data.leaderboards.slice(-8); // Keep last 8 weeks
  storage.save(data);
  console.log(`✅ Scored ${userStats.length} users for week ${getWeekKey()}`);
}

async function generateSimpleLeaderboard(): Promise<void> {
  console.log('📊 Generating simple leaderboard...');
  
  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const tweets = await fetchTwitterMentions(sevenDaysAgo.toISOString(), new Date(now.getTime() - 30 * 1000).toISOString());
  
  if (tweets.length === 0) {
    await telegramBot.sendMessage(CONFIG.TELEGRAM_CHAT_ID, '🏆 Weekly OpenServ Leaderboard\n\nNo OpenServ mentions found this week!');
    return;
  }

  const tweetsByUser: Record<string, Tweet[]> = {};
  
  tweets
    .filter(isValidTweet)
    .forEach(tweet => {
      if (!tweetsByUser[tweet.username]) {
        tweetsByUser[tweet.username] = [];
      }
      tweetsByUser[tweet.username]!.push(tweet);
    });

  const userScores: Record<string, number> = {};
  Object.entries(tweetsByUser).forEach(([username, userTweets]) => {
    if (!userTweets || userTweets.length === 0) return;
    
    let totalScore = 0;
    userTweets.forEach((tweet, index) => {
      const impactScore = (tweet.follower_count * 0.001) + tweet.likes + (tweet.retweets * 2);
      const freshnessMultiplier = index === 0 ? 3 : index === 1 ? 2 : 1;
      const decayFactor = index === 0 ? 1 : index === 1 ? 0.5 : 0.25;
      totalScore += impactScore * freshnessMultiplier * decayFactor;
    });
    
    userScores[username] = totalScore;
  });

  const leaderboard = Object.entries(userScores)
    .filter(([_, score]) => !isNaN(score) && score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([username, score], index) => `#${index + 1} @${username} — ${score.toFixed(1)} pts`)
    .join('\n');

  const message = leaderboard ? `🏆 Weekly OpenServ Leaderboard\n\n${leaderboard}` : '🏆 Weekly OpenServ Leaderboard\n\nNo valid scores found this week!';
  await telegramBot.sendMessage(CONFIG.TELEGRAM_CHAT_ID, message);
  console.log('✅ Simple leaderboard posted to Telegram!');
}

async function sendLeaderboardToTelegram(): Promise<void> {
  console.log('📱 Sending weekly leaderboard to Telegram...');
  
  const data = storage.load();
  const currentWeek = getWeekKey();
  const leaderboard = data.leaderboards.find(lb => lb.week === currentWeek);
  
  if (!leaderboard || leaderboard.users.length === 0) {
    console.log('No leaderboard data found, generating simple leaderboard...');
    await generateSimpleLeaderboard();
    return;
  }

  const top10 = leaderboard.users.slice(0, 10);
  const leaderboardText = top10.map((user, index) => `#${index + 1} @${user.username} — ${user.totalScore.toFixed(1)} pts`).join('\n');
  const viralText = leaderboard.mostViralTweet.username !== 'none' 
    ? `\n\n🔥 Most Viral: @${leaderboard.mostViralTweet.username} (${leaderboard.mostViralTweet.likes + leaderboard.mostViralTweet.retweets * 2} engagement)`
    : '';

  const message = `🏆 Weekly OpenServ Leaderboard\n\n${leaderboardText}${viralText}\n\nKeep tweeting about OpenServ to climb the board! 🚀`;
  await telegramBot.sendMessage(CONFIG.TELEGRAM_CHAT_ID, message);
  console.log('✅ Leaderboard posted to Telegram!');
}

// Web API endpoints
app.get('/api/leaderboard', (req, res) => {
  try {
    const data = storage.load();
    const currentWeek = getWeekKey();
    const leaderboard = data.leaderboards.find(lb => lb.week === currentWeek);
    
    if (!leaderboard) {
      res.json({
        week: currentWeek,
        users: [],
        totalTweets: 0,
        mostViralTweet: null,
        lastFetch: data.lastFetch
      });
      return;
    }
    
    res.json({
      ...leaderboard,
      lastFetch: data.lastFetch
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/analytics', (req, res) => {
  try {
    const data = storage.load();
    const currentWeek = getWeekKey();
    const leaderboard = data.leaderboards.find(lb => lb.week === currentWeek);
    
    if (!leaderboard) {
      res.json({
        activeUsers: 0,
        totalTweets: 0,
        avgScore: 0,
        mostViralScore: 0,
        weeklyGrowth: 0
      });
      return;
    }
    
    const avgScore = leaderboard.users.length > 0 
      ? leaderboard.users.reduce((sum, u) => sum + u.totalScore, 0) / leaderboard.users.length 
      : 0;
    
    const mostViralScore = leaderboard.mostViralTweet 
      ? leaderboard.mostViralTweet.likes + leaderboard.mostViralTweet.retweets * 2 
      : 0;
    
    // Calculate weekly growth
    const previousWeekData = data.leaderboards.find(lb => lb.week !== currentWeek);
    const weeklyGrowth = previousWeekData 
      ? ((leaderboard.users.length - previousWeekData.users.length) / previousWeekData.users.length) * 100 
      : 0;
    
    res.json({
      activeUsers: leaderboard.users.length,
      totalTweets: leaderboard.totalTweets,
      avgScore: Math.round(avgScore * 10) / 10,
      mostViralScore,
      weeklyGrowth: Math.round(weeklyGrowth * 10) / 10
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/refresh', async (req, res) => {
  try {
    await fetchAllMentionsHistorical();
    await scoreAndStore();
    res.json({ success: true, message: 'Leaderboard refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing leaderboard:', error);
    res.status(500).json({ error: 'Failed to refresh leaderboard' });
  }
});

// Serve the React app
app.get('/', (req, res) => {
  res.send(getHTMLTemplate());
});

function getHTMLTemplate(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenServ Leaderboard</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        'mono': ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace']
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-black text-green-400 font-mono">
    <div id="root"></div>
    
    <script type="text/babel">
        const { useState, useEffect } = React;
        
        // Lucide icons as inline SVG
        const Trophy = ({ className = "w-6 h-6" }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 22.1C6.264 22.1 5 20.836 5 19.265V5.5C5 4.119 6.119 3 7.5 3h9c1.381 0 2.5 1.119 2.5 2.5v13.765c0 1.571-1.264 2.835-2.835 2.835z" />
            </svg>
        );
        
        const Users = ({ className = "w-6 h-6" }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
        );
        
        const MessageCircle = ({ className = "w-6 h-6" }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        );
        
        const Heart = ({ className = "w-6 h-6" }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        );
        
        const Repeat2 = ({ className = "w-6 h-6" }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        );
        
        const TrendingUp = ({ className = "w-6 h-6" }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
        );
        
        const ExternalLink = ({ className = "w-6 h-6" }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
        );
        
        const Award = ({ className = "w-6 h-6" }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 22.1C6.264 22.1 5 20.836 5 19.265V5.5C5 4.119 6.119 3 7.5 3h9c1.381 0 2.5 1.119 2.5 2.5v13.765c0 1.571-1.264 2.835-2.835 2.835z" />
            </svg>
        );
        
        const Flame = ({ className = "w-6 h-6" }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 1-4 4-4 1.657 1.657 3 4 3 4s1.343-1.343 1.657-1.657z" />
            </svg>
        );
        
        const BarChart3 = ({ className = "w-6 h-6" }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        );
        
        const RefreshCw = ({ className = "w-6 h-6" }) => (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        );

        const App = () => {
            const [leaderboard, setLeaderboard] = useState(null);
            const [analytics, setAnalytics] = useState(null);
            const [loading, setLoading] = useState(true);
            const [refreshing, setRefreshing] = useState(false);
            const [error, setError] = useState(null);

            const fetchData = async () => {
                try {
                    setError(null);
                    const [leaderboardRes, analyticsRes] = await Promise.all([
                        fetch('/api/leaderboard'),
                        fetch('/api/analytics')
                    ]);
                    
                    if (!leaderboardRes.ok || !analyticsRes.ok) {
                        throw new Error('Failed to fetch data');
                    }
                    
                    const leaderboardData = await leaderboardRes.json();
                    const analyticsData = await analyticsRes.json();
                    
                    setLeaderboard(leaderboardData);
                    setAnalytics(analyticsData);
                } catch (err) {
                    setError(err.message);
                    console.error('Error fetching data:', err);
                } finally {
                    setLoading(false);
                }
            };

            const handleRefresh = async () => {
                setRefreshing(true);
                try {
                    const response = await fetch('/api/refresh', { method: 'POST' });
                    if (!response.ok) throw new Error('Failed to refresh');
                    await fetchData();
                } catch (err) {
                    setError(err.message);
                } finally {
                    setRefreshing(false);
                }
            };

            useEffect(() => {
                fetchData();
                const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
                return () => clearInterval(interval);
            }, []);

            const formatDate = (dateStr) => {
                return new Date(dateStr).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                });
            };

            const getRankIcon = (rank) => {
                switch (rank) {
                    case 1: return '🥇';
                    case 2: return '🥈';
                    case 3: return '🥉';
                    default: return `#${rank}`;
                }
            };

            if (loading) {
                return (
                    <div className="min-h-screen bg-black flex items-center justify-center">
                        <div className="text-green-400 text-xl animate-pulse">Loading leaderboard...</div>
                    </div>
                );
            }

            if (error) {
                return (
                    <div className="min-h-screen bg-black flex items-center justify-center">
                        <div className="text-red-400 text-xl">Error: {error}</div>
                    </div>
                );
            }

            return (
                <div className="min-h-screen bg-black text-green-400">
                    {/* Header */}
                    <div className="border-b border-green-800 bg-gray-900">
                        <div className="max-w-6xl mx-auto px-4 py-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Trophy className="w-8 h-8 text-yellow-400" />
                                    <div>
                                        <h1 className="text-3xl font-bold text-green-400">OpenServ Leaderboard</h1>
                                        <p className="text-green-600">Community Twitter Champions</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleRefresh}
                                    disabled={refreshing}
                                    className="flex items-center space-x-2 px-4 py-2 bg-green-800 hover:bg-green-700 disabled:opacity-50 rounded border border-green-600 transition-colors"
                                >
                                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                    <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-6xl mx-auto px-4 py-8">
                        {/* Analytics Cards */}
                        {analytics && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                <div className="bg-gray-900 border border-green-800 rounded-lg p-4">
                                    <div className="flex items-center space-x-3">
                                        <Users className="w-6 h-6 text-blue-400" />
                                        <div>
                                            <p className="text-green-600 text-sm">Active Users</p>
                                            <p className="text-2xl font-bold">{analytics.activeUsers}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-900 border border-green-800 rounded-lg p-4">
                                    <div className="flex items-center space-x-3">
                                        <MessageCircle className="w-6 h-6 text-green-400" />
                                        <div>
                                            <p className="text-green-600 text-sm">Total Tweets</p>
                                            <p className="text-2xl font-bold">{analytics.totalTweets}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-900 border border-green-800 rounded-lg p-4">
                                    <div className="flex items-center space-x-3">
                                        <BarChart3 className="w-6 h-6 text-purple-400" />
                                        <div>
                                            <p className="text-green-600 text-sm">Avg Score</p>
                                            <p className="text-2xl font-bold">{analytics.avgScore}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-900 border border-green-800 rounded-lg p-4">
                                    <div className="flex items-center space-x-3">
                                        <Flame className="w-6 h-6 text-orange-400" />
                                        <div>
                                            <p className="text-green-600 text-sm">Most Viral</p>
                                            <p className="text-2xl font-bold">{analytics.mostViralScore}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Current Week */}
                        <div className="mb-8">
                            <div className="flex items-center space-x-3 mb-4">
                                <Award className="w-6 h-6 text-yellow-400" />
                                <h2 className="text-2xl font-bold">Current Week</h2>
                                {leaderboard?.week && (
                                    <span className="text-green-600">Week of {formatDate(leaderboard.week)}</span>
                                )}
                            </div>

                            {leaderboard?.users?.length > 0 ? (
                                <div className="bg-gray-900 border border-green-800 rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-800 border-b border-green-800">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Rank</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">User</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Score</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Tweets</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Avg Likes</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Avg RTs</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase tracking-wider">Top Tweet</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-green-800">
                                                {leaderboard.users.map((user, index) => (
                                                    <tr key={user.username} className="hover:bg-gray-800 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <span className="text-2xl mr-2">{getRankIcon(index + 1)}</span>
                                                                <span className="text-green-400 font-mono">#{index + 1}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="text-sm font-medium text-green-400">@{user.username}</div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-green-300 font-mono">{Math.round(user.totalScore * 10) / 10}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-green-300">{user.tweetCount}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center text-sm text-green-300">
                                                                <Heart className="w-4 h-4 mr-1 text-red-400" />
                                                                {Math.round(user.avgLikes * 10) / 10}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center text-sm text-green-300">
                                                                <Repeat2 className="w-4 h-4 mr-1 text-blue-400" />
                                                                {Math.round(user.avgRetweets * 10) / 10}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            {user.topTweet && user.topTweet.url ? (
                                                                <a
                                                                    href={user.topTweet.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center text-sm text-green-400 hover:text-green-300 transition-colors"
                                                                >
                                                                    <span className="mr-2">
                                                                        {user.topTweet.likes + user.topTweet.retweets * 2} engagement
                                                                    </span>
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </a>
                                                            ) : (
                                                                <span className="text-sm text-green-600">N/A</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-900 border border-green-800 rounded-lg p-8 text-center">
                                    <Trophy className="w-12 h-12 text-green-600 mx-auto mb-4" />
                                    <p className="text-green-400 text-lg">No tweets found this week</p>
                                    <p className="text-green-600">Start tweeting about OpenServ to appear on the leaderboard!</p>
                                </div>
                            )}
                        </div>

                        {/* Most Viral Tweet */}
                        {leaderboard?.mostViralTweet && leaderboard.mostViralTweet.username !== 'none' && (
                            <div className="mb-8">
                                <div className="flex items-center space-x-3 mb-4">
                                    <Flame className="w-6 h-6 text-orange-400" />
                                    <h2 className="text-2xl font-bold">Most Viral Tweet</h2>
                                </div>
                                <div className="bg-gray-900 border border-green-800 rounded-lg p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="text-green-400 font-medium">@{leaderboard.mostViralTweet.username}</div>
                                            <div className="text-green-600 text-sm">
                                                {formatDate(leaderboard.mostViralTweet.created_at)}
                                            </div>
                                        </div>
                                        <a
                                            href={leaderboard.mostViralTweet.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-400 hover:text-green-300 transition-colors"
                                        >
                                            <ExternalLink className="w-5 h-5" />
                                        </a>
                                    </div>
                                    <p className="text-green-300 mb-4 leading-relaxed">{leaderboard.mostViralTweet.text}</p>
                                    <div className="flex items-center space-x-6 text-sm">
                                        <div className="flex items-center space-x-2 text-red-400">
                                            <Heart className="w-4 h-4" />
                                            <span>{leaderboard.mostViralTweet.likes}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-blue-400">
                                            <Repeat2 className="w-4 h-4" />
                                            <span>{leaderboard.mostViralTweet.retweets}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-green-400">
                                            <TrendingUp className="w-4 h-4" />
                                            <span>{leaderboard.mostViralTweet.likes + leaderboard.mostViralTweet.retweets * 2} total engagement</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="text-center text-green-600 border-t border-green-800 pt-8">
                            <p>Keep tweeting about OpenServ to climb the leaderboard! 🚀</p>
                            <p className="text-sm mt-2">
                                Last updated: {leaderboard?.lastFetch ? formatDate(leaderboard.lastFetch) : 'Never'}
                            </p>
                        </div>
                    </div>
                </div>
            );
        };

        ReactDOM.render(<App />, document.getElementById('root'));
    </script>
</body>
</html>
  `;
}

// Error handlers and initialization
telegramBot.on('error', (error: Error) => console.error('❌ Telegram bot error:', error));
telegramBot.on('polling_error', (error: Error) => console.error('❌ Telegram polling error:', error));

// Initialize bot
telegramBot.getMe().then(botInfo => {
  console.log(`✅ Telegram bot connected: @${botInfo.username}`);
}).catch((error: Error) => {
  console.error('❌ Failed to connect to Telegram bot:', error);
  process.exit(1);
});

// Start web server if enabled
if (CONFIG.WEB_ENABLED) {
  app.listen(CONFIG.WEB_PORT, () => {
    console.log(`🌐 Web server running on port ${CONFIG.WEB_PORT}`);
    console.log(`📱 Telegram bot polling enabled`);
  });
} else {
  console.log('📱 Telegram bot running in polling mode only');
}

// Command handlers (your existing telegram commands remain the same)
telegramBot.onText(/\/start/, async (msg) => {
  const welcomeMessage = `🚀 Welcome to OpenServ Leaderboard Bot!

Available commands:
📊 /leaderboard - View current weekly rankings
👤 /myxp @username - Check user stats
📈 /analytics - View weekly analytics
🔄 /fetch - Manually fetch latest tweets
🧪 /test - Run bot diagnostics
🆘 /help - Show this help message

Keep tweeting about OpenServ to climb the leaderboard! 🏆`;
  
  await telegramBot.sendMessage(msg.chat.id, welcomeMessage);
});

telegramBot.onText(/\/help/, async (msg) => {
  const helpMessage = `🆘 OpenServ Leaderboard Bot Help

Commands:
📊 /leaderboard - Current weekly rankings
👤 /myxp @username - User stats (e.g., /myxp satoshi_dev)
📈 /analytics - Weekly analytics
🔄 /fetch - Manually fetch and score tweets
🧪 /test - Bot diagnostics
🚀 /start - Welcome message

How it works:
• Tweet about OpenServ, @OpenServAI, or use #OpenServ
• Scores are calculated based on engagement and timing
• Leaderboard updates weekly

Need help? Contact the OpenServ team!`;
  
  await telegramBot.sendMessage(msg.chat.id, helpMessage);
});

telegramBot.onText(/\/fetch/, async (msg) => {
  try {
    await telegramBot.sendMessage(msg.chat.id, '🔄 Fetching latest tweets and generating leaderboard...');
    await fetchAllMentionsHistorical();
    await scoreAndStore();
    await telegramBot.sendMessage(msg.chat.id, '✅ Fetch completed! Use /leaderboard to see results.');
  } catch (error) {
    console.error('Error in /fetch command:', error);
    await telegramBot.sendMessage(msg.chat.id, '❌ Error fetching tweets. Please try again.');
  }
});

telegramBot.onText(/\/myxp(?:\s+@?(\w+))?/, async (msg, match) => {
  try {
    const requestedUser = match?.[1];
    if (!requestedUser) {
      await telegramBot.sendMessage(msg.chat.id, '📝 Usage: /myxp @username\nExample: /myxp satoshi_dev');
      return;
    }

    const data = storage.load();
    const leaderboard = data.leaderboards.find(lb => lb.week === getWeekKey());
    
    if (!leaderboard) {
      await telegramBot.sendMessage(msg.chat.id, '📊 No leaderboard data available. Try /fetch first.');
      return;
    }

    const userStats = leaderboard.users.find(u => u.username.toLowerCase() === requestedUser.toLowerCase());
    
    if (!userStats) {
      await telegramBot.sendMessage(msg.chat.id, `🔍 @${requestedUser} hasn't posted about OpenServ this week.`);
      return;
    }

    const rank = leaderboard.users.findIndex(u => u.username.toLowerCase() === requestedUser.toLowerCase()) + 1;
    
    const message = `📊 Stats for @${userStats.username}:
    
🏆 Rank: #${rank}
⭐ Score: ${userStats.totalScore.toFixed(1)} pts
📝 Tweets: ${userStats.tweetCount}
❤️ Avg Likes: ${userStats.avgLikes.toFixed(1)}
🔄 Avg Retweets: ${userStats.avgRetweets.toFixed(1)}
🔥 Top Tweet: ${userStats.topTweet.likes + userStats.topTweet.retweets * 2} engagement`;

    await telegramBot.sendMessage(msg.chat.id, message);
  } catch (error) {
    console.error('Error in /myxp command:', error);
    await telegramBot.sendMessage(msg.chat.id, '❌ Error retrieving user stats. Please try again.');
  }
});

telegramBot.onText(/\/leaderboard/, async (msg) => {
  try {
    const data = storage.load();
    const leaderboard = data.leaderboards.find(lb => lb.week === getWeekKey());
    
    if (!leaderboard || leaderboard.users.length === 0) {
      await telegramBot.sendMessage(msg.chat.id, '🔄 No leaderboard data found. Generating fresh leaderboard...');
      await generateSimpleLeaderboard();
      return;
    }

    const top10 = leaderboard.users.slice(0, 10);
    const leaderboardText = top10.map((user, index) => `#${index + 1} @${user.username} — ${user.totalScore.toFixed(1)} pts`).join('\n');
    const message = `🏆 Current Weekly Leaderboard\n\n${leaderboardText}\n\n📅 Week: ${getWeekKey()}`;
    await telegramBot.sendMessage(msg.chat.id, message);
  } catch (error) {
    console.error('Error in /leaderboard command:', error);
    await telegramBot.sendMessage(msg.chat.id, '❌ Error retrieving leaderboard. Please try again.');
  }
});

telegramBot.onText(/\/analytics/, async (msg) => {
  try {
    const data = storage.load();
    const leaderboard = data.leaderboards.find(lb => lb.week === getWeekKey());
    
    if (!leaderboard) {
      await telegramBot.sendMessage(msg.chat.id, '📈 No analytics data available. Try /fetch first.');
      return;
    }

    const totalUsers = leaderboard.users.length;
    const avgScore = totalUsers > 0 ? leaderboard.users.reduce((sum, u) => sum + u.totalScore, 0) / totalUsers : 0;

    const prevWeek = data.leaderboards.find(lb => lb.week !== getWeekKey());
    let fastestRiser = 'N/A';
    if (prevWeek) {
      for (const user of leaderboard.users.slice(0, 5)) {
        const prevRank = prevWeek.users.findIndex(u => u.username === user.username);
        const currentRank = leaderboard.users.findIndex(u => u.username === user.username);
        if (prevRank > currentRank && prevRank >= 0) {
          fastestRiser = `@${user.username} (↑${prevRank - currentRank})`;
          break;
        }
      }
    }

    const message = `📈 Weekly Analytics:

👥 Active Users: ${totalUsers}
📝 Total Tweets: ${leaderboard.totalTweets}
💯 Avg Score: ${avgScore.toFixed(1)}
🚀 Fastest Riser: ${fastestRiser}
🔥 Most Viral: @${leaderboard.mostViralTweet.username}
📅 Week: ${getWeekKey()}`;

    await telegramBot.sendMessage(msg.chat.id, message);
  } catch (error) {
    console.error('Error in /analytics command:', error);
    await telegramBot.sendMessage(msg.chat.id, '❌ Error retrieving analytics. Please try again.');
  }
});

telegramBot.onText(/\/test/, async (msg) => {
  try {
    const data = storage.load();
    const testMessage = `🧪 Bot Test Results:

✅ Bot is running
✅ Commands are working
🕐 Current time: ${new Date().toLocaleString()}
📁 Data directory: ${CONFIG.DATA_DIR}
📊 Stored tweets: ${data.tweets.length}
📈 Stored leaderboards: ${data.leaderboards.length}
🎯 Environment: ${process.env.NODE_ENV || 'development'}`;

    await telegramBot.sendMessage(msg.chat.id, testMessage);
  } catch (error) {
    console.error('Error in /test command:', error);
    await telegramBot.sendMessage(msg.chat.id, '❌ Error running test. Please check logs.');
  }
});

// Export functions for external use
export { 
  fetchAllMentionsHistorical, 
  fetchLatestMentionsLive, 
  scoreAndStore, 
  sendLeaderboardToTelegram 
};