/**
 * Coding Memories Module
 * Provides persistent memory storage for Claude Code
 *
 * This module enables Claude Code to store and retrieve:
 * - Project context and metadata
 * - Code patterns and snippets
 * - Architectural decisions
 * - Bug fixes, gotchas, tips, and solutions
 */

// Project management
export {
    handleInitProjectMemory,
    initProjectMemoryDefinition,
    handleGetProjectContext,
    getProjectContextDefinition,
    handleUpdateProjectContext,
    updateProjectContextDefinition,
    handleListProjects,
    listProjectsDefinition,
} from './project.js';

// Code patterns
export {
    handleStoreCodePattern,
    storeCodePatternDefinition,
    handleSearchCodePatterns,
    searchCodePatternsDefinition,
    handleListCodePatterns,
    listCodePatternsDefinition,
    handleGetCodePattern,
    getCodePatternDefinition,
} from './patterns.js';

// Decisions
export {
    handleRecordDecision,
    recordDecisionDefinition,
    handleSearchDecisions,
    searchDecisionsDefinition,
    handleListDecisions,
    listDecisionsDefinition,
} from './decisions.js';

// Learnings
export {
    handleStoreLearning,
    storeLearningDefinition,
    handleSearchLearnings,
    searchLearningsDefinition,
    handleListLearnings,
    listLearningsDefinition,
} from './learnings.js';

// Smart recall
export {
    handleRecallRelevant,
    recallRelevantDefinition,
    handleQuickRecall,
    quickRecallDefinition,
    handleGetMemoryStats,
    getMemoryStatsDefinition,
} from './recall.js';

// Bulk operations
export {
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
} from './bulk.js';

// Utilities (for advanced use)
export {
    MEMORY_TYPES,
    LEARNING_CATEGORIES,
    getAgentName,
    projectToSlug,
    createMemoryMetadata,
    serializeMemory,
    parseMemory,
    filterMemoriesByType,
    searchMemories,
} from './utils.js';

/**
 * All tool definitions for registration
 */
export const codingMemoriesToolDefinitions = [
    // Project management (4 tools)
    'initProjectMemoryDefinition',
    'getProjectContextDefinition',
    'updateProjectContextDefinition',
    'listProjectsDefinition',

    // Code patterns (4 tools)
    'storeCodePatternDefinition',
    'searchCodePatternsDefinition',
    'listCodePatternsDefinition',
    'getCodePatternDefinition',

    // Decisions (3 tools)
    'recordDecisionDefinition',
    'searchDecisionsDefinition',
    'listDecisionsDefinition',

    // Learnings (3 tools)
    'storeLearningDefinition',
    'searchLearningsDefinition',
    'listLearningsDefinition',

    // Smart recall (3 tools)
    'recallRelevantDefinition',
    'quickRecallDefinition',
    'getMemoryStatsDefinition',

    // Bulk operations (5 tools)
    'exportProjectMemoriesDefinition',
    'importProjectMemoriesDefinition',
    'clearProjectMemoriesDefinition',
    'deleteMemoryDefinition',
    'deleteProjectMemoryAgentDefinition',
];

/**
 * All tool handlers mapped by tool name
 */
export const codingMemoriesHandlers = {
    // Project management
    init_project_memory: 'handleInitProjectMemory',
    get_project_context: 'handleGetProjectContext',
    update_project_context: 'handleUpdateProjectContext',
    list_memory_projects: 'handleListProjects',

    // Code patterns
    store_code_pattern: 'handleStoreCodePattern',
    search_code_patterns: 'handleSearchCodePatterns',
    list_code_patterns: 'handleListCodePatterns',
    get_code_pattern: 'handleGetCodePattern',

    // Decisions
    record_decision: 'handleRecordDecision',
    search_decisions: 'handleSearchDecisions',
    list_decisions: 'handleListDecisions',

    // Learnings
    store_learning: 'handleStoreLearning',
    search_learnings: 'handleSearchLearnings',
    list_learnings: 'handleListLearnings',

    // Smart recall
    recall_relevant: 'handleRecallRelevant',
    quick_recall: 'handleQuickRecall',
    get_memory_stats: 'handleGetMemoryStats',

    // Bulk operations
    export_project_memories: 'handleExportProjectMemories',
    import_project_memories: 'handleImportProjectMemories',
    clear_project_memories: 'handleClearProjectMemories',
    delete_memory: 'handleDeleteMemory',
    delete_project_memory_agent: 'handleDeleteProjectMemoryAgent',
};
