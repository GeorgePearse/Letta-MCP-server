#!/usr/bin/env node
import dotenv from 'dotenv';
import { LettaServer } from './core/server.js';
import { registerToolHandlers } from './tools/index.js';
import { registerPromptHandlers } from './handlers/prompts.js';
import { registerResourceHandlers } from './handlers/resources.js';
import { initializeExamples } from './examples/index.js';
import { runStdio, runSSE, runHTTP } from './transports/index.js';
import { createLogger } from './core/logger.js';
import { listMemoriesCommand, parseListMemoriesArgs } from './cli/list-memories.js';

// Load environment variables
dotenv.config();

// Create logger for main module
const logger = createLogger('Main');

// Handle CLI commands before starting MCP server
const listMemories = process.argv.includes('--list-memories');
const showHelp = process.argv.includes('--help') || process.argv.includes('-h');

if (showHelp) {
    console.log(`
Letta MCP Server

Usage: letta-mcp [options]

Transport Options:
  --http          Run with HTTP transport (recommended for production)
  --sse           Run with SSE transport
  (default)       Run with stdio transport

CLI Commands:
  --list-memories List all memories for a project
    --project=NAME  Project name (default: "default")
    --format=TYPE   Output format: json, summary, table (default: json)
    --limit=N       Maximum memories to fetch (default: 100)

  --help, -h      Show this help message

Examples:
  letta-mcp --http                    # Start HTTP server
  letta-mcp --list-memories           # List memories for default project
  letta-mcp --list-memories --project=myapp --format=summary
`);
    process.exit(0);
}

if (listMemories) {
    const options = parseListMemoriesArgs(process.argv);
    listMemoriesCommand(options).then(() => process.exit(0));
} else {

/**
 * Initialize and run the Letta MCP server
 */
async function main() {
    try {
        // Create server instance
        const server = new LettaServer();

        // Register all handlers before connecting to transport
        registerToolHandlers(server);
        registerPromptHandlers(server);
        registerResourceHandlers(server);

        // Initialize example prompts and resources
        initializeExamples(server);

        // Mark handlers as registered
        server.handlersRegistered = true;

        // Determine transport mode from command line arguments
        const useSSE = process.argv.includes('--sse');
        const useHTTP = process.argv.includes('--http');

        // Run server with appropriate transport
        if (useHTTP) {
            logger.info('Starting Letta server with HTTP transport');
            await runHTTP(server);
        } else if (useSSE) {
            logger.info('Starting Letta server with SSE transport');
            await runSSE(server);
        } else {
            logger.info('Starting Letta server with stdio transport');
            await runStdio(server);
        }
    } catch (error) {
        logger.error('Failed to start Letta server:', error);
        process.exit(1);
    }
}

// Run the server
main().catch((error) => {
    logger.error('Uncaught error in main:', error);
    process.exit(1);
});
}
