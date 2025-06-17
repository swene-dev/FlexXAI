import { Agent } from '@openserv-labs/sdk';
import TelegramBot from 'node-telegram-bot-api';
import { subDays } from 'date-fns';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// Configuration
const CONFIG = {
  OPENSERV_API_KEY: process.env.OPENSERV_API_KEY || '',
  WORKSPACE_ID: parseInt(process.env.WORKSPACE_ID || '0', 10),
  TWITTER_INTEGRATION_ID: process.env.TWITTER_INTEGRATION_ID || 'twitter-v2',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
};

// Validate configuration
if (!CONFIG.OPENSERV_API_KEY || !CONFIG.WORKSPACE_ID || !CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) {
  console.error('❌ Missing required environment variables. Please set OPENSERV_API_KEY, WORKSPACE_ID, TELEGRAM_BOT_TOKEN, and TELEGRAM_CHAT_ID in .env');
  process.exit(1);
}

// Initialize OpenServ agent
const twitterAgent = new Agent({
  systemPrompt: 'You are a Twitter integration agent for fetching OpenServ mentions.',
  apiKey: CONFIG.OPENSERV_API_KEY,
});

// Initialize Telegram bot
const telegramBot = new TelegramBot(CONFIG.TELEGRAM_BOT_TOKEN, { polling: false });

// Define interfaces
interface Tweet {
  username: string;
  follower_count: number;
  created_at: string;
  likes: number;
  retweets: number;
}

interface TwitterUser {
  id: string;
  username: string;
  public_metrics: {
    follower_count: number;
  };
}

interface TwitterTweet {
  id: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
  };
}

interface TwitterResponse {
  data?: TwitterTweet[];
  includes?: {
    users?: TwitterUser[];
  };
  meta?: {
    next_token?: string;
  };
}

interface IntegrationResponse {
  output: string | TwitterResponse;
}

// Utility function to safely convert to number
function safeNumber(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

// Fetch X posts from the last 7 days
async function fetchWeeklyMentions(): Promise<Tweet[]> {
  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const startTime = sevenDaysAgo.toISOString();
  const endTime = new Date(now.getTime() - 30 * 1000).toISOString();

  let allTweets: TwitterTweet[] = [];
  let allUsers: TwitterUser[] = [];
  let nextToken: string | undefined;
  const maxPages = 10;
  let pageCount = 0;

  try {
    do {
      pageCount++;
      console.log(`Fetching page ${pageCount}...`);

      const searchQuery = encodeURIComponent('("OpenServ" OR "@OpenServAI" OR "#OpenServ" OR "openserv.ai") -is:retweet');
      const tweetFields = encodeURIComponent('created_at,public_metrics,author_id');
      const expansions = encodeURIComponent('author_id');
      const userFields = encodeURIComponent('username,public_metrics');

      let endpoint = `/2/tweets/search/recent?query=${searchQuery}&start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}&max_results=100&sort_order=recency&tweet.fields=${tweetFields}&expansions=${expansions}&user.fields=${userFields}`;

      if (nextToken) {
        endpoint += `&next_token=${encodeURIComponent(nextToken)}`;
      }

      const response: IntegrationResponse = await twitterAgent.callIntegration({
        workspaceId: CONFIG.WORKSPACE_ID,
        integrationId: CONFIG.TWITTER_INTEGRATION_ID,
        details: { endpoint, method: 'GET' },
      });

      const responseData: TwitterResponse = typeof response.output === 'string' 
        ? JSON.parse(response.output) 
        : response.output;

      if (responseData.data && Array.isArray(responseData.data)) {
        allTweets.push(...responseData.data);
      }
      if (responseData.includes?.users && Array.isArray(responseData.includes.users)) {
        allUsers.push(...responseData.includes.users);
      }

      nextToken = responseData.meta?.next_token;
      if (nextToken && pageCount < maxPages) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } while (nextToken && pageCount < maxPages);

    console.log(`Found ${allTweets.length} tweets and ${allUsers.length} users`);

    const processedTweets: Tweet[] = allTweets.map((tweet) => {
      const author = allUsers.find((user) => user.id === tweet.author_id);
      if (!author) {
        console.warn(`Author not found for tweet ${tweet.id}`);
        return {
          username: 'unknown',
          follower_count: 0,
          created_at: tweet.created_at,
          likes: safeNumber(tweet.public_metrics?.like_count),
          retweets: safeNumber(tweet.public_metrics?.retweet_count),
        };
      }

      const processedTweet = {
        username: author.username,
        follower_count: safeNumber(author.public_metrics?.follower_count),
        created_at: tweet.created_at,
        likes: safeNumber(tweet.public_metrics?.like_count),
        retweets: safeNumber(tweet.public_metrics?.retweet_count),
      };

      // Debug log for first few tweets
      if (allTweets.indexOf(tweet) < 3) {
        console.log(`Tweet ${tweet.id} by @${processedTweet.username}:`, {
          followers: processedTweet.follower_count,
          likes: processedTweet.likes,
          retweets: processedTweet.retweets
        });
      }

      return processedTweet;
    });

    return processedTweets;
  } catch (error) {
    console.error('Error fetching tweets:', error);
    return [];
  }
}

// Generate and post the leaderboard
async function generateLeaderboard(): Promise<void> {
  console.log('Starting leaderboard generation...');

  try {
    const tweets = await fetchWeeklyMentions();
    if (!tweets.length) {
      const message = '🏆 Weekly OpenServ Leaderboard\n\nNo OpenServ mentions found this week!';
      await telegramBot.sendMessage(CONFIG.TELEGRAM_CHAT_ID, message);
      console.log('No tweets found, message posted to Telegram.');
      return;
    }

    const tweetsByUser: { [username: string]: Tweet[] } = {};
    for (const tweet of tweets) {
      if (!tweet.username || tweet.username === 'unknown') {
        console.warn('Tweet missing username:', tweet);
        continue;
      }
      if (!tweetsByUser[tweet.username]) {
        tweetsByUser[tweet.username] = [];
      }
      tweetsByUser[tweet.username]!.push(tweet);
    }

    // Sort tweets by date for each user
    Object.keys(tweetsByUser).forEach((username) => {
      const userTweets = tweetsByUser[username];
      if (userTweets) {
        userTweets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    });

    // Load previous week users
    let previousWeekUsers: string[] = [];
    const prevWeekFile = path.join(__dirname, 'previous_week_users.json');
    try {
      if (fs.existsSync(prevWeekFile)) {
        const fileContent = fs.readFileSync(prevWeekFile, 'utf-8');
        previousWeekUsers = JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('Error loading previous week users:', error);
    }

    // Calculate user scores
    const userScores: { [username: string]: number } = {};
    Object.keys(tweetsByUser).forEach((username) => {
      const tweetsForUser = tweetsByUser[username];
      if (!tweetsForUser) return;
      
      let totalScore = 0;

      for (let i = 0; i < tweetsForUser.length; i++) {
        const tweet = tweetsForUser[i];
        if (!tweet) continue;
        
        // Ensure all values are numbers
        const followerCount = safeNumber(tweet.follower_count);
        const likes = safeNumber(tweet.likes);
        const retweets = safeNumber(tweet.retweets);
        
        const impactScore = (followerCount * 0.001) + likes + (retweets * 2);
        const freshnessMultiplier = i === 0 ? 3 : i === 1 ? 2 : 1;
        const decayFactor = i === 0 ? 1 : i === 1 ? 0.5 : 0.25;
        const tweetScore = impactScore * freshnessMultiplier * decayFactor;
        
        totalScore += tweetScore;

        // Debug log for first user's first tweet
        if (Object.keys(tweetsByUser).indexOf(username) === 0 && i === 0) {
          console.log(`Score calculation for @${username}:`, {
            followerCount,
            likes,
            retweets,
            impactScore,
            freshnessMultiplier,
            decayFactor,
            tweetScore,
            totalScore
          });
        }
      }

      // Apply bonus for returning users
      const finalScore = previousWeekUsers.includes(username) ? totalScore * 1.25 : totalScore;
      userScores[username] = finalScore;

      // Debug log
      if (Object.keys(tweetsByUser).indexOf(username) < 3) {
        console.log(`Final score for @${username}: ${finalScore} (${tweetsForUser.length} tweets)`);
      }
    });

    // Check if we have valid scores
    const validScores = Object.values(userScores).filter(score => !isNaN(score) && score > 0);
    if (validScores.length === 0) {
      console.error('No valid scores calculated! All scores are NaN or 0');
      console.log('User scores:', userScores);
      await telegramBot.sendMessage(CONFIG.TELEGRAM_CHAT_ID, '❌ Error: No valid scores could be calculated. Please check the data.');
      return;
    }

    // Generate leaderboard
    const leaderboard = Object.entries(userScores)
      .filter(([_, score]) => !isNaN(score) && score > 0) // Filter out NaN and 0 scores
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([username, score], index) => `#${index + 1} @${username} — ${score.toFixed(1)} pts`)
      .join('\n');

    if (!leaderboard) {
      const message = '🏆 Weekly OpenServ Leaderboard\n\nNo valid scores found this week!';
      await telegramBot.sendMessage(CONFIG.TELEGRAM_CHAT_ID, message);
      console.log('No valid scores found, message posted to Telegram.');
      return;
    }

    const message = `🏆 Weekly OpenServ Leaderboard\n\n${leaderboard}`;
    await telegramBot.sendMessage(CONFIG.TELEGRAM_CHAT_ID, message);
    console.log('Leaderboard posted to Telegram!');

    // Save current week users
    const currentWeekUsers = Object.keys(tweetsByUser);
    try {
      fs.writeFileSync(prevWeekFile, JSON.stringify(currentWeekUsers, null, 2));
      console.log('Saved current week users.');
    } catch (error) {
      console.error('Error saving current week users:', error);
    }
  } catch (error) {
    console.error('Error generating leaderboard:', error);
    await telegramBot.sendMessage(CONFIG.TELEGRAM_CHAT_ID, '❌ Error generating leaderboard. Please try again later.');
  }
}

// Run the script
if (process.argv[1] && process.argv[1].includes('openserv') || process.argv0 === 'node') {
  generateLeaderboard();
}