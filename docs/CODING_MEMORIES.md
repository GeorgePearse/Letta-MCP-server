# Coding Memories Feature

The Coding Memories feature provides persistent memory storage for AI coding assistants. It enables storing and retrieving code patterns, architectural decisions, learnings, and project context across sessions.

## Overview

This feature creates dedicated Letta agents for each project that store memories in archival memory. Memories are structured with metadata for easy categorization, searching, and recall.

## Memory Types

| Type | Description | Use Case |
|------|-------------|----------|
| `project_context` | Project-wide settings and metadata | Tech stack, conventions, structure |
| `code_pattern` | Reusable code snippets and patterns | Common patterns, utility functions |
| `decision` | Architectural and design decisions | ADRs, technology choices |
| `learning` | Bug fixes, tips, gotchas, solutions | Debugging knowledge, best practices |

## Tools by Category

### Project Management (4 tools)

| Tool | Description |
|------|-------------|
| `init_project_memory` | Initialize or retrieve a memory agent for a project |
| `get_project_context` | Get project metadata and memory counts |
| `update_project_context` | Update tech stack, conventions, notes |
| `list_memory_projects` | List all projects with memory agents |

**Example: Initialize a project**
```json
{
  "project": "my-web-app",
  "description": "React frontend with Express backend",
  "tech_stack": ["typescript", "react", "express", "postgresql"]
}
```

### Code Patterns (4 tools)

| Tool | Description |
|------|-------------|
| `store_code_pattern` | Store a reusable code pattern |
| `search_code_patterns` | Search patterns by query, language, framework, or tags |
| `list_code_patterns` | List all patterns for a project |
| `get_code_pattern` | Get a specific pattern by name |

**Example: Store a pattern**
```json
{
  "project": "my-web-app",
  "name": "useAsync hook",
  "language": "typescript",
  "framework": "react",
  "pattern": "const useAsync = <T>(asyncFn: () => Promise<T>) => {...}",
  "usage": "Wrap async operations with loading/error state",
  "tags": ["hooks", "async", "state-management"]
}
```

### Decisions (3 tools)

| Tool | Description |
|------|-------------|
| `record_decision` | Record an architectural or design decision |
| `search_decisions` | Search decisions by query, category, status, or tags |
| `list_decisions` | List all decisions for a project |

**Decision Categories:**
- `architecture` - System architecture choices
- `technology` - Tech stack decisions
- `design` - UI/UX design choices
- `process` - Development process decisions
- `security` - Security-related choices
- `performance` - Performance optimization decisions
- `general` - Other decisions

**Decision Statuses:**
- `proposed` - Under consideration
- `accepted` - Approved and active
- `deprecated` - No longer recommended
- `superseded` - Replaced by another decision

**Example: Record a decision**
```json
{
  "project": "my-web-app",
  "title": "Use PostgreSQL over MongoDB",
  "decision": "Use PostgreSQL as the primary database",
  "rationale": "Strong ACID compliance, better for relational data",
  "category": "technology",
  "alternatives": ["MongoDB", "MySQL", "SQLite"],
  "consequences": "Need to manage migrations, but get better data integrity",
  "tags": ["database", "backend"]
}
```

### Learnings (3 tools)

| Tool | Description |
|------|-------------|
| `store_learning` | Store a bug fix, tip, gotcha, or solution |
| `search_learnings` | Search by query, error message, category, severity, or tags |
| `list_learnings` | List all learnings for a project |

**Learning Categories:**
- `bug_fix` - Fixed bugs with solutions
- `gotcha` - Common pitfalls to avoid
- `tip` - Best practices and tips
- `solution` - Problem-solution pairs
- `convention` - Coding standards and conventions

**Severity Levels:**
- `low` - Minor issues
- `medium` - Moderate impact
- `high` - Significant issues
- `critical` - Severe problems

**Example: Store a learning**
```json
{
  "project": "my-web-app",
  "title": "Race condition in useEffect cleanup",
  "category": "bug_fix",
  "severity": "high",
  "problem": "State updates after component unmount cause warnings",
  "solution": "Add cleanup function with mounted flag",
  "code_before": "useEffect(() => { fetch().then(setData) }, [])",
  "code_after": "useEffect(() => { let mounted = true; fetch().then(d => mounted && setData(d)); return () => { mounted = false } }, [])",
  "explanation": "React warns about state updates on unmounted components",
  "prevention": "Always add cleanup functions for async operations",
  "tags": ["react", "hooks", "async"]
}
```

### Smart Recall (3 tools)

| Tool | Description |
|------|-------------|
| `recall_relevant` | Intelligently recall memories based on current context |
| `quick_recall` | Fast search with a simple query |
| `get_memory_stats` | Get statistics about stored memories |

**Example: Recall relevant memories**
```json
{
  "project": "my-web-app",
  "task": "implementing user authentication",
  "file_path": "src/auth/login.tsx",
  "keywords": ["auth", "jwt", "session"],
  "types": ["code_pattern", "decision", "learning"]
}
```

### Bulk Operations (5 tools)

| Tool | Description |
|------|-------------|
| `export_project_memories` | Export all memories as JSON |
| `import_project_memories` | Import memories from export |
| `clear_project_memories` | Delete all memories (requires confirmation) |
| `delete_memory` | Delete a specific memory by ID |
| `delete_project_memory_agent` | Permanently delete project agent |

## Storage Architecture

Memories are stored in Letta's archival memory system:

```
Project Agent (claude-code-memory-{project-slug})
└── Archival Memory (passages)
    ├── project_context (1 per project)
    ├── code_patterns (N per project)
    ├── decisions (N per project)
    └── learnings (N per project)
```

Each memory is stored as a JSON passage with:
- `metadata` - Type, project, timestamps, categorization
- `content` - The actual memory content

## Agent Naming Convention

Agents are named using the pattern: `claude-code-memory-{project-slug}`

Where `project-slug` is the project name:
- Lowercased
- Non-alphanumeric characters replaced with hyphens
- Leading/trailing hyphens removed
- Truncated to 50 characters

Examples:
- `my-web-app` → `claude-code-memory-my-web-app`
- `My Project 2024` → `claude-code-memory-my-project-2024`

## CLI Access

List memories from the command line:

```bash
# List all memories (JSON format)
npm run list-memories

# Summary format
npm run list-memories -- --project=my-web-app --format=summary

# Table format with limit
npm run list-memories -- --project=my-web-app --format=table --limit=50
```

See [CLI.md](./CLI.md) for full CLI documentation.

## Best Practices

1. **Initialize projects early** - Call `init_project_memory` when starting work on a project
2. **Use descriptive names** - Pattern and decision names should be searchable
3. **Tag consistently** - Use consistent tags across memories for better recall
4. **Record decisions immediately** - Document decisions when they're made, not later
5. **Include code examples** - For learnings, include before/after code when relevant
6. **Use recall before implementing** - Check for relevant patterns and past decisions
7. **Export periodically** - Backup important project memories

## Source Files

- `src/tools/coding_memories/utils.js` - Shared utilities and constants
- `src/tools/coding_memories/project.js` - Project management tools
- `src/tools/coding_memories/patterns.js` - Code pattern tools
- `src/tools/coding_memories/decisions.js` - Decision recording tools
- `src/tools/coding_memories/learnings.js` - Learning storage tools
- `src/tools/coding_memories/recall.js` - Smart recall tools
- `src/tools/coding_memories/bulk.js` - Bulk operations
- `src/tools/coding_memories/index.js` - Tool registration
