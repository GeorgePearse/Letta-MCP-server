# AGENTS.md

Guidance for AI coding agents working with the Letta MCP Server codebase.

## Quick Start

| What | Where |
|------|-------|
| Entry point | `src/index.js` |
| Tool implementations | `src/tools/` |
| Transport protocols | `src/transports/` |
| Core server logic | `src/core/server.js` |
| Tests | `src/test/` |

## Documentation

For implementation details, see the `/docs` directory:

| Document | Contents |
|----------|----------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System diagrams, component flow, tool categories |
| [CODING_MEMORIES.md](docs/CODING_MEMORIES.md) | Full guide to the coding memories feature |
| [CLI.md](docs/CLI.md) | CLI commands and options |
| [AUTHENTICATION.md](docs/AUTHENTICATION.md) | Authentication methods and configuration |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | Development setup, adding tools, testing |
| [SECURITY.md](docs/SECURITY.md) | Security policies and best practices |

## Key Features

### MCP Tools (50+)

Tools are organized by domain in `src/tools/`:

```
src/tools/
├── agents/          # Agent CRUD operations
├── memory/          # Memory block management
├── passages/        # Archival memory passages
├── tools/           # Tool attachment and management
├── mcp/             # MCP server integration
├── models/          # LLM model listing
├── prompts/         # Prompt wizards
└── coding_memories/ # Persistent coding memories (22 tools)
```

### Coding Memories

The coding memories feature (`src/tools/coding_memories/`) provides persistent memory for AI coding assistants:

- **Project management**: `init_project_memory`, `get_project_context`
- **Code patterns**: `store_code_pattern`, `search_code_patterns`
- **Decisions**: `record_decision`, `search_decisions`
- **Learnings**: `store_learning`, `search_learnings`
- **Smart recall**: `recall_relevant`, `quick_recall`

See [docs/CODING_MEMORIES.md](docs/CODING_MEMORIES.md) for full documentation.

### CLI Commands

```bash
# Start MCP server
letta-mcp --http          # HTTP transport
letta-mcp --sse           # SSE transport
letta-mcp                 # stdio transport (default)

# List memories
letta-mcp --list-memories --project=myapp --format=summary
```

See [docs/CLI.md](docs/CLI.md) for full CLI reference.

## Tool Development Pattern

When adding new tools, follow this pattern:

```javascript
// 1. Define Zod schema
const MyToolArgsSchema = z.object({
    required_field: z.string().describe('Description'),
    optional_field: z.string().optional(),
});

// 2. Export tool definition
export const myToolDefinition = {
    name: 'my_tool',
    description: 'What this tool does',
    inputSchema: zodToJsonSchema(MyToolArgsSchema),
};

// 3. Export handler function
export async function handleMyTool(server, args) {
    try {
        const validated = MyToolArgsSchema.parse(args);
        const response = await server.api.get('/endpoint', {
            headers: server.getApiHeaders(),
        });
        return {
            content: [{ type: 'text', text: JSON.stringify(response.data) }],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Context');
    }
}
```

Then register in `src/tools/index.js`.

## File Structure

```
src/
├── index.js              # Entry point, CLI parsing
├── core/
│   ├── server.js         # LettaServer class, API client
│   └── logger.js         # Winston logger setup
├── transports/
│   ├── http-transport.js # HTTP + SSE transport
│   ├── sse-transport.js  # SSE-only transport
│   └── stdio-transport.js# Standard I/O transport
├── tools/
│   ├── index.js          # Tool registration
│   ├── agents/           # Agent management tools
│   ├── memory/           # Memory block tools
│   ├── passages/         # Passage/archival memory tools
│   ├── tools/            # Tool management tools
│   ├── mcp/              # MCP integration tools
│   ├── models/           # Model listing tools
│   ├── prompts/          # Prompt wizards
│   └── coding_memories/  # Coding memories feature
├── handlers/
│   ├── prompts.js        # Prompt handler registration
│   └── resources.js      # Resource handler registration
├── cli/
│   └── list-memories.js  # CLI command implementation
└── test/                 # Test files
```

## Environment Setup

Required environment variables:

```bash
# For Letta Cloud
export LETTA_API_KEY="sk-let-xxxxx"

# For self-hosted
export LETTA_BASE_URL="http://localhost:8283"
export LETTA_PASSWORD="your-password"
```

See [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md) for details.

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Integration tests only
npm run test:integration
```

## Common Operations

### Adding a new tool

1. Create file in appropriate `src/tools/{category}/` directory
2. Define Zod schema, tool definition, and handler
3. Export from the category's index file
4. Register in `src/tools/index.js`
5. Add tests in `src/test/tools/`

### Adding a new CLI command

1. Create handler in `src/cli/`
2. Add argument detection in `src/index.js`
3. Update help text in `src/index.js`
4. Add npm script in `package.json`
5. Document in `docs/CLI.md`

### Debugging API issues

1. Check environment variables are set correctly
2. Verify Letta server is running (for self-hosted)
3. Check server logs with `DEBUG=* npm run dev`
4. Test API directly with curl

## Related Files

- `CLAUDE.md` - Claude Code-specific instructions
- `README.md` - Project overview and setup
- `package.json` - Dependencies and scripts
