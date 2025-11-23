/**
 * Bulk operations for coding memories
 * Export, import, and clear project memories
 */

import {
    getAgentName,
    parseMemory,
    validateRequiredFields,
} from './utils.js';

/**
 * Export all memories for a project
 */
export async function handleExportProjectMemories(server, args) {
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
            params: { limit: args.limit || 1000 },
        });

        const passages = passagesResponse.data || [];

        // Parse all memories
        const memories = passages.map((p) => {
            const parsed = parseMemory(p.text);
            return {
                id: p.id,
                raw_text: p.text,
                metadata: parsed.metadata,
                content: parsed.content,
            };
        });

        // Create export object
        const exportData = {
            export_version: '1.0',
            exported_at: new Date().toISOString(),
            project: args.project,
            agent_name: agentName,
            memory_count: memories.length,
            memories,
        };

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(exportData, null, args.pretty ? 2 : 0),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to export project memories');
    }
}

export const exportProjectMemoriesDefinition = {
    name: 'export_project_memories',
    description:
        'Export all memories for a project as JSON. Use this for backup, sharing, or migrating memories between projects.',
    inputSchema: {
        type: 'object',
        properties: {
            project: {
                type: 'string',
                description: 'Name of the project',
            },
            limit: {
                type: 'integer',
                description: 'Maximum number of memories to export (default: 1000)',
                default: 1000,
            },
            pretty: {
                type: 'boolean',
                description: 'Format output with indentation (default: false)',
                default: false,
            },
        },
        required: ['project'],
    },
};

/**
 * Import memories into a project
 */
export async function handleImportProjectMemories(server, args) {
    validateRequiredFields(args, ['project', 'memories'], server);

    try {
        const headers = server.getApiHeaders();
        const agentName = getAgentName(args.project);

        // Find the agent
        const listResponse = await server.api.get('/agents/', {
            headers,
            params: { name: agentName },
        });

        const agents = listResponse.data || [];
        let agent = agents.find((a) => a.name === agentName);

        // Create agent if it doesn't exist and create_if_missing is true
        if (!agent) {
            if (args.create_if_missing) {
                const agentConfig = {
                    name: agentName,
                    description: `Claude Code memory storage agent for project: ${args.project} (imported)`,
                    agent_type: 'memgpt_agent',
                    model: 'letta/letta-free',
                    embedding: 'letta/letta-free',
                };

                const createResponse = await server.api.post('/agents/', agentConfig, { headers });
                agent = createResponse.data;
            } else {
                server.createErrorResponse(
                    `No memory agent found for project "${args.project}". Set create_if_missing=true to create one.`
                );
            }
        }

        // Parse import data
        let memoriesToImport;
        if (typeof args.memories === 'string') {
            try {
                const parsed = JSON.parse(args.memories);
                memoriesToImport = parsed.memories || parsed;
            } catch {
                server.createErrorResponse('Invalid JSON in memories parameter');
            }
        } else if (Array.isArray(args.memories)) {
            memoriesToImport = args.memories;
        } else if (args.memories.memories) {
            memoriesToImport = args.memories.memories;
        } else {
            server.createErrorResponse('memories must be an array or export object');
        }

        // Import memories
        let imported = 0;
        let failed = 0;
        const errors = [];

        for (const memory of memoriesToImport) {
            try {
                // Use raw_text if available, otherwise reconstruct
                const text = memory.raw_text || JSON.stringify({
                    metadata: memory.metadata,
                    content: memory.content,
                });

                await server.api.post(
                    `/agents/${agent.id}/archival-memory`,
                    { text },
                    { headers }
                );
                imported++;
            } catch (err) {
                failed++;
                errors.push({
                    memory_id: memory.id,
                    error: err.message,
                });
            }
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        project: args.project,
                        total: memoriesToImport.length,
                        imported,
                        failed,
                        errors: errors.length > 0 ? errors : undefined,
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to import project memories');
    }
}

export const importProjectMemoriesDefinition = {
    name: 'import_project_memories',
    description:
        'Import memories into a project from an export. Use this to restore backups or share memories between projects.',
    inputSchema: {
        type: 'object',
        properties: {
            project: {
                type: 'string',
                description: 'Name of the project to import into',
            },
            memories: {
                oneOf: [
                    { type: 'string', description: 'JSON string of export data' },
                    { type: 'array', description: 'Array of memory objects' },
                    { type: 'object', description: 'Export object with memories array' },
                ],
                description: 'Memories to import (export JSON string, array, or export object)',
            },
            create_if_missing: {
                type: 'boolean',
                description: 'Create the project memory agent if it does not exist (default: false)',
                default: false,
            },
        },
        required: ['project', 'memories'],
    },
};

/**
 * Clear all memories for a project
 */
export async function handleClearProjectMemories(server, args) {
    validateRequiredFields(args, ['project'], server);

    // Require confirmation
    if (!args.confirm) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        message: `This will permanently delete all memories for project "${args.project}". Set confirm=true to proceed.`,
                        warning: 'This action cannot be undone!',
                    }),
                },
            ],
        };
    }

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
                `No memory agent found for project "${args.project}".`
            );
        }

        // Get all passages
        const passagesResponse = await server.api.get(`/agents/${agent.id}/archival-memory`, {
            headers,
            params: { limit: 1000 },
        });

        const passages = passagesResponse.data || [];

        // Delete all passages
        let deleted = 0;
        let failed = 0;

        for (const passage of passages) {
            try {
                await server.api.delete(`/agents/${agent.id}/archival-memory/${passage.id}`, {
                    headers,
                });
                deleted++;
            } catch {
                failed++;
            }
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        project: args.project,
                        total: passages.length,
                        deleted,
                        failed,
                        message: `Cleared ${deleted} memories from project "${args.project}"`,
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to clear project memories');
    }
}

export const clearProjectMemoriesDefinition = {
    name: 'clear_project_memories',
    description:
        'Delete all memories for a project. Requires confirmation. Use export_project_memories first if you want a backup.',
    inputSchema: {
        type: 'object',
        properties: {
            project: {
                type: 'string',
                description: 'Name of the project',
            },
            confirm: {
                type: 'boolean',
                description: 'Must be true to proceed with deletion',
                default: false,
            },
        },
        required: ['project'],
    },
};

/**
 * Delete a specific memory
 */
export async function handleDeleteMemory(server, args) {
    validateRequiredFields(args, ['project', 'memory_id'], server);

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
                `No memory agent found for project "${args.project}".`
            );
        }

        // Delete the specific passage
        await server.api.delete(`/agents/${agent.id}/archival-memory/${args.memory_id}`, {
            headers,
        });

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        project: args.project,
                        memory_id: args.memory_id,
                        message: `Deleted memory ${args.memory_id} from project "${args.project}"`,
                    }),
                },
            ],
        };
    } catch (error) {
        if (error.response?.status === 404) {
            server.createErrorResponse(
                `Memory not found: ${args.memory_id}`
            );
        }
        server.createErrorResponse(error, 'Failed to delete memory');
    }
}

export const deleteMemoryDefinition = {
    name: 'delete_memory',
    description:
        'Delete a specific memory by ID. Use list or search tools to find memory IDs.',
    inputSchema: {
        type: 'object',
        properties: {
            project: {
                type: 'string',
                description: 'Name of the project',
            },
            memory_id: {
                type: 'string',
                description: 'ID of the memory to delete',
            },
        },
        required: ['project', 'memory_id'],
    },
};

/**
 * Delete project memory agent entirely
 */
export async function handleDeleteProjectMemoryAgent(server, args) {
    validateRequiredFields(args, ['project'], server);

    if (!args.confirm) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        message: `This will permanently delete the memory agent and ALL memories for project "${args.project}". Set confirm=true to proceed.`,
                        warning: 'This action cannot be undone!',
                    }),
                },
            ],
        };
    }

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
                `No memory agent found for project "${args.project}".`
            );
        }

        // Delete the agent
        await server.api.delete(`/agents/${agent.id}`, { headers });

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        project: args.project,
                        agent_id: agent.id,
                        message: `Deleted memory agent for project "${args.project}"`,
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to delete project memory agent');
    }
}

export const deleteProjectMemoryAgentDefinition = {
    name: 'delete_project_memory_agent',
    description:
        'Permanently delete the memory agent for a project, including all stored memories. Requires confirmation.',
    inputSchema: {
        type: 'object',
        properties: {
            project: {
                type: 'string',
                description: 'Name of the project',
            },
            confirm: {
                type: 'boolean',
                description: 'Must be true to proceed with deletion',
                default: false,
            },
        },
        required: ['project'],
    },
};
