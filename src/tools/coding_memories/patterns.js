/**
 * Code pattern storage tools for Claude Code
 * Store and retrieve reusable code patterns
 */

import {
    getAgentName,
    MEMORY_TYPES,
    createMemoryMetadata,
    serializeMemory,
    filterMemoriesByType,
    validateRequiredFields,
    formatMemoryForDisplay,
} from './utils.js';

/**
 * Store a code pattern
 */
export async function handleStoreCodePattern(server, args) {
    validateRequiredFields(args, ['project', 'name', 'pattern'], server);

    try {
        const headers = server.getApiHeaders();
        const agentName = getAgentName(args.project);

        // Find the agent
        const listResponse = await server.api.get('/agents/', {
            headers,
            params: { name: agentName },
        });

        const agents = listResponse.data || [];
        const agent = agents.find((a) => a.name === agentName);

        if (!agent) {
            server.createErrorResponse(
                `No memory agent found for project "${args.project}". Use init_project_memory first.`
            );
        }

        // Create pattern metadata
        const metadata = createMemoryMetadata(MEMORY_TYPES.CODE_PATTERN, args.project, {
            name: args.name,
            language: args.language || 'unknown',
            framework: args.framework || null,
            tags: args.tags || [],
            usage: args.usage || '',
            file_context: args.file_context || null,
        });

        const content = {
            pattern: args.pattern,
            example: args.example || null,
            notes: args.notes || null,
        };

        const passageText = serializeMemory(metadata, content);

        // Store the pattern
        const response = await server.api.post(
            `/agents/${agent.id}/archival-memory`,
            { text: passageText },
            { headers }
        );

        const createdPassages = response.data || [];
        const passageId = createdPassages[0]?.id;

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        passage_id: passageId,
                        project: args.project,
                        pattern_name: args.name,
                        message: `Stored code pattern "${args.name}" for project "${args.project}"`,
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to store code pattern');
    }
}

export const storeCodePatternDefinition = {
    name: 'store_code_pattern',
    description:
        'Store a reusable code pattern for future reference. Use this to save common patterns, utility functions, component structures, or any code that should be remembered and reused.',
    inputSchema: {
        type: 'object',
        properties: {
            project: {
                type: 'string',
                description: 'Name of the project',
            },
            name: {
                type: 'string',
                description: 'Name for the pattern (e.g., "useAsync hook", "API error handler")',
            },
            pattern: {
                type: 'string',
                description: 'The actual code pattern/snippet',
            },
            language: {
                type: 'string',
                description: 'Programming language (e.g., "typescript", "python", "rust")',
            },
            framework: {
                type: 'string',
                description: 'Framework if applicable (e.g., "react", "express", "fastapi")',
            },
            tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags for categorization (e.g., ["hooks", "async", "error-handling"])',
            },
            usage: {
                type: 'string',
                description: 'Description of when and how to use this pattern',
            },
            example: {
                type: 'string',
                description: 'Example usage of the pattern',
            },
            notes: {
                type: 'string',
                description: 'Additional notes or caveats',
            },
            file_context: {
                type: 'string',
                description: 'File path or location context where this pattern is used',
            },
        },
        required: ['project', 'name', 'pattern'],
    },
};

/**
 * Search code patterns
 */
export async function handleSearchCodePatterns(server, args) {
    validateRequiredFields(args, ['project'], server);

    try {
        const headers = server.getApiHeaders();
        const agentName = getAgentName(args.project);

        // Find the agent
        const listResponse = await server.api.get('/agents/', {
            headers,
            params: { name: agentName },
        });

        const agents = listResponse.data || [];
        const agent = agents.find((a) => a.name === agentName);

        if (!agent) {
            server.createErrorResponse(
                `No memory agent found for project "${args.project}". Use init_project_memory first.`
            );
        }

        // Build search params
        const params = {
            limit: args.limit || 50,
        };

        // Use Letta's semantic search if query provided
        if (args.query) {
            params.search = args.query;
        }

        const passagesResponse = await server.api.get(`/agents/${agent.id}/archival-memory`, {
            headers,
            params,
        });

        const passages = passagesResponse.data || [];

        // Filter to only code patterns
        let patterns = filterMemoriesByType(passages, MEMORY_TYPES.CODE_PATTERN);

        // Apply additional filters
        if (args.language) {
            patterns = patterns.filter(
                (p) => p.metadata?.language?.toLowerCase() === args.language.toLowerCase()
            );
        }

        if (args.framework) {
            patterns = patterns.filter(
                (p) => p.metadata?.framework?.toLowerCase() === args.framework.toLowerCase()
            );
        }

        if (args.tags && args.tags.length > 0) {
            patterns = patterns.filter((p) => {
                const patternTags = p.metadata?.tags || [];
                return args.tags.some((tag) =>
                    patternTags.some((pt) => pt.toLowerCase().includes(tag.toLowerCase()))
                );
            });
        }

        // Format for display
        const formattedPatterns = patterns.map(formatMemoryForDisplay);

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        count: formattedPatterns.length,
                        project: args.project,
                        patterns: formattedPatterns,
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to search code patterns');
    }
}

export const searchCodePatternsDefinition = {
    name: 'search_code_patterns',
    description:
        'Search stored code patterns for a project. Use semantic search or filter by language, framework, or tags to find relevant patterns.',
    inputSchema: {
        type: 'object',
        properties: {
            project: {
                type: 'string',
                description: 'Name of the project',
            },
            query: {
                type: 'string',
                description: 'Search query for semantic search',
            },
            language: {
                type: 'string',
                description: 'Filter by programming language',
            },
            framework: {
                type: 'string',
                description: 'Filter by framework',
            },
            tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by tags (matches any)',
            },
            limit: {
                type: 'integer',
                description: 'Maximum number of patterns to return (default: 50)',
                default: 50,
            },
        },
        required: ['project'],
    },
};

/**
 * List all code patterns for a project
 */
export async function handleListCodePatterns(server, args) {
    validateRequiredFields(args, ['project'], server);

    try {
        const headers = server.getApiHeaders();
        const agentName = getAgentName(args.project);

        // Find the agent
        const listResponse = await server.api.get('/agents/', {
            headers,
            params: { name: agentName },
        });

        const agents = listResponse.data || [];
        const agent = agents.find((a) => a.name === agentName);

        if (!agent) {
            server.createErrorResponse(
                `No memory agent found for project "${args.project}". Use init_project_memory first.`
            );
        }

        // Get all passages
        const passagesResponse = await server.api.get(`/agents/${agent.id}/archival-memory`, {
            headers,
            params: { limit: args.limit || 100 },
        });

        const passages = passagesResponse.data || [];

        // Filter to only code patterns
        const patterns = filterMemoriesByType(passages, MEMORY_TYPES.CODE_PATTERN);

        // Create summary view (name, language, tags only)
        const patternSummaries = patterns.map((p) => ({
            id: p.id,
            name: p.metadata?.name || 'Unnamed',
            language: p.metadata?.language || 'unknown',
            framework: p.metadata?.framework || null,
            tags: p.metadata?.tags || [],
            created_at: p.metadata?.created_at,
        }));

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        count: patternSummaries.length,
                        project: args.project,
                        patterns: patternSummaries,
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to list code patterns');
    }
}

export const listCodePatternsDefinition = {
    name: 'list_code_patterns',
    description:
        'List all stored code patterns for a project. Returns a summary view with pattern names, languages, and tags.',
    inputSchema: {
        type: 'object',
        properties: {
            project: {
                type: 'string',
                description: 'Name of the project',
            },
            limit: {
                type: 'integer',
                description: 'Maximum number of patterns to return (default: 100)',
                default: 100,
            },
        },
        required: ['project'],
    },
};

/**
 * Get a specific code pattern by name
 */
export async function handleGetCodePattern(server, args) {
    validateRequiredFields(args, ['project', 'name'], server);

    try {
        const headers = server.getApiHeaders();
        const agentName = getAgentName(args.project);

        // Find the agent
        const listResponse = await server.api.get('/agents/', {
            headers,
            params: { name: agentName },
        });

        const agents = listResponse.data || [];
        const agent = agents.find((a) => a.name === agentName);

        if (!agent) {
            server.createErrorResponse(
                `No memory agent found for project "${args.project}". Use init_project_memory first.`
            );
        }

        // Search for the pattern by name
        const passagesResponse = await server.api.get(`/agents/${agent.id}/archival-memory`, {
            headers,
            params: { search: args.name, limit: 50 },
        });

        const passages = passagesResponse.data || [];
        const patterns = filterMemoriesByType(passages, MEMORY_TYPES.CODE_PATTERN);

        // Find exact match by name
        const pattern = patterns.find(
            (p) => p.metadata?.name?.toLowerCase() === args.name.toLowerCase()
        );

        if (!pattern) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            found: false,
                            project: args.project,
                            name: args.name,
                            message: `Pattern "${args.name}" not found in project "${args.project}"`,
                        }),
                    },
                ],
            };
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        found: true,
                        pattern: formatMemoryForDisplay(pattern),
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to get code pattern');
    }
}

export const getCodePatternDefinition = {
    name: 'get_code_pattern',
    description:
        'Retrieve a specific code pattern by name. Returns the full pattern including code, usage instructions, and examples.',
    inputSchema: {
        type: 'object',
        properties: {
            project: {
                type: 'string',
                description: 'Name of the project',
            },
            name: {
                type: 'string',
                description: 'Name of the pattern to retrieve',
            },
        },
        required: ['project', 'name'],
    },
};
