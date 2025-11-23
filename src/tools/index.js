// Agent-related imports
import { handleListAgents, listAgentsToolDefinition } from './agents/list-agents.js';
import { handlePromptAgent, promptAgentToolDefinition } from './agents/prompt-agent.js';
import { handleListAgentTools, listAgentToolsDefinition } from './agents/list-agent-tools.js';
import { handleCreateAgent, createAgentToolDefinition } from './agents/create-agent.js';
import { handleRetrieveAgent, retrieveAgentDefinition } from './agents/retrieve-agent.js';
import { handleModifyAgent, modifyAgentDefinition } from './agents/modify-agent.js';
import { handleDeleteAgent, deleteAgentDefinition } from './agents/delete-agent.js';
import { handleExportAgent, exportAgentDefinition } from './agents/export-agent.js';
import { handleImportAgent, importAgentDefinition } from './agents/import-agent.js';
import { handleCloneAgent, cloneAgentDefinition } from './agents/clone-agent.js';
import { handleGetAgentSummary, getAgentSummaryDefinition } from './agents/get-agent-summary.js';
import { handleBulkDeleteAgents, bulkDeleteAgentsDefinition } from './agents/bulk-delete-agents.js';

// Memory-related imports
import {
    handleListMemoryBlocks,
    listMemoryBlocksToolDefinition,
} from './memory/list-memory-blocks.js';
import {
    handleReadMemoryBlock,
    readMemoryBlockToolDefinition,
} from './memory/read-memory-block.js';
import {
    handleUpdateMemoryBlock,
    updateMemoryBlockToolDefinition,
} from './memory/update-memory-block.js';
import {
    handleAttachMemoryBlock,
    attachMemoryBlockToolDefinition,
} from './memory/attach-memory-block.js';
import {
    handleCreateMemoryBlock,
    createMemoryBlockToolDefinition,
} from './memory/create-memory-block.js';

// Passage-related imports
import { handleListPassages, listPassagesDefinition } from './passages/list-passages.js';
import { handleCreatePassage, createPassageDefinition } from './passages/create-passage.js';
import { handleModifyPassage, modifyPassageDefinition } from './passages/modify-passage.js';
import { handleDeletePassage, deletePassageDefinition } from './passages/delete-passage.js';

// Tool-related imports
import { handleAttachTool, attachToolToolDefinition } from './tools/attach-tool.js';
import {
    handleBulkAttachToolToAgents,
    bulkAttachToolDefinition,
} from './tools/bulk-attach-tool.js';
import { handleUploadTool, uploadToolToolDefinition } from './tools/upload-tool.js';

// MCP-related imports
import {
    handleListMcpToolsByServer,
    listMcpToolsByServerDefinition,
} from './mcp/list-mcp-tools-by-server.js';
import { handleListMcpServers, listMcpServersDefinition } from './mcp/list-mcp-servers.js';
import {
    handleAddMcpToolToLetta,
    addMcpToolToLettaDefinition,
} from './mcp/add-mcp-tool-to-letta.js';

// Model-related imports
import { handleListLlmModels, listLlmModelsDefinition } from './models/list-llm-models.js';
import {
    handleListEmbeddingModels,
    listEmbeddingModelsDefinition,
} from './models/list-embedding-models.js';

// Prompt-related imports
import { handleListPrompts, listPromptsToolDefinition } from './prompts/list-prompts.js';
import { handleUsePrompt, usePromptToolDefinition } from './prompts/use-prompt.js';

// Coding memories imports
import {
    // Project management
    handleInitProjectMemory,
    initProjectMemoryDefinition,
    handleGetProjectContext,
    getProjectContextDefinition,
    handleUpdateProjectContext,
    updateProjectContextDefinition,
    handleListProjects,
    listProjectsDefinition,
    // Code patterns
    handleStoreCodePattern,
    storeCodePatternDefinition,
    handleSearchCodePatterns,
    searchCodePatternsDefinition,
    handleListCodePatterns,
    listCodePatternsDefinition,
    handleGetCodePattern,
    getCodePatternDefinition,
    // Decisions
    handleRecordDecision,
    recordDecisionDefinition,
    handleSearchDecisions,
    searchDecisionsDefinition,
    handleListDecisions,
    listDecisionsDefinition,
    // Learnings
    handleStoreLearning,
    storeLearningDefinition,
    handleSearchLearnings,
    searchLearningsDefinition,
    handleListLearnings,
    listLearningsDefinition,
    // Smart recall
    handleRecallRelevant,
    recallRelevantDefinition,
    handleQuickRecall,
    quickRecallDefinition,
    handleGetMemoryStats,
    getMemoryStatsDefinition,
    // Bulk operations
    handleExportProjectMemories,
    exportProjectMemoriesDefinition,
    handleImportProjectMemories,
    importProjectMemoriesDefinition,
    handleClearProjectMemories,
    clearProjectMemoriesDefinition,
    handleDeleteMemory,
    deleteMemoryDefinition,
    handleDeleteProjectMemoryAgent,
    deleteProjectMemoryAgentDefinition,
} from './coding_memories/index.js';

import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    McpError,
    ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { enhanceAllTools } from './enhance-tools.js';

/**
 * Register all tool handlers with the server
 * @param {Object} server - The LettaServer instance (should likely be typed more specifically if possible)
 */
export function registerToolHandlers(server) {
    // Collect all tool definitions
    const allTools = [
        listAgentsToolDefinition,
        promptAgentToolDefinition,
        listAgentToolsDefinition,
        createAgentToolDefinition,
        attachToolToolDefinition,
        listMemoryBlocksToolDefinition,
        readMemoryBlockToolDefinition,
        updateMemoryBlockToolDefinition,
        attachMemoryBlockToolDefinition,
        createMemoryBlockToolDefinition,
        uploadToolToolDefinition,
        listMcpToolsByServerDefinition,
        listMcpServersDefinition,
        retrieveAgentDefinition,
        modifyAgentDefinition,
        deleteAgentDefinition,
        listLlmModelsDefinition,
        listEmbeddingModelsDefinition,
        listPassagesDefinition,
        createPassageDefinition,
        modifyPassageDefinition,
        deletePassageDefinition,
        exportAgentDefinition,
        importAgentDefinition,
        cloneAgentDefinition,
        bulkAttachToolDefinition,
        getAgentSummaryDefinition,
        bulkDeleteAgentsDefinition,
        addMcpToolToLettaDefinition,
        listPromptsToolDefinition,
        usePromptToolDefinition,
        // Coding memories - Project management
        initProjectMemoryDefinition,
        getProjectContextDefinition,
        updateProjectContextDefinition,
        listProjectsDefinition,
        // Coding memories - Code patterns
        storeCodePatternDefinition,
        searchCodePatternsDefinition,
        listCodePatternsDefinition,
        getCodePatternDefinition,
        // Coding memories - Decisions
        recordDecisionDefinition,
        searchDecisionsDefinition,
        listDecisionsDefinition,
        // Coding memories - Learnings
        storeLearningDefinition,
        searchLearningsDefinition,
        listLearningsDefinition,
        // Coding memories - Smart recall
        recallRelevantDefinition,
        quickRecallDefinition,
        getMemoryStatsDefinition,
        // Coding memories - Bulk operations
        exportProjectMemoriesDefinition,
        importProjectMemoriesDefinition,
        clearProjectMemoriesDefinition,
        deleteMemoryDefinition,
        deleteProjectMemoryAgentDefinition,
    ];

    // Enhance all tools with output schemas and improved descriptions
    const enhancedTools = enhanceAllTools(allTools);

    // Register tool definitions
    server.server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: enhancedTools,
    }));

    // Register tool call handler
    server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
        switch (request.params.name) {
            case 'list_agents':
                return handleListAgents(server, request.params.arguments);
            case 'prompt_agent':
                return handlePromptAgent(server, request.params.arguments);
            case 'list_agent_tools':
                return handleListAgentTools(server, request.params.arguments);
            case 'create_agent':
                return handleCreateAgent(server, request.params.arguments);
            case 'attach_tool':
                return handleAttachTool(server, request.params.arguments);
            case 'list_memory_blocks':
                return handleListMemoryBlocks(server, request.params.arguments);
            case 'read_memory_block':
                return handleReadMemoryBlock(server, request.params.arguments);
            case 'update_memory_block':
                return handleUpdateMemoryBlock(server, request.params.arguments);
            case 'attach_memory_block':
                return handleAttachMemoryBlock(server, request.params.arguments);
            case 'create_memory_block':
                return handleCreateMemoryBlock(server, request.params.arguments);
            case 'upload_tool':
                return handleUploadTool(server, request.params.arguments);
            case 'list_mcp_tools_by_server':
                return handleListMcpToolsByServer(server, request.params.arguments);
            case 'list_mcp_servers':
                return handleListMcpServers(server, request.params.arguments);
            case 'retrieve_agent':
                return handleRetrieveAgent(server, request.params.arguments);
            case 'modify_agent':
                return handleModifyAgent(server, request.params.arguments);
            case 'delete_agent':
                return handleDeleteAgent(server, request.params.arguments);
            case 'list_llm_models':
                return handleListLlmModels(server, request.params.arguments);
            case 'list_embedding_models':
                return handleListEmbeddingModels(server, request.params.arguments);
            case 'list_passages':
                return handleListPassages(server, request.params.arguments);
            case 'create_passage':
                return handleCreatePassage(server, request.params.arguments);
            case 'modify_passage':
                return handleModifyPassage(server, request.params.arguments);
            case 'delete_passage':
                return handleDeletePassage(server, request.params.arguments);
            case 'export_agent':
                return handleExportAgent(server, request.params.arguments);
            case 'import_agent':
                return handleImportAgent(server, request.params.arguments);
            case 'clone_agent':
                return handleCloneAgent(server, request.params.arguments);
            case 'bulk_attach_tool_to_agents':
                return handleBulkAttachToolToAgents(server, request.params.arguments);
            case 'get_agent_summary':
                return handleGetAgentSummary(server, request.params.arguments);
            case 'bulk_delete_agents':
                return handleBulkDeleteAgents(server, request.params.arguments);
            case 'add_mcp_tool_to_letta':
                return handleAddMcpToolToLetta(server, request.params.arguments);
            case 'list_prompts':
                return handleListPrompts(server, request.params.arguments);
            case 'use_prompt':
                return handleUsePrompt(server, request.params.arguments);
            // Coding memories - Project management
            case 'init_project_memory':
                return handleInitProjectMemory(server, request.params.arguments);
            case 'get_project_context':
                return handleGetProjectContext(server, request.params.arguments);
            case 'update_project_context':
                return handleUpdateProjectContext(server, request.params.arguments);
            case 'list_memory_projects':
                return handleListProjects(server, request.params.arguments);
            // Coding memories - Code patterns
            case 'store_code_pattern':
                return handleStoreCodePattern(server, request.params.arguments);
            case 'search_code_patterns':
                return handleSearchCodePatterns(server, request.params.arguments);
            case 'list_code_patterns':
                return handleListCodePatterns(server, request.params.arguments);
            case 'get_code_pattern':
                return handleGetCodePattern(server, request.params.arguments);
            // Coding memories - Decisions
            case 'record_decision':
                return handleRecordDecision(server, request.params.arguments);
            case 'search_decisions':
                return handleSearchDecisions(server, request.params.arguments);
            case 'list_decisions':
                return handleListDecisions(server, request.params.arguments);
            // Coding memories - Learnings
            case 'store_learning':
                return handleStoreLearning(server, request.params.arguments);
            case 'search_learnings':
                return handleSearchLearnings(server, request.params.arguments);
            case 'list_learnings':
                return handleListLearnings(server, request.params.arguments);
            // Coding memories - Smart recall
            case 'recall_relevant':
                return handleRecallRelevant(server, request.params.arguments);
            case 'quick_recall':
                return handleQuickRecall(server, request.params.arguments);
            case 'get_memory_stats':
                return handleGetMemoryStats(server, request.params.arguments);
            // Coding memories - Bulk operations
            case 'export_project_memories':
                return handleExportProjectMemories(server, request.params.arguments);
            case 'import_project_memories':
                return handleImportProjectMemories(server, request.params.arguments);
            case 'clear_project_memories':
                return handleClearProjectMemories(server, request.params.arguments);
            case 'delete_memory':
                return handleDeleteMemory(server, request.params.arguments);
            case 'delete_project_memory_agent':
                return handleDeleteProjectMemoryAgent(server, request.params.arguments);
            default:
                throw new McpError(
                    ErrorCode.MethodNotFound,
                    `Unknown tool: ${request.params.name}`,
                );
        }
    });
}

// Export all tool definitions (enhanced)
export const toolDefinitions = enhanceAllTools([
    listAgentsToolDefinition,
    promptAgentToolDefinition,
    listAgentToolsDefinition,
    createAgentToolDefinition,
    attachToolToolDefinition,
    listMemoryBlocksToolDefinition,
    readMemoryBlockToolDefinition,
    updateMemoryBlockToolDefinition,
    attachMemoryBlockToolDefinition,
    createMemoryBlockToolDefinition,
    uploadToolToolDefinition,
    listMcpToolsByServerDefinition,
    listMcpServersDefinition,
    retrieveAgentDefinition,
    modifyAgentDefinition,
    deleteAgentDefinition,
    listLlmModelsDefinition,
    listEmbeddingModelsDefinition,
    listPassagesDefinition,
    createPassageDefinition,
    modifyPassageDefinition,
    deletePassageDefinition,
    exportAgentDefinition,
    importAgentDefinition,
    cloneAgentDefinition,
    bulkAttachToolDefinition,
    getAgentSummaryDefinition,
    bulkDeleteAgentsDefinition,
    addMcpToolToLettaDefinition,
    listPromptsToolDefinition,
    usePromptToolDefinition,
    // Coding memories - Project management
    initProjectMemoryDefinition,
    getProjectContextDefinition,
    updateProjectContextDefinition,
    listProjectsDefinition,
    // Coding memories - Code patterns
    storeCodePatternDefinition,
    searchCodePatternsDefinition,
    listCodePatternsDefinition,
    getCodePatternDefinition,
    // Coding memories - Decisions
    recordDecisionDefinition,
    searchDecisionsDefinition,
    listDecisionsDefinition,
    // Coding memories - Learnings
    storeLearningDefinition,
    searchLearningsDefinition,
    listLearningsDefinition,
    // Coding memories - Smart recall
    recallRelevantDefinition,
    quickRecallDefinition,
    getMemoryStatsDefinition,
    // Coding memories - Bulk operations
    exportProjectMemoriesDefinition,
    importProjectMemoriesDefinition,
    clearProjectMemoriesDefinition,
    deleteMemoryDefinition,
    deleteProjectMemoryAgentDefinition,
]);

// Export all tool handlers
export const toolHandlers = {
    handleListAgents,
    handlePromptAgent,
    handleListAgentTools,
    handleCreateAgent,
    handleAttachTool,
    handleListMemoryBlocks,
    handleReadMemoryBlock,
    handleUpdateMemoryBlock,
    handleAttachMemoryBlock,
    handleCreateMemoryBlock,
    handleUploadTool,
    handleListMcpToolsByServer,
    handleListMcpServers,
    handleRetrieveAgent,
    handleModifyAgent,
    handleDeleteAgent,
    handleListLlmModels,
    handleListEmbeddingModels,
    handleListPassages,
    handleCreatePassage,
    handleModifyPassage,
    handleDeletePassage,
    handleExportAgent,
    handleImportAgent,
    handleCloneAgent,
    handleBulkAttachToolToAgents,
    handleGetAgentSummary,
    handleBulkDeleteAgents,
    handleAddMcpToolToLetta,
    // Coding memories - Project management
    handleInitProjectMemory,
    handleGetProjectContext,
    handleUpdateProjectContext,
    handleListProjects,
    // Coding memories - Code patterns
    handleStoreCodePattern,
    handleSearchCodePatterns,
    handleListCodePatterns,
    handleGetCodePattern,
    // Coding memories - Decisions
    handleRecordDecision,
    handleSearchDecisions,
    handleListDecisions,
    // Coding memories - Learnings
    handleStoreLearning,
    handleSearchLearnings,
    handleListLearnings,
    // Coding memories - Smart recall
    handleRecallRelevant,
    handleQuickRecall,
    handleGetMemoryStats,
    // Coding memories - Bulk operations
    handleExportProjectMemories,
    handleImportProjectMemories,
    handleClearProjectMemories,
    handleDeleteMemory,
    handleDeleteProjectMemoryAgent,
};
