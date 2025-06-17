# 🚀 OpenServ SDK Testing Suite

A comprehensive collection of TypeScript examples and tests for the OpenServ SDK, demonstrating agent creation, multi-agent collaboration, and integration testing.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Available Tests](#available-tests)
- [Multi-Agent Tunneling Setup](#multi-agent-tunneling-setup)
- [Advanced Tunneling with ngrok Configuration](#advanced-tunneling-with-ngrok-configuration)
- [Multi-Agent Architecture Concepts](#multi-agent-architecture-concepts)
- [How to Find Your Values](#how-to-find-your-values)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

## 🚀 Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd openserv-sdk-intro
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp env.example .env
   # Edit .env with your actual values (see Environment Setup below)
   ```

3. **Run Tests**
   ```bash
   # Comprehensive SDK testing
   npx ts-node openserv-sdk-comprehensive-example.ts
   
   # Multi-agent workspace testing
   npx ts-node multi-agent-servers.ts
   
   # Twitter integration testing
   npx ts-node twitter-integration-test.ts
   ```

## 🔧 Environment Setup

### Required Configuration

Copy `env.example` to `.env` and fill in your values:

```bash
cp env.example .env
```

### 🔑 Essential Variables

| Variable | Description | Required | Where to Find |
|----------|-------------|----------|---------------|
| `OPENSERV_API_KEY` | Your OpenServ API key | ✅ Yes | [Developer Profile](https://platform.openserv.ai/developer/profile) |
| `WORKSPACE_ID` | Your workspace ID | ✅ Yes | OpenServ workspace settings |

### 🤖 Multi-Agent Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `AGENT_ID_A` | First agent ID (Data Analysis) | For multi-agent | - |
| `AGENT_ID_B` | Second agent ID (Content Generation) | For multi-agent | - |
| `OPENSERV_API_KEY_2` | Alternative API key for Agent B | Optional | Uses `OPENSERV_API_KEY` |
| `WORKSPACE_ID_MULTI` | Dedicated multi-agent workspace | Optional | Uses `WORKSPACE_ID` |
| `PORT_A` | Agent A server port | Optional | `7378` |
| `PORT_B` | Agent B server port | Optional | `7379` |

### 🐦 Twitter Integration Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `TWITTER_INTEGRATION_ID` | Twitter integration ID | Optional | `twitter-v2` |

### 🧪 Optional Testing Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key for `process()` testing | Optional | - |
| `PORT` | Default server port | Optional | `7378` |

## 📁 Available Tests

### 1. 🎯 Comprehensive SDK Example

**File:** `openserv-sdk-comprehensive-example.ts`

**Purpose:** Demonstrates all OpenServ SDK functionalities in one file

**Features:**
- Agent creation with multiple capabilities
- Task management (create, update, complete)
- Chat communication
- File operations
- Integration calls
- Error handling
- Custom agent classes

**Run:**
```bash
npx ts-node openserv-sdk-comprehensive-example.ts
```

**Required Environment:**
- `OPENSERV_API_KEY`
- `WORKSPACE_ID`

### 2. 🤖 Multi-Agent Workspace Testing

**File:** `multi-agent-servers.ts`

**Purpose:** Demonstrates multiple agents working in the same workspace

**Features:**
- Two specialized agents (Data Analysis + Content Generation)
- Same workspace, different ports and identities
- Cross-agent collaboration
- Real file uploads and task management
- Agent identification and distinct capabilities

**Run:**
```bash
npx ts-node multi-agent-servers.ts
```

**Required Environment:**
- `OPENSERV_API_KEY`
- `WORKSPACE_ID`
- `AGENT_ID_A`
- `AGENT_ID_B`

**What You'll See:**
1. Both agents start on different ports (7378, 7379)
2. Input files uploaded to workspace
3. Agent A creates and completes data analysis task
4. Agent B creates and completes content generation task
5. Cross-agent collaboration with task assignment
6. Clear agent identification in all outputs

### 3. 🐦 Twitter Integration Testing

**File:** `twitter-integration-test.ts`

**Purpose:** Tests Twitter API integration through OpenServ

**Features:**
- Twitter profile fetching
- Tweet searching (recent and archive)
- OpenServ mention analysis
- Pagination support
- Engagement analytics
- Access tier testing (Essential/Elevated/Academic)

**Run:**
```bash
npx ts-node twitter-integration-test.ts
```

**Required Environment:**
- `OPENSERV_API_KEY`
- `WORKSPACE_ID`
- Twitter integration configured in OpenServ workspace

## 🔗 Multi-Agent Tunneling Setup

For local development with the OpenServ platform:

### 1. Start Multi-Agent Servers
```bash
npx ts-node multi-agent-servers.ts
```

### 2. Set Up Tunneling

**Option A: ngrok (recommended)**
```bash
# Terminal 1: Agent A
ngrok http 7378

# Terminal 2: Agent B  
ngrok http 7379
```

**Option B: localtunnel**
```bash
# Terminal 1: Agent A
npx localtunnel --port 7378 --subdomain openserv-agent-a

# Terminal 2: Agent B
npx localtunnel --port 7379 --subdomain openserv-agent-b
```

### 3. Register Agent Endpoints

1. Go to [OpenServ Developer Console](https://platform.openserv.ai/developer/agents)
2. Update each agent's endpoint URL with your tunnel URLs
3. Test agents in the same workspace

## 🌐 Advanced Tunneling with ngrok Configuration

### Using ngrok.yml for Multiple Tunnels

For convenience, we've included `examplengrok.yml` which allows you to run both agent tunnels from a single ngrok command.

**Setup Steps:**

1. **Get ngrok Auth Token**
   ```bash
   # Sign up at https://ngrok.com
   # Copy your auth token from the dashboard
   ngrok config add-authtoken your_auth_token_here
   ```

2. **Configure ngrok.yml**
   ```bash
   # Copy the example configuration
   cp examplengrok.yml ngrok.yml
   
   # Edit ngrok.yml and replace 'ngrok_auth_token' with your actual token
   ```

3. **Start Both Tunnels**
   ```bash
   # This starts both agent tunnels simultaneously
   ngrok start --all
   ```

**Configuration Details:**
```yaml
version: "2"
authtoken: your_actual_ngrok_auth_token

tunnels:
  agent-a:
    addr: 7378          # DataAnalyst-Alpha port
    proto: http
    inspect: true       # Enable ngrok web interface
    
  agent-b:
    addr: 7379          # ContentGen-Beta port
    proto: http
    inspect: true
```

**Benefits:**
- ✅ Single command starts both tunnels
- ✅ Persistent tunnel names for easier management
- ✅ Web inspection interface at http://127.0.0.1:4040
- ✅ More reliable than running separate ngrok instances

## 🧠 Multi-Agent Architecture Concepts

### Agent Identity & API Keys

**Key Concept:** Each agent maintains its own identity through unique API keys and agent IDs, even when operating in the same workspace.

#### Agent A (DataAnalyst-Alpha)
- **Purpose:** Data analysis specialist
- **API Key:** `OPENSERV_API_KEY` (primary)
- **Agent ID:** `AGENT_ID_A`
- **Port:** 7378
- **Capabilities:** Statistical analysis, report generation, data insights

#### Agent B (ContentGen-Beta)
- **Purpose:** Content generation specialist
- **API Key:** `OPENSERV_API_KEY_2` (or fallback to primary)
- **Agent ID:** `AGENT_ID_B`
- **Port:** 7379
- **Capabilities:** Marketing content, documentation, communication materials

### Authentication Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Agent A       │    │   Agent B       │
│ (Port 7378)     │    │ (Port 7379)     │
│                 │    │                 │
│ API Key: KEY_1  │    │ API Key: KEY_2  │
│ Agent ID: 735   │    │ Agent ID: 736   │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────────┬───────────┘
                     │
            ┌────────▼────────┐
            │   Workspace     │
            │   (Shared)      │
            │                 │
            │ ID: 4403        │
            └─────────────────┘
```

### Why Separate API Keys?

1. **Identity Distinction:** Each agent appears as a different user in the workspace
2. **Permission Control:** Different agents can have different access levels
3. **Audit Trail:** Clear attribution of actions to specific agents
4. **Scalability:** Easy to add more agents with unique identities

### Workspace Collaboration Model

**Same Workspace, Different Identities:**
- Both agents operate in the same workspace (`WORKSPACE_ID`)
- Each agent has distinct capabilities and specializations
- Tasks can be assigned between agents
- Chat messages show clear agent attribution
- File uploads are tagged with the uploading agent

**Cross-Agent Task Assignment:**
```typescript
// Agent A creates a task and assigns it to Agent B
const collaborativeTask = await dataAnalysisAgent.createTask({
  workspaceId: WORKSPACE_ID,
  assignee: AGENT_ID_B,  // Assigning to Agent B
  description: "Create marketing content from analysis results",
  // ... other task details
})
```

### Production Deployment Considerations

**For Production Multi-Agent Systems:**

1. **Separate Servers:** Deploy each agent on different servers/containers
2. **Load Balancing:** Use proper load balancers for high availability
3. **Environment Isolation:** Use separate environment configurations
4. **Monitoring:** Track each agent's performance independently
5. **Scaling:** Scale agents independently based on workload

**Example Production URLs:**
```
Agent A: https://data-agent.yourcompany.com
Agent B: https://content-agent.yourcompany.com
```

### Security Best Practices

1. **API Key Management:**
   - Use different API keys for different agents in production
   - Rotate keys regularly
   - Store keys in secure environment variables or secret managers

2. **Network Security:**
   - Use HTTPS in production
   - Implement proper firewall rules
   - Consider VPN for sensitive workspaces

3. **Access Control:**
   - Assign minimal required permissions to each agent
   - Monitor agent actions through OpenServ audit logs
   - Implement rate limiting if needed

## 🔍 How to Find Your Values

### Workspace ID
1. Go to [OpenServ Platform](https://platform.openserv.ai)
2. Select your workspace
3. Check the URL or workspace settings page

### Agent IDs
1. Go to **Developer** → **Your Agents**
2. Click on each agent to view details
3. Copy the agent ID from the details page

### API Key
1. Go to **Developer** → **Profile**
2. Create or copy your API key
3. **⚠️ Keep secure** - never commit to version control

## 🐛 Troubleshooting

### Common Issues

**❌ "Please set your OPENSERV_API_KEY"**
- Copy `env.example` to `.env`
- Add your actual API key from OpenServ developer profile

**❌ "Please set your WORKSPACE_ID"**
- Find your workspace ID in OpenServ platform
- Add it to your `.env` file

**❌ "Please set your AGENT_ID_A"**
- Create agents in OpenServ developer console
- Add their IDs to `.env` file

**❌ Multi-agent tests fail**
- Ensure both `AGENT_ID_A` and `AGENT_ID_B` are set
- Verify agents exist in your OpenServ workspace
- Check that workspace ID is correct

**❌ Twitter integration fails**
- Verify Twitter integration is configured in OpenServ workspace
- Check Twitter API credentials in integration settings
- Ensure proper access level for endpoints being tested

**❌ ngrok tunneling issues**
- Ensure ngrok is installed: `npm install -g ngrok`
- Check auth token is configured: `ngrok config add-authtoken your_token`
- Verify ports are not in use: `lsof -i :7378` and `lsof -i :7379`
- For multiple tunnels, use `ngrok start --all` with proper `ngrok.yml`

**❌ "tunnel session failed" errors**
- Free ngrok accounts are limited to 1 tunnel - upgrade or use `ngrok.yml` approach
- Check if another ngrok process is running: `ps aux | grep ngrok`
- Restart ngrok service if needed

### Debug Steps

1. **Check Environment Variables**
   ```bash
   node -e "console.log(process.env.OPENSERV_API_KEY ? 'API Key set' : 'API Key missing')"
   ```

2. **Verify Configuration**
   - All files validate environment variables on startup
   - Check error messages for specific missing values

3. **Test Individual Components**
   - Start with `openserv-sdk-comprehensive-example.ts`
   - Move to multi-agent testing once basic setup works
   - Test Twitter integration last

## 📚 Additional Resources

- [OpenServ Documentation](https://docs.openserv.ai)
- [OpenServ Platform](https://platform.openserv.ai)
- [SDK Repository](https://github.com/openserv-labs/sdk)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 