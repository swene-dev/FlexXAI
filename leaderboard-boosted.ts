import { Agent } from '@openserv-labs/sdk';
import TelegramBot from 'node-telegram-bot-api';
import { subDays, subMinutes } from 'date-fns';
import fs from 'fs';
import path from 'path';
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