/**
 * Smart context-aware recall tools for Claude Code
 * Intelligently retrieve relevant memories based on current context
 */

import {
    getAgentName,
    MEMORY_TYPES,
    parseMemory,
    formatMemoryForDisplay,
    validateRequiredFields,
} from './utils.js';

/**
 * Recall relevant memories based on current context
 * This is the main "smart recall" tool that considers multiple factors
 */
export async function handleRecallRelevant(server, args) {
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
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            found: false,
                            project: args.project,
                            message: `No memory agent found for project "${args.project}". Use init_project_memory first.`,
                        }),
                    },
                ],
            };
        }

        // Build a comprehensive search query from context
        const searchTerms = [];

        if (args.task) searchTerms.push(args.task);
        if (args.file_path) {
            // Extract filename and directory
            const parts = args.file_path.split('/');
            searchTerms.push(parts[parts.length - 1]); // filename
            if (parts.length > 1) searchTerms.push(parts[parts.length - 2]); // parent dir
        }
        if (args.error_message) searchTerms.push(args.error_message);
        if (args.keywords && args.keywords.length > 0) {
            searchTerms.push(...args.keywords);
        }

        const searchQuery = searchTerms.join(' ');

        // Get all passages with semantic search if we have context
        const params = {
            limit: args.limit || 20,
        };

        if (searchQuery) {
            params.search = searchQuery;
        }

        const passagesResponse = await server.api.get(`/agents/${agent.id}/archival-memory`, {
            headers,
            params,
        });

        const passages = passagesResponse.data || [];

        // Parse and categorize memories
        const memories = passages.map((p) => {
            const parsed = parseMemory(p.text);
            return {
                id: p.id,
                ...parsed,
            };
        });

        // Filter by requested types
        const requestedTypes = args.types || ['code_pattern', 'decision', 'learning'];
        const filteredMemories = memories.filter((m) => {
            const type = m.metadata?.type;
            return requestedTypes.includes(type);
        });

        // Score and rank memories by relevance
        const scoredMemories = filteredMemories.map((memory) => {
            let score = 0;

            // File path match
            if (args.file_path && memory.metadata?.related_files) {
                const files = memory.metadata.related_files;
                if (files.some((f) => args.file_path.includes(f) || f.includes(args.file_path))) {
                    score += 10;
                }
            }

            // Error message match (high priority for bug fixes)
            if (args.error_message && memory.metadata?.error_message) {
                if (memory.metadata.error_message.toLowerCase().includes(args.error_message.toLowerCase())) {
                    score += 15;
                }
            }

            // Tag matches
            if (args.keywords && memory.metadata?.tags) {
                const tags = memory.metadata.tags.map((t) => t.toLowerCase());
                const keywords = args.keywords.map((k) => k.toLowerCase());
                const tagMatches = keywords.filter((k) => tags.some((t) => t.includes(k)));
                score += tagMatches.length * 3;
            }

            // Recency bonus (within last 30 days)
            if (memory.metadata?.created_at) {
                const created = new Date(memory.metadata.created_at);
                const now = new Date();
                const daysSince = (now - created) / (1000 * 60 * 60 * 24);
                if (daysSince < 30) {
                    score += Math.floor((30 - daysSince) / 10);
                }
            }

            // Category-specific bonuses
            if (args.error_message && memory.metadata?.category === 'bug_fix') {
                score += 5;
            }

            return { ...memory, relevance_score: score };
        });

        // Sort by relevance score
        scoredMemories.sort((a, b) => b.relevance_score - a.relevance_score);

        // Take top results
        const topMemories = scoredMemories.slice(0, args.limit || 10);

        // Format for display
        const formattedMemories = topMemories.map((m) => ({
            ...formatMemoryForDisplay(m),
            relevance_score: m.relevance_score,
        }));

        // Group by type for easier consumption
        const byType = {
            patterns: formattedMemories.filter((m) => m.type === MEMORY_TYPES.CODE_PATTERN),
            decisions: formattedMemories.filter((m) => m.type === MEMORY_TYPES.DECISION),
            learnings: formattedMemories.filter((m) => m.type === MEMORY_TYPES.LEARNING),
        };

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        count: formattedMemories.length,
                        project: args.project,
                        context: {
                            task: args.task || null,
                            file_path: args.file_path || null,
                            error_message: args.error_message || null,
                        },
                        by_type: byType,
                        all_memories: formattedMemories,
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to recall relevant memories');
    }
}

export const recallRelevantDefinition = {
    name: 'recall_relevant',
    description:
        'Intelligently recall relevant memories based on current context. Provide information about what you\'re working on (task, file, error) and get back the most relevant patterns, decisions, and learnings. This is the primary tool for retrieving contextual knowledge.',
    inputSchema: {
        type: 'object',
        properties: {
            project: {
                type: 'string',
                description: 'Name of the project',
            },
            task: {
                type: 'string',
                description: 'Description of the current task (e.g., "implementing user authentication")',
            },
            file_path: {
                type: 'string',
                description: 'Current file being worked on',
            },
            error_message: {
                type: 'string',
                description: 'Error message if debugging an issue',
            },
            keywords: {
                type: 'array',
                items: { type: 'string' },
                description: 'Keywords related to the current context',
            },
            types: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: ['code_pattern', 'decision', 'learning', 'project_context'],
                },
                description: 'Types of memories to recall (default: patterns, decisions, learnings)',
                default: ['code_pattern', 'decision', 'learning'],
            },
            limit: {
                type: 'integer',
                description: 'Maximum number of memories to return (default: 10)',
                default: 10,
            },
        },
        required: ['project'],
    },
};

/**
 * Quick recall for a specific memory type
 */
export async function handleQuickRecall(server, args) {
    validateRequiredFields(args, ['project', 'query'], server);

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

        // Semantic search
        const passagesResponse = await server.api.get(`/agents/${agent.id}/archival-memory`, {
            headers,
            params: {
                search: args.query,
                limit: args.limit || 5,
            },
        });

        const passages = passagesResponse.data || [];

        // Parse memories
        let memories = passages.map((p) => {
            const parsed = parseMemory(p.text);
            return {
                id: p.id,
                ...parsed,
            };
        });

        // Filter by type if specified
        if (args.type) {
            memories = memories.filter((m) => m.metadata?.type === args.type);
        }

        // Format for display
        const formattedMemories = memories.map(formatMemoryForDisplay);

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        count: formattedMemories.length,
                        project: args.project,
                        query: args.query,
                        memories: formattedMemories,
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to quick recall');
    }
}

export const quickRecallDefinition = {
    name: 'quick_recall',
    description:
        'Quickly search for memories using a simple query. Use this for fast lookups when you know what you\'re looking for.',
    inputSchema: {
        type: 'object',
        properties: {
            project: {
                type: 'string',
                description: 'Name of the project',
            },
            query: {
                type: 'string',
                description: 'Search query',
            },
            type: {
                type: 'string',
                enum: ['code_pattern', 'decision', 'learning', 'project_context'],
                description: 'Filter by memory type',
            },
            limit: {
                type: 'integer',
                description: 'Maximum number of results (default: 5)',
                default: 5,
            },
        },
        required: ['project', 'query'],
    },
};

/**
 * Get memory statistics for a project
 */
export async function handleGetMemoryStats(server, args) {
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
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            found: false,
                            project: args.project,
                            message: `No memory agent found for project "${args.project}"`,
                        }),
                    },
                ],
            };
        }

        // Get all passages
        const passagesResponse = await server.api.get(`/agents/${agent.id}/archival-memory`, {
            headers,
            params: { limit: 1000 },
        });

        const passages = passagesResponse.data || [];

        // Analyze memories
        const stats = {
            total_memories: passages.length,
            by_type: {
                code_pattern: 0,
                decision: 0,
                learning: 0,
                project_context: 0,
                other: 0,
            },
            learnings_by_category: {
                bug_fix: 0,
                gotcha: 0,
                tip: 0,
                solution: 0,
                convention: 0,
            },
            decisions_by_category: {
                architecture: 0,
                technology: 0,
                design: 0,
                process: 0,
                security: 0,
                performance: 0,
                general: 0,
            },
            languages: {},
            frameworks: {},
            recent_activity: {
                last_7_days: 0,
                last_30_days: 0,
            },
        };

        const now = new Date();

        for (const passage of passages) {
            const parsed = parseMemory(passage.text);
            const type = parsed.metadata?.type;
            const createdAt = parsed.metadata?.created_at ? new Date(parsed.metadata.created_at) : null;

            // Count by type
            if (type in stats.by_type) {
                stats.by_type[type]++;
            } else {
                stats.by_type.other++;
            }

            // Count learnings by category
            if (type === MEMORY_TYPES.LEARNING && parsed.metadata?.category) {
                const cat = parsed.metadata.category;
                if (cat in stats.learnings_by_category) {
                    stats.learnings_by_category[cat]++;
                }
            }

            // Count decisions by category
            if (type === MEMORY_TYPES.DECISION && parsed.metadata?.category) {
                const cat = parsed.metadata.category;
                if (cat in stats.decisions_by_category) {
                    stats.decisions_by_category[cat]++;
                }
            }

            // Count languages
            if (parsed.metadata?.language) {
                const lang = parsed.metadata.language.toLowerCase();
                stats.languages[lang] = (stats.languages[lang] || 0) + 1;
            }

            // Count frameworks
            if (parsed.metadata?.framework) {
                const fw = parsed.metadata.framework.toLowerCase();
                stats.frameworks[fw] = (stats.frameworks[fw] || 0) + 1;
            }

            // Recent activity
            if (createdAt) {
                const daysSince = (now - createdAt) / (1000 * 60 * 60 * 24);
                if (daysSince <= 7) stats.recent_activity.last_7_days++;
                if (daysSince <= 30) stats.recent_activity.last_30_days++;
            }
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        project: args.project,
                        agent_id: agent.id,
                        stats,
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to get memory stats');
    }
}

export const getMemoryStatsDefinition = {
    name: 'get_memory_stats',
    description:
        'Get statistics about stored memories for a project. Shows counts by type, category breakdowns, and recent activity.',
    inputSchema: {
        type: 'object',
        properties: {
            project: {
                type: 'string',
                description: 'Name of the project',
            },
        },
        required: ['project'],
    },
};
