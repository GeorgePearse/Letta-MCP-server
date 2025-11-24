# LLM Proxy with Letta Memory Storage

A lightweight proxy that sits between any LLM client and the API, transparently capturing all conversations and storing them in Letta for persistent memory - **without adding latency** to your interactions.

## The Problem

You want to capture **every** interaction with LLMs for persistent memory, but:

1. **MCP calls are slow** - Adding synchronous MCP calls to every message adds noticeable latency
2. **Forking tools is painful** - Modifying Claude Code, OpenCode, or Cursor requires ongoing maintenance
3. **You use multiple tools** - Different IDEs/tools all need the same memory capture

## The Solution

A transparent proxy that:

```
Your Tool (Claude Code, Cursor, etc.)
            ↓
    localhost:8080 (proxy)
            ↓
    api.anthropic.com
            ↓ (async, non-blocking)
    Letta Memory Storage
```

**Key insight**: The proxy queues memories in a background buffer and writes to Letta asynchronously. Your requests are never blocked waiting for Letta.

## Quick Start

### 1. Create a Letta Agent for Memory Storage

First, you need a Letta agent to store the memories. You can create one via the Letta API or UI:

```bash
# Using curl
curl -X POST "http://localhost:8283/v1/agents" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "conversation-memory",
    "description": "Stores all LLM conversation history for persistent memory"
  }'
```

Save the `agent_id` from the response - you'll need it for configuration.

### 2. Install and Run the Proxy

```bash
cd proxy

# Install dependencies
pip install -r requirements.txt

# Configure environment
export LETTA_BASE_URL=http://localhost:8283/v1
export LETTA_AGENT_ID=agent-xxx-xxx  # Your agent ID from step 1
export LETTA_PASSWORD=""  # If using authentication

# Run the proxy
python llm_proxy.py
```

### 3. Point Your Tool at the Proxy

For **Claude Code**:
```bash
export ANTHROPIC_BASE_URL=http://localhost:8080
```

For **OpenAI-compatible tools** (Cursor, etc.):
```bash
export OPENAI_BASE_URL=http://localhost:8080
```

That's it! All conversations will now be captured and stored in Letta.

## Running with Docker

```bash
# Build
docker build -t llm-proxy -f proxy/Dockerfile proxy/

# Run
docker run -d \
  -p 8080:8080 \
  -e LETTA_BASE_URL=http://host.docker.internal:8283/v1 \
  -e LETTA_AGENT_ID=your-agent-id \
  --name llm-proxy \
  llm-proxy
```

### Docker Compose (with Letta)

```yaml
version: '3.8'
services:
  letta:
    image: letta/letta:latest
    ports:
      - "8283:8283"
    volumes:
      - letta-data:/root/.letta

  llm-proxy:
    build: ./proxy
    ports:
      - "8080:8080"
    environment:
      - LETTA_BASE_URL=http://letta:8283/v1
      - LETTA_AGENT_ID=${LETTA_AGENT_ID}
    depends_on:
      - letta

volumes:
  letta-data:
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PROXY_PORT` | `8080` | Port the proxy listens on |
| `LETTA_BASE_URL` | `http://localhost:8283/v1` | Letta API URL |
| `LETTA_AGENT_ID` | (required) | Agent to store memories in |
| `LETTA_PASSWORD` | `""` | Letta authentication password |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | Anthropic API to proxy to |
| `OPENAI_BASE_URL` | `https://api.openai.com` | OpenAI API to proxy to |
| `BUFFER_MAX_SIZE` | `1000` | Max memories to buffer before dropping |
| `BATCH_SIZE` | `10` | Memories to write per batch |
| `FLUSH_INTERVAL` | `5.0` | Seconds between batch writes |

## Architecture

### How It Works

1. **Request arrives** at the proxy (e.g., Claude Code sends a message)
2. **Extract messages** from the request body
3. **Queue to buffer** (non-blocking, immediate return)
4. **Forward to LLM API** (Anthropic, OpenAI)
5. **Stream/return response** to client
6. **Extract response** and queue to buffer
7. **Background writer** batches and writes to Letta

### Memory Buffer

The proxy uses an in-memory buffer with:

- **Bounded size**: Prevents memory exhaustion (default: 1000 items)
- **Overflow handling**: Drops oldest when full
- **Retry queue**: Failed writes are retried
- **Statistics**: Track success/failure rates

### Memory Format

Each memory is stored in Letta's archival memory as structured text:

```
[2024-01-15T10:30:45.123456]
Session: a1b2c3d4
Model: claude-sonnet-4-20250514
Role: USER
---
What's the best way to implement a cache in Python?
```

This format is:
- **Human-readable**: Easy to browse in Letta UI
- **Searchable**: Letta can search by timestamp, role, model
- **Structured**: Consistent format for parsing

## API Endpoints

### GET /health

Health check with buffer statistics:

```bash
curl http://localhost:8080/health
```

```json
{
  "status": "healthy",
  "letta_configured": true,
  "letta_base_url": "http://localhost:8283/v1",
  "buffer_stats": {
    "total_queued": 150,
    "total_written": 145,
    "total_failed": 2,
    "dropped_overflow": 0,
    "pending": 5,
    "failed_pending_retry": 2
  }
}
```

### GET /stats

Detailed buffer statistics:

```bash
curl http://localhost:8080/stats
```

## Streaming Support

The proxy fully supports streaming responses (SSE):

1. Client requests with `stream: true`
2. Proxy forwards to LLM API
3. Response streams back to client immediately
4. Proxy accumulates streamed content in background
5. After stream completes, full response is queued to Letta

**No latency impact** - streaming happens at full speed.

## Multi-Provider Support

The proxy automatically detects which provider to use:

1. **Explicit header**: `X-LLM-Provider: anthropic` or `X-LLM-Provider: openai`
2. **Path pattern**: `/v1/messages` → Anthropic, `/v1/chat` → OpenAI
3. **Anthropic headers**: Presence of `anthropic-version` header
4. **Default**: Anthropic

## Use Cases

### 1. Personal Knowledge Base

Store all your coding conversations for future reference:
- "How did I solve that async bug last month?"
- "What was the architecture we discussed for the auth system?"

### 2. Team Knowledge Sharing

Multiple developers using the same Letta agent:
- Collective learning from everyone's LLM interactions
- Searchable history of solutions and approaches

### 3. Training Data Collection

Capture high-quality conversations for:
- Fine-tuning models on your domain
- Creating documentation from real interactions

### 4. Debugging & Auditing

Full history of all LLM interactions:
- What exactly was sent to the model?
- What response was received?
- Timestamp and session tracking

## Troubleshooting

### Memories not appearing in Letta

1. Check the agent ID is correct:
   ```bash
   curl http://localhost:8080/health
   ```

2. Verify Letta is accessible:
   ```bash
   curl http://localhost:8283/v1/agents
   ```

3. Check proxy logs for write errors

### High pending count

If `pending` count keeps growing:

1. Check Letta connectivity
2. Increase `BATCH_SIZE` for faster writes
3. Decrease `FLUSH_INTERVAL` for more frequent writes

### Dropped memories

If `dropped_overflow` is non-zero:

1. Increase `BUFFER_MAX_SIZE`
2. Ensure Letta is keeping up with writes
3. Consider running multiple Letta agents

## Integration Examples

### Claude Code

```bash
# In your shell config (.bashrc, .zshrc)
export ANTHROPIC_BASE_URL=http://localhost:8080

# Or in claude_code_settings.json
{
  "anthropic_base_url": "http://localhost:8080"
}
```

### Cursor

```bash
export OPENAI_BASE_URL=http://localhost:8080
```

### Custom Application

```python
import anthropic

client = anthropic.Anthropic(
    base_url="http://localhost:8080"
)

# All calls now go through the proxy
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

## Security Considerations

1. **API Keys**: The proxy forwards your API keys to the LLM provider. Run locally or in a trusted environment.

2. **Sensitive Data**: All conversations are stored in Letta. Ensure your Letta instance is secured.

3. **Network**: Run on localhost or behind authentication for production use.

## Future Enhancements

- [ ] SQLite local buffer for crash resilience
- [ ] Configurable memory format templates
- [ ] Metrics/Prometheus endpoint
- [ ] Multiple Letta agents (per-project routing)
- [ ] Conversation session tracking
- [ ] Memory deduplication
