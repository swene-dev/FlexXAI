/**
 * 🚀 Multi-Agent Servers - Same File, Different Ports
 * 
 * This demonstrates that we CAN run multiple agents in the same file
 * as long as they use different ports for their HTTP servers.
 * 
 * Agent A: Port 7378 (DataAnalyst-Alpha)
 * Agent B: Port 7379 (ContentGen-Beta)
 */

import 'dotenv/config'
import { Agent } from '@openserv-labs/sdk'
import { z } from 'zod'

const CONFIG = {
  // Shared workspace (use WORKSPACE_ID_MULTI if set, otherwise WORKSPACE_ID)
  WORKSPACE_ID: parseInt(process.env.WORKSPACE_ID_MULTI || process.env.WORKSPACE_ID || '0'),
  
  // Agent A Configuration (Data Analysis Specialist)
  AGENT_A: {
    API_KEY: process.env.OPENSERV_API_KEY || '',
    AGENT_ID: parseInt(process.env.AGENT_ID_A || '0'),
    NAME: 'DataAnalyst-Alpha',
    PORT: parseInt(process.env.PORT_A || '7378')
  },
  
  // Agent B Configuration (Content Generation Specialist)
  AGENT_B: {
    API_KEY: process.env.OPENSERV_API_KEY_2 || process.env.OPENSERV_API_KEY || '',
    AGENT_ID: parseInt(process.env.AGENT_ID_B || '0'),
    NAME: 'ContentGen-Beta',
    PORT: parseInt(process.env.PORT_B || '7379')
  }
}

// Validate required configuration
if (!CONFIG.AGENT_A.API_KEY) {
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

if (!CONFIG.AGENT_A.AGENT_ID || CONFIG.AGENT_A.AGENT_ID === 0) {
  console.error('❌ Please set your AGENT_ID_A environment variable')
  console.error('   1. Find your agent ID at https://platform.openserv.ai/developer/agents')
  console.error('   2. Set AGENT_ID_A=your_actual_agent_id in .env')
  process.exit(1)
}

if (!CONFIG.AGENT_B.AGENT_ID || CONFIG.AGENT_B.AGENT_ID === 0) {
  console.error('❌ Please set your AGENT_ID_B environment variable')
  console.error('   1. Create a second agent at https://platform.openserv.ai/developer/agents')
  console.error('   2. Set AGENT_ID_B=your_second_agent_id in .env')
  process.exit(1)
}

console.log('🚀 Starting Multi-Agent Servers')
console.log('================================')
console.log(`Workspace ID: ${CONFIG.WORKSPACE_ID}`)
console.log(`Agent A: ${CONFIG.AGENT_A.NAME} (ID: ${CONFIG.AGENT_A.AGENT_ID}) → Port ${CONFIG.AGENT_A.PORT}`)
console.log(`Agent B: ${CONFIG.AGENT_B.NAME} (ID: ${CONFIG.AGENT_B.AGENT_ID}) → Port ${CONFIG.AGENT_B.PORT}`)
console.log('')

// ============================================================================
// 🤖 AGENT A: DATA ANALYSIS SPECIALIST
// ============================================================================

const dataAnalysisAgent = new Agent({
  systemPrompt: `You are ${CONFIG.AGENT_A.NAME}, a specialized data analysis agent. 
    You excel at processing data, generating insights, and creating analytical reports.`,
  apiKey: CONFIG.AGENT_A.API_KEY,
  port: CONFIG.AGENT_A.PORT
})

dataAnalysisAgent.addCapabilities([
  {
    name: 'analyzeDataset',
    description: 'Analyze a dataset and provide statistical insights',
    schema: z.object({
      dataType: z.enum(['sales', 'user', 'financial', 'performance']).describe('Type of data to analyze'),
      timeframe: z.string().describe('Time period for analysis'),
      metrics: z.array(z.string()).describe('Specific metrics to calculate')
    }),
    async run({ args }) {
      const { dataType, timeframe, metrics } = args
      
      const analysisResults = {
        agent: CONFIG.AGENT_A.NAME,
        agentId: CONFIG.AGENT_A.AGENT_ID,
        port: CONFIG.AGENT_A.PORT,
        dataType,
        timeframe,
        metrics,
        insights: [
          `${dataType} data shows 15% growth over ${timeframe}`,
          `Key metric ${metrics[0]} increased by 23%`,
          `Identified 3 significant trends in the dataset`
        ],
        timestamp: new Date().toISOString()
      }
      
      console.log(`📊 [${CONFIG.AGENT_A.NAME}:${CONFIG.AGENT_A.PORT}] Completed data analysis`)
      
      return JSON.stringify(analysisResults, null, 2)
    }
  },
  {
    name: 'identifyAgent',
    description: 'Identify this specific agent instance',
    schema: z.object({}),
    async run() {
      const info = `I am ${CONFIG.AGENT_A.NAME} (ID: ${CONFIG.AGENT_A.AGENT_ID}) running on port ${CONFIG.AGENT_A.PORT}. I specialize in data analysis.`
      console.log(`🔍 [${CONFIG.AGENT_A.NAME}:${CONFIG.AGENT_A.PORT}] Agent identification requested`)
      return info
    }
  }
])

// ============================================================================
// 🤖 AGENT B: CONTENT GENERATION SPECIALIST
// ============================================================================

const contentGenerationAgent = new Agent({
  systemPrompt: `You are ${CONFIG.AGENT_B.NAME}, a specialized content generation agent. 
    You excel at creating marketing content, documentation, and communication materials.`,
  apiKey: CONFIG.AGENT_B.API_KEY,
  port: CONFIG.AGENT_B.PORT
})

contentGenerationAgent.addCapabilities([
  {
    name: 'createMarketingContent',
    description: 'Create marketing content for various platforms',
    schema: z.object({
      platform: z.enum(['twitter', 'linkedin', 'blog', 'email']).describe('Target platform'),
      topic: z.string().describe('Content topic or theme'),
      tone: z.enum(['professional', 'casual', 'promotional', 'educational']).describe('Content tone')
    }),
    async run({ args }) {
      const { platform, topic, tone } = args
      
      const contentTemplates = {
        twitter: `🚀 ${topic} insights that will change your perspective! #Innovation #Tech`,
        linkedin: `Exciting developments in ${topic} that every professional should know about...`,
        blog: `# Understanding ${topic}: A Comprehensive Guide\n\nIn today's landscape, ${topic} has become increasingly important...`,
        email: `Subject: Latest Updates on ${topic}\n\nDear Valued Reader,\n\nWe're excited to share the latest insights about ${topic}...`
      }
      
      const content = {
        agent: CONFIG.AGENT_B.NAME,
        agentId: CONFIG.AGENT_B.AGENT_ID,
        port: CONFIG.AGENT_B.PORT,
        platform,
        topic,
        tone,
        content: contentTemplates[platform],
        timestamp: new Date().toISOString()
      }
      
      console.log(`✍️  [${CONFIG.AGENT_B.NAME}:${CONFIG.AGENT_B.PORT}] Created ${platform} content`)
      
      return JSON.stringify(content, null, 2)
    }
  },
  {
    name: 'identifyAgent',
    description: 'Identify this specific agent instance',
    schema: z.object({}),
    async run() {
      const info = `I am ${CONFIG.AGENT_B.NAME} (ID: ${CONFIG.AGENT_B.AGENT_ID}) running on port ${CONFIG.AGENT_B.PORT}. I specialize in content generation.`
      console.log(`🔍 [${CONFIG.AGENT_B.NAME}:${CONFIG.AGENT_B.PORT}] Agent identification requested`)
      return info
    }
  }
])

// ============================================================================
// 📁 CREATE AND UPLOAD INPUT FILES
// ============================================================================

async function createAndUploadInputFiles() {
  console.log('\n📁 Creating and uploading input files to workspace...')
  console.log('=' .repeat(70))
  
  try {
    // 1. Create Q4 Sales Data CSV
    const q4SalesData = `Date,Region,Product,Sales,Units,Revenue
2023-10-01,North America,Enterprise Software,156000,45,2340000
2023-10-15,Europe,Mobile App,89000,120,1068000
2023-11-01,Asia Pacific,Enterprise Software,203000,67,3248000
2023-11-15,North America,Mobile App,145000,89,1305000
2023-12-01,Europe,Enterprise Software,178000,52,2848000
2023-12-15,Asia Pacific,Mobile App,167000,134,2004000
2023-12-31,Global,Year End Summary,938000,507,12813000`

    await dataAnalysisAgent.uploadFile({
      workspaceId: CONFIG.WORKSPACE_ID,
      path: 'q4-sales-data.csv',
      file: q4SalesData,
      skipSummarizer: false,
      taskIds: []
    })
    
    console.log('📊 [DataAnalyst-Alpha] Uploaded q4-sales-data.csv')
    
    // 2. Create Marketing Brief
    const marketingBrief = `# Q1 Marketing Campaign Brief

## Campaign Overview
**Campaign Name:** "Data-Driven Growth 2024"
**Duration:** Q1 2024 (January - March)
**Target Audience:** Enterprise clients and mobile users

## Key Messages
- 23% growth in enterprise segment
- 15% increase in mobile engagement
- Data-driven decision making
- Innovation and reliability

## Platforms
- Twitter: Short, engaging posts with growth stats
- LinkedIn: Professional insights and case studies
- Blog: Detailed analysis and thought leadership
- Email: Personalized customer communications

## Brand Guidelines
- Professional yet approachable tone
- Use data points to support claims
- Consistent OpenServ branding
- Focus on customer success stories

## Success Metrics
- Engagement rate increase: 20%
- Lead generation: 500 new qualified leads
- Brand awareness: 15% increase in recognition`

    await contentGenerationAgent.uploadFile({
      workspaceId: CONFIG.WORKSPACE_ID,
      path: 'marketing-brief-q1.md',
      file: marketingBrief,
      skipSummarizer: false,
      taskIds: []
    })
    
    console.log('📝 [ContentGen-Beta] Uploaded marketing-brief-q1.md')
    
    // 3. Create Analysis Insights JSON (for collaboration)
    const analysisInsights = {
      "analysis_date": "2023-12-31",
      "analyst": "DataAnalyst-Alpha",
      "workspace_id": CONFIG.WORKSPACE_ID,
      "key_findings": {
        "enterprise_growth": {
          "percentage": 23,
          "revenue_impact": "$8,436,000",
          "trend": "accelerating",
          "regions": ["North America", "Asia Pacific", "Europe"]
        },
        "mobile_engagement": {
          "percentage": 15,
          "user_increase": "343 new enterprise users",
          "trend": "consistent",
          "platforms": ["iOS", "Android", "Web"]
        },
        "seasonal_patterns": {
          "q4_peak": "December shows 34% higher activity",
          "regional_variance": "Asia Pacific leads with 28% growth",
          "product_mix": "Enterprise software outperforming mobile by 8%"
        }
      },
      "recommendations": [
        "Focus marketing spend on enterprise segment",
        "Expand mobile user acquisition in Q1",
        "Leverage Q4 momentum for Q1 campaigns",
        "Increase Asia Pacific market investment"
      ],
      "data_confidence": 0.95,
      "next_steps": [
        "Create targeted enterprise marketing content",
        "Develop mobile engagement campaigns",
        "Plan Q1 product launches for high-growth regions"
      ]
    }

    await dataAnalysisAgent.uploadFile({
      workspaceId: CONFIG.WORKSPACE_ID,
      path: 'q4-analysis-insights.json',
      file: JSON.stringify(analysisInsights, null, 2),
      skipSummarizer: true,
      taskIds: []
    })
    
    console.log('🔍 [DataAnalyst-Alpha] Uploaded q4-analysis-insights.json')
    
    // 4. List all files to confirm uploads
    const files = await dataAnalysisAgent.getFiles({
      workspaceId: CONFIG.WORKSPACE_ID
    })
    
    console.log('\n📂 Workspace files uploaded:')
    files.forEach((file: any, index: number) => {
      console.log(`   ${index + 1}. ${file.path || file.name || 'Unknown file'}`)
    })
    
    console.log('✅ All input files created and uploaded successfully!')
    
  } catch (error) {
    console.error('❌ Error uploading files:', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

// ============================================================================
// 🧪 WORKSPACE TESTING FUNCTIONS
// ============================================================================

async function testAgentA() {
  console.log(`\n🧪 Testing ${CONFIG.AGENT_A.NAME} - Creating Data Analysis Task`)
  console.log('=' .repeat(70))
  
  try {
    // Create a task for Agent A
    const analysisTask = await dataAnalysisAgent.createTask({
      workspaceId: CONFIG.WORKSPACE_ID,
      assignee: CONFIG.AGENT_A.AGENT_ID,
      description: `[${CONFIG.AGENT_A.NAME}] Q4 Sales Data Analysis`,
      body: 'Analyze Q4 sales performance data to identify trends and growth opportunities',
      input: 'q4-sales-data.csv',
      expectedOutput: 'Comprehensive analysis report with insights and recommendations',
      dependencies: []
    })
    
    console.log(`📋 [${CONFIG.AGENT_A.NAME}] Created task: ${analysisTask.id}`)
    
    // Update task status
    await dataAnalysisAgent.updateTaskStatus({
      workspaceId: CONFIG.WORKSPACE_ID,
      taskId: analysisTask.id,
      status: 'in-progress'
    })
    
    // Add task log
    await dataAnalysisAgent.addLogToTask({
      workspaceId: CONFIG.WORKSPACE_ID,
      taskId: analysisTask.id,
      severity: 'info',
      type: 'text',
      body: `${CONFIG.AGENT_A.NAME} (Port: ${CONFIG.AGENT_A.PORT}) starting data analysis workflow`
    })
    
    // Simulate processing
    console.log(`⚙️  [${CONFIG.AGENT_A.NAME}] Processing sales data analysis...`)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Complete task
    await dataAnalysisAgent.updateTaskStatus({
      workspaceId: CONFIG.WORKSPACE_ID,
      taskId: analysisTask.id,
      status: 'done'
    })
    
    await dataAnalysisAgent.addLogToTask({
      workspaceId: CONFIG.WORKSPACE_ID,
      taskId: analysisTask.id,
      severity: 'info',
      type: 'text',
      body: `${CONFIG.AGENT_A.NAME} completed analysis with 95% confidence - identified 3 key growth opportunities`
    })
    
    console.log(`✅ [${CONFIG.AGENT_A.NAME}] Task ${analysisTask.id} completed successfully!`)
    return analysisTask
    
  } catch (error) {
    console.error(`❌ [${CONFIG.AGENT_A.NAME}] Error:`, error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

async function testAgentB() {
  console.log(`\n🧪 Testing ${CONFIG.AGENT_B.NAME} - Creating Content Generation Task`)
  console.log('=' .repeat(70))
  
  try {
    // Create a task for Agent B
    const contentTask = await contentGenerationAgent.createTask({
      workspaceId: CONFIG.WORKSPACE_ID,
      assignee: CONFIG.AGENT_B.AGENT_ID,
      description: `[${CONFIG.AGENT_B.NAME}] Marketing Campaign Content Suite`,
      body: 'Generate comprehensive marketing content for Q1 campaign across multiple platforms',
      input: 'marketing-brief-q1.md',
      expectedOutput: 'Multi-platform content package with consistent messaging',
      dependencies: []
    })
    
    console.log(`📋 [${CONFIG.AGENT_B.NAME}] Created task: ${contentTask.id}`)
    
    // Update task status
    await contentGenerationAgent.updateTaskStatus({
      workspaceId: CONFIG.WORKSPACE_ID,
      taskId: contentTask.id,
      status: 'in-progress'
    })
    
    // Add task log
    await contentGenerationAgent.addLogToTask({
      workspaceId: CONFIG.WORKSPACE_ID,
      taskId: contentTask.id,
      severity: 'info',
      type: 'text',
      body: `${CONFIG.AGENT_B.NAME} (Port: ${CONFIG.AGENT_B.PORT}) starting content generation workflow`
    })
    
    // Simulate processing
    console.log(`✍️  [${CONFIG.AGENT_B.NAME}] Generating marketing content suite...`)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Complete task
    await contentGenerationAgent.updateTaskStatus({
      workspaceId: CONFIG.WORKSPACE_ID,
      taskId: contentTask.id,
      status: 'done'
    })
    
    await contentGenerationAgent.addLogToTask({
      workspaceId: CONFIG.WORKSPACE_ID,
      taskId: contentTask.id,
      severity: 'info',
      type: 'text',
      body: `${CONFIG.AGENT_B.NAME} completed content generation - created 5 platform variations with consistent branding`
    })
    
    console.log(`✅ [${CONFIG.AGENT_B.NAME}] Task ${contentTask.id} completed successfully!`)
    return contentTask
    
  } catch (error) {
    console.error(`❌ [${CONFIG.AGENT_B.NAME}] Error:`, error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

async function testAgentCollaboration() {
  console.log(`\n🤝 Testing Agent Collaboration in Workspace ${CONFIG.WORKSPACE_ID}`)
  console.log('=' .repeat(70))
  
  try {
    // Agent A sends a message to the workspace
    await dataAnalysisAgent.sendChatMessage({
      workspaceId: CONFIG.WORKSPACE_ID,
      agentId: CONFIG.AGENT_A.AGENT_ID,
      message: `🔍 ${CONFIG.AGENT_A.NAME} reporting: I've completed the Q4 sales analysis. Found strong growth patterns in enterprise segment (+23%) and mobile engagement (+15%). This data could inform our marketing strategy.`
    })
    
    console.log(`💬 [${CONFIG.AGENT_A.NAME}] Sent analysis results to workspace`)
    
    // Agent B responds
    await contentGenerationAgent.sendChatMessage({
      workspaceId: CONFIG.WORKSPACE_ID,
      agentId: CONFIG.AGENT_B.AGENT_ID,
      message: `📝 ${CONFIG.AGENT_B.NAME} here! Thanks for the insights! I can create targeted marketing content highlighting the enterprise growth and mobile engagement trends. Shall I generate a campaign focusing on these strengths?`
    })
    
    console.log(`💬 [${CONFIG.AGENT_B.NAME}] Responded with collaboration offer`)
    
    // Create a collaborative task - Agent A creates a task for Agent B
    const collaborativeTask = await dataAnalysisAgent.createTask({
      workspaceId: CONFIG.WORKSPACE_ID,
      assignee: CONFIG.AGENT_B.AGENT_ID, // Assigning to Agent B
      description: `[COLLABORATION] Data-Driven Marketing Content from ${CONFIG.AGENT_A.NAME} insights`,
      body: 'Create marketing content that highlights Q4 analysis findings: 23% enterprise growth and 15% mobile engagement increase',
      input: 'q4-analysis-insights.json',
      expectedOutput: 'Marketing content suite emphasizing data-driven growth achievements',
      dependencies: []
    })
    
    console.log(`🤝 [${CONFIG.AGENT_A.NAME}] Created collaborative task ${collaborativeTask.id} for ${CONFIG.AGENT_B.NAME}`)
    
    // Agent B acknowledges the collaborative task
    await contentGenerationAgent.addLogToTask({
      workspaceId: CONFIG.WORKSPACE_ID,
      taskId: collaborativeTask.id,
      severity: 'info',
      type: 'text',
      body: `${CONFIG.AGENT_B.NAME} received collaborative task from ${CONFIG.AGENT_A.NAME} - will create data-driven content highlighting enterprise growth and mobile engagement trends`
    })
    
    console.log(`✅ Multi-agent collaboration successfully demonstrated!`)
    return collaborativeTask
    
  } catch (error) {
    console.error('❌ Agent collaboration error:', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

// ============================================================================
// 🚀 START SERVERS AND RUN TESTS
// ============================================================================

async function startBothAgents() {
  console.log('🚀 Starting both agents...')
  
  try {
    console.log(`🤖 Starting ${CONFIG.AGENT_A.NAME} on port ${CONFIG.AGENT_A.PORT}...`)
    
    // Start Agent A (port already configured in constructor)
    dataAnalysisAgent.start()
    
    // Wait a moment to avoid any startup conflicts
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log(`🤖 Starting ${CONFIG.AGENT_B.NAME} on port ${CONFIG.AGENT_B.PORT}...`)
    
    // Start Agent B (port already configured in constructor)
    contentGenerationAgent.start()
    
    console.log('')
    console.log('✅ Both agents are now running!')
    console.log('')
    console.log('🔗 Tunneling Commands:')
    console.log(`   Terminal 1: ngrok http ${CONFIG.AGENT_A.PORT}`)
    console.log(`   Terminal 2: ngrok http ${CONFIG.AGENT_B.PORT}`)
    console.log('')
    console.log('📋 Agent Endpoints:')
    console.log(`   ${CONFIG.AGENT_A.NAME}: https://[your-ngrok-url-1].ngrok-free.app`)
    console.log(`   ${CONFIG.AGENT_B.NAME}: https://[your-ngrok-url-2].ngrok-free.app`)
    console.log('')
    console.log('🏢 Both agents will work in the same workspace:', CONFIG.WORKSPACE_ID)
    
  } catch (error) {
    console.error('❌ Error starting agents:', error)
  }
}

async function runWorkspaceTests() {
  console.log('\n🎯 Starting Multi-Agent Workspace Tests...')
  console.log('=' .repeat(70))
  
  try {
    // Test Agent A
    const taskA = await testAgentA()
    
    // Test Agent B
    const taskB = await testAgentB()
    
    // Test collaboration
    const collaborativeTask = await testAgentCollaboration()
    
    // Display results
    console.log('\n📊 MULTI-AGENT WORKSPACE TEST RESULTS')
    console.log('=' .repeat(70))
    console.log(`✅ ${CONFIG.AGENT_A.NAME} Task: ${taskA.id} (Data Analysis)`)
    console.log(`✅ ${CONFIG.AGENT_B.NAME} Task: ${taskB.id} (Content Generation)`)
    console.log(`✅ Collaborative Task: ${collaborativeTask.id} (Cross-Agent)`)
    console.log(`🏢 Workspace: ${CONFIG.WORKSPACE_ID}`)
    console.log(`🤖 Agent A: ${CONFIG.AGENT_A.NAME} (ID: ${CONFIG.AGENT_A.AGENT_ID}, Port: ${CONFIG.AGENT_A.PORT})`)
    console.log(`🤖 Agent B: ${CONFIG.AGENT_B.NAME} (ID: ${CONFIG.AGENT_B.AGENT_ID}, Port: ${CONFIG.AGENT_B.PORT})`)
    console.log('')
    console.log('🎉 Multi-agent workspace testing completed successfully!')
    console.log('📈 Both agents are working independently in the same workspace!')
    
  } catch (error) {
    console.error('❌ Workspace tests failed:', error instanceof Error ? error.message : 'Unknown error')
  }
}

async function main() {
  // Start both agent servers
  await startBothAgents()
  
  // Wait for servers to fully start
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  // Create and upload input files
  await createAndUploadInputFiles()
  
  // Run workspace tests
  await runWorkspaceTests()
}

// Start everything
main().catch(console.error)

// Export for testing
export { dataAnalysisAgent, contentGenerationAgent, CONFIG } 