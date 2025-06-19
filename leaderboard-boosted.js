"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAllMentionsHistorical = fetchAllMentionsHistorical;
exports.fetchLatestMentionsLive = fetchLatestMentionsLive;
exports.scoreAndStore = scoreAndStore;
exports.sendLeaderboardToTelegram = sendLeaderboardToTelegram;
var sdk_1 = require("@openserv-labs/sdk");
var node_telegram_bot_api_1 = require("node-telegram-bot-api");
var date_fns_1 = require("date-fns");
var fs = require("fs");
var path = require("path");
require("dotenv/config");
var CONFIG = {
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
var twitterAgent = new sdk_1.Agent({
    systemPrompt: 'You are a Twitter integration agent for fetching OpenServ mentions and building community leaderboards.',
    apiKey: CONFIG.OPENSERV_API_KEY,
});
var telegramBot = new node_telegram_bot_api_1.default(CONFIG.TELEGRAM_BOT_TOKEN, {
    polling: { interval: 1000, autoStart: true, params: { timeout: 10 } }
});
// Type guard function to check if a tweet is valid
function isValidTweet(tweet) {
    return tweet &&
        typeof tweet === 'object' &&
        typeof tweet.id === 'string' &&
        typeof tweet.username === 'string' &&
        tweet.username !== 'unknown' &&
        tweet.username !== '';
}
var DataStorage = /** @class */ (function () {
    function DataStorage() {
        this.filePath = path.join(CONFIG.DATA_DIR, 'leaderboard_data.json');
    }
    DataStorage.prototype.load = function () {
        try {
            if (fs.existsSync(this.filePath)) {
                var data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
                return data;
            }
        }
        catch (error) {
            console.error('Error loading data:', error);
        }
        return { tweets: [], lastFetch: new Date(0).toISOString(), leaderboards: [] };
    };
    DataStorage.prototype.save = function (data) {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
        }
        catch (error) {
            console.error('Error saving data:', error);
        }
    };
    DataStorage.prototype.getWeeklyTweets = function (weekOffset) {
        if (weekOffset === void 0) { weekOffset = 0; }
        var data = this.load();
        var now = new Date();
        var weekStart = (0, date_fns_1.subDays)(now, 7 + (weekOffset * 7));
        var weekEnd = (0, date_fns_1.subDays)(now, weekOffset * 7);
        return data.tweets.filter(function (tweet) {
            var tweetDate = new Date(tweet.created_at);
            return tweetDate >= weekStart && tweetDate < weekEnd;
        });
    };
    return DataStorage;
}());
var storage = new DataStorage();
function safeNumber(value, defaultValue) {
    if (defaultValue === void 0) { defaultValue = 0; }
    if (value === null || value === undefined)
        return defaultValue;
    var num = Number(value);
    return isNaN(num) ? defaultValue : num;
}
function getWeekKey(date) {
    if (date === void 0) { date = new Date(); }
    var weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return weekStart.toISOString().split('T')[0] || '';
}
function fetchTwitterMentions(startTime_1, endTime_1) {
    return __awaiter(this, arguments, void 0, function (startTime, endTime, maxResults) {
        var allTweets, allUsers, nextToken, maxPages, pageCount, searchQuery, tweetFields, expansions, userFields, endpoint, response, responseData, processedTweets, error_1;
        var _a, _b;
        if (maxResults === void 0) { maxResults = 100; }
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    allTweets = [];
                    allUsers = [];
                    maxPages = 10;
                    pageCount = 0;
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 7, , 8]);
                    _c.label = 2;
                case 2:
                    pageCount++;
                    console.log("Fetching page ".concat(pageCount, "..."));
                    searchQuery = encodeURIComponent('("OpenServ" OR "@OpenServAI" OR "#OpenServ" OR "openserv.ai") -is:retweet');
                    tweetFields = encodeURIComponent('created_at,public_metrics,author_id,text');
                    expansions = encodeURIComponent('author_id');
                    userFields = encodeURIComponent('username,public_metrics');
                    endpoint = "/2/tweets/search/recent?query=".concat(searchQuery, "&start_time=").concat(encodeURIComponent(startTime), "&end_time=").concat(encodeURIComponent(endTime), "&max_results=").concat(maxResults, "&sort_order=recency&tweet.fields=").concat(tweetFields, "&expansions=").concat(expansions, "&user.fields=").concat(userFields);
                    if (nextToken)
                        endpoint += "&next_token=".concat(encodeURIComponent(nextToken));
                    return [4 /*yield*/, twitterAgent.callIntegration({
                            workspaceId: CONFIG.WORKSPACE_ID,
                            integrationId: CONFIG.TWITTER_INTEGRATION_ID,
                            details: { endpoint: endpoint, method: 'GET' },
                        })];
                case 3:
                    response = _c.sent();
                    responseData = typeof response.output === 'string' ? JSON.parse(response.output) : response.output;
                    if (responseData.data && Array.isArray(responseData.data))
                        allTweets.push.apply(allTweets, responseData.data);
                    if (((_a = responseData.includes) === null || _a === void 0 ? void 0 : _a.users) && Array.isArray(responseData.includes.users))
                        allUsers.push.apply(allUsers, responseData.includes.users);
                    nextToken = (_b = responseData.meta) === null || _b === void 0 ? void 0 : _b.next_token;
                    if (!(nextToken && pageCount < maxPages)) return [3 /*break*/, 5];
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 2000); })];
                case 4:
                    _c.sent();
                    _c.label = 5;
                case 5:
                    if (nextToken && pageCount < maxPages) return [3 /*break*/, 2];
                    _c.label = 6;
                case 6:
                    console.log("Found ".concat(allTweets.length, " tweets and ").concat(allUsers.length, " users"));
                    processedTweets = allTweets.map(function (tweet) {
                        var _a, _b, _c;
                        var author = allUsers.find(function (user) { return user.id === tweet.author_id; });
                        return {
                            id: tweet.id,
                            username: (author === null || author === void 0 ? void 0 : author.username) || 'unknown',
                            follower_count: safeNumber((_a = author === null || author === void 0 ? void 0 : author.public_metrics) === null || _a === void 0 ? void 0 : _a.follower_count),
                            created_at: tweet.created_at,
                            likes: safeNumber((_b = tweet.public_metrics) === null || _b === void 0 ? void 0 : _b.like_count),
                            retweets: safeNumber((_c = tweet.public_metrics) === null || _c === void 0 ? void 0 : _c.retweet_count),
                            text: tweet.text || '',
                            url: "https://twitter.com/".concat(author === null || author === void 0 ? void 0 : author.username, "/status/").concat(tweet.id)
                        };
                    });
                    return [2 /*return*/, processedTweets.filter(function (tweet) { return tweet.username !== 'unknown'; })];
                case 7:
                    error_1 = _c.sent();
                    console.error('Error fetching tweets:', error_1);
                    return [2 /*return*/, []];
                case 8: return [2 /*return*/];
            }
        });
    });
}
function fetchAllMentionsHistorical() {
    return __awaiter(this, void 0, void 0, function () {
        var now, sevenDaysAgo, startTime, endTime, tweets, data, existingIds, newTweets;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('🔄 Running fetchAllMentionsHistorical...');
                    now = new Date();
                    sevenDaysAgo = (0, date_fns_1.subDays)(now, 7);
                    startTime = sevenDaysAgo.toISOString();
                    endTime = new Date(now.getTime() - 30 * 1000).toISOString();
                    return [4 /*yield*/, fetchTwitterMentions(startTime, endTime)];
                case 1:
                    tweets = _b.sent();
                    data = storage.load();
                    existingIds = new Set(data.tweets.map(function (t) { return t.id; }));
                    newTweets = tweets.filter(function (t) { return !existingIds.has(t.id); });
                    (_a = data.tweets).push.apply(_a, newTweets);
                    data.lastFetch = new Date().toISOString();
                    storage.save(data);
                    console.log("\u2705 Fetched ".concat(newTweets.length, " new tweets"));
                    if (!(newTweets.length > 0)) return [3 /*break*/, 3];
                    console.log('📊 Auto-generating leaderboard...');
                    return [4 /*yield*/, scoreAndStore()];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function fetchLatestMentionsLive() {
    return __awaiter(this, void 0, void 0, function () {
        var data, lastFetch, now, thirtyMinutesAgo, startTime, endTime, tweets, existingIds, newTweets;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('🔄 Running fetchLatestMentionsLive...');
                    data = storage.load();
                    lastFetch = new Date(data.lastFetch);
                    now = new Date();
                    thirtyMinutesAgo = (0, date_fns_1.subMinutes)(now, 30);
                    startTime = lastFetch > thirtyMinutesAgo ? lastFetch.toISOString() : thirtyMinutesAgo.toISOString();
                    endTime = new Date(now.getTime() - 30 * 1000).toISOString();
                    return [4 /*yield*/, fetchTwitterMentions(startTime, endTime, 50)];
                case 1:
                    tweets = _b.sent();
                    existingIds = new Set(data.tweets.map(function (t) { return t.id; }));
                    newTweets = tweets.filter(function (t) { return !existingIds.has(t.id); });
                    (_a = data.tweets).push.apply(_a, newTweets);
                    data.lastFetch = new Date().toISOString();
                    storage.save(data);
                    console.log("\u2705 Live fetch: ".concat(newTweets.length, " new tweets"));
                    if (!(newTweets.length > 0)) return [3 /*break*/, 3];
                    return [4 /*yield*/, scoreAndStore()];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function calculateUserScore(userTweets, previousWeekUsers) {
    var _a;
    var sortedTweets = __spreadArray([], userTweets, true).sort(function (a, b) { return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); });
    var totalScore = 0;
    var username = (_a = userTweets[0]) === null || _a === void 0 ? void 0 : _a.username;
    for (var i = 0; i < sortedTweets.length; i++) {
        var tweet = sortedTweets[i];
        if (!tweet)
            continue;
        var impactScore = (tweet.follower_count * 0.001) + tweet.likes + (tweet.retweets * 2);
        var freshnessMultiplier = i === 0 ? 3 : i === 1 ? 2 : 1;
        var decayFactor = i === 0 ? 1 : i === 1 ? 0.5 : 0.25;
        totalScore += impactScore * freshnessMultiplier * decayFactor;
    }
    var consistencyMultiplier = username && previousWeekUsers.includes(username) ? 1.25 : 1;
    return totalScore * consistencyMultiplier;
}
function scoreAndStore() {
    return __awaiter(this, void 0, void 0, function () {
        var currentWeekTweets, previousWeekTweets, tweetsByUser, previousWeekUsers, userStats, mostViralTweet, leaderboardData, data, existingIndex;
        return __generator(this, function (_a) {
            console.log('📊 Running scoreAndStore...');
            currentWeekTweets = storage.getWeeklyTweets(0);
            previousWeekTweets = storage.getWeeklyTweets(1);
            if (currentWeekTweets.length === 0) {
                console.log('No tweets found for current week');
                return [2 /*return*/];
            }
            tweetsByUser = {};
            // Filter valid tweets and group by user
            currentWeekTweets
                .filter(isValidTweet)
                .forEach(function (tweet) {
                if (!tweetsByUser[tweet.username]) {
                    tweetsByUser[tweet.username] = [];
                }
                tweetsByUser[tweet.username].push(tweet);
            });
            previousWeekUsers = __spreadArray([], new Set(previousWeekTweets.map(function (t) { return t.username; })), true);
            userStats = Object.entries(tweetsByUser)
                .map(function (_a) {
                var _b;
                var username = _a[0], tweets = _a[1];
                if (!tweets || tweets.length === 0)
                    return null;
                var score = calculateUserScore(tweets, previousWeekUsers);
                var avgLikes = tweets.reduce(function (sum, t) { return sum + t.likes; }, 0) / tweets.length;
                var avgRetweets = tweets.reduce(function (sum, t) { return sum + t.retweets; }, 0) / tweets.length;
                var topTweet = tweets.reduce(function (best, current) {
                    return (current.likes + current.retweets * 2) > (best.likes + best.retweets * 2) ? current : best;
                });
                return {
                    username: username,
                    totalScore: score,
                    tweetCount: tweets.length,
                    avgLikes: avgLikes,
                    avgRetweets: avgRetweets,
                    topTweet: topTweet,
                    lastActive: ((_b = tweets[0]) === null || _b === void 0 ? void 0 : _b.created_at) || new Date().toISOString()
                };
            })
                .filter(function (stat) { return stat !== null && stat.totalScore > 0; });
            userStats.sort(function (a, b) { return b.totalScore - a.totalScore; });
            if (currentWeekTweets.length > 0) {
                mostViralTweet = currentWeekTweets.reduce(function (best, current) {
                    return (current.likes + current.retweets * 2) > (best.likes + best.retweets * 2) ? current : best;
                });
            }
            else {
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
            leaderboardData = {
                week: getWeekKey(),
                users: userStats,
                totalTweets: currentWeekTweets.length,
                mostViralTweet: mostViralTweet
            };
            data = storage.load();
            existingIndex = data.leaderboards.findIndex(function (lb) { return lb.week === leaderboardData.week; });
            if (existingIndex >= 0) {
                data.leaderboards[existingIndex] = leaderboardData;
            }
            else {
                data.leaderboards.push(leaderboardData);
            }
            data.leaderboards = data.leaderboards.slice(-8); // Keep last 8 weeks
            storage.save(data);
            console.log("\u2705 Scored ".concat(userStats.length, " users for week ").concat(getWeekKey()));
            return [2 /*return*/];
        });
    });
}
function generateSimpleLeaderboard() {
    return __awaiter(this, void 0, void 0, function () {
        var now, sevenDaysAgo, tweets, tweetsByUser, userScores, leaderboard, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('📊 Generating simple leaderboard...');
                    now = new Date();
                    sevenDaysAgo = (0, date_fns_1.subDays)(now, 7);
                    return [4 /*yield*/, fetchTwitterMentions(sevenDaysAgo.toISOString(), new Date(now.getTime() - 30 * 1000).toISOString())];
                case 1:
                    tweets = _a.sent();
                    if (!(tweets.length === 0)) return [3 /*break*/, 3];
                    return [4 /*yield*/, telegramBot.sendMessage(CONFIG.TELEGRAM_CHAT_ID, '🏆 Weekly OpenServ Leaderboard\n\nNo OpenServ mentions found this week!')];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
                case 3:
                    tweetsByUser = {};
                    tweets
                        .filter(isValidTweet)
                        .forEach(function (tweet) {
                        if (!tweetsByUser[tweet.username]) {
                            tweetsByUser[tweet.username] = [];
                        }
                        tweetsByUser[tweet.username].push(tweet);
                    });
                    userScores = {};
                    Object.entries(tweetsByUser).forEach(function (_a) {
                        var username = _a[0], userTweets = _a[1];
                        if (!userTweets || userTweets.length === 0)
                            return;
                        var totalScore = 0;
                        userTweets.forEach(function (tweet, index) {
                            var impactScore = (tweet.follower_count * 0.001) + tweet.likes + (tweet.retweets * 2);
                            var freshnessMultiplier = index === 0 ? 3 : index === 1 ? 2 : 1;
                            var decayFactor = index === 0 ? 1 : index === 1 ? 0.5 : 0.25;
                            totalScore += impactScore * freshnessMultiplier * decayFactor;
                        });
                        userScores[username] = totalScore;
                    });
                    leaderboard = Object.entries(userScores)
                        .filter(function (_a) {
                        var _ = _a[0], score = _a[1];
                        return !isNaN(score) && score > 0;
                    })
                        .sort(function (a, b) { return b[1] - a[1]; })
                        .slice(0, 10)
                        .map(function (_a, index) {
                        var username = _a[0], score = _a[1];
                        return "#".concat(index + 1, " @").concat(username, " \u2014 ").concat(score.toFixed(1), " pts");
                    })
                        .join('\n');
                    message = leaderboard ? "\uD83C\uDFC6 Weekly OpenServ Leaderboard\n\n".concat(leaderboard) : '🏆 Weekly OpenServ Leaderboard\n\nNo valid scores found this week!';
                    return [4 /*yield*/, telegramBot.sendMessage(CONFIG.TELEGRAM_CHAT_ID, message)];
                case 4:
                    _a.sent();
                    console.log('✅ Simple leaderboard posted to Telegram!');
                    return [2 /*return*/];
            }
        });
    });
}
function sendLeaderboardToTelegram() {
    return __awaiter(this, void 0, void 0, function () {
        var data, currentWeek, leaderboard, top10, leaderboardText, viralText, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('📱 Sending weekly leaderboard to Telegram...');
                    data = storage.load();
                    currentWeek = getWeekKey();
                    leaderboard = data.leaderboards.find(function (lb) { return lb.week === currentWeek; });
                    if (!(!leaderboard || leaderboard.users.length === 0)) return [3 /*break*/, 2];
                    console.log('No leaderboard data found, generating simple leaderboard...');
                    return [4 /*yield*/, generateSimpleLeaderboard()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
                case 2:
                    top10 = leaderboard.users.slice(0, 10);
                    leaderboardText = top10.map(function (user, index) { return "#".concat(index + 1, " @").concat(user.username, " \u2014 ").concat(user.totalScore.toFixed(1), " pts"); }).join('\n');
                    viralText = leaderboard.mostViralTweet.username !== 'none'
                        ? "\n\n\uD83D\uDD25 Most Viral: @".concat(leaderboard.mostViralTweet.username, " (").concat(leaderboard.mostViralTweet.likes + leaderboard.mostViralTweet.retweets * 2, " engagement)")
                        : '';
                    message = "\uD83C\uDFC6 Weekly OpenServ Leaderboard\n\n".concat(leaderboardText).concat(viralText, "\n\nKeep tweeting about OpenServ to climb the board! \uD83D\uDE80");
                    return [4 /*yield*/, telegramBot.sendMessage(CONFIG.TELEGRAM_CHAT_ID, message)];
                case 3:
                    _a.sent();
                    console.log('✅ Leaderboard posted to Telegram!');
                    return [2 /*return*/];
            }
        });
    });
}
// Error handlers
telegramBot.on('error', function (error) { return console.error('❌ Telegram bot error:', error); });
telegramBot.on('polling_error', function (error) { return console.error('❌ Telegram polling error:', error); });
// Initialize bot
telegramBot.getMe().then(function (botInfo) {
    console.log("\u2705 Telegram bot connected: @".concat(botInfo.username));
}).catch(function (error) {
    console.error('❌ Failed to connect to Telegram bot:', error);
    process.exit(1);
});
// Command handlers
telegramBot.onText(/\/start/, function (msg) { return __awaiter(void 0, void 0, void 0, function () {
    var welcomeMessage;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                welcomeMessage = "\uD83D\uDE80 Welcome to OpenServ Leaderboard Bot!\n\nAvailable commands:\n\uD83D\uDCCA /leaderboard - View current weekly rankings\n\uD83D\uDC64 /myxp @username - Check user stats\n\uD83D\uDCC8 /analytics - View weekly analytics\n\uD83D\uDD04 /fetch - Manually fetch latest tweets\n\uD83E\uDDEA /test - Run bot diagnostics\n\uD83C\uDD98 /help - Show this help message\n\nKeep tweeting about OpenServ to climb the leaderboard! \uD83C\uDFC6";
                return [4 /*yield*/, telegramBot.sendMessage(msg.chat.id, welcomeMessage)];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
telegramBot.onText(/\/help/, function (msg) { return __awaiter(void 0, void 0, void 0, function () {
    var helpMessage;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                helpMessage = "\uD83C\uDD98 OpenServ Leaderboard Bot Help\n\nCommands:\n\uD83D\uDCCA /leaderboard - Current weekly rankings\n\uD83D\uDC64 /myxp @username - User stats (e.g., /myxp satoshi_dev)\n\uD83D\uDCC8 /analytics - Weekly analytics\n\uD83D\uDD04 /fetch - Manually fetch and score tweets\n\uD83E\uDDEA /test - Bot diagnostics\n\uD83D\uDE80 /start - Welcome message\n\nHow it works:\n\u2022 Tweet about OpenServ, @OpenServAI, or use #OpenServ\n\u2022 Scores are calculated based on engagement and timing\n\u2022 Leaderboard updates weekly\n\nNeed help? Contact the OpenServ team!";
                return [4 /*yield*/, telegramBot.sendMessage(msg.chat.id, helpMessage)];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
telegramBot.onText(/\/fetch/, function (msg) { return __awaiter(void 0, void 0, void 0, function () {
    var error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 7]);
                return [4 /*yield*/, telegramBot.sendMessage(msg.chat.id, '🔄 Fetching latest tweets and generating leaderboard...')];
            case 1:
                _a.sent();
                return [4 /*yield*/, fetchAllMentionsHistorical()];
            case 2:
                _a.sent();
                return [4 /*yield*/, scoreAndStore()];
            case 3:
                _a.sent();
                return [4 /*yield*/, telegramBot.sendMessage(msg.chat.id, '✅ Fetch completed! Use /leaderboard to see results.')];
            case 4:
                _a.sent();
                return [3 /*break*/, 7];
            case 5:
                error_2 = _a.sent();
                console.error('Error in /fetch command:', error_2);
                return [4 /*yield*/, telegramBot.sendMessage(msg.chat.id, '❌ Error fetching tweets. Please try again.')];
            case 6:
                _a.sent();
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
telegramBot.onText(/\/myxp(?:\s+@?(\w+))?/, function (msg, match) { return __awaiter(void 0, void 0, void 0, function () {
    var requestedUser_1, data, leaderboard, userStats, rank, message, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 8, , 10]);
                requestedUser_1 = match === null || match === void 0 ? void 0 : match[1];
                if (!!requestedUser_1) return [3 /*break*/, 2];
                return [4 /*yield*/, telegramBot.sendMessage(msg.chat.id, '📝 Usage: /myxp @username\nExample: /myxp satoshi_dev')];
            case 1:
                _a.sent();
                return [2 /*return*/];
            case 2:
                data = storage.load();
                leaderboard = data.leaderboards.find(function (lb) { return lb.week === getWeekKey(); });
                if (!!leaderboard) return [3 /*break*/, 4];
                return [4 /*yield*/, telegramBot.sendMessage(msg.chat.id, '📊 No leaderboard data available. Try /fetch first.')];
            case 3:
                _a.sent();
                return [2 /*return*/];
            case 4:
                userStats = leaderboard.users.find(function (u) { return u.username.toLowerCase() === requestedUser_1.toLowerCase(); });
                if (!!userStats) return [3 /*break*/, 6];
                return [4 /*yield*/, telegramBot.sendMessage(msg.chat.id, "\uD83D\uDD0D @".concat(requestedUser_1, " hasn't posted about OpenServ this week."))];
            case 5:
                _a.sent();
                return [2 /*return*/];
            case 6:
                rank = leaderboard.users.findIndex(function (u) { return u.username.toLowerCase() === requestedUser_1.toLowerCase(); }) + 1;
                message = "\uD83D\uDCCA Stats for @".concat(userStats.username, ":\n    \n\uD83C\uDFC6 Rank: #").concat(rank, "\n\u2B50 Score: ").concat(userStats.totalScore.toFixed(1), " pts\n\uD83D\uDCDD Tweets: ").concat(userStats.tweetCount, "\n\u2764\uFE0F Avg Likes: ").concat(userStats.avgLikes.toFixed(1), "\n\uD83D\uDD04 Avg Retweets: ").concat(userStats.avgRetweets.toFixed(1), "\n\uD83D\uDD25 Top Tweet: ").concat(userStats.topTweet.likes + userStats.topTweet.retweets * 2, " engagement");
                return [4 /*yield*/, telegramBot.sendMessage(msg.chat.id, message)];
            case 7:
                _a.sent();
                return [3 /*break*/, 10];
            case 8:
                error_3 = _a.sent();
                console.error('Error in /myxp command:', error_3);
                return [4 /*yield*/, telegramBot.sendMessage(msg.chat.id, '❌ Error retrieving user stats. Please try again.')];
            case 9:
                _a.sent();
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
telegramBot.onText(/\/leaderboard/, function (msg) { return __awaiter(void 0, void 0, void 0, function () {
    var data, leaderboard, top10, leaderboardText, message, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 7]);
                data = storage.load();
                leaderboard = data.leaderboards.find(function (lb) { return lb.week === getWeekKey(); });
                if (!(!leaderboard || leaderboard.users.length === 0)) return [3 /*break*/, 3];
                return [4 /*yield*/, telegramBot.sendMessage(msg.chat.id, '🔄 No leaderboard data found. Generating fresh leaderboard...')];
            case 1:
                _a.sent();
                return [4 /*yield*/, generateSimpleLeaderboard()];
            case 2:
                _a.sent();
                return [2 /*return*/];
            case 3:
                top10 = leaderboard.users.slice(0, 10);
                leaderboardText = top10.map(function (user, index) { return "#".concat(index + 1, " @").concat(user.username, " \u2014 ").concat(user.totalScore.toFixed(1), " pts"); }).join('\n');
                message = "\uD83C\uDFC6 Current Weekly Leaderboard\n\n".concat(leaderboardText, "\n\n\uD83D\uDCC5 Week: ").concat(getWeekKey());
                return [4 /*yield*/, telegramBot.sendMessage(msg.chat.id, message)];
            case 4:
                _a.sent();
                return [3 /*break*/, 7];
            case 5:
                error_4 = _a.sent();
                console.error('Error in /leaderboard command:', error_4);
                return [4 /*yield*/, telegramBot.sendMessage(msg.chat.id, '❌ Error retrieving leaderboard. Please try again.')];
            case 6:
                _a.sent();
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
telegramBot.onText(/\/analytics/, function (msg) { return __awaiter(void 0, void 0, void 0, function () {
    var data, leaderboard, totalUsers, avgScore, prevWeek, fastestRiser, _loop_1, _i, _a, user, state_1, message, error_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 6]);
                data = storage.load();
                leaderboard = data.leaderboards.find(function (lb) { return lb.week === getWeekKey(); });
                if (!!leaderboard) return [3 /*break*/, 2];
                return [4 /*yield*/, telegramBot.sendMessage(msg.chat.id, '📈 No analytics data available. Try /fetch first.')];
            case 1:
                _b.sent();
                return [2 /*return*/];
            case 2:
                totalUsers = leaderboard.users.length;
                avgScore = totalUsers > 0 ? leaderboard.users.reduce(function (sum, u) { return sum + u.totalScore; }, 0) / totalUsers : 0;
                prevWeek = data.leaderboards.find(function (lb) { return lb.week !== getWeekKey(); });
                fastestRiser = 'N/A';
                if (prevWeek) {
                    _loop_1 = function (user) {
                        var prevRank = prevWeek.users.findIndex(function (u) { return u.username === user.username; });
                        var currentRank = leaderboard.users.findIndex(function (u) { return u.username === user.username; });
                        if (prevRank > currentRank && prevRank >= 0) {
                            fastestRiser = "@".concat(user.username, " (\u2191").concat(prevRank - currentRank, ")");
                            return "break";
                        }
                    };
                    for (_i = 0, _a = leaderboard.users.slice(0, 5); _i < _a.length; _i++) {
                        user = _a[_i];
                        state_1 = _loop_1(user);
                        if (state_1 === "break")
                            break;
                    }
                }
                message = "\uD83D\uDCC8 Weekly Analytics:\n\n\uD83D\uDC65 Active Users: ".concat(totalUsers, "\n\uD83D\uDCDD Total Tweets: ").concat(leaderboard.totalTweets, "\n\uD83D\uDCAF Avg Score: ").concat(avgScore.toFixed(1), "\n\uD83D\uDE80 Fastest Riser: ").concat(fastestRiser, "\n\uD83D\uDD25 Most Viral: @").concat(leaderboard.mostViralTweet.username, "\n\uD83D\uDCC5 Week: ").concat(getWeekKey());
                return [4 /*yield*/, telegramBot.sendMessage(msg.chat.id, message)];
            case 3:
                _b.sent();
                return [3 /*break*/, 6];
            case 4:
                error_5 = _b.sent();
                console.error('Error in /analytics command:', error_5);
                return [4 /*yield*/, telegramBot.sendMessage(msg.chat.id, '❌ Error retrieving analytics. Please try again.')];
            case 5:
                _b.sent();
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
telegramBot.onText(/\/test/, function (msg) { return __awaiter(void 0, void 0, void 0, function () {
    var data, testMessage, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 4]);
                data = storage.load();
                testMessage = "\uD83E\uDDEA Bot Test Results:\n\n\u2705 Bot is running\n\u2705 Commands are working\n\uD83D\uDD50 Current time: ".concat(new Date().toLocaleString(), "\n\uD83D\uDCC1 Data directory: ").concat(CONFIG.DATA_DIR, "\n\uD83D\uDCCA Stored tweets: ").concat(data.tweets.length, "\n\uD83D\uDCC8 Stored leaderboards: ").concat(data.leaderboards.length, "\n\uD83C\uDFAF Environment: ").concat(process.env.NODE_ENV || 'development');
                return [4 /*yield*/, telegramBot.sendMessage(msg.chat.id, testMessage)];
            case 1:
                _a.sent();
                return [3 /*break*/, 4];
            case 2:
                error_6 = _a.sent();
                console.error('Error in /test command:', error_6);
                return [4 /*yield*/, telegramBot.sendMessage(msg.chat.id, '❌ Error running test. Please check logs.')];
            case 3:
                _a.sent();
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
