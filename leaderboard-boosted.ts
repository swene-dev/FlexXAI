import { Agent } from '@openserv-labs/sdk';
import TelegramBot from 'node-telegram-bot-api';
import { subDays, subMinutes } from 'date-fns';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
// For TypeScript + node-fetch v2 compatibility
// @ts-ignore
import fetch from 'node-fetch';

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

// Type guard function to check if a tweet is valid
function isValidTweet(tweet: any): tweet is Tweet {
  return tweet && 
         typeof tweet === 'object' && 
         typeof tweet.id === 'string' && 
         typeof tweet.username === 'string' && 
         tweet.username !== 'unknown' && 
         tweet.username !== '';
}

const API_BASE_URL = process.env.LEADERBOARD_API_URL || 'http://localhost:3000/api';

// Helper functions to call the API
async function getLeaderboard() {
  const res = await fetch(`${API_BASE_URL}/leaderboard`);
  const json = await res.json();
  return json.data;
}

async function getUserStats(username: string) {
  const res = await fetch(`${API_BASE_URL}/user/${encodeURIComponent(username)}`);
  const json = await res.json();
  return json.data;
}

async function getAnalytics() {
  const res = await fetch(`${API_BASE_URL}/analytics`);
  const json = await res.json();
  return json.data;
}

async function triggerFetch() {
  const res = await fetch(`${API_BASE_URL}/fetch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'historical' }) });
  const json = await res.json();
  return json.data;
}

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

// Error handlers
telegramBot.on('error', (error: Error) => console.error('❌ Telegram bot error:', error));
telegramBot.on('polling_error', (error: Error) => console.error('❌ Telegram polling error:', error));

// Initialize bot
telegramBot.getMe().then(botInfo => {
  console.log(`✅ Telegram bot connected: @${botInfo.username}`);
}).catch((error: Error) => {
  console.error('❌ Failed to connect to Telegram bot:', error);
  process.exit(1);
});

// Command handlers
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
    await triggerFetch();
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
    const userStats = await getUserStats(requestedUser);
    if (!userStats) {
      await telegramBot.sendMessage(msg.chat.id, `🔍 @${requestedUser} hasn't posted about OpenServ this week.`);
      return;
    }
    const message = `📊 Stats for @${userStats.username}:
\n🏆 Rank: #${userStats.rank}\n⭐ Score: ${userStats.totalScore.toFixed(1)} pts\n📝 Tweets: ${userStats.tweetCount}\n❤️ Avg Likes: ${userStats.avgLikes.toFixed(1)}\n🔄 Avg Retweets: ${userStats.avgRetweets.toFixed(1)}\n🔥 Top Tweet: ${userStats.topTweet.likes + userStats.topTweet.retweets * 2} engagement`;
    await telegramBot.sendMessage(msg.chat.id, message);
  } catch (error) {
    console.error('Error in /myxp command:', error);
    await telegramBot.sendMessage(msg.chat.id, '❌ Error retrieving user stats. Please try again.');
  }
});

telegramBot.onText(/\/leaderboard/, async (msg) => {
  try {
    const leaderboard = await getLeaderboard();
    if (!leaderboard || leaderboard.users.length === 0) {
      await telegramBot.sendMessage(msg.chat.id, '🔄 No leaderboard data found.');
      return;
    }
    const top10 = leaderboard.users.slice(0, 10);
    const leaderboardText = top10.map((user: any, index: number) => `#${index + 1} @${user.username} — ${user.totalScore.toFixed(1)} pts`).join('\n');
    const message = `🏆 Current Weekly Leaderboard\n\n${leaderboardText}\n\n📅 Week: ${leaderboard.week}`;
    await telegramBot.sendMessage(msg.chat.id, message);
  } catch (error) {
    console.error('Error in /leaderboard command:', error);
    await telegramBot.sendMessage(msg.chat.id, '❌ Error retrieving leaderboard. Please try again.');
  }
});

telegramBot.onText(/\/analytics/, async (msg) => {
  try {
    const analytics = await getAnalytics();
    if (!analytics) {
      await telegramBot.sendMessage(msg.chat.id, '📈 No analytics data available. Try /fetch first.');
      return;
    }
    const message = `📈 Weekly Analytics:
\n👥 Active Users: ${analytics.totalUsers}\n📝 Total Tweets: ${analytics.totalTweets}\n💯 Avg Score: ${analytics.avgScore}\n🚀 Fastest Riser: ${analytics.fastestRiser ? analytics.fastestRiser.username : 'N/A'}\n🔥 Most Viral: @${analytics.mostViralTweet?.username}\n📅 Week: ${analytics.week}`;
    await telegramBot.sendMessage(msg.chat.id, message);
  } catch (error) {
    console.error('Error in /analytics command:', error);
    await telegramBot.sendMessage(msg.chat.id, '❌ Error retrieving analytics. Please try again.');
  }
});

telegramBot.onText(/\/test/, async (msg) => {
  try {
    const leaderboard = await getLeaderboard();
    const testMessage = `🧪 Bot Test Results:

✅ Bot is running
✅ Commands are working
🕐 Current time: ${new Date().toLocaleString()}
📊 Stored tweets: ${leaderboard?.totalTweets ?? 0}
📈 Stored leaderboards: ${leaderboard ? 1 : 0}
🎯 Environment: ${process.env.NODE_ENV || 'development'}`;
    await telegramBot.sendMessage(msg.chat.id, testMessage);
  } catch (error) {
    console.error('Error in /test command:', error);
    await telegramBot.sendMessage(msg.chat.id, '❌ Error running test. Please check logs.');
  }
});