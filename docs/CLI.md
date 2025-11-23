# CLI Reference

The Letta MCP Server includes command-line options for different transport modes and standalone utilities.

## Usage

```bash
letta-mcp [options]
```

Or via npm:

```bash
npm run start [-- options]
```

## Transport Options

The server supports three transport protocols for MCP communication:

| Option | Description | Use Case |
|--------|-------------|----------|
| (default) | stdio transport | Local process communication, Claude Desktop |
| `--http` | HTTP transport | Production deployments, REST-like access |
| `--sse` | SSE transport | Server-sent events streaming |

### Examples

```bash
# stdio transport (default) - for Claude Desktop integration
letta-mcp
npm run start

# HTTP transport - recommended for production
letta-mcp --http
npm run start:http

# SSE transport - for streaming clients
letta-mcp --sse
npm run start:sse
```

## CLI Commands

### --list-memories

List all stored coding memories for a project without starting the MCP server.

```bash
letta-mcp --list-memories [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--project=NAME` | Project name | `default` |
| `--format=TYPE` | Output format: `json`, `summary`, `table` | `json` |
| `--limit=N` | Maximum memories to fetch | `100` |

**Examples:**

```bash
# List memories for default project (JSON output)
npm run list-memories

# Summary format for specific project
npm run list-memories -- --project=my-web-app --format=summary

# Table format with custom limit
npm run list-memories -- --project=api-server --format=table --limit=50
```

**Output Formats:**

**JSON** - Full structured data:
```json
{
  "project": "default",
  "agent_id": "agent-xxx",
  "total": 4,
  "by_type": {
    "code_pattern": [...],
    "decision": [...],
    "learning": [...],
    "project_context": [...]
  }
}
```

**Summary** - Concise overview:
```
Memories for project: my-web-app
Agent: claude-code-memory-my-web-app (agent-xxx)
Total memories: 12

By type:
  code_pattern: 5
    - useAsync hook
    - API error handler
  decision: 3
    - Use PostgreSQL over MongoDB
  learning: 4
    - Race condition in useEffect
```

**Table** - Formatted display:
```
================================================================================
MEMORIES FOR PROJECT: my-web-app
================================================================================

## CODE_PATTERN (5)
----------------------------------------
  * useAsync hook [hooks, async, react]
  * API error handler [error-handling, express]
```

### --help

Display usage information:

```bash
letta-mcp --help
letta-mcp -h
```

## npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run start` | `node src/index.js` | Start with stdio transport |
| `npm run start:http` | `node src/index.js --http` | Start with HTTP transport |
| `npm run start:sse` | `node src/index.js --sse` | Start with SSE transport |
| `npm run dev` | `node src/index.js` | Development mode (stdio) |
| `npm run dev:http` | `node src/index.js --http` | Development mode (HTTP) |
| `npm run dev:sse` | `node src/index.js --sse` | Development mode (SSE) |
| `npm run list-memories` | `node src/index.js --list-memories` | List coding memories |

## Environment Variables

CLI commands require authentication. See [AUTHENTICATION.md](./AUTHENTICATION.md) for details.

| Variable | Required | Description |
|----------|----------|-------------|
| `LETTA_BASE_URL` | For self-hosted | Letta API base URL |
| `LETTA_API_KEY` | For Letta Cloud | API key for cloud access |
| `LETTA_PASSWORD` | For self-hosted | Password authentication |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (missing env vars, API errors, etc.) |

## Source Files

- `src/index.js` - Entry point and CLI argument parsing
- `src/cli/list-memories.js` - List memories command implementation
