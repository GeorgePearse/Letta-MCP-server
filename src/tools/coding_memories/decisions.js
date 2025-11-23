/**
 * Decision tracking tools for Claude Code
 * Record and query architectural and design decisions
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
 * Record an architectural or design decision
 */
export async function handleRecordDecision(server, args) {
    validateRequiredFields(args, ['project', 'title', 'decision', 'rationale'], server);

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

        // Create decision metadata
        const metadata = createMemoryMetadata(MEMORY_TYPES.DECISION, args.project, {
            title: args.title,
            category: args.category || 'general',
            tags: args.tags || [],
            status: args.status || 'accepted',
            date: args.date || new Date().toISOString().split('T')[0],
        });

        const content = {
            context: args.context || '',
            decision: args.decision,
            alternatives: args.alternatives || [],
            rationale: args.rationale,
            consequences: args.consequences || '',
            related_files: args.related_files || [],
        };

        const passageText = serializeMemory(metadata, content);

        // Store the decision
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
                        decision_title: args.title,
                        message: `Recorded decision "${args.title}" for project "${args.project}"`,
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to record decision');
    }
}

export const recordDecisionDefinition = {
    name: 'record_decision',
    description:
        'Record an architectural or design decision with rationale and alternatives considered. Use this to document important choices made during development for future reference.',
    inputSchema: {
        type: 'object',
        properties: {
            project: {
                type: 'string',
                description: 'Name of the project',
            },
            title: {
                type: 'string',
                description: 'Brief title for the decision (e.g., "Use PostgreSQL over MongoDB")',
            },
            context: {
                type: 'string',
                description: 'Background context that led to this decision',
            },
            decision: {
                type: 'string',
                description: 'The decision that was made',
            },
            alternatives: {
                type: 'array',
                items: { type: 'string' },
                description: 'Alternative options that were considered',
            },
            rationale: {
                type: 'string',
                description: 'Why this decision was made (required)',
            },
            consequences: {
                type: 'string',
                description: 'Expected consequences or trade-offs of this decision',
            },
            category: {
                type: 'string',
                enum: ['architecture', 'technology', 'design', 'process', 'security', 'performance', 'general'],
                description: 'Category of the decision',
                default: 'general',
            },
            tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags for categorization',
            },
            status: {
                type: 'string',
                enum: ['proposed', 'accepted', 'deprecated', 'superseded'],
                description: 'Status of the decision',
                default: 'accepted',
            },
            date: {
                type: 'string',
                description: 'Date of the decision (YYYY-MM-DD format, defaults to today)',
            },
            related_files: {
                type: 'array',
                items: { type: 'string' },
                description: 'File paths related to this decision',
            },
        },
        required: ['project', 'title', 'decision', 'rationale'],
    },
};

/**
 * Search decisions
 */
export async function handleSearchDecisions(server, args) {
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

        const passagesResponse = await server.api.get(`/agents/${agent.id}/archival-memory`, {
            headers,
            params,
        });

        const passages = passagesResponse.data || [];

        // Filter to only decisions
        let decisions = filterMemoriesByType(passages, MEMORY_TYPES.DECISION);

        // Apply category filter
        if (args.category) {
            decisions = decisions.filter(
                (d) => d.metadata?.category?.toLowerCase() === args.category.toLowerCase()
            );
        }

        // Apply status filter
        if (args.status) {
            decisions = decisions.filter(
                (d) => d.metadata?.status?.toLowerCase() === args.status.toLowerCase()
            );
        }

        // Apply tag filter
        if (args.tags && args.tags.length > 0) {
            decisions = decisions.filter((d) => {
                const decisionTags = d.metadata?.tags || [];
                return args.tags.some((tag) =>
                    decisionTags.some((dt) => dt.toLowerCase().includes(tag.toLowerCase()))
                );
            });
        }

        // Format for display
        const formattedDecisions = decisions.map(formatMemoryForDisplay);

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        count: formattedDecisions.length,
                        project: args.project,
                        decisions: formattedDecisions,
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to search decisions');
    }
}

export const searchDecisionsDefinition = {
    name: 'search_decisions',
    description:
        'Search recorded decisions for a project. Use semantic search or filter by category, status, or tags.',
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
            category: {
                type: 'string',
                enum: ['architecture', 'technology', 'design', 'process', 'security', 'performance', 'general'],
                description: 'Filter by decision category',
            },
            status: {
                type: 'string',
                enum: ['proposed', 'accepted', 'deprecated', 'superseded'],
                description: 'Filter by decision status',
            },
            tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by tags',
            },
            limit: {
                type: 'integer',
                description: 'Maximum number of decisions to return (default: 50)',
                default: 50,
            },
        },
        required: ['project'],
    },
};

/**
 * List all decisions for a project
 */
export async function handleListDecisions(server, args) {
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

        // Filter to only decisions
        const decisions = filterMemoriesByType(passages, MEMORY_TYPES.DECISION);

        // Create summary view
        const decisionSummaries = decisions.map((d) => ({
            id: d.id,
            title: d.metadata?.title || 'Untitled',
            category: d.metadata?.category || 'general',
            status: d.metadata?.status || 'accepted',
            date: d.metadata?.date,
            tags: d.metadata?.tags || [],
        }));

        // Sort by date (newest first)
        decisionSummaries.sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return b.date.localeCompare(a.date);
        });

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        count: decisionSummaries.length,
                        project: args.project,
                        decisions: decisionSummaries,
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to list decisions');
    }
}

export const listDecisionsDefinition = {
    name: 'list_decisions',
    description:
        'List all recorded decisions for a project. Returns a summary view with titles, categories, and dates.',
    inputSchema: {
        type: 'object',
        properties: {
            project: {
                type: 'string',
                description: 'Name of the project',
            },
            limit: {
                type: 'integer',
                description: 'Maximum number of decisions to return (default: 100)',
                default: 100,
            },
        },
        required: ['project'],
    },
};
