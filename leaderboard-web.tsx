import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Users, MessageCircle, Heart, Repeat2, ExternalLink, Calendar, BarChart3, Award, Flame } from 'lucide-react';

// Interfaces
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

const LeaderboardDashboard = () => {
  const [data, setData] = useState<StorageData>({
    tweets: [],
    lastFetch: new Date().toISOString(),
    leaderboards: []
  });
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'analytics'>('leaderboard');
  const [error, setError] = useState<string | null>(null);

  const currentLeaderboard = data.leaderboards[selectedWeek] || data.leaderboards[0];
  
  const loadLeaderboardData = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/leaderboard-data');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const parsedData: StorageData = await response.json();
      setData(parsedData);
      console.log(`✅ Loaded ${parsedData.leaderboards.length} leaderboards and ${parsedData.tweets.length} tweets`);
    } catch (err) {
      console.error('Error loading leaderboard data:', err);
      setError(`Failed to load leaderboard data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    loadLeaderboardData();
    const interval = setInterval(loadLeaderboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatScore = (score: number): string => {
    return score.toFixed(1);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Award className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-600">#{rank}</span>;
  };

  const LeaderboardCard = ({ user, rank }: { user: UserStats; rank: number }) => (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 transition-all hover:shadow-lg ${
      rank === 1 ? 'border-yellow-500' : rank === 2 ? 'border-gray-400' : rank === 3 ? 'border-amber-600' : 'border-blue-500'
    }`}>
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
            <MessageCircle className="w-4 h-4 text-blue-500" />
            <span className="font-semibold">{user.tweetCount}</span>
          </div>
          <div className="text-xs text-gray-500">Tweets</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="font-semibold">{user.avgLikes.toFixed(1)}</span>
          </div>
          <div className="text-xs text-gray-500">Avg Likes</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <Repeat2 className="w-4 h-4 text-green-500" />
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
              <Heart className="w-3 h-3" />
              <span>{user.topTweet.likes}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Repeat2 className="w-3 h-3" />
              <span>{user.topTweet.retweets}</span>
            </span>
          </div>
          <a 
            href={user.topTweet.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-blue-500 hover:text-blue-700 text-sm"
          >
            <span>View</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );

  const AnalyticsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold">{currentLeaderboard?.users.length || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Total Tweets</p>
              <p className="text-2xl font-bold">{currentLeaderboard?.totalTweets || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-sm text-gray-600">Avg Score</p>
              <p className="text-2xl font-bold">
                {currentLeaderboard?.users.length > 0 
                  ? formatScore(currentLeaderboard.users.reduce((sum, u) => sum + u.totalScore, 0) / currentLeaderboard.users.length)
                  : '0.0'
                }
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3">
            <Flame className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-sm text-gray-600">Most Viral</p>
              <p className="text-lg font-bold">
                {currentLeaderboard?.mostViralTweet ? 
                  (currentLeaderboard.mostViralTweet.likes + currentLeaderboard.mostViralTweet.retweets * 2) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {currentLeaderboard?.mostViralTweet && currentLeaderboard.mostViralTweet.username !== 'none' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
            <Flame className="w-5 h-5 text-orange-500" />
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
                  <Heart className="w-4 h-4 text-red-500" />
                  <span>{currentLeaderboard.mostViralTweet.likes}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Repeat2 className="w-4 h-4 text-green-500" />
                  <span>{currentLeaderboard.mostViralTweet.retweets}</span>
                </span>
              </div>
              <a 
                href={currentLeaderboard.mostViralTweet.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-blue-500 hover:text-blue-700"
              >
                <span>View Tweet</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">OpenServ Leaderboard</h1>
          <p className="text-gray-600">Track community engagement and weekly champions</p>
          <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Week of {formatDate(currentLeaderboard?.week || new Date().toISOString())}</span>
            <span>•</span>
            <span>Last updated: {formatDate(data.lastFetch)}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-md p-1">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'leaderboard' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏆 Leaderboard
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'analytics' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📈 Analytics
            </button>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={loadLeaderboardData}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <TrendingUp className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>

        {/* Auto-refresh indicator */}
        <div className="text-center text-sm text-gray-500 mb-6">
          Auto-refreshes every 5 minutes
        </div>

        {/* Content */}
        {error ? (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
              <p className="text-red-700 text-sm mb-4">{error}</p>
              <button
                onClick={loadLeaderboardData}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : activeTab === 'leaderboard' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentLeaderboard?.users.map((user, index) => (
              <LeaderboardCard key={user.username} user={user} rank={index + 1} />
            ))}
          </div>
        ) : (
          <AnalyticsTab />
        )}

        {!error && (!currentLeaderboard?.users || currentLeaderboard.users.length === 0) && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No data available</h3>
            <p className="text-gray-500">Start tweeting about OpenServ to see the leaderboard!</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Keep tweeting about OpenServ to climb the leaderboard! 🚀</p>
          <p className="mt-2">Powered by OpenServ AI • Built with ❤️ for the community</p>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardDashboard;