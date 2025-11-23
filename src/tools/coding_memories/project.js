/**
 * Project memory management tools for Claude Code
 * Handles creating and managing per-project memory agents
 */

import {
    getAgentName,
    projectToSlug,
    MEMORY_TYPES,
    createMemoryMetadata,
    serializeMemory,
    parseMemory,
    validateRequiredFields,
} from './utils.js';

/**
 * Initialize or retrieve a project memory agent
 * Creates a new agent if one doesn't exist for the project
 */
export async function handleInitProjectMemory(server, args) {
    validateRequiredFields(args, ['project'], server);

    try {
        const headers = server.getApiHeaders();
        const agentName = getAgentName(args.project);

        // First, try to find an existing agent with this name
        const listResponse = await server.api.get('/agents/', {
            headers,
            params: { name: agentName },
        });

        const existingAgents = listResponse.data || [];
        const existingAgent = existingAgents.find((a) => a.name === agentName);

        if (existingAgent) {
            // Return existing agent
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'existing',
                            agent_id: existingAgent.id,
                            agent_name: existingAgent.name,
                            project: args.project,
                            message: `Found existing memory agent for project "${args.project}"`,
                        }),
                    },
                ],
            };
        }

        // Create new agent for this project
        const agentConfig = {
            name: agentName,
            description: `Claude Code memory storage agent for project: ${args.project}`,
            agent_type: 'memgpt_agent',
            model: args.model || 'letta/letta-free',
            embedding: args.embedding || 'letta/letta-free',
        };

        const createResponse = await server.api.post('/agents/', agentConfig, { headers });
        const newAgent = createResponse.data;

        // Store initial project context as first memory
        const projectContext = {
            name: args.project,
            slug: projectToSlug(args.project),
            initialized_at: new Date().toISOString(),
            tech_stack: args.tech_stack || [],
            description: args.description || '',
        };

        const contextMetadata = createMemoryMetadata(MEMORY_TYPES.PROJECT_CONTEXT, args.project, {
            is_primary: true,
        });

        const contextPayload = { text: serializeMemory(contextMetadata, projectContext) };
        await server.api.post(`/agents/${newAgent.id}/archival-memory`, contextPayload, { headers });

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        status: 'created',
                        agent_id: newAgent.id,
                        agent_name: newAgent.name,
                        project: args.project,
                        message: `Created new memory agent for project "${args.project}"`,
                    }),
                },
            ],
        };
    } catch (error) {
        if (error.response?.status === 409) {
            // Agent name conflict - try to retrieve it
            server.createErrorResponse(
                `Agent name conflict for "${args.project}". Try retrieving with get_project_context.`
            );
        }
        server.createErrorResponse(error, 'Failed to initialize project memory');
    }
}

export const initProjectMemoryDefinition = {
    name: 'init_project_memory',
    description:
        'Initialize or retrieve a memory storage agent for a coding project. Call this first before storing any memories for a new project. Returns the agent ID needed for other memory operations.',
    inputSchema: {
        type: 'object',
        properties: {
            project: {
                type: 'string',
                description: 'Name of the project (e.g., "my-web-app", "api-server")',
            },
            description: {
                type: 'string',
                description: 'Optional description of the project',
            },
            tech_stack: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional list of technologies used (e.g., ["typescript", "react", "postgresql"])',
            },
            model: {
                type: 'string',
                description: 'LLM model for the agent (default: letta/letta-free)',
                default: 'letta/letta-free',
            },
            embedding: {
                type: 'string',
                description: 'Embedding model for semantic search (default: letta/letta-free)',
                default: 'letta/letta-free',
            },
        },
        required: ['project'],
    },
};

/**
 * Get project context and metadata
 */
export async function handleGetProjectContext(server, args) {
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
                            message: `No memory agent found for project "${args.project}". Use init_project_memory to create one.`,
                        }),
                    },
                ],
            };
        }

        // Get project context from archival memory
        const passagesResponse = await server.api.get(`/agents/${agent.id}/archival-memory`, {
            headers,
            params: { search: MEMORY_TYPES.PROJECT_CONTEXT, limit: 10 },
        });

        const passages = passagesResponse.data || [];
        let projectContext = null;

        for (const passage of passages) {
            const parsed = parseMemory(passage.text);
            if (parsed.metadata?.type === MEMORY_TYPES.PROJECT_CONTEXT && parsed.metadata?.is_primary) {
                projectContext = parsed.content;
                break;
            }
        }

        // Get memory counts by type
        const allPassagesResponse = await server.api.get(`/agents/${agent.id}/archival-memory`, {
            headers,
            params: { limit: 1000 },
        });

        const allPassages = allPassagesResponse.data || [];
        const memoryCounts = {
            total: allPassages.length,
            patterns: 0,
            decisions: 0,
            learnings: 0,
            project_context: 0,
        };

        for (const passage of allPassages) {
            const parsed = parseMemory(passage.text);
            const type = parsed.metadata?.type;
            if (type === MEMORY_TYPES.CODE_PATTERN) memoryCounts.patterns++;
            else if (type === MEMORY_TYPES.DECISION) memoryCounts.decisions++;
            else if (type === MEMORY_TYPES.LEARNING) memoryCounts.learnings++;
            else if (type === MEMORY_TYPES.PROJECT_CONTEXT) memoryCounts.project_context++;
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        found: true,
                        agent_id: agent.id,
                        agent_name: agent.name,
                        project: args.project,
                        context: projectContext,
                        memory_counts: memoryCounts,
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to get project context');
    }
}

export const getProjectContextDefinition = {
    name: 'get_project_context',
    description:
        'Retrieve the context and metadata for a project, including memory counts. Use this to check if a project has been initialized and see what memories are stored.',
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

/**
 * Update project context
 */
export async function handleUpdateProjectContext(server, args) {
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

        // Get existing primary project context
        const passagesResponse = await server.api.get(`/agents/${agent.id}/archival-memory`, {
            headers,
            params: { search: MEMORY_TYPES.PROJECT_CONTEXT, limit: 50 },
        });

        const passages = passagesResponse.data || [];
        let existingPassageId = null;
        let existingContext = {};

        for (const passage of passages) {
            const parsed = parseMemory(passage.text);
            if (parsed.metadata?.type === MEMORY_TYPES.PROJECT_CONTEXT && parsed.metadata?.is_primary) {
                existingPassageId = passage.id;
                existingContext = parsed.content || {};
                break;
            }
        }

        // Merge updates with existing context
        const updatedContext = {
            ...existingContext,
            name: args.project,
            updated_at: new Date().toISOString(),
        };

        if (args.description !== undefined) updatedContext.description = args.description;
        if (args.tech_stack !== undefined) updatedContext.tech_stack = args.tech_stack;
        if (args.conventions !== undefined) updatedContext.conventions = args.conventions;
        if (args.structure !== undefined) updatedContext.structure = args.structure;
        if (args.notes !== undefined) updatedContext.notes = args.notes;

        const contextMetadata = createMemoryMetadata(MEMORY_TYPES.PROJECT_CONTEXT, args.project, {
            is_primary: true,
        });

        const newText = serializeMemory(contextMetadata, updatedContext);

        if (existingPassageId) {
            // Update existing passage
            await server.api.patch(`/agents/${agent.id}/archival-memory/${existingPassageId}`, {
                text: newText,
            }, { headers });
        } else {
            // Create new primary context
            await server.api.post(`/agents/${agent.id}/archival-memory`, {
                text: newText,
            }, { headers });
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        project: args.project,
                        context: updatedContext,
                        message: `Updated project context for "${args.project}"`,
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to update project context');
    }
}

export const updateProjectContextDefinition = {
    name: 'update_project_context',
    description:
        'Update the context and metadata for a project. Use this to store information about tech stack, conventions, project structure, and other project-wide knowledge.',
    inputSchema: {
        type: 'object',
        properties: {
            project: {
                type: 'string',
                description: 'Name of the project',
            },
            description: {
                type: 'string',
                description: 'Updated project description',
            },
            tech_stack: {
                type: 'array',
                items: { type: 'string' },
                description: 'Technologies used in the project',
            },
            conventions: {
                type: 'object',
                description: 'Coding conventions and style guidelines (e.g., { "naming": "camelCase", "imports": "absolute" })',
            },
            structure: {
                type: 'object',
                description: 'Project structure information (e.g., { "src": "source code", "tests": "test files" })',
            },
            notes: {
                type: 'string',
                description: 'Additional notes about the project',
            },
        },
        required: ['project'],
    },
};

/**
 * List all projects with memory agents
 */
export async function handleListProjects(server, args) {
    try {
        const headers = server.getApiHeaders();

        // List all agents
        const listResponse = await server.api.get('/agents/', {
            headers,
            params: { limit: args.limit || 100 },
        });

        const agents = listResponse.data || [];

        // Filter to only Claude Code memory agents
        const memoryAgents = agents.filter((a) => a.name?.startsWith('claude-code-memory-'));

        const projects = memoryAgents.map((agent) => {
            // Extract project name from agent name
            const projectSlug = agent.name.replace('claude-code-memory-', '');
            return {
                agent_id: agent.id,
                agent_name: agent.name,
                project_slug: projectSlug,
                created_at: agent.created_at,
            };
        });

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        count: projects.length,
                        projects,
                    }),
                },
            ],
        };
    } catch (error) {
        server.createErrorResponse(error, 'Failed to list projects');
    }
}

export const listProjectsDefinition = {
    name: 'list_memory_projects',
    description:
        'List all projects that have memory agents. Use this to see which projects have stored memories.',
    inputSchema: {
        type: 'object',
        properties: {
            limit: {
                type: 'integer',
                description: 'Maximum number of projects to return (default: 100)',
                default: 100,
            },
        },
        required: [],
    },
};
