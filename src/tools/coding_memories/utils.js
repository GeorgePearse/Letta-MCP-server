/**
 * Shared utilities for coding memories tools
 */

/**
 * Memory type constants for categorizing stored memories
 */
export const MEMORY_TYPES = {
    PROJECT_CONTEXT: 'project_context',
    CODE_PATTERN: 'code_pattern',
    DECISION: 'decision',
    LEARNING: 'learning',
};

/**
 * Learning category constants
 */
export const LEARNING_CATEGORIES = {
    BUG_FIX: 'bug_fix',
    GOTCHA: 'gotcha',
    TIP: 'tip',
    SOLUTION: 'solution',
    CONVENTION: 'convention',
};

/**
 * Agent naming prefix for Claude Code project agents
 */
export const AGENT_PREFIX = 'claude-code-memory';

/**
 * Convert a project name to a slug for agent naming
 * @param {string} projectName - The project name
 * @returns {string} URL-safe slug
 */
export function projectToSlug(projectName) {
    return projectName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
}

/**
 * Generate agent name from project name
 * @param {string} projectName - The project name
 * @returns {string} Agent name
 */
export function getAgentName(projectName) {
    const slug = projectToSlug(projectName);
    return `${AGENT_PREFIX}-${slug}`;
}

/**
 * Create structured metadata for a memory passage
 * @param {string} type - Memory type from MEMORY_TYPES
 * @param {string} project - Project name
 * @param {Object} additionalMetadata - Additional metadata fields
 * @returns {Object} Structured metadata object
 */
export function createMemoryMetadata(type, project, additionalMetadata = {}) {
    return {
        type,
        project,
        created_at: new Date().toISOString(),
        source: 'claude-code',
        ...additionalMetadata,
    };
}

/**
 * Serialize memory content with metadata for storage
 * @param {Object} metadata - Memory metadata
 * @param {string} content - Main content text
 * @returns {string} Serialized memory string
 */
export function serializeMemory(metadata, content) {
    return JSON.stringify({
        metadata,
        content,
    });
}

/**
 * Parse a stored memory passage back into structured format
 * @param {string} passageText - Raw passage text
 * @returns {Object|null} Parsed memory object or null if parsing fails
 */
export function parseMemory(passageText) {
    try {
        const parsed = JSON.parse(passageText);
        if (parsed.metadata && parsed.content !== undefined) {
            return parsed;
        }
        // If not our format, return as raw content
        return {
            metadata: { type: 'unknown' },
            content: passageText,
        };
    } catch {
        // If not JSON, return as raw content
        return {
            metadata: { type: 'raw' },
            content: passageText,
        };
    }
}

/**
 * Filter memories by type from a list of passages
 * @param {Array} passages - Array of passage objects
 * @param {string} type - Memory type to filter by
 * @returns {Array} Filtered and parsed memories
 */
export function filterMemoriesByType(passages, type) {
    return passages
        .map((passage) => {
            const parsed = parseMemory(passage.text);
            return {
                id: passage.id,
                ...parsed,
            };
        })
        .filter((memory) => memory.metadata?.type === type);
}

/**
 * Search memories by matching content or metadata fields
 * @param {Array} passages - Array of passage objects
 * @param {string} query - Search query
 * @param {Object} filters - Optional filters (type, tags, etc.)
 * @returns {Array} Matching memories
 */
export function searchMemories(passages, query, filters = {}) {
    const queryLower = query.toLowerCase();

    return passages
        .map((passage) => {
            const parsed = parseMemory(passage.text);
            return {
                id: passage.id,
                ...parsed,
            };
        })
        .filter((memory) => {
            // Apply type filter if specified
            if (filters.type && memory.metadata?.type !== filters.type) {
                return false;
            }

            // Apply tag filter if specified
            if (filters.tags && Array.isArray(filters.tags)) {
                const memoryTags = memory.metadata?.tags || [];
                const hasMatchingTag = filters.tags.some((tag) =>
                    memoryTags.includes(tag)
                );
                if (!hasMatchingTag) {
                    return false;
                }
            }

            // Search in content
            const contentMatch =
                typeof memory.content === 'string' &&
                memory.content.toLowerCase().includes(queryLower);

            // Search in metadata fields
            const metadataMatch = Object.values(memory.metadata || {}).some(
                (value) =>
                    typeof value === 'string' &&
                    value.toLowerCase().includes(queryLower)
            );

            return contentMatch || metadataMatch;
        });
}

/**
 * Format a memory for display
 * @param {Object} memory - Parsed memory object
 * @returns {Object} Formatted memory for response
 */
export function formatMemoryForDisplay(memory) {
    const { metadata, content, id } = memory;

    return {
        id,
        type: metadata?.type || 'unknown',
        project: metadata?.project,
        created_at: metadata?.created_at,
        ...metadata,
        content,
    };
}

/**
 * Validate required fields for a memory type
 * @param {Object} args - Arguments to validate
 * @param {Array} requiredFields - List of required field names
 * @param {Object} server - Server instance for error handling
 */
export function validateRequiredFields(args, requiredFields, server) {
    for (const field of requiredFields) {
        if (args?.[field] === undefined || args?.[field] === null || args?.[field] === '') {
            server.createErrorResponse(`Missing required argument: ${field}`);
        }
    }
}
