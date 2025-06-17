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
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
// Use the same config as your bot
var CONFIG = {
    DATA_DIR: './data',
};
var LeaderboardDashboard = function () {
    var _a = (0, react_1.useState)({
        tweets: [],
        lastFetch: new Date().toISOString(),
        leaderboards: []
    }), data = _a[0], setData = _a[1];
    var _b = (0, react_1.useState)(0), selectedWeek = _b[0], setSelectedWeek = _b[1];
    var _c = (0, react_1.useState)(false), loading = _c[0], setLoading = _c[1];
    var _d = (0, react_1.useState)('leaderboard'), activeTab = _d[0], setActiveTab = _d[1];
    var _e = (0, react_1.useState)(null), error = _e[0], setError = _e[1];
    var currentLeaderboard = data.leaderboards[selectedWeek] || data.leaderboards[0];
    var loadLeaderboardData = function () { return __awaiter(void 0, void 0, void 0, function () {
        var filePath, fileData, parsedData, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setLoading(true);
                    setError(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    filePath = "".concat(CONFIG.DATA_DIR, "/leaderboard_data.json");
                    // Check if file system API is available
                    if (!window.fs || typeof window.fs.readFile !== 'function') {
                        throw new Error('File system not available. Please ensure leaderboard_data.json is uploaded to this conversation.');
                    }
                    return [4 /*yield*/, window.fs.readFile(filePath, { encoding: 'utf8' })];
                case 2:
                    fileData = _a.sent();
                    parsedData = JSON.parse(fileData);
                    setData(parsedData);
                    console.log("\u2705 Loaded ".concat(parsedData.leaderboards.length, " leaderboards and ").concat(parsedData.tweets.length, " tweets"));
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _a.sent();
                    console.error('Error loading leaderboard data:', err_1);
                    setError("Failed to load leaderboard data: ".concat(err_1 instanceof Error ? err_1.message : 'Unknown error'));
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var formatDate = function (dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };
    var formatScore = function (score) {
        return score.toFixed(1);
    };
    var getRankIcon = function (rank) {
        if (rank === 1)
            return <lucide_react_1.Trophy className="w-5 h-5 text-yellow-500"/>;
        if (rank === 2)
            return <lucide_react_1.Award className="w-5 h-5 text-gray-400"/>;
        if (rank === 3)
            return <lucide_react_1.Award className="w-5 h-5 text-amber-600"/>;
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-600">#{rank}</span>;
    };
    var LeaderboardCard = function (_a) {
        var user = _a.user, rank = _a.rank;
        return (<div className={"bg-white rounded-lg shadow-md p-6 border-l-4 transition-all hover:shadow-lg ".concat(rank === 1 ? 'border-yellow-500' : rank === 2 ? 'border-gray-400' : rank === 3 ? 'border-amber-600' : 'border-blue-500')}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getRankIcon(rank)}
          <div>
            <h3 className="text-lg font-bold text-gray-900">@{user.username}</h3>
            <p className="text-sm text-gray-600">{formatScore(user.totalScore)} points</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{formatScore(user.totalScore)}</div>
          <div className="text-xs text-gray-500">pts</div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <lucide_react_1.MessageCircle className="w-4 h-4 text-blue-500"/>
            <span className="font-semibold">{user.tweetCount}</span>
          </div>
          <div className="text-xs text-gray-500">Tweets</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <lucide_react_1.Heart className="w-4 h-4 text-red-500"/>
            <span className="font-semibold">{user.avgLikes.toFixed(1)}</span>
          </div>
          <div className="text-xs text-gray-500">Avg Likes</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <lucide_react_1.Repeat2 className="w-4 h-4 text-green-500"/>
            <span className="font-semibold">{user.avgRetweets.toFixed(1)}</span>
          </div>
          <div className="text-xs text-gray-500">Avg RTs</div>
        </div>
      </div>

      <div className="border-t pt-3">
        <p className="text-sm text-gray-700 mb-2 line-clamp-2">{user.topTweet.text}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className="flex items-center space-x-1">
              <lucide_react_1.Heart className="w-3 h-3"/>
              <span>{user.topTweet.likes}</span>
            </span>
            <span className="flex items-center space-x-1">
              <lucide_react_1.Repeat2 className="w-3 h-3"/>
              <span>{user.topTweet.retweets}</span>
            </span>
          </div>
          <a href={user.topTweet.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 text-blue-500 hover:text-blue-700 text-sm">
            <span>View</span>
            <lucide_react_1.ExternalLink className="w-3 h-3"/>
          </a>
        </div>
      </div>
    </div>);
    };
    var AnalyticsTab = function () { return (<div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3">
            <lucide_react_1.Users className="w-8 h-8 text-blue-500"/>
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold">{(currentLeaderboard === null || currentLeaderboard === void 0 ? void 0 : currentLeaderboard.users.length) || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3">
            <lucide_react_1.MessageCircle className="w-8 h-8 text-green-500"/>
            <div>
              <p className="text-sm text-gray-600">Total Tweets</p>
              <p className="text-2xl font-bold">{(currentLeaderboard === null || currentLeaderboard === void 0 ? void 0 : currentLeaderboard.totalTweets) || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3">
            <lucide_react_1.BarChart3 className="w-8 h-8 text-purple-500"/>
            <div>
              <p className="text-sm text-gray-600">Avg Score</p>
              <p className="text-2xl font-bold">
                {(currentLeaderboard === null || currentLeaderboard === void 0 ? void 0 : currentLeaderboard.users.length) > 0
            ? formatScore(currentLeaderboard.users.reduce(function (sum, u) { return sum + u.totalScore; }, 0) / currentLeaderboard.users.length)
            : '0.0'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3">
            <lucide_react_1.Flame className="w-8 h-8 text-orange-500"/>
            <div>
              <p className="text-sm text-gray-600">Most Viral</p>
              <p className="text-lg font-bold">
                {(currentLeaderboard === null || currentLeaderboard === void 0 ? void 0 : currentLeaderboard.mostViralTweet) ?
            (currentLeaderboard.mostViralTweet.likes + currentLeaderboard.mostViralTweet.retweets * 2) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {(currentLeaderboard === null || currentLeaderboard === void 0 ? void 0 : currentLeaderboard.mostViralTweet) && currentLeaderboard.mostViralTweet.username !== 'none' && (<div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
            <lucide_react_1.Flame className="w-5 h-5 text-orange-500"/>
            <span>Most Viral Tweet This Week</span>
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-900">@{currentLeaderboard.mostViralTweet.username}</span>
              <span className="text-sm text-gray-500">{formatDate(currentLeaderboard.mostViralTweet.created_at)}</span>
            </div>
            <p className="text-gray-700 mb-3">{currentLeaderboard.mostViralTweet.text}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center space-x-1">
                  <lucide_react_1.Heart className="w-4 h-4 text-red-500"/>
                  <span>{currentLeaderboard.mostViralTweet.likes}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <lucide_react_1.Repeat2 className="w-4 h-4 text-green-500"/>
                  <span>{currentLeaderboard.mostViralTweet.retweets}</span>
                </span>
              </div>
              <a href={currentLeaderboard.mostViralTweet.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 text-blue-500 hover:text-blue-700">
                <span>View Tweet</span>
                <lucide_react_1.ExternalLink className="w-4 h-4"/>
              </a>
            </div>
          </div>
        </div>)}
    </div>); };
    return (<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">OpenServ Leaderboard</h1>
          <p className="text-gray-600">Track community engagement and weekly champions</p>
          <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-500">
            <lucide_react_1.Calendar className="w-4 h-4"/>
            <span>Week of {formatDate((currentLeaderboard === null || currentLeaderboard === void 0 ? void 0 : currentLeaderboard.week) || new Date().toISOString())}</span>
            <span>•</span>
            <span>Last updated: {formatDate(data.lastFetch)}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-md p-1">
            <button onClick={function () { return setActiveTab('leaderboard'); }} className={"px-6 py-2 rounded-md font-medium transition-colors ".concat(activeTab === 'leaderboard'
            ? 'bg-blue-500 text-white'
            : 'text-gray-600 hover:text-gray-900')}>
              🏆 Leaderboard
            </button>
            <button onClick={function () { return setActiveTab('analytics'); }} className={"px-6 py-2 rounded-md font-medium transition-colors ".concat(activeTab === 'analytics'
            ? 'bg-blue-500 text-white'
            : 'text-gray-600 hover:text-gray-900')}>
              📈 Analytics
            </button>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-center mb-6">
          <button onClick={loadLeaderboardData} disabled={loading} className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2">
            <lucide_react_1.TrendingUp className={"w-4 h-4 ".concat(loading ? 'animate-spin' : '')}/>
            <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>

        {/* Content */}
        {error ? (<div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
              <p className="text-red-700 text-sm mb-4">{error}</p>
              <button onClick={loadLeaderboardData} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                Try Again
              </button>
            </div>
          </div>) : activeTab === 'leaderboard' ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentLeaderboard === null || currentLeaderboard === void 0 ? void 0 : currentLeaderboard.users.map(function (user, index) { return (<LeaderboardCard key={user.username} user={user} rank={index + 1}/>); })}
          </div>) : (<AnalyticsTab />)}

        {!error && (!(currentLeaderboard === null || currentLeaderboard === void 0 ? void 0 : currentLeaderboard.users) || currentLeaderboard.users.length === 0) && (<div className="text-center py-12">
            <lucide_react_1.Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4"/>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No data available</h3>
            <p className="text-gray-500">Start tweeting about OpenServ to see the leaderboard!</p>
          </div>)}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Keep tweeting about OpenServ to climb the leaderboard! 🚀</p>
          <p className="mt-2">Powered by OpenServ AI • Built with ❤️ for the community</p>
        </div>
      </div>
    </div>);
};
exports.default = LeaderboardDashboard;
