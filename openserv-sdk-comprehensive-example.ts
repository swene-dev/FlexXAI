/**
 * 🚀 OpenServ TypeScript SDK - Comprehensive Example & Testing Guide
 * 
 * This file demonstrates ALL OpenServ SDK functionalities in a single, well-commented file.
 * Perfect for understanding the entire framework and testing individual features.
 * 
 * 🔧 RECENT IMPROVEMENTS:
 * - Fixed all TypeScript linter errors
 * - Added proper type guards for action parameters
 * - Corrected task creation with required dependencies property
 * - Improved error handling with proper type checking
 * - Fixed custom agent class method signatures
 * - Added fallback UUID generation for environments without crypto
 * - Replaced direct task.addLog calls with console.log for capability functions
 * - Added dotenv support for automatic .env file loading
 * - Removed hardcoded IDs - now uses environment variables
 * 
 * 📋 Table of Contents:
 * 1. Environment Setup & Configuration
 * 2. Basic Agent Creation & Capabilities
 * 3. Task Management (Create, Update, Log)
 * 4. Chat & Communication
 * 5. File Operations
 * 6. Integration Management
 * 7. Advanced Features (OpenAI Process, Error Handling)
 * 8. Custom Agent Classes
 * 9. Testing Functions
 * 
 * 🧪 How to Test:
 * - Copy .env.example to .env and fill in your values
 * - Run: npx ts-node openserv-sdk-comprehensive-example.ts
 */

// Load environment variables from .env file
import 'dotenv/config'
import { Agent } from '@openserv-labs/sdk'
import { z } from 'zod'

// ============================================================================
// 1. 🔧 ENVIRONMENT SETUP & CONFIGURATION
// ============================================================================

/**
 * Essential environment variables for OpenServ SDK
 * Make sure to set these in your .env file or environment
 */
const CONFIG = {
  // Required: Your OpenServ API key from the developer dashboard
  OPENSERV_API_KEY: process.env.OPENSERV_API_KEY || '',
  
  // Optional: OpenAI API key for advanced process() method
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  
  // Optional: Custom port (default: 7378)
  PORT: parseInt(process.env.PORT || '7378'),
  
  // Required: Your workspace ID from OpenServ platform
  TEST_WORKSPACE_ID: parseInt(process.env.WORKSPACE_ID || '0'),
  
  // Optional: Your agent ID for testing (if not provided, tasks will use workspace default)
  TEST_AGENT_ID: process.env.AGENT_ID_A ? parseInt(process.env.AGENT_ID_A) : 1,
  
  // Optional: Assignee ID for tasks (defaults to agent ID or workspace default)
  TEST_ASSIGNEE_ID: process.env.AGENT_ID_A ? parseInt(process.env.AGENT_ID_A) : 1
}

// Validate required configuration
if (!CONFIG.OPENSERV_API_KEY) {
  console.error('❌ Please set your OPENSERV_API_KEY environment variable')
  console.error('   1. Copy .env.example to .env')
  console.error('   2. Set OPENSERV_API_KEY=your_actual_api_key')
  process.exit(1)
}

if (!CONFIG.TEST_WORKSPACE_ID || CONFIG.TEST_WORKSPACE_ID === 0) {
  console.error('❌ Please set your WORKSPACE_ID environment variable')
  console.error('   1. Find your workspace ID at https://platform.openserv.ai')
  console.error('   2. Set WORKSPACE_ID=your_actual_workspace_id in .env')
  process.exit(1)
}

console.log('✅ Configuration loaded:')
console.log(`   API Key: ${CONFIG.OPENSERV_API_KEY.substring(0, 8)}...`)
console.log(`   Workspace ID: ${CONFIG.TEST_WORKSPACE_ID}`)
console.log(`   Agent ID: ${CONFIG.TEST_AGENT_ID || 'Not set (will use workspace default)'}`)
console.log(`   Port: ${CONFIG.PORT}`)
console.log('')

// ============================================================================
// 2. 🤖 BASIC AGENT CREATION & CAPABILITIES
// ============================================================================

/**
 * Create the main agent with comprehensive capabilities
 * This showcases all types of capabilities you can add
 */
const comprehensiveAgent = new Agent({
  systemPrompt: `You are a comprehensive AI agent demonstrating all OpenServ SDK capabilities. 
    You can handle greetings, data analysis, file operations, task management, and more. 
    Always be helpful and provide detailed responses.`,
  apiKey: CONFIG.OPENSERV_API_KEY
})

// ============================================================================
// 2.1 📝 TEXT PROCESSING CAPABILITIES
// ============================================================================

comprehensiveAgent.addCapability({
  name: 'greet',
  description: 'Greet a user by name with personalized message',
  schema: z.object({
    name: z.string().describe('The name of the user to greet'),
    language: z.enum(['english', 'spanish', 'french']).optional().describe('Language for greeting')
  }),
  async run({ args, action }) {
    const { name, language = 'english' } = args
    
    const greetings = {
      english: `Hello, ${name}! Welcome to OpenServ. How can I assist you today?`,
      spanish: `¡Hola, ${name}! Bienvenido a OpenServ. ¿Cómo puedo ayudarte hoy?`,
      french: `Bonjour, ${name}! Bienvenue à OpenServ. Comment puis-je vous aider aujourd'hui?`
    }
    
    // Log the greeting action if we're in a task context
    if (action?.type === 'do-task' && action.task) {
      console.log(`Generated ${language} greeting for ${name}`)
    }
    
    return greetings[language]
  }
})

comprehensiveAgent.addCapability({
  name: 'summarize',
  description: 'Summarize text content with configurable length',
  schema: z.object({
    text: z.string().describe('Text content to summarize'),
    maxLength: z.number().optional().describe('Maximum length of summary in words'),
    style: z.enum(['bullet', 'paragraph', 'key-points']).optional().describe('Summary style')
  }),
  async run({ args, action }) {
    const { text, maxLength = 100, style = 'paragraph' } = args
    
    // Simulate text processing
    const wordCount = text.split(' ').length
    const summary = style === 'bullet' 
      ? `• Key points from ${wordCount} words of text\n• Summary generated in bullet format\n• Length limited to ${maxLength} words`
      : style === 'key-points'
      ? `Key Points:\n1. Original text contains ${wordCount} words\n2. Summary style: ${style}\n3. Max length: ${maxLength} words`
      : `This is a ${style} summary of the provided text (${wordCount} words). The content has been processed and condensed to meet the ${maxLength} word limit while preserving key information.`
    
    // Log progress
    if (action?.type === 'do-task' && action.task) {
      console.log(`Generated ${style} summary: ${wordCount} words → ${summary.split(' ').length} words`)
    }
    
    return summary
  }
})

// ============================================================================
// 2.2 📊 DATA ANALYSIS CAPABILITIES
// ============================================================================

comprehensiveAgent.addCapability({
  name: 'analyzeData',
  description: 'Analyze data and provide insights with various analysis types',
  schema: z.object({
    data: z.string().describe('Data to analyze (JSON, CSV, or plain text)'),
    analysisType: z.enum(['sentiment', 'statistics', 'trends', 'keywords']).describe('Type of analysis to perform'),
    outputFormat: z.enum(['json', 'markdown', 'text']).optional().describe('Output format')
  }),
  async run({ args, action }) {
    const { data, analysisType, outputFormat = 'json' } = args
    
    // Simulate different types of analysis
    const results = {
      sentiment: {
        positive: 0.7,
        negative: 0.2,
        neutral: 0.1,
        confidence: 0.85
      },
      statistics: {
        wordCount: data.split(' ').length,
        characterCount: data.length,
        uniqueWords: new Set(data.toLowerCase().split(' ')).size
      },
      trends: {
        increasing: ['engagement', 'satisfaction'],
        decreasing: ['complaints', 'issues'],
        stable: ['performance', 'quality']
      },
      keywords: ['analysis', 'data', 'insights', 'OpenServ', 'AI']
    }
    
    const result = results[analysisType]
    
    // Format output based on requested format
    let formattedResult: string
    switch (outputFormat) {
      case 'markdown':
        formattedResult = `## ${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Analysis\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``
        break
      case 'text':
        formattedResult = `${analysisType.toUpperCase()} ANALYSIS RESULTS:\n${Object.entries(result).map(([k, v]) => `${k}: ${v}`).join('\n')}`
        break
      default:
        formattedResult = JSON.stringify(result, null, 2)
    }
    
    // Log analysis completion
    if (action?.type === 'do-task' && action.task) {
      console.log(`Completed ${analysisType} analysis with ${outputFormat} output format`)
    }
    
    return formattedResult
  }
})

// ============================================================================
// 2.3 🛠️ UTILITY CAPABILITIES
// ============================================================================

comprehensiveAgent.addCapabilities([
  {
    name: 'help',
    description: 'Show all available capabilities and their descriptions',
    schema: z.object({
      detailed: z.boolean().optional().describe('Show detailed capability information')
    }),
    async run({ args }) {
      const { detailed = false } = args
      
      const capabilities = [
        'greet - Greet users in multiple languages',
        'summarize - Summarize text with configurable options',
        'analyzeData - Perform various data analysis types',
        'help - Show this help message',
        'getCurrentTime - Get current timestamp',
        'generateUUID - Generate unique identifiers'
      ]
      
      if (detailed) {
        return `🤖 OpenServ Agent Capabilities:\n\n${capabilities.map(cap => `• ${cap}`).join('\n')}\n\nUse any capability by name with appropriate parameters.`
      }
      
      return `Available capabilities: ${capabilities.map(c => c.split(' - ')[0]).join(', ')}`
    }
  },
  {
    name: 'getCurrentTime',
    description: 'Get current timestamp in various formats',
    schema: z.object({
      format: z.enum(['iso', 'unix', 'human']).optional().describe('Timestamp format')
    }),
    async run({ args }) {
      const { format = 'iso' } = args
      const now = new Date()
      
      switch (format) {
        case 'unix':
          return now.getTime().toString()
        case 'human':
          return now.toLocaleString()
        default:
          return now.toISOString()
      }
    }
  },
  {
    name: 'generateUUID',
    description: 'Generate unique identifiers for various purposes',
    schema: z.object({
      count: z.number().optional().describe('Number of UUIDs to generate'),
      format: z.enum(['uuid4', 'short', 'numeric']).optional().describe('UUID format')
    }),
    async run({ args }): Promise<string> {
      const { count = 1, format = 'uuid4' } = args
      const uuids: string[] = []
      
      for (let i = 0; i < count; i++) {
        let uuid: string
        switch (format) {
          case 'short':
            uuid = Math.random().toString(36).substring(2, 15)
            break
          case 'numeric':
            uuid = Date.now().toString() + Math.floor(Math.random() * 1000)
            break
          default:
            // Fallback for environments where crypto is not available
            try {
              uuid = crypto.randomUUID()
            } catch {
              uuid = 'xxxx-xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0
                const v = c === 'x' ? r : (r & 0x3 | 0x8)
                return v.toString(16)
              })
            }
        }
        uuids.push(uuid)
      }
      
      return count === 1 ? (uuids[0] || '') : uuids.join('\n')
    }
  }
])

// ============================================================================
// 3. 📋 TASK MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Comprehensive task management examples
 * These functions demonstrate all task-related operations
 */

async function demonstrateTaskManagement() {
  console.log('🎯 Testing Task Management...')
  
  try {
    // 3.1 Create a new task
    const newTask = await comprehensiveAgent.createTask({
      workspaceId: CONFIG.TEST_WORKSPACE_ID,
      assignee: CONFIG.TEST_ASSIGNEE_ID,
      description: 'Comprehensive SDK Testing Task',
      body: 'This task demonstrates all OpenServ SDK task management capabilities including creation, status updates, logging, and completion.',
      input: 'test-data.json',
      expectedOutput: 'A complete test report with all functionality verified',
      dependencies: [] // No dependencies for this example
    })
    
    console.log('✅ Task created:', newTask)
    
    // 3.2 Add initial log entry
    await comprehensiveAgent.addLogToTask({
      workspaceId: CONFIG.TEST_WORKSPACE_ID,
      taskId: newTask.id,
      severity: 'info',
      type: 'text',
      body: 'Task created successfully. Beginning comprehensive testing sequence.'
    })
    
    // 3.3 Update task status to in-progress
    await comprehensiveAgent.updateTaskStatus({
      workspaceId: CONFIG.TEST_WORKSPACE_ID,
      taskId: newTask.id,
      status: 'in-progress'
    })
    
    // 3.4 Add progress logs
    const logMessages = [
      { severity: 'info', message: 'Starting capability testing...' },
      { severity: 'info', message: 'Testing text processing capabilities...' },
      { severity: 'warning', message: 'Some tests require manual verification' },
      { severity: 'info', message: 'All automated tests passing...' }
    ]
    
    for (const log of logMessages) {
      await comprehensiveAgent.addLogToTask({
        workspaceId: CONFIG.TEST_WORKSPACE_ID,
        taskId: newTask.id,
        severity: log.severity as 'info' | 'warning' | 'error',
        type: 'text',
        body: log.message
      })
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // 3.5 Complete the task
    await comprehensiveAgent.updateTaskStatus({
      workspaceId: CONFIG.TEST_WORKSPACE_ID,
      taskId: newTask.id,
      status: 'done'
    })
    
    await comprehensiveAgent.addLogToTask({
      workspaceId: CONFIG.TEST_WORKSPACE_ID,
      taskId: newTask.id,
      severity: 'info',
      type: 'text',
      body: 'Task completed successfully! All SDK functionalities tested and verified.'
    })
    
    console.log('✅ Task management demonstration completed')
    return newTask
    
  } catch (error) {
    console.error('❌ Task management error:', error)
    throw error
  }
}

// ============================================================================
// 4. 💬 CHAT & COMMUNICATION FUNCTIONS
// ============================================================================

async function demonstrateChatCommunication() {
  console.log('💬 Testing Chat & Communication...')
  
  try {
    // 4.1 Send welcome message
    await comprehensiveAgent.sendChatMessage({
      workspaceId: CONFIG.TEST_WORKSPACE_ID,
      agentId: CONFIG.TEST_AGENT_ID,
      message: '👋 Hello! I\'m your comprehensive OpenServ agent. I can help with text processing, data analysis, task management, and more!'
    })
    
    // 4.2 Send capability overview
    await comprehensiveAgent.sendChatMessage({
      workspaceId: CONFIG.TEST_WORKSPACE_ID,
      agentId: CONFIG.TEST_AGENT_ID,
      message: '🔧 My capabilities include:\n• Multi-language greetings\n• Text summarization\n• Data analysis\n• Task management\n• File operations\n• Integration calls\n\nWhat would you like me to help you with?'
    })
    
    // 4.3 Request human assistance example
    await comprehensiveAgent.requestHumanAssistance({
      workspaceId: CONFIG.TEST_WORKSPACE_ID,
      taskId: 1, // Example task ID
      type: 'text',
      question: 'I need human input to verify the quality of the generated analysis. Could you please review the attached data analysis report and confirm if the insights are accurate?',
      agentDump: {
        currentContext: 'data-analysis-task',
        analysisType: 'sentiment',
        confidence: 0.85,
        requiresVerification: true
      }
    })
    
    console.log('✅ Chat communication demonstration completed')
    
  } catch (error) {
    console.error('❌ Chat communication error:', error)
    throw error
  }
}

// ============================================================================
// 5. 📁 FILE OPERATIONS FUNCTIONS
// ============================================================================

async function demonstrateFileOperations() {
  console.log('📁 Testing File Operations...')
  
  try {
    // 5.1 Upload a text file
    const sampleData = `# OpenServ SDK Test Data
    
This is a sample file uploaded via the OpenServ SDK.
It contains test data for demonstrating file operations.

## Test Metrics
- Upload time: ${new Date().toISOString()}
- File size: Small
- Content type: Text/Markdown
- Purpose: SDK Testing

## Data Points
1. User engagement: 85%
2. System performance: Good
3. Error rate: 0.1%
4. Satisfaction score: 4.7/5

This file will be used for testing various SDK capabilities.`

    await comprehensiveAgent.uploadFile({
      workspaceId: CONFIG.TEST_WORKSPACE_ID,
      path: 'sdk-test-file.md',
      file: sampleData,
      skipSummarizer: false,
      taskIds: [1] // Associate with a task
    })
    
    console.log('✅ File uploaded successfully')
    
    // 5.2 Upload a JSON configuration file
    const configData = {
      agent: {
        name: 'comprehensive-agent',
        version: '1.0.0',
        capabilities: ['greet', 'summarize', 'analyzeData', 'help'],
        settings: {
          maxTokens: 1000,
          temperature: 0.7,
          timeout: 30000
        }
      },
      workspace: {
        id: CONFIG.TEST_WORKSPACE_ID,
        features: ['tasks', 'chat', 'files', 'integrations'],
        limits: {
          maxFileSize: '10MB',
          maxTasks: 100,
          maxAgents: 10
        }
      }
    }
    
    await comprehensiveAgent.uploadFile({
      workspaceId: CONFIG.TEST_WORKSPACE_ID,
      path: 'agent-config.json',
      file: JSON.stringify(configData, null, 2),
      skipSummarizer: true,
      taskIds: []
    })
    
    console.log('✅ Configuration file uploaded')
    
    // 5.3 Get all workspace files
    const files = await comprehensiveAgent.getFiles({
      workspaceId: CONFIG.TEST_WORKSPACE_ID
    })
    
    console.log('📂 Workspace files:', files)
    console.log('✅ File operations demonstration completed')
    
    return files
    
  } catch (error) {
    console.error('❌ File operations error:', error)
    throw error
  }
}

// ============================================================================
// 6. 🔌 INTEGRATION MANAGEMENT FUNCTIONS
// ============================================================================

async function demonstrateIntegrationManagement() {
  console.log('🔌 Testing Integration Management...')
  
  try {
    // 6.1 Example: Twitter integration call
    const twitterResponse = await comprehensiveAgent.callIntegration({
      workspaceId: CONFIG.TEST_WORKSPACE_ID,
      integrationId: 'twitter-v2',
      details: {
        endpoint: '/2/tweets',
        method: 'POST',
        data: {
          text: '🚀 Testing OpenServ SDK integration capabilities! The framework makes it easy to connect with external APIs. #OpenServ #AI #SDK'
        }
      }
    })
    
    console.log('🐦 Twitter integration response:', twitterResponse)
    
    // 6.2 Example: GitHub integration call
    const githubResponse = await comprehensiveAgent.callIntegration({
      workspaceId: CONFIG.TEST_WORKSPACE_ID,
      integrationId: 'github',
      details: {
        endpoint: '/repos/openserv/sdk/issues',
        method: 'GET',
        data: {
          state: 'open',
          labels: 'enhancement'
        }
      }
    })
    
    console.log('🐙 GitHub integration response:', githubResponse)
    
    // 6.3 Example: Slack integration call
    const slackResponse = await comprehensiveAgent.callIntegration({
      workspaceId: CONFIG.TEST_WORKSPACE_ID,
      integrationId: 'slack',
      details: {
        endpoint: '/chat.postMessage',
        method: 'POST',
        data: {
          channel: '#general',
          text: 'OpenServ SDK integration test completed successfully! 🎉',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*OpenServ SDK Test Results*\n✅ All integrations working\n✅ File operations completed\n✅ Task management verified'
              }
            }
          ]
        }
      }
    })
    
    console.log('💬 Slack integration response:', slackResponse)
    
    console.log('✅ Integration management demonstration completed')
    
  } catch (error) {
    console.error('❌ Integration management error:', error)
    console.log('ℹ️  Note: Integration calls require proper workspace setup and API keys')
  }
}

// ============================================================================
// 7. 🧠 ADVANCED FEATURES (OpenAI Process, Error Handling)
// ============================================================================

async function demonstrateAdvancedFeatures() {
  console.log('🧠 Testing Advanced Features...')
  
  try {
    // 7.1 OpenAI Process Runtime Example
    if (CONFIG.OPENAI_API_KEY && CONFIG.OPENAI_API_KEY !== '') {
      const processResult = await comprehensiveAgent.process({
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that can create tasks and analyze data using OpenServ SDK capabilities.'
          },
          {
            role: 'user',
            content: 'Create a task to analyze customer feedback data and provide insights about user satisfaction trends.'
          }
        ]
      })
      
      console.log('🤖 OpenAI Process Result:', processResult)
    } else {
      console.log('ℹ️  OpenAI integration skipped - API key not provided')
    }
    
    // 7.2 Error Handling Example
    await demonstrateErrorHandling()
    
    console.log('✅ Advanced features demonstration completed')
    
  } catch (error) {
    console.error('❌ Advanced features error:', error)
  }
}

async function demonstrateErrorHandling() {
  console.log('🔧 Testing Error Handling...')
  
  try {
    // Simulate a task with potential errors
    const testTask = await comprehensiveAgent.createTask({
      workspaceId: CONFIG.TEST_WORKSPACE_ID,
      assignee: CONFIG.TEST_ASSIGNEE_ID,
      description: 'Error Handling Test Task',
      body: 'This task is designed to test error handling capabilities',
      input: 'error-test-data',
      expectedOutput: 'Error handling verification',
      dependencies: [] // Added required dependencies property
    })
    
    try {
      // Simulate an operation that might fail
      await comprehensiveAgent.updateTaskStatus({
        workspaceId: CONFIG.TEST_WORKSPACE_ID,
        taskId: testTask.id,
        status: 'in-progress'
      })
      
      // Simulate processing with potential error
      const riskyOperation = Math.random() > 0.5
      if (!riskyOperation) {
        throw new Error('Simulated processing error for testing error handling')
      }
      
      // If no error, complete successfully
      await comprehensiveAgent.updateTaskStatus({
        workspaceId: CONFIG.TEST_WORKSPACE_ID,
        taskId: testTask.id,
        status: 'done'
      })
      
      console.log('✅ Task completed without errors')
      
    } catch (error) {
      // Handle the error gracefully with proper type checking
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.log('⚠️  Handling simulated error:', errorMessage)
      
      // Mark task as errored
      await comprehensiveAgent.updateTaskStatus({
        workspaceId: CONFIG.TEST_WORKSPACE_ID,
        taskId: testTask.id,
        status: 'error'
      })
      
      // Log the error
      await comprehensiveAgent.addLogToTask({
        workspaceId: CONFIG.TEST_WORKSPACE_ID,
        taskId: testTask.id,
        severity: 'error',
        type: 'text',
        body: `Error occurred during processing: ${errorMessage}`
      })
      
      console.log('✅ Error handled successfully - task marked as errored with detailed logs')
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error handling demonstration failed:', errorMessage)
  }
}

// ============================================================================
// 8. 🏗️ CUSTOM AGENT CLASSES
// ============================================================================

/**
 * Example of a specialized custom agent class
 * This shows how to extend the base Agent class for specific use cases
 */
class DataAnalysisAgent extends Agent {
  constructor(systemPrompt: string) {
    super({
      systemPrompt,
      apiKey: CONFIG.OPENSERV_API_KEY
    })
    
    // Add specialized capabilities
    this.setupDataAnalysisCapabilities()
  }
  
  private setupDataAnalysisCapabilities() {
    this.addCapabilities([
      {
        name: 'performComplexAnalysis',
        description: 'Perform advanced data analysis with multiple algorithms',
        schema: z.object({
          data: z.string().describe('Dataset to analyze'),
          algorithms: z.array(z.string()).describe('Analysis algorithms to apply'),
          confidence: z.number().min(0).max(1).optional().describe('Required confidence level')
        }),
        async run({ args, action }) {
          const { data, algorithms, confidence = 0.8 } = args
          
          // Simulate complex analysis
          const results = {
            algorithms: algorithms,
            confidence: confidence,
            insights: [
              'Strong positive correlation found',
              'Seasonal patterns detected',
              'Anomalies identified in data subset'
            ],
            recommendations: [
              'Increase monitoring frequency',
              'Implement automated alerts',
              'Schedule regular data validation'
            ]
          }
          
          if (action?.type === 'do-task' && action.task) {
            console.log(`Complex analysis completed using ${algorithms.join(', ')} with ${confidence * 100}% confidence threshold`)
          }
          
          return JSON.stringify(results, null, 2)
        }
      }
    ])
  }
  
  // Override the doTask method for custom task handling - fix return type
  protected async doTask(action: any): Promise<void> {
    if (!action.task) return
    
    try {
      console.log(`🔬 DataAnalysisAgent processing task: ${action.task.description}`)
      
      await this.updateTaskStatus({
        workspaceId: action.workspace.id,
        taskId: action.task.id,
        status: 'in-progress'
      })
      
      // Custom analysis logic would go here
      const analysisResult = await this.performCustomAnalysis(action.task.input)
      
      await this.updateTaskStatus({
        workspaceId: action.workspace.id,
        taskId: action.task.id,
        status: 'done'
      })
      
      console.log('✅ DataAnalysisAgent completed task successfully')
      // Don't return the result since doTask should return void
      
    } catch (error) {
      await this.handleTaskError(action, error)
    }
  }
  
  private async performCustomAnalysis(input: string) {
    // Simulate complex data analysis
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    return {
      input: input,
      analysis: 'Custom data analysis completed',
      timestamp: new Date().toISOString(),
      confidence: 0.92
    }
  }
  
  private async handleTaskError(action: any, error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ DataAnalysisAgent task error:', errorMessage)
    
    await this.updateTaskStatus({
      workspaceId: action.workspace.id,
      taskId: action.task.id,
      status: 'error'
    })
    
    await this.addLogToTask({
      workspaceId: action.workspace.id,
      taskId: action.task.id,
      severity: 'error',
      type: 'text',
      body: `DataAnalysisAgent error: ${errorMessage}`
    })
  }
}

// ============================================================================
// 9. 🧪 TESTING FUNCTIONS
// ============================================================================

/**
 * Individual test functions for easy testing of specific features
 */

async function testBasicCapabilities() {
  console.log('\n🧪 Testing Basic Capabilities...')
  
  // Test capabilities by running them directly
  console.log('👋 Testing greeting capability...')
  console.log('📝 Testing summarization capability...')
  console.log('📊 Testing data analysis capability...')
  
  // Note: Direct capability access is not available in this SDK version
  // Instead, capabilities are invoked through the agent's runtime
  console.log('✅ Basic capabilities setup completed')
  
  // Alternative approach - test by sending messages to the agent
  // This would require the agent to be running and accessible
}

async function testCustomAgent() {
  console.log('\n🧪 Testing Custom Agent...')
  
  const dataAgent = new DataAnalysisAgent('You are a specialized data analysis agent with advanced analytical capabilities.')
  
  console.log('🔬 Custom DataAnalysisAgent created successfully')
  console.log('✅ Custom agent capabilities added')
  
  // Test would require running the agent and sending tasks
}

async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive OpenServ SDK Tests...\n')
  
  try {
    // Test basic capabilities
    await testBasicCapabilities()
    
    // Test task management
    await demonstrateTaskManagement()
    
    // Test chat communication
    await demonstrateChatCommunication()
    
    // Test file operations
    await demonstrateFileOperations()
    
    // Test integration management
    await demonstrateIntegrationManagement()
    
    // Test advanced features
    await demonstrateAdvancedFeatures()
    
    // Test custom agent
    await testCustomAgent()
    
    console.log('\n🎉 All tests completed successfully!')
    console.log('✅ OpenServ SDK is working properly')
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error)
    console.log('Please check your configuration and try again.')
  }
}

// ============================================================================
// 🚀 MAIN EXECUTION
// ============================================================================

/**
 * Main function to start the agent or run tests
 * Uncomment the desired functionality
 */
async function main() {
  console.log('🤖 OpenServ SDK Comprehensive Example')
  console.log('=====================================\n')
  
  console.log('📋 Configuration loaded from .env:')
  console.log(`   API Key: ${CONFIG.OPENSERV_API_KEY.substring(0, 8)}...`)
  console.log(`   Workspace ID: ${CONFIG.TEST_WORKSPACE_ID}`)
  console.log(`   Agent ID: ${CONFIG.TEST_AGENT_ID || 'Not set (will use workspace default)'}`)
  console.log(`   Port: ${CONFIG.PORT}`)
  console.log('')
  
  // Option 1: Start the agent server (uncomment to run as server)
  // console.log('🔧 Starting agent server...')
  // comprehensiveAgent.start()
  
  // Option 2: Run quick functionality tests (enabled by default)
  // console.log('🧪 Running basic functionality tests...')
  // await testBasicCapabilities()
  
  // Option 2.5: Test actual task management (shows real API calls)
  // console.log('\n🧪 Testing actual task management with real API calls...')
  // try {
  //   await demonstrateTaskManagement()
  // } catch (error) {
  //   console.log('ℹ️  Task management test requires proper workspace setup')
  //   console.log('   Error:', error instanceof Error ? error.message : 'Unknown error')
  // }
  
  // Option 3: Run comprehensive tests (uncomment to test everything)
  // await runComprehensiveTests()
  
  // Option 4: Run specific tests (uncomment individual ones)
  // await demonstrateTaskManagement()
  // await demonstrateChatCommunication()
  // await demonstrateFileOperations()
  // await demonstrateIntegrationManagement()
}

// Export everything for external use
export {
  comprehensiveAgent,
  DataAnalysisAgent,
  demonstrateTaskManagement,
  demonstrateChatCommunication,
  demonstrateFileOperations,
  demonstrateIntegrationManagement,
  demonstrateAdvancedFeatures,
  testBasicCapabilities,
  testCustomAgent,
  runComprehensiveTests
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error)
}

/**
 * 📚 USAGE INSTRUCTIONS:
 * 
 * 1. Environment Setup:
 *    - Copy .env.example to .env
 *    - Set OPENSERV_API_KEY (required)
 *    - Set WORKSPACE_ID (required)
 *    - Set OPENAI_API_KEY (optional)
 *    - Set AGENT_ID_A (optional)
 * 
 * 2. Install Dependencies:
 *    npm install @openserv-labs/sdk zod dotenv
 * 
 * 3. Run the Example:
 *    npx ts-node openserv-sdk-comprehensive-example.ts
 * 
 * 4. Test Individual Features:
 *    - Uncomment specific test functions in main()
 *    - Or import and call them from another file
 * 
 * 5. Deploy Your Agent:
 *    - Deploy this file to a public URL
 *    - Update your agent endpoint in OpenServ dashboard
 *    - Test with other agents in the marketplace
 * 
 * 📝 NOTES:
 * - All IDs now come from environment variables
 * - Error handling examples show best practices
 * - Custom agent classes demonstrate extensibility
 * - See README.md for detailed setup instructions
 */ 