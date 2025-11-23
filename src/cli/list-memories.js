import axios from 'axios';
import dotenv from 'dotenv';
import { createLogger } from '../core/logger.js';

// Load environment variables
dotenv.config();

const logger = createLogger('CLI');

/**
 * Parse memory content from passage text
 */
function parseMemoryContent(text) {
    try {
        // Memory content is stored as JSON in the passage text
        const parsed = JSON.parse(text);
        return parsed;
    } catch {
        return { raw: text };
    }
}

/**
 * Format memory for display
 */
function formatMemory(passage) {
    const content = parseMemoryContent(passage.text);
    const memory = {
        id: passage.id,
        created_at: passage.created_at,
    };

    // Extract from metadata (actual structure from Letta)
    const metadata = content.metadata || {};
    const innerContent = content.content || {};

    // Extract common fields from metadata
    if (metadata.type) memory.type = metadata.type;
    if (metadata.title) memory.title = metadata.title;
    if (metadata.name) memory.name = metadata.name;
    if (metadata.category) memory.category = metadata.category;
    if (metadata.tags) memory.tags = metadata.tags;
    if (metadata.language) memory.language = metadata.language;
    if (metadata.framework) memory.framework = metadata.framework;
    if (metadata.severity) memory.severity = metadata.severity;

    // Fallback to direct content fields
    if (!memory.type && content.type) memory.type = content.type;
    if (!memory.title && content.title) memory.title = content.title;

    // Include full content for detailed view
    memory.content = content;

    return memory;
}

/**
 * List memories for a project
 */
export async function listMemoriesCommand(options = {}) {
    const { project = 'default', format = 'json', limit = 100 } = options;

    const apiBase = process.env.LETTA_BASE_URL || 'https://api.letta.com';
    const password = process.env.LETTA_PASSWORD;
    const apiKey = process.env.LETTA_API_KEY;

    // Build authorization headers
    const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    };

    if (apiKey) {
        // Use API key authentication (Letta Cloud)
        headers.Authorization = `Bearer ${apiKey}`;
    } else if (password) {
        // Use password authentication (self-hosted)
        headers['X-BARE-PASSWORD'] = `password ${password}`;
        headers.Authorization = `Bearer ${password}`;
    } else {
        console.error('Error: Either LETTA_API_KEY or LETTA_PASSWORD environment variable is required');
        process.exit(1);
    }

    const api = axios.create({
        baseURL: `${apiBase}/v1`,
        headers,
    });

    try {
        // First, find the memory agent for the project
        const agentName = `claude-code-memory-${project}`;
        logger.info(`Looking for memory agent: ${agentName}`);

        const agentsResponse = await api.get('/agents');
        const agents = agentsResponse.data;

        const memoryAgent = agents.find((a) => a.name === agentName);

        if (!memoryAgent) {
            console.error(`No memory agent found for project: ${project}`);
            console.error('Available agents:');
            agents.forEach((a) => console.error(`  - ${a.name}`));
            process.exit(1);
        }

        logger.info(`Found agent: ${memoryAgent.id}`);

        // Fetch passages (archival memory)
        const passagesResponse = await api.get(`/agents/${memoryAgent.id}/archival-memory`, {
            params: { limit },
        });

        const passages = passagesResponse.data;

        // Parse and categorize memories
        const memories = {
            project,
            agent_id: memoryAgent.id,
            agent_name: memoryAgent.name,
            total: passages.length,
            by_type: {
                code_pattern: [],
                decision: [],
                learning: [],
                project_context: [],
                other: [],
            },
        };

        for (const passage of passages) {
            const formatted = formatMemory(passage);
            const type = formatted.type || 'other';

            if (memories.by_type[type]) {
                memories.by_type[type].push(formatted);
            } else {
                memories.by_type.other.push(formatted);
            }
        }

        // Output based on format
        if (format === 'json') {
            console.log(JSON.stringify(memories, null, 2));
        } else if (format === 'summary') {
            console.log(`\nMemories for project: ${project}`);
            console.log(`Agent: ${memoryAgent.name} (${memoryAgent.id})`);
            console.log(`Total memories: ${passages.length}\n`);

            console.log('By type:');
            for (const [type, items] of Object.entries(memories.by_type)) {
                if (items.length > 0) {
                    console.log(`  ${type}: ${items.length}`);
                    for (const item of items) {
                        const title = item.title || item.name || item.id;
                        console.log(`    - ${title}`);
                    }
                }
            }
        } else {
            // Table format
            console.log(`\n${'='.repeat(80)}`);
            console.log(`MEMORIES FOR PROJECT: ${project}`);
            console.log(`${'='.repeat(80)}\n`);

            for (const [type, items] of Object.entries(memories.by_type)) {
                if (items.length > 0) {
                    console.log(`\n## ${type.toUpperCase()} (${items.length})`);
                    console.log('-'.repeat(40));
                    for (const item of items) {
                        const title = item.title || item.name || 'Untitled';
                        const tags = item.tags ? ` [${item.tags.join(', ')}]` : '';
                        console.log(`  * ${title}${tags}`);
                    }
                }
            }
            console.log(`\n${'='.repeat(80)}`);
        }

        return memories;
    } catch (error) {
        if (error.response) {
            console.error(`API Error: ${error.response.status} - ${error.response.statusText}`);
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(`Error: ${error.message}`);
        }
        process.exit(1);
    }
}

/**
 * Parse CLI arguments for list-memories command
 */
export function parseListMemoriesArgs(argv) {
    const options = {
        project: 'default',
        format: 'json',
        limit: 100,
    };

    for (const arg of argv) {
        if (arg.startsWith('--project=')) {
            options.project = arg.split('=')[1];
        } else if (arg.startsWith('--format=')) {
            options.format = arg.split('=')[1];
        } else if (arg.startsWith('--limit=')) {
            options.limit = parseInt(arg.split('=')[1], 10);
        }
    }

    return options;
}
