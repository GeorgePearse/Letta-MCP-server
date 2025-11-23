/**
 * Learnings storage tools for Claude Code
 * Store and retrieve bug fixes, gotchas, tips, and solutions
 */

import {
    getAgentName,
    MEMORY_TYPES,
    LEARNING_CATEGORIES,
    createMemoryMetadata,
    serializeMemory,
    filterMemoriesByType,
    validateRequiredFields,
    formatMemoryForDisplay,
} from './utils.js';

/**
 * Store a learning (bug fix, gotcha, tip, or solution)
 */
export async function handleStoreLearning(server, args) {
    validateRequiredFields(args, ['project', 'title', 'category'], server);

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

        // Validate category
        const validCategories = Object.values(LEARNING_CATEGORIES);
        if (!validCategories.includes(args.category)) {
            server.createErrorResponse(
                `Invalid category "${args.category}". Must be one of: ${validCategories.join(', ')}`
            );
        }

        // Create learning metadata
        const metadata = createMemoryMetadata(MEMORY_TYPES.LEARNING, args.project, {
            title: args.title,
            category: args.category,
            tags: args.tags || [],
            severity: args.severity || 'medium',
            related_files: args.related_files || [],
            error_message: args.error_message || null,
        });

        const content = {
            problem: args.problem || '',
            solution: args.solution || '',
            explanation: args.explanation || '',
            code_before: args.code_before || null,
            code_after: args.code_after || null,
            prevention: args.prevention || '',
        };

        const passageText = serializeMemory(metadata, content);

        // Store the learning
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
                        learning_title: args.title,
                        category: args.category,
                        message: `Stored ${args.category} "${args.title}" for project "${args.project}"`,
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to store learning');
    }
}

export const storeLearningDefinition = {
    name: 'store_learning',
    description:
        'Store a learning such as a bug fix, gotcha, tip, solution, or convention. Use this to remember problems encountered and their solutions for future reference.',
    inputSchema: {
        type: 'object',
        properties: {
            project: {
                type: 'string',
                description: 'Name of the project',
            },
            title: {
                type: 'string',
                description: 'Brief title for the learning (e.g., "Race condition in useEffect cleanup")',
            },
            category: {
                type: 'string',
                enum: ['bug_fix', 'gotcha', 'tip', 'solution', 'convention'],
                description: 'Type of learning: bug_fix (fixed bug), gotcha (common pitfall), tip (best practice), solution (problem solved), convention (coding standard)',
            },
            problem: {
                type: 'string',
                description: 'Description of the problem or issue',
            },
            solution: {
                type: 'string',
                description: 'How the problem was solved',
            },
            explanation: {
                type: 'string',
                description: 'Why the solution works or additional context',
            },
            code_before: {
                type: 'string',
                description: 'Code snippet showing the problematic code (if applicable)',
            },
            code_after: {
                type: 'string',
                description: 'Code snippet showing the fixed/improved code (if applicable)',
            },
            prevention: {
                type: 'string',
                description: 'How to prevent this issue in the future',
            },
            tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags for categorization (e.g., ["async", "hooks", "memory-leak"])',
            },
            severity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                description: 'Severity of the issue',
                default: 'medium',
            },
            related_files: {
                type: 'array',
                items: { type: 'string' },
                description: 'File paths where this issue occurred or applies',
            },
            error_message: {
                type: 'string',
                description: 'Error message associated with this issue (for bug_fix category)',
            },
        },
        required: ['project', 'title', 'category'],
    },
};

/**
 * Search learnings
 */
export async function handleSearchLearnings(server, args) {
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

        if (args.query) {
            params.search = args.query;
        }

        // If searching by error message, include that in the search
        if (args.error_message) {
            params.search = args.error_message;
        }

        const passagesResponse = await server.api.get(`/agents/${agent.id}/archival-memory`, {
            headers,
            params,
        });

        const passages = passagesResponse.data || [];

        // Filter to only learnings
        let learnings = filterMemoriesByType(passages, MEMORY_TYPES.LEARNING);

        // Apply category filter
        if (args.category) {
            learnings = learnings.filter(
                (l) => l.metadata?.category?.toLowerCase() === args.category.toLowerCase()
            );
        }

        // Apply severity filter
        if (args.severity) {
            learnings = learnings.filter(
                (l) => l.metadata?.severity?.toLowerCase() === args.severity.toLowerCase()
            );
        }

        // Apply tag filter
        if (args.tags && args.tags.length > 0) {
            learnings = learnings.filter((l) => {
                const learningTags = l.metadata?.tags || [];
                return args.tags.some((tag) =>
                    learningTags.some((lt) => lt.toLowerCase().includes(tag.toLowerCase()))
                );
            });
        }

        // Apply file filter
        if (args.related_file) {
            learnings = learnings.filter((l) => {
                const relatedFiles = l.metadata?.related_files || [];
                return relatedFiles.some((f) =>
                    f.toLowerCase().includes(args.related_file.toLowerCase())
                );
            });
        }

        // Format for display
        const formattedLearnings = learnings.map(formatMemoryForDisplay);

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        count: formattedLearnings.length,
                        project: args.project,
                        learnings: formattedLearnings,
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to search learnings');
    }
}

export const searchLearningsDefinition = {
    name: 'search_learnings',
    description:
        'Search stored learnings for a project. Use semantic search, search by error message, or filter by category, severity, or tags.',
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
            error_message: {
                type: 'string',
                description: 'Search for learnings related to a specific error message',
            },
            category: {
                type: 'string',
                enum: ['bug_fix', 'gotcha', 'tip', 'solution', 'convention'],
                description: 'Filter by learning category',
            },
            severity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                description: 'Filter by severity',
            },
            tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by tags',
            },
            related_file: {
                type: 'string',
                description: 'Filter by related file path',
            },
            limit: {
                type: 'integer',
                description: 'Maximum number of learnings to return (default: 50)',
                default: 50,
            },
        },
        required: ['project'],
    },
};

/**
 * List all learnings for a project
 */
export async function handleListLearnings(server, args) {
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

        // Filter to only learnings
        const learnings = filterMemoriesByType(passages, MEMORY_TYPES.LEARNING);

        // Create summary view
        const learningSummaries = learnings.map((l) => ({
            id: l.id,
            title: l.metadata?.title || 'Untitled',
            category: l.metadata?.category || 'unknown',
            severity: l.metadata?.severity || 'medium',
            tags: l.metadata?.tags || [],
            created_at: l.metadata?.created_at,
        }));

        // Group by category for overview
        const byCategory = {
            bug_fix: learningSummaries.filter((l) => l.category === 'bug_fix').length,
            gotcha: learningSummaries.filter((l) => l.category === 'gotcha').length,
            tip: learningSummaries.filter((l) => l.category === 'tip').length,
            solution: learningSummaries.filter((l) => l.category === 'solution').length,
            convention: learningSummaries.filter((l) => l.category === 'convention').length,
        };

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        count: learningSummaries.length,
                        project: args.project,
                        by_category: byCategory,
                        learnings: learningSummaries,
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to list learnings');
    }
}

export const listLearningsDefinition = {
    name: 'list_learnings',
    description:
        'List all stored learnings for a project. Returns a summary view with titles, categories, and severity levels, grouped by category.',
    inputSchema: {
        type: 'object',
        properties: {
            project: {
                type: 'string',
                description: 'Name of the project',
            },
            limit: {
                type: 'integer',
                description: 'Maximum number of learnings to return (default: 100)',
                default: 100,
            },
        },
        required: ['project'],
    },
};
