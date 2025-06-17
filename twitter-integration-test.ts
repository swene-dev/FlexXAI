/**
 * 🐦 Twitter Integration Test - OpenServ SDK
 * 
 * This file focuses specifically on testing Twitter integration functionality
 * using the OpenServ SDK's callIntegration method.
 * 
 * 🚀 Quick Test:
 * 1. Set your OPENSERV_API_KEY environment variable
 * 2. Update the CONFIG with your workspace ID
 * 3. Run: npx ts-node twitter-integration-test.ts
 */

// Load environment variables from .env file
import 'dotenv/config'
import { Agent } from '@openserv-labs/sdk'

// ============================================================================
// 🔧 CONFIGURATION
// ============================================================================

const CONFIG = {
  // Required: Your OpenServ API key
  OPENSERV_API_KEY: process.env.OPENSERV_API_KEY || '',
  
  // Required: Your workspace ID (from .env file)
  WORKSPACE_ID: parseInt(process.env.WORKSPACE_ID || '0'),
  
  // Twitter integration ID (this should match your OpenServ integration setup)
  TWITTER_INTEGRATION_ID: process.env.TWITTER_INTEGRATION_ID || 'twitter-v2'
}

// Validate configuration
if (!CONFIG.OPENSERV_API_KEY) {
  console.error('❌ Please set your OPENSERV_API_KEY environment variable')
  console.error('   1. Copy .env.example to .env')
  console.error('   2. Set OPENSERV_API_KEY=your_actual_api_key')
  process.exit(1)
}

if (!CONFIG.WORKSPACE_ID || CONFIG.WORKSPACE_ID === 0) {
  console.error('❌ Please set your WORKSPACE_ID environment variable')
  console.error('   1. Find your workspace ID at https://platform.openserv.ai')
  console.error('   2. Set WORKSPACE_ID=your_actual_workspace_id in .env')
  process.exit(1)
}

// ============================================================================
// 🤖 TWITTER INTEGRATION AGENT
// ============================================================================

const twitterAgent = new Agent({
  systemPrompt: 'You are a Twitter integration testing agent. You help test Twitter API calls through OpenServ integrations.',
  apiKey: CONFIG.OPENSERV_API_KEY
})

// ============================================================================
// 🐦 TWITTER INTEGRATION TESTS
// ============================================================================

/**
 * Test getting user timeline via OpenServ Twitter integration
 */
async function testTwitterGetTimeline() {
  console.log('🐦 Testing Twitter Get Timeline Integration...')
  
  try {
    // First get user ID from profile, then get timeline
    const profileResponse = await twitterAgent.callIntegration({
      workspaceId: CONFIG.WORKSPACE_ID,
      integrationId: CONFIG.TWITTER_INTEGRATION_ID,
      details: {
        endpoint: '/2/users/me',
        method: 'GET'
      }
    })
    
    // Extract user ID from profile response - handle both string and object
    let userData
    if (typeof profileResponse.output === 'string') {
      userData = JSON.parse(profileResponse.output)
    } else {
      userData = profileResponse.output
    }
    const userId = userData.data.id
    
    const response = await twitterAgent.callIntegration({
      workspaceId: CONFIG.WORKSPACE_ID,
      integrationId: CONFIG.TWITTER_INTEGRATION_ID,
      details: {
        endpoint: `/2/users/${userId}/tweets`,
        method: 'GET',
        data: {
          max_results: 5,
          'tweet.fields': 'created_at,public_metrics'
        }
      }
    })
    
    console.log('✅ Twitter timeline fetch successful!')
    console.log('📊 Response:', JSON.stringify(response, null, 2))
    
    return response
    
  } catch (error) {
    console.error('❌ Twitter timeline fetch failed:', error)
    throw error
  }
}

/**
 * Test searching tweets via OpenServ Twitter integration
 */
async function testTwitterSearch() {
  console.log('🐦 Testing Twitter Search Integration...')
  
  try {
    const response = await twitterAgent.callIntegration({
      workspaceId: CONFIG.WORKSPACE_ID,
      integrationId: CONFIG.TWITTER_INTEGRATION_ID,
      details: {
        endpoint: '/2/tweets/search/recent?query=javascript&max_results=10', // Try URL params instead
        method: 'GET'
      }
    })
    
    console.log('✅ Twitter search successful!')
    console.log('📊 Response:', JSON.stringify(response, null, 2))
    
    return response
    
  } catch (error) {
    console.error('❌ Twitter search failed:', error)
    throw error
  }
}

/**
 * Test OpenServ-specific search via Twitter integration (Full Archive Search)
 * NOTE: Requires Academic Research access level
 */
async function testOpenServSearch() {
  console.log('🐦 Testing OpenServ-Specific Search Integration...')
  
  try {
    const response = await twitterAgent.callIntegration({
      workspaceId: CONFIG.WORKSPACE_ID,
      integrationId: CONFIG.TWITTER_INTEGRATION_ID,
      details: {
        endpoint: '/2/tweets/search/all',
        method: 'GET',
        data: {
          query: '"OpenServ" OR "@OpenServAI" OR "#OpenServ"',
          max_results: 100,
          expansions: 'author_id',
          'tweet.fields': 'public_metrics,created_at',
          'user.fields': 'public_metrics'
        }
      }
    })
    
    console.log('✅ OpenServ search successful!')
    console.log('📊 Response:', JSON.stringify(response, null, 2))
    
    return response
    
  } catch (error) {
    console.error('❌ OpenServ search failed:', error)
    console.log('💡 Note: /search/all requires Academic Research access level')
    throw error
  }
}

/**
 * Test basic Twitter search that should work with Essential access
 */
async function testBasicTwitterSearch() {
  console.log('🐦 Testing Basic Twitter Search (Essential Access)...')
  
  try {
    // Try with URL parameters instead of data object
    const searchQuery = encodeURIComponent('hello world')
    const response = await twitterAgent.callIntegration({
      workspaceId: CONFIG.WORKSPACE_ID,
      integrationId: CONFIG.TWITTER_INTEGRATION_ID,
      details: {
        endpoint: `/2/tweets/search/recent?query=${searchQuery}&max_results=10&tweet.fields=created_at,public_metrics`,
        method: 'GET'
      }
    })
    
    console.log('✅ Basic Twitter search successful!')
    console.log('📊 Response:', JSON.stringify(response, null, 2))
    
    return response
    
  } catch (error) {
    console.error('❌ Basic Twitter search failed:', error)
    throw error
  }
}

/**
 * Test getting Twitter user followers via OpenServ Twitter integration
 */
async function testTwitterGetFollowers() {
  console.log('🐦 Testing Twitter Get Followers Integration...')
  
  try {
    // First get user ID from profile
    const profileResponse = await twitterAgent.callIntegration({
      workspaceId: CONFIG.WORKSPACE_ID,
      integrationId: CONFIG.TWITTER_INTEGRATION_ID,
      details: {
        endpoint: '/2/users/me',
        method: 'GET'
      }
    })
    
    // Extract user ID from profile response - handle both string and object
    let userData
    if (typeof profileResponse.output === 'string') {
      userData = JSON.parse(profileResponse.output)
    } else {
      userData = profileResponse.output
    }
    const userId = userData.data.id
    
    const response = await twitterAgent.callIntegration({
      workspaceId: CONFIG.WORKSPACE_ID,
      integrationId: CONFIG.TWITTER_INTEGRATION_ID,
      details: {
        endpoint: `/2/users/${userId}/followers`,
        method: 'GET',
        data: {
          max_results: 10,
          'user.fields': 'created_at,description,public_metrics,verified'
        }
      }
    })
    
    console.log('✅ Twitter followers fetch successful!')
    console.log('📊 Response:', JSON.stringify(response, null, 2))
    
    return response
    
  } catch (error) {
    console.error('❌ Twitter followers fetch failed:', error)
    throw error
  }
}

/**
 * Test getting Twitter user profile via OpenServ Twitter integration
 */
async function testTwitterGetProfile() {
  console.log('🐦 Testing Twitter Get Profile Integration...')
  
  try {
    const response = await twitterAgent.callIntegration({
      workspaceId: CONFIG.WORKSPACE_ID,
      integrationId: CONFIG.TWITTER_INTEGRATION_ID,
      details: {
        endpoint: '/2/users/me',
        method: 'GET',
        data: {
          'user.fields': 'created_at,description,location,public_metrics,verified'
        }
      }
    })
    
    console.log('✅ Twitter profile fetch successful!')
    console.log('📊 Response:', JSON.stringify(response, null, 2))
    
    return response
    
  } catch (error) {
    console.error('❌ Twitter profile fetch failed:', error)
    throw error
  }
}

/**
 * Test searching for recent OpenServ mentions in the last 2 days
 * Uses /2/tweets/search/recent which works with Essential access
 */
async function testOpenServRecentMentions() {
  console.log('🐦 Testing Recent OpenServ Mentions (Last 2 Days)...')
  
  try {
    // Calculate date range for last 2 days
    const now = new Date()
    const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000))
    
    // Twitter requires end_time to be at least 10 seconds before now
    const endTime = new Date(now.getTime() - (30 * 1000)) // 30 seconds ago to be safe
    
    // Format dates for Twitter API (ISO 8601)
    const startTime = twoDaysAgo.toISOString()
    const endTimeFormatted = endTime.toISOString()
    
    console.log(`📅 Searching from ${startTime} to ${endTimeFormatted}`)
    
    // Build URL with parameters instead of using data object
    const searchQuery = encodeURIComponent('("OpenServ" OR "@OpenServAI" OR "#OpenServ" OR "openserv.ai") -is:retweet')
    const tweetFields = encodeURIComponent('created_at,public_metrics,author_id,context_annotations,entities,lang,source')
    const expansions = encodeURIComponent('author_id,referenced_tweets.id.author_id,entities.mentions.username')
    const userFields = encodeURIComponent('created_at,description,location,name,public_metrics,username,verified,verified_type')
    
    const endpoint = `/2/tweets/search/recent?query=${searchQuery}&start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTimeFormatted)}&max_results=100&sort_order=recency&tweet.fields=${tweetFields}&expansions=${expansions}&user.fields=${userFields}`
    
    const response = await twitterAgent.callIntegration({
      workspaceId: CONFIG.WORKSPACE_ID,
      integrationId: CONFIG.TWITTER_INTEGRATION_ID,
      details: {
        endpoint: endpoint,
        method: 'GET'
      }
    })
    
    console.log('✅ OpenServ recent mentions search successful!')
    
    // Parse and analyze the response
    let responseData
    if (typeof response.output === 'string') {
      responseData = JSON.parse(response.output)
    } else {
      responseData = response.output
    }
    
    // Display summary
    if (responseData.data && Array.isArray(responseData.data)) {
      const tweetCount = responseData.data.length
      const resultCount = responseData.meta?.result_count || tweetCount
      
      console.log(`🎯 Found ${resultCount} OpenServ mentions in the last 2 days!`)
      console.log(`📊 Retrieved ${tweetCount} tweets in this response`)
      
      if (responseData.meta?.next_token) {
        console.log(`🔄 More results available (next_token: ${responseData.meta.next_token.substring(0, 20)}...)`)
      }
      
      // Show engagement summary
      const totalLikes = responseData.data.reduce((sum: number, tweet: any) => sum + (tweet.public_metrics?.like_count || 0), 0)
      const totalRetweets = responseData.data.reduce((sum: number, tweet: any) => sum + (tweet.public_metrics?.retweet_count || 0), 0)
      const totalReplies = responseData.data.reduce((sum: number, tweet: any) => sum + (tweet.public_metrics?.reply_count || 0), 0)
      
      console.log(`💫 Total engagement:`)
      console.log(`   ❤️  ${totalLikes} likes`)
      console.log(`   🔄 ${totalRetweets} retweets`) 
      console.log(`   💬 ${totalReplies} replies`)
      
      // Show first few tweets as examples
      const sampleTweets = responseData.data.slice(0, 3)
      console.log(`\n📝 Sample tweets:`)
      sampleTweets.forEach((tweet: any, index: number) => {
        console.log(`\n   ${index + 1}. "${tweet.text?.substring(0, 80)}${tweet.text?.length > 80 ? '...' : ''}"`)
        console.log(`      📅 ${tweet.created_at}`)
        console.log(`      💫 ${tweet.public_metrics?.like_count || 0} likes, ${tweet.public_metrics?.retweet_count || 0} retweets`)
      })
      
      if (responseData.includes?.users) {
        console.log(`\n👥 Unique authors: ${responseData.includes.users.length}`)
      }
      
    } else if (responseData.meta && responseData.meta.result_count === 0) {
      console.log('📊 No OpenServ mentions found in the last 2 days (but search worked!)')
    } else {
      console.log('📊 No OpenServ mentions found in the last 2 days')
    }
    
    // Comment out the full response to avoid overwhelming output
    // console.log('\n📊 Full Response:', JSON.stringify(response, null, 2))
    
    return response
    
  } catch (error) {
    console.error('❌ OpenServ recent mentions search failed:', error)
    throw error
  }
}

/**
 * Test searching for ALL recent OpenServ mentions (using pagination)
 * Fetches multiple pages to get more than 100 results
 */
async function testOpenServAllRecentMentions() {
  console.log('🐦 Testing ALL Recent OpenServ Mentions (with pagination)...')
  
  try {
    // Calculate date range for last 2 days
    const now = new Date()
    const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000))
    const endTime = new Date(now.getTime() - (30 * 1000)) // 30 seconds ago
    
    const startTime = twoDaysAgo.toISOString()
    const endTimeFormatted = endTime.toISOString()
    
    console.log(`📅 Searching from ${startTime} to ${endTimeFormatted}`)
    
    // Collect all tweets across multiple pages
    let allTweets: any[] = []
    let nextToken: string | undefined = undefined
    let pageCount = 0
    const maxPages = 5 // Limit to 5 pages (500 tweets max) to avoid rate limits
    
    do {
      pageCount++
      console.log(`📄 Fetching page ${pageCount}...`)
      
      // Build URL with parameters
      const searchQuery = encodeURIComponent('("OpenServ" OR "@OpenServAI" OR "#OpenServ" OR "openserv.ai") -is:retweet')
      const tweetFields = encodeURIComponent('created_at,public_metrics,author_id,lang,source')
      const expansions = encodeURIComponent('author_id')
      const userFields = encodeURIComponent('name,username,verified,public_metrics')
      
      let endpoint = `/2/tweets/search/recent?query=${searchQuery}&start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTimeFormatted)}&max_results=100&sort_order=recency&tweet.fields=${tweetFields}&expansions=${expansions}&user.fields=${userFields}`
      
      // Add pagination token if we have one
      if (nextToken) {
        endpoint += `&next_token=${encodeURIComponent(nextToken)}`
      }
      
      const response = await twitterAgent.callIntegration({
        workspaceId: CONFIG.WORKSPACE_ID,
        integrationId: CONFIG.TWITTER_INTEGRATION_ID,
        details: {
          endpoint: endpoint,
          method: 'GET'
        }
      })
      
      // Parse response
      let responseData
      if (typeof response.output === 'string') {
        responseData = JSON.parse(response.output)
      } else {
        responseData = response.output
      }
      
      // Add tweets from this page
      if (responseData.data && Array.isArray(responseData.data)) {
        allTweets.push(...responseData.data)
        console.log(`   ✅ Got ${responseData.data.length} tweets (total: ${allTweets.length})`)
      }
      
      // Check for next page
      nextToken = responseData.meta?.next_token
      
      // Wait between requests to respect rate limits
      if (nextToken && pageCount < maxPages) {
        console.log(`   ⏳ Waiting 2 seconds before next page...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      
    } while (nextToken && pageCount < maxPages)
    
    // Display final summary
    console.log(`\n🎯 FINAL RESULTS: Found ${allTweets.length} total OpenServ mentions!`)
    console.log(`📄 Fetched ${pageCount} pages`)
    
    if (nextToken) {
      console.log(`🔄 More results still available (stopped at ${maxPages} pages to avoid rate limits)`)
    }
    
    // Calculate total engagement across all tweets
    const totalLikes = allTweets.reduce((sum, tweet) => sum + (tweet.public_metrics?.like_count || 0), 0)
    const totalRetweets = allTweets.reduce((sum, tweet) => sum + (tweet.public_metrics?.retweet_count || 0), 0)
    const totalReplies = allTweets.reduce((sum, tweet) => sum + (tweet.public_metrics?.reply_count || 0), 0)
    const totalImpressions = allTweets.reduce((sum, tweet) => sum + (tweet.public_metrics?.impression_count || 0), 0)
    
    console.log(`\n💫 TOTAL ENGAGEMENT ACROSS ALL TWEETS:`)
    console.log(`   ❤️  ${totalLikes.toLocaleString()} likes`)
    console.log(`   🔄 ${totalRetweets.toLocaleString()} retweets`) 
    console.log(`   💬 ${totalReplies.toLocaleString()} replies`)
    console.log(`   👀 ${totalImpressions.toLocaleString()} impressions`)
    
    // Show date range of tweets
    if (allTweets.length > 0) {
      const dates = allTweets.map(t => new Date(t.created_at)).sort()
      const oldestTweet = dates[0]
      const newestTweet = dates[dates.length - 1]
      
      if (oldestTweet && newestTweet) {
        console.log(`\n📅 Tweet date range:`)
        console.log(`   Oldest: ${oldestTweet.toLocaleString()}`)
        console.log(`   Newest: ${newestTweet.toLocaleString()}`)
      }
    }
    
    return {
      tweets: allTweets,
      totalCount: allTweets.length,
      pagesFetched: pageCount,
      hasMore: !!nextToken
    }
    
  } catch (error) {
    console.error('❌ OpenServ all mentions search failed:', error)
    throw error
  }
}

// ============================================================================
// 🧪 TEST RUNNER
// ============================================================================

/**
 * Run all Twitter integration tests
 */
async function runAllTwitterTests() {
  console.log('🚀 Starting Twitter Integration Tests...')
  console.log('=====================================\n')
  
  const essentialTests = [
    { name: 'Profile Fetch', fn: testTwitterGetProfile },
    { name: 'Basic Search (URL params)', fn: testBasicTwitterSearch },
    { name: 'Recent OpenServ Mentions (Last 2 Days)', fn: testOpenServRecentMentions },
    { name: 'Timeline Fetch', fn: testTwitterGetTimeline }
  ]
  
  const elevatedTests = [
    { name: 'Followers Fetch', fn: testTwitterGetFollowers }
  ]
  
  const academicTests = [
    { name: 'OpenServ Search (Full Archive)', fn: testOpenServSearch }
  ]
  
  console.log('🟢 Testing Essential Access Endpoints...')
  console.log('=========================================')
  
  const results: Array<{
    test: string
    status: 'SUCCESS' | 'FAILED'
    result?: any
    error?: string
    tier: 'Essential' | 'Elevated' | 'Academic'
  }> = []
  
  // Test Essential access endpoints
  for (const test of essentialTests) {
    try {
      console.log(`\n🧪 Running test: ${test.name}`)
      console.log('─'.repeat(40))
      
      const result = await test.fn()
      results.push({ test: test.name, status: 'SUCCESS', result, tier: 'Essential' })
      
      console.log(`✅ ${test.name} completed successfully\n`)
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      results.push({ test: test.name, status: 'FAILED', error: errorMessage, tier: 'Essential' })
      
      console.log(`❌ ${test.name} failed: ${errorMessage}\n`)
    }
  }
  
  console.log('\n🟡 Testing Elevated Access Endpoints...')
  console.log('========================================')
  
  // Test Elevated access endpoints
  for (const test of elevatedTests) {
    try {
      console.log(`\n🧪 Running test: ${test.name}`)
      console.log('─'.repeat(40))
      
      const result = await test.fn()
      results.push({ test: test.name, status: 'SUCCESS', result, tier: 'Elevated' })
      
      console.log(`✅ ${test.name} completed successfully\n`)
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      results.push({ test: test.name, status: 'FAILED', error: errorMessage, tier: 'Elevated' })
      
      console.log(`❌ ${test.name} failed: ${errorMessage}`)
      console.log('💡 This endpoint requires Elevated access - apply at developer.twitter.com\n')
    }
  }
  
  console.log('\n🔴 Testing Academic Research Endpoints...')
  console.log('==========================================')
  
  // Test Academic access endpoints
  for (const test of academicTests) {
    try {
      console.log(`\n🧪 Running test: ${test.name}`)
      console.log('─'.repeat(40))
      
      const result = await test.fn()
      results.push({ test: test.name, status: 'SUCCESS', result, tier: 'Academic' })
      
      console.log(`✅ ${test.name} completed successfully\n`)
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      results.push({ test: test.name, status: 'FAILED', error: errorMessage, tier: 'Academic' })
      
      console.log(`❌ ${test.name} failed: ${errorMessage}`)
      console.log('💡 This endpoint requires Academic Research access\n')
    }
  }
  
  // Print summary
  console.log('\n📊 TEST SUMMARY BY ACCESS TIER')
  console.log('================================')
  
  const tiers = ['Essential', 'Elevated', 'Academic']
  tiers.forEach(tier => {
    const tierResults = results.filter(r => r.tier === tier)
    if (tierResults.length > 0) {
      console.log(`\n${tier} Access:`)
      tierResults.forEach(result => {
        const icon = result.status === 'SUCCESS' ? '✅' : '❌'
        console.log(`  ${icon} ${result.test}: ${result.status}`)
      })
    }
  })
  
  const successCount = results.filter(r => r.status === 'SUCCESS').length
  console.log(`\n🎯 ${successCount}/${results.length} tests passed overall`)
  
  return results
}

/**
 * Run individual test functions for quick testing
 */
async function runQuickTest() {
  console.log('⚡ Quick Twitter Integration Test')
  console.log('=================================\n')
  
  try {
    // Start with a non-intrusive test
    console.log('Testing Twitter profile fetch...')
    await testTwitterGetProfile()
    
    console.log('\n🎉 Quick test completed successfully!')
    console.log('💡 Run `runAllTwitterTests()` for comprehensive testing')
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Quick test failed:', errorMessage)
    console.log('\n🔧 Troubleshooting tips:')
    console.log('1. Verify your OPENSERV_API_KEY is set correctly')
    console.log('2. Check that your workspace ID is correct')
    console.log('3. Ensure Twitter integration is properly configured in OpenServ')
    console.log('4. Verify Twitter API credentials are valid in the integration')
  }
}

// ============================================================================
// 🚀 MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🐦 OpenServ Twitter Integration Tester')
  console.log('======================================\n')
  
  console.log('📋 Configuration:')
  console.log(`   Workspace ID: ${CONFIG.WORKSPACE_ID}`)
  console.log(`   Integration ID: ${CONFIG.TWITTER_INTEGRATION_ID}`)
  console.log(`   API Key: ${CONFIG.OPENSERV_API_KEY.substring(0, 8)}...`)
  console.log('')
  
  // Choose your test mode:
  
  // Option 1: Quick test (recommended for first run)
  // await runQuickTest()
  
  // Option 2: Full test suite (uncomment to run all tests)
  // await runAllTwitterTests()
  
  // Option 3: Individual tests (uncomment specific tests)
  // await testTwitterGetProfile()
  // await testTwitterSearch()
  // await testTwitterGetTimeline()
  // await testTwitterGetFollowers()
  // await testOpenServRecentMentions()
  await testOpenServAllRecentMentions()
}

// Export functions for external use
export {
  twitterAgent,
  testTwitterGetTimeline,
  testTwitterGetProfile,
  testTwitterSearch,
  testBasicTwitterSearch,
  testOpenServSearch,
  testTwitterGetFollowers,
  testOpenServRecentMentions,
  testOpenServAllRecentMentions,
  runAllTwitterTests,
  runQuickTest
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('\n💥 Test execution failed:', errorMessage)
    process.exit(1)
  })
}

/**
 * 📚 USAGE INSTRUCTIONS:
 * 
 * 1. Environment Setup:
 *    export OPENSERV_API_KEY=your_openserv_api_key
 *    export WORKSPACE_ID=your_workspace_id  # Optional, defaults to 123
 * 
 * 2. Twitter Integration Setup (in OpenServ Dashboard):
 *    - Go to your workspace settings
 *    - Add Twitter integration
 *    - Configure with your Twitter API credentials
 *    - Note the integration ID (usually 'twitter-v2')
 * 
 * 3. Run Tests:
 *    npx ts-node twitter-integration-test.ts
 * 
 * 4. Customize:
 *    - Modify tweet text in testTwitterPost()
 *    - Adjust search queries in testTwitterSearch()
 *    - Change API endpoints and parameters as needed
 * 
 * 🔧 Troubleshooting:
 * - Ensure Twitter integration is active in your OpenServ workspace
 * - Check Twitter API rate limits if tests fail
 * - Verify Twitter OAuth 2.0 credentials are properly configured
 * - Make sure your Twitter app has the necessary permissions
 */ 