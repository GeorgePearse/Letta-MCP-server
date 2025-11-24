[![npm version](https://img.shields.io/npm/v/letta-mcp-server.svg)](https://www.npmjs.com/package/letta-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/letta-mcp-server.svg)](https://www.npmjs.com/package/letta-mcp-server)
[![npm downloads total](https://img.shields.io/npm/dt/letta-mcp-server.svg)](https://www.npmjs.com/package/letta-mcp-server)
[![Docker Image](https://img.shields.io/badge/Docker-ghcr.io-blue)](https://github.com/oculairmedia/Letta-MCP-server/pkgs/container/letta-mcp-server)
[![MseeP.ai Security Assessment Badge](https://mseep.net/mseep-audited.png)](https://mseep.ai/app/oculairmedia-letta-mcp-server)
[![CI/CD](https://github.com/oculairmedia/letta-MCP-server/actions/workflows/test.yml/badge.svg)](https://github.com/oculairmedia/letta-MCP-server/actions/workflows/test.yml)
[![Docker Build](https://github.com/oculairmedia/letta-MCP-server/actions/workflows/docker-build.yml/badge.svg)](https://github.com/oculairmedia/letta-MCP-server/actions/workflows/docker-build.yml)
[![CodeQL](https://github.com/oculairmedia/letta-MCP-server/actions/workflows/codeql.yml/badge.svg)](https://github.com/oculairmedia/letta-MCP-server/actions/workflows/codeql.yml)
[![Coverage Status](https://codecov.io/gh/oculairmedia/letta-MCP-server/branch/main/graph/badge.svg)](https://codecov.io/gh/oculairmedia/letta-MCP-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# Letta MCP Server

A Model Context Protocol (MCP) server that provides comprehensive tools for agent management, memory operations, and integration with the Letta system. This server implements the full MCP specification including tools, prompts, and resources, with enhanced descriptions, output schemas, and behavioral annotations.

**[View on npm](https://www.npmjs.com/package/letta-mcp-server)** | **[View on GitHub](https://github.com/oculairmedia/Letta-MCP-server)**

## Features

- 🤖 **Agent Management** - Create, modify, clone, and manage Letta agents
- 🧠 **Memory Operations** - Handle memory blocks and passages
- 🔧 **Tool Integration** - Attach and manage tools for agents with full MCP support
- 💬 **Prompts** - Interactive wizards and assistants for common workflows
- 📚 **Resources** - Access system information, documentation, and agent data
- 🌐 **Multiple Transports** - HTTP, SSE, and stdio support
- 🔗 **MCP Server Integration** - Integrate with other MCP servers
- 📊 **Enhanced Metadata** - Output schemas and behavioral annotations for all tools
- 📦 **Docker Support** - Easy deployment with Docker
- 🔄 **LLM Proxy** - Capture all LLM conversations to Letta without latency (see [LLM Proxy](#llm-proxy-for-automatic-memory-capture))

## Environment Configuration

Create a `.env` file with the following variables:

```bash
# Required
LETTA_BASE_URL=https://your-letta-instance.com/v1
LETTA_PASSWORD=your-secure-password

# Optional
PORT=3001
NODE_ENV=production
```

## Installation

### Install from npm

```bash
# Global installation (recommended for CLI usage)
npm install -g letta-mcp-server

# Or local installation
npm install letta-mcp-server
```

### Use with Claude Desktop

After installing globally, add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "letta": {
      "command": "letta-mcp",
      "args": [],
      "env": {
        "LETTA_BASE_URL": "https://your-letta-instance.com/v1",
        "LETTA_PASSWORD": "your-secure-password"
      }
    }
  }
}
```

### Quick Start with npm

```bash
# Install globally
npm install -g letta-mcp-server

# Set environment variables
export LETTA_BASE_URL=https://your-letta-instance.com/v1
export LETTA_PASSWORD=your-secure-password

# Run the server
letta-mcp              # stdio (for Claude Desktop)
letta-mcp --http       # HTTP transport
letta-mcp --sse        # SSE transport
```

## Implementation Options

This repository provides **three different implementations** of the Letta MCP server, allowing you to choose the best option for your use case:

### 🔵 Classic Individual Tools (master branch)
**Branch:** `master`

The original implementation with individual tools for each API endpoint.

**Best for:**
- Users who prefer individual, focused tools
- Compatibility with existing integrations
- Granular tool selection and control
- Learning the Letta API one operation at a time

**Docker Images:**
```bash
# Latest master branch build
docker pull ghcr.io/oculairmedia/letta-mcp-server:master
```

**Features:**
- 70+ individual tools, each handling one specific operation
- Direct mapping to Letta API endpoints
- Simple, straightforward tool names
- Full MCP protocol support (tools, prompts, resources)
- Multiple transport protocols (HTTP, SSE, stdio)

### 🟢 Node.js Consolidated Tools (Recommended for most users)
**Branch:** `nodejs-consolidated-tools`

Modern implementation with 7 consolidated tools using the discriminator pattern.

**Best for:**
- Production deployments
- Claude Desktop integration
- npm package consumers
- Teams who want fewer tools with more functionality

**Docker Images:**
```bash
# Latest stable release
docker pull ghcr.io/oculairmedia/letta-mcp-server:latest

# Specific version
docker pull ghcr.io/oculairmedia/letta-mcp-server:2.0.1

# Development branch
docker pull ghcr.io/oculairmedia/letta-mcp-server:nodejs-consolidated-tools
```

**Features:**
- 7 consolidated tools covering 87 operations
- 93% SDK coverage with official @letta-ai/letta-client
- Discriminator pattern (use `operation` parameter)
- Enhanced error handling and validation
- Full MCP protocol support (tools, prompts, resources)
- Comprehensive test suite and documentation

### 🦀 Rust Implementation (Performance-focused alternative)
**Branch:** `rust-implementation`

High-performance implementation built with Rust and the TurboMCP framework.

**Best for:**
- Resource-constrained environments
- Maximum performance requirements
- Low memory footprint needs
- Teams familiar with Rust

**Docker Images:**
```bash
# Latest Rust build
docker pull ghcr.io/oculairmedia/letta-mcp-server-rust:rust-latest

# Development branch
docker pull ghcr.io/oculairmedia/letta-mcp-server-rust:rust-implementation
```

**Features:**
- Same 7 consolidated tools with full feature parity
- Built on TurboMCP framework for MCP protocol
- Compile-time type safety and validation
- Lower memory usage and faster execution
- Multi-architecture Docker builds (amd64, arm64)

### Comparison

| Feature | Classic (master) | Node.js Consolidated | Rust |
|---------|------------------|---------------------|------|
| **Tool Count** | 70+ individual | 7 consolidated | 7 consolidated |
| **API Pattern** | One tool per endpoint | Discriminator pattern | Discriminator pattern |
| **Maturity** | ✅ Original | ✅ Production-ready | 🟡 Stable, newer |
| **Performance** | Good | Good | Excellent |
| **Memory Usage** | ~50-100MB | ~50-100MB | ~10-30MB |
| **Startup Time** | ~1-2s | ~1-2s | ~100-500ms |
| **SDK Integration** | Direct API calls | 93% official SDK | Custom API client |
| **Type Safety** | Runtime validation | TypeScript (runtime) | Rust (compile-time) |
| **Package Manager** | npm | npm | Docker/Cargo |
| **Use Case** | Simple, focused | Production, feature-rich | Performance-critical |

### Choosing an Implementation

**Use Classic (master) if:**
- You prefer individual, single-purpose tools
- You're already using the original implementation
- You want simple, straightforward tool names
- You're learning the Letta API

**Use Node.js Consolidated if:**
- You need a battle-tested, production-ready solution
- You want fewer tools with comprehensive functionality
- You're using npm packages or Claude Desktop
- You want SDK-powered reliability and type safety

**Use Rust if:**
- You need maximum performance
- You're running in resource-constrained environments (edge, embedded)
- You prefer compile-time safety guarantees
- You're comfortable with Docker-based deployment

All three implementations provide identical functionality and MCP protocol compliance. You can switch between them at any time without changing your Letta instance configuration.

## Quick Setup

### Option 1: Run from source

```bash
# Clone the repository
git clone https://github.com/oculairmedia/letta-MCP-server.git
cd letta-MCP-server

# Install dependencies
npm install

# Development
npm run dev         # Default (stdio) transport
npm run dev:sse     # SSE transport
npm run dev:http    # HTTP transport (recommended)

# Production
npm run start       # Default (stdio) transport
npm run start:sse   # SSE transport
npm run start:http  # HTTP transport (recommended)
```

### Option 2: Run with Docker

#### Using the prebuilt image from GitHub Container Registry

Available tags:
- `latest` - Latest stable release
- `2.0.1`, `2.0`, `2` - Specific version tags
- `master` - Latest master branch build

```bash
# Pull the latest image
docker pull ghcr.io/oculairmedia/letta-mcp-server:latest

# Run with environment variables
docker run -d \
  -p 3001:3001 \
  -e LETTA_BASE_URL=https://your-letta-instance.com/v1 \
  -e LETTA_PASSWORD=your-secure-password \
  -e PORT=3001 \
  -e NODE_ENV=production \
  --name letta-mcp \
  ghcr.io/oculairmedia/letta-mcp-server:latest

# Or use a specific version
docker run -d \
  -p 3001:3001 \
  -e LETTA_BASE_URL=https://your-letta-instance.com/v1 \
  -e LETTA_PASSWORD=your-secure-password \
  --name letta-mcp \
  ghcr.io/oculairmedia/letta-mcp-server:2.0.1
```

#### Using Docker Compose

```yaml
version: '3.8'
services:
  letta-mcp:
    image: ghcr.io/oculairmedia/letta-mcp-server:latest
    container_name: letta-mcp
    ports:
      - "3001:3001"
    environment:
      - LETTA_BASE_URL=https://your-letta-instance.com/v1
      - LETTA_PASSWORD=your-secure-password
      - PORT=3001
      - NODE_ENV=production
    restart: unless-stopped
```

#### Building from source

```bash
# Clone and build locally
git clone https://github.com/oculairmedia/letta-MCP-server.git
cd letta-MCP-server
docker build -t letta-mcp-server .
docker run -d -p 3001:3001 --env-file .env --name letta-mcp letta-mcp-server
```

### Option 3: Run with stdio for local MCP

```bash
# Create startup script
chmod +x /opt/stacks/letta-MCP-server/start-mcp.sh

# Add to Claude
claude mcp add --transport stdio letta-tools "/opt/stacks/letta-MCP-server/start-mcp.sh"
```

## Architecture

See the [Architecture Documentation](docs/ARCHITECTURE.md) for detailed system diagrams and component relationships.

## MCP Protocol Support

This server implements the full MCP specification with all three capabilities:

### 🔧 Tools
All tools include:
- **Enhanced Descriptions**: Detailed explanations with use cases and best practices
- **Output Schemas**: Structured response definitions for predictable outputs
- **Behavioral Annotations**: Hints about tool behavior (readOnly, costLevel, executionTime, etc.)

### 💬 Prompts
Interactive prompts for common workflows:
- `letta_agent_wizard` - Guided agent creation with memory and tool setup
- `letta_memory_optimizer` - Analyze and optimize agent memory usage
- `letta_debug_assistant` - Troubleshoot agent issues
- `letta_tool_config` - Discover, attach, create, or audit tools
- `letta_migration` - Export, import, upgrade, or clone agents

### 📚 Resources
Access system information and documentation:
- `letta://system/status` - System health and version info
- `letta://system/models` - Available LLM and embedding models
- `letta://agents/list` - Overview of all agents
- `letta://tools/all/docs` - Complete tool documentation with examples
- `letta://docs/mcp-integration` - Integration guide
- `letta://docs/api-reference` - API quick reference

Resource templates for dynamic content:
- `letta://agents/{agent_id}/config` - Agent configuration
- `letta://agents/{agent_id}/memory/{block_id}` - Memory block content
- `letta://tools/{tool_name}/docs` - Individual tool documentation

## Available Tools

### Agent Management

| Tool | Description | Annotations |
|------|-------------|-------------|
| `create_agent` | Create a new Letta agent | 💰 Medium cost, ⚡ Fast |
| `list_agents` | List all available agents | 👁️ Read-only, 💰 Low cost |
| `prompt_agent` | Send a message to an agent | 💰 High cost, ⏱️ Variable time, 🔒 Rate limited |
| `retrieve_agent` | Get agent details by ID | 👁️ Read-only, ⚡ Fast |
| `get_agent_summary` | Get agent summary information | 👁️ Read-only, ⚡ Fast |
| `modify_agent` | Update an existing agent | ✏️ Modifies state, ⚡ Fast |
| `delete_agent` | Delete an agent | ⚠️ Dangerous, 🗑️ Permanent |
| `clone_agent` | Clone an existing agent | 💰 Medium cost, ⏱️ Medium time |
| `bulk_delete_agents` | Delete multiple agents | ⚠️ Dangerous, 📦 Bulk operation |
| `export_agent` | Export agent configuration and memory | 👁️ Read-only, ⚡ Fast, 📦 Full backup |
| `import_agent` | Import agent from backup | 💰 High cost, ⏱️ Slow, ✏️ Creates state |

### Memory Management

| Tool | Description | Annotations |
|------|-------------|-------------|
| `list_memory_blocks` | List all memory blocks | 👁️ Read-only, ⚡ Fast |
| `create_memory_block` | Create a new memory block | ✏️ Creates state, ⚡ Fast |
| `read_memory_block` | Read a memory block | 👁️ Read-only, ⚡ Fast |
| `update_memory_block` | Update a memory block | ✏️ Modifies state, ⚡ Fast |
| `attach_memory_block` | Attach memory to an agent | ✏️ Links resources, ⚡ Fast |

### Passage Management

| Tool | Description | Annotations |
|------|-------------|-------------|
| `list_passages` | Search archival memory | 👁️ Read-only, ⚡ Fast |
| `create_passage` | Create archival memory | 💰 Medium cost (embeddings), ⚡ Fast |
| `modify_passage` | Update archival memory | 💰 Medium cost (re-embedding), ⚡ Fast |
| `delete_passage` | Delete archival memory | 🗑️ Permanent, ⚡ Fast |

### Tool Management

| Tool | Description | Annotations |
|------|-------------|-------------|
| `list_agent_tools` | List tools for an agent | 👁️ Read-only, ⚡ Fast |
| `attach_tool` | Attach tools to an agent | ✏️ Modifies capabilities, ⚡ Fast |
| `upload_tool` | Upload a custom tool | 🔒 Security: Executes code, ⚡ Fast |
| `bulk_attach_tool_to_agents` | Attach tool to multiple agents | 📦 Bulk operation, ⏱️ Slow |

### Model Management

| Tool | Description | Annotations |
|------|-------------|-------------|
| `list_llm_models` | List available LLM models | 👁️ Read-only, ⚡ Fast |
| `list_embedding_models` | List available embedding models | 👁️ Read-only, ⚡ Fast |

### MCP Integration

| Tool | Description | Annotations |
|------|-------------|-------------|
| `list_mcp_servers` | List configured MCP servers | 👁️ Read-only, ⚡ Fast |
| `list_mcp_tools_by_server` | List tools from an MCP server | 👁️ Read-only, ⚡ Fast |
| `add_mcp_tool_to_letta` | Import MCP tool to Letta | ✏️ Creates tool, ⚡ Fast |

### Prompt Tools

| Tool | Description | Annotations |
|------|-------------|-------------|
| `list_prompts` | List available prompt templates | 👁️ Read-only, ⚡ Fast |
| `use_prompt` | Execute a prompt template | 💰 Variable cost, ⏱️ Variable time |

## Directory Structure

- `src/index.js` - Main entry point
- `src/core/` - Core server functionality
- `src/handlers/` - Prompt and resource handlers
- `src/examples/` - Example prompts and resources
- `src/tools/` - Tool implementations organized by category:
  - `agents/` - Agent management tools
  - `memory/` - Memory block tools
  - `passages/` - Passage management tools
  - `tools/` - Tool attachment and management
  - `mcp/` - MCP server integration tools
  - `models/` - Model listing tools
  - `enhanced-descriptions.js` - Detailed tool descriptions
  - `output-schemas.js` - Structured output definitions
  - `annotations.js` - Behavioral hints
- `src/transports/` - Server transport implementations

## Transport Protocols

The server supports three transport protocols:

1. **HTTP (Recommended)** - Streamable HTTP transport with full duplex communication
   - Endpoint: `http://your-server:3001/mcp`
   - Best for production use and remote connections
   - Supports health checks at `/health`

2. **SSE (Server-Sent Events)** - Real-time event streaming
   - Endpoint: `http://your-server:3001/sse`
   - Good for unidirectional server-to-client updates

3. **stdio** - Standard input/output
   - Direct process communication
   - Best for local development and Claude integration

## Configuration with MCP Settings

Add the server to your mcp_settings.json:

```json
"letta": {
  "command": "node",
  "args": [
    "--no-warnings",
    "--experimental-modules",
    "path/to/letta-server/src/index.js"
  ],
  "env": {
    "LETTA_BASE_URL": "https://your-letta-instance.com",
    "LETTA_PASSWORD": "yourPassword"
  },
  "disabled": false,
  "alwaysAllow": [
    "upload_tool",
    "attach_tool",
    "list_agents",
    "list_memory_blocks"
  ],
  "timeout": 300
}
```

For remote instances with HTTP transport (recommended):

```json
"remote_letta_tools": {
  "url": "http://your-server:3001/mcp",
  "transport": "http",
  "disabled": false,
  "alwaysAllow": [
    "attach_tool", 
    "list_agents",
    "list_tools",
    "get_agent"
  ],
  "timeout": 120
}
```

## Docker Operations

```bash
# View container logs
docker logs -f letta-mcp

# Stop the container
docker stop letta-mcp

# Update to latest version
docker pull ghcr.io/oculairmedia/letta-mcp-server:latest
docker stop letta-mcp
docker rm letta-mcp
docker run -d -p 3001:3001 -e PORT=3001 -e NODE_ENV=production --name letta-mcp ghcr.io/oculairmedia/letta-mcp-server:latest
```

## LLM Proxy for Automatic Memory Capture

**Problem**: You want to capture all LLM interactions for persistent memory, but MCP calls add latency to every request, and forking your tools requires ongoing maintenance.

**Solution**: A lightweight proxy that sits between your LLM client and the API, capturing all conversations asynchronously without blocking.

```
Claude Code / Cursor / Any Tool
            ↓
    localhost:8080 (proxy)
            ↓
    api.anthropic.com
            ↓ (async, non-blocking)
    Letta Memory Storage
```

### Quick Start

```bash
cd proxy

# Install dependencies
pip install -r requirements.txt

# Configure
export LETTA_BASE_URL=http://localhost:8283/v1
export LETTA_AGENT_ID=your-memory-agent-id  # Create an agent first

# Run
python llm_proxy.py
```

Then point your tool at the proxy:

```bash
# For Claude Code
export ANTHROPIC_BASE_URL=http://localhost:8080

# For OpenAI-compatible tools
export OPENAI_BASE_URL=http://localhost:8080
```

### Key Features

- **Zero latency impact**: Writes happen in a background queue
- **Works with any tool**: Just change the base URL environment variable
- **Handles streaming**: Full SSE support for streaming responses
- **Resilient**: In-memory buffer with overflow handling
- **Multi-provider**: Supports both Anthropic and OpenAI APIs

### Docker

```bash
docker build -t llm-proxy -f proxy/Dockerfile proxy/

docker run -d \
  -p 8080:8080 \
  -e LETTA_BASE_URL=http://host.docker.internal:8283/v1 \
  -e LETTA_AGENT_ID=your-agent-id \
  llm-proxy
```

For detailed documentation, see [docs/LLM_PROXY.md](docs/LLM_PROXY.md).

## Troubleshooting

### Common Issues

1. **Connection refused errors**
   - Ensure the server is running and accessible
   - Check firewall settings for port 3001
   - Verify the correct transport protocol is being used

2. **Authentication failures**
   - Verify LETTA_BASE_URL includes `/v1` suffix
   - Check LETTA_PASSWORD is correct
   - Ensure environment variables are loaded
   - When self-hosting the Letta-Server, set environment variables accordingly:
     ```json
     "env": {
        "LETTA_BASE_URL": "http://localhost:8283",
        "LETTA_PASSWORD": "",
        "LOG_LEVEL": "info"
      }
     ```


3. **Tool execution timeouts**
   - Increase timeout values in MCP configuration
   - Check network latency for remote connections
   - Consider using HTTP transport for better reliability

### Health Check

The HTTP transport provides a health endpoint:

```bash
curl http://your-server:3001/health
```

Response:
```json
{
  "status": "healthy",
  "transport": "streamable_http",
  "protocol_version": "2025-06-18",
  "sessions": 0,
  "uptime": 12345.678
}
```

## Development

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linter
npm run lint
```

### Contributing

We welcome contributions! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details on:

- Development setup
- Code style and standards
- Adding new tools
- Testing requirements
- Pull request process

## Security

For security vulnerabilities, please see our [Security Policy](docs/SECURITY.md).

## License

MIT License - see LICENSE file for details
