# Epic #2: Core Agent Runtime - Task Decomposition

**Status:** Ready for Implementation (Infrastructure Review Complete)
**Epic:** Core Agent Runtime (P0)  
**Constitutional Basis:** docs/PRD.md Section 4 (CAP-001 to CAP-006), docs/TechSpec.md Sections 1, 3, 4, 5, 6

---

## Infrastructure Inventory (Pre-Existing from Epic #1)

The following components were implemented in Epic #1 (Infrastructure Foundation) and are available for Epic #2:

### Already Implemented

| Component                | Location                   | Status                                   | Impact on Epic #2                  |
| ------------------------ | -------------------------- | ---------------------------------------- | ---------------------------------- |
| **Configuration System** | `src/config/index.ts`      | Partial - Basic loading works            | CORE-003 reduced scope             |
| **Credential Vault**     | `src/credentials/vault.ts` | Complete with tests                      | CORE-004 is verification only      |
| **Sandbox Integration**  | `src/sandbox/index.ts`     | Framework exists, needs tool integration | CORE-009 reduced scope             |
| **Platform Paths**       | `src/platform/resolver.ts` | Complete with cross-platform support     | Ready for use                      |
| **Database Schema**      | `migrations/*.sql`         | Base tables ready                        | Checkpointer tables auto-created   |
| **CUE Schema**           | `nix/schema/config.cue`    | Validation ready                         | CORE-003 needs runtime integration |

### Critical Gaps Identified

1. **Missing Dependencies**: `package.json` lacks LangChain, grammY, RMM middleware
2. **No Entry Point**: `src/main.ts` does not exist
3. **Empty CLI**: `apps/cli/src/main.ts` is a 25-line stub
4. **Empty Web UI**: `apps/web-ui/` directory exists but is empty
5. **No Tool Registry**: Infrastructure exists but no tool system implemented
6. **No Middleware Framework**: Only config interface exists, no composition logic

---

## Executive Summary

**Total Estimation:** 51 Story Points (revised from 63 after infrastructure review)  
**Critical Path:** 11 tickets, ~4 weeks for solo developer  
**Parallel Workstreams:** 4 (Foundation, Tools, CLI, Web UI)  
**Prerequisites:** Package dependency installation (see CORE-PREP below)

**Goal:** Build a functional Agent Runtime capable of receiving messages, processing them through middleware, executing tools in sandbox, and responding via multiple interfaces.

---

## Project Phasing Strategy

### Phase 1 (MVP - Core Runtime): Tickets CORE-001 to CORE-017

**Must Have for Working System:**

- Agent execution loop with LangChain createAgent()
- Terminal command execution (CORE-009)
- Filesystem operations: read, write, list (CORE-010)
- Policy enforcement (CORE-011)
- PII detection (CORE-012)
- Checkpointer integration (CORE-002)
- RMM Memory middleware (CORE-001)
- CLI interface (CORE-013)
- Basic Web UI (CORE-014)
- Telegram adapter (CORE-015)
- Summarization (CORE-016)
- Human-in-the-Loop (CORE-017)

**Deferred to Phase 2:**

- Web search middleware (requires Exa API)
- Browser automation middleware (requires Vercel Agent Browser)
- MCP Adapter (for Slack/Discord integrations)
- Skill Loader middleware (skills CLI integration and policy controls)
- Cron middleware (for scheduled tasks)
- Sub-Agent middleware (task delegation)

---

## Build Order (Dependency Graph)

```mermaid
flowchart TB
    subgraph PREP["Prerequisites"]
        PREP[CORE-PREP: Install Dependencies<br/>1pt]
    end

    subgraph FOUNDATION["Foundation Layer (Week 1)"]
        A[CORE-001: RMM Middleware<br/>2pts]
        B[CORE-002: Checkpointer<br/>2pts]
        C[CORE-003: Configuration<br/>2pts]
        D[CORE-004: Credentials<br/>1pt]
        E[CORE-005: LLM Factory<br/>3pts]
    end

    subgraph AGENT["Agent Core (Week 2)"]
        F[CORE-006: LangChain Core<br/>5pts]
        G[CORE-007: Tool Registry<br/>3pts]
        H[CORE-008: Middleware Framework<br/>5pts]
    end

    subgraph TOOLS["Tools Layer (Week 3)"]
        I[CORE-009: Terminal Tool<br/>3pts]
        J[CORE-010: Filesystem Tools<br/>3pts]
        K[CORE-011: Policy Middleware<br/>5pts]
        L[CORE-012: PII Middleware<br/>3pts]
    end

    subgraph INTERFACE["Interface Layer (Week 4-5)"]
        M[CORE-013: CLI App<br/>8pts]
        N[CORE-014: Web UI Core<br/>8pts]
        O[CORE-015: Telegram Adapter<br/>5pts]
        P[CORE-016: Summarization MW<br/>3pts]
        Q[CORE-017: HITL Middleware<br/>5pts]
    end

    A --> F
    B --> F
    C --> F
    D --> F
    E --> F

    F --> G
    G --> H
    H --> I
    H --> J
    H --> K
    H --> L

    I --> M
    I --> N
    J --> M
    J --> N
    K --> M
    K --> N
    L --> M
    L --> N

    M --> O
    N --> O
    H --> P
    H --> Q
    P --> O
    Q --> O

    style A fill:#e1f5fe
    style B fill:#e1f5fe
    style C fill:#e1f5fe
    style D fill:#e1f5fe
    style E fill:#e1f5fe
    style F fill:#b3e5fc
    style G fill:#b3e5fc
    style H fill:#81d4fa
    style I fill:#81d4fa
    style J fill:#81d4fa
    style K fill:#81d4fa
    style L fill:#81d4fa
    style M fill:#4fc3f7
    style N fill:#4fc3f7
    style O fill:#29b6f6
    style P fill:#29b6f6
    style Q fill:#29b6f6
```

---

## Critical Path Analysis

**Revised Critical Path (After Infrastructure Review):**

```
CORE-PREP → CORE-PREP-2 → CORE-001/CORE-002 → CORE-006 → CORE-008 → CORE-009 → CORE-013 → CORE-015
```

**Revised Effort:** 41 Story Points (down from 63)  
**Estimated Duration:** 4 weeks (down from 5)

**Critical Path Breakdown:**
| Ticket | Effort | Cumulative | Notes |
|--------|--------|------------|-------|
| CORE-PREP | 1 | 1 | Install dependencies |
| CORE-PREP-2 | 1 | 2 | Create entry points |
| CORE-001 | 2 | 4 | RMM exists, needs config |
| CORE-002 | 2 | 6 | Checkpointer exists |
| CORE-006 | 5 | 11 | Build agent core |
| CORE-008 | 5 | 16 | Build middleware framework |
| CORE-009 | 3 | 19 | Integrate terminal tool |
| CORE-013 | 8 | 27 | Build CLI |
| CORE-015 | 5 | 32 | Telegram adapter |

**Parallel Workstreams:**

1. **Prerequisites:** CORE-PREP, CORE-PREP-2 (sequential, must be first)
2. **Foundation Track:** CORE-001 through CORE-005 (can be parallelized after prep)
3. **Core Engine Track:** CORE-006 through CORE-008 (sequential)
4. **Tools Track:** CORE-009 through CORE-012 (parallel after CORE-008)
5. **Interface Track:** CORE-013 through CORE-017 (CLI/Web parallel, then Telegram)

**Effort Reduction Rationale:**

- CORE-003: 3→2 (config framework exists, needs extension only)
- CORE-004: 3→1 (vault fully implemented, needs integration only)
- CORE-009: 5→3 (sandbox exists, needs tool wrapper only)
- CORE-010: 5→3 (file-editor exists, needs adaptation only)

---

## Prerequisite Tasks

These tasks must be completed before implementation begins.

---

#### CORE-PREP: Install Package Dependencies

**Type:** Chore  
**Effort:** 1  
**Dependencies:** None  
**Status:** CRITICAL GAP - No LangChain dependencies in package.json

**Description:**  
Add required dependencies to `packages/orchestrator/package.json`. Current package.json only has `@anthropic-ai/sandbox-runtime` and `age-encryption`. Missing critical dependencies for Epic #2.

**Required Dependencies:**

```json
{
	"langchain": "<exact pin from docs/TechSpec.md Section 1.2>",
	"@langchain/core": "<exact pin from docs/TechSpec.md Section 1.2 if imported directly>",
	"@langchain/langgraph": "<exact pin from docs/TechSpec.md Section 1.2 if imported directly>",
	"@langchain/mcp-adapters": "<exact pin from docs/TechSpec.md Section 1.2>",
	"@langchain/anthropic": "<exact pin from docs/TechSpec.md ADR-008>",
	"@langchain/openai": "<exact pin from docs/TechSpec.md ADR-008>",
	"@langchain/google": "<exact pin from docs/TechSpec.md ADR-008>",
	"@skroyc/bun-sqlite-checkpointer": "<exact pin from docs/TechSpec.md ADR-004>",
	"@skroyc/rmm-middleware": "<exact pin from docs/TechSpec.md ADR-014>",
	"grammy": "<exact pin from docs/TechSpec.md Section 1.3>",
	"yaml": "<exact pin from docs/TechSpec.md Section 1.6>",
	"zod": "<exact pin from docs/TechSpec.md Section 1.6>"
}
```

All runtime dependencies MUST use exact version pins from `docs/TechSpec.md`. Do not use caret ranges in production manifests. If TechSpec names a package or ADR but does not record a literal version, verify the current stable release against official documentation before pinning it.

**Also Required for CLI (apps/cli/package.json):**

```json
{
	"@opentui/core": "<exact pin from docs/TechSpec.md ADR-006>"
}
```

**Also Required for Web UI (apps/web-ui/package.json):**

```json
{
	"@sveltejs/kit": "<exact pin from docs/TechSpec.md ADR-007>",
	"svelte": "<exact pin from docs/TechSpec.md ADR-007>"
}
```

**Definition of Done:**

- [ ] Dependencies added to orchestrator package.json
- [ ] Dependencies added to cli package.json
- [ ] Dependencies added to web-ui package.json
- [ ] `bun install` completes successfully
- [ ] TypeScript compilation passes

---

#### CORE-PREP-2: Create Entry Point Structure

**Type:** Chore  
**Effort:** 1  
**Dependencies:** CORE-PREP  
**Status:** CRITICAL GAP - No main.ts entry point exists

**Description:**  
Create the main entry point and directory structure for Epic #2 components that don't exist yet.

**Missing Files/Directories:**

- `packages/orchestrator/src/main.ts` - Main orchestrator entry
- `packages/orchestrator/src/agent/` - Agent core implementation
- `packages/orchestrator/src/tools/` - Tool registry and implementations
- `packages/orchestrator/src/middleware/` - Middleware framework
- `apps/cli/src/` - CLI implementation (only 25-line stub exists)
- `apps/web-ui/src/` - Web UI implementation (empty)

**Definition of Done:**

- [ ] main.ts entry point created with basic initialization
- [ ] Directory structure created for agent, tools, middleware
- [ ] Basic module exports configured
- [ ] Import paths resolve correctly

---

## The Ticket List

### Phase 1: Foundation Layer

---

#### CORE-001: RMM Middleware Integration

**Type:** Chore  
**Effort:** 3  
**Dependencies:** None  
**TechSpec Reference:** Section 5.5.1 (Memory Middleware Tier 2), ADR-014

**Description:**  
Import and configure `@skroyc/rmm-middleware` package for Reflective Memory Management. This implements the three-tier memory system from Tan et al. (ACL 2025) with Prospective Reflection (forward-looking summarization) and Retrospective Reflection (learnable reranking with REINFORCE).

**Implementation Details:**

- Package: `@skroyc/rmm-middleware` (already built, in testing)
- Configure Top-K=20 retrieval, Top-M=5 reranking
- Integrate with bun-sqlite-checkpointer for memory bank persistence
- Set up embedding-based retrieval interface

**Acceptance Criteria (Gherkin):**

```gherkin
Given the rmm-middleware package is installed
When the middleware is configured with default settings
Then Prospective Reflection extracts topic-based memories after sessions
And Retrospective Reflection reranks memories using learned weights (1536x1536 matrices)
And memory bank persists in SQLite with encryption
And Top-K=20 retrieval and Top-M=5 reranking is active
And citation extraction generates reward signals for RL training
```

**Definition of Done:**

- [ ] Package installed and imported
- [ ] Configuration schema defined
- [ ] Integration tests with sample conversations
- [ ] Documentation for memory retrieval/injection flow

---

#### CORE-002: Checkpointer Integration

**Type:** Chore  
**Effort:** 2  
**Dependencies:** None  
**TechSpec Reference:** Section 3.1, ADR-004

**Description:**  
Import `@skroyc/bun-sqlite-checkpointer` and configure as LangGraph checkpointer. Initialize database tables (checkpoints, writes) on first run with WAL mode enabled.

**Implementation Details:**

- Package: `@skroyc/bun-sqlite-checkpointer` (already built, published to npm)
- Use `BunSqliteSaver.fromConnString()` for database initialization
- Tables: checkpoints, writes per TechSpec Section 3.1
- WAL mode: `PRAGMA journal_mode=WAL`

**Acceptance Criteria (Gherkin):**

```gherkin
Given the bun-sqlite-checkpointer package is installed
When the Orchestrator starts with DATABASE_PATH configured
Then BunSqliteSaver initializes with WAL mode enabled
And checkpoints table exists with composite PK (thread_id, checkpoint_ns, checkpoint_id)
And writes table exists with composite PK (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
And agent state persists across Orchestrator restarts
And checkpoint serialization uses JsonPlusSerializer
```

**Definition of Done:**

- [ ] Package installed and configured
- [ ] Database initialization on startup
- [ ] Integration test: state persistence across restart
- [ ] Migration script for schema updates

---

#### CORE-003: Configuration System Extension

**Type:** Feature  
**Effort:** 2  
**Dependencies:** None  
**TechSpec Reference:** Section 6.1, 6.2, 6.3  
**Status:** ⚠️ Partially Implemented - Infrastructure exists at `src/config/index.ts`

**Description:**  
Extend existing configuration system with missing features: environment variable interpolation, CUE schema validation at runtime, and hot-reload support.

**What's Already Implemented:**

- ✅ `OpenKrakenConfig` interface with all sections
- ✅ YAML loading via `parse()` from `yaml` package
- ✅ Platform-appropriate path resolution via `getConfigPath()`
- ✅ Basic configuration structure (app, sandbox, egress, middleware, observability)

**What's Missing:**

- ❌ Environment variable interpolation: `${VAR_NAME}`
- ❌ CUE schema validation at runtime (schema exists at `nix/schema/config.cue`)
- ❌ Hot-reload support on SIGHUP
- ❌ Configuration provider pattern for dependency injection

**Acceptance Criteria (Gherkin):**

```gherkin
Given a valid config.yaml file exists with ${VAR_NAME} placeholders
When the Orchestrator starts
Then environment variables are interpolated in configuration values
And CUE schema validation passes with detailed error messages
And invalid configuration prevents startup with clear error indication
And configuration is accessible via ConfigProvider singleton
And SIGHUP triggers configuration reload without restart
```

**Definition of Done:**

- [ ] Env var interpolation in config values
- [ ] Runtime CUE validation (`cue vet` equivalent in Bun)
- [ ] ConfigProvider singleton for DI
- [ ] Hot-reload on SIGHUP
- [ ] Integration tests

---

#### CORE-004: Credential Vault Integration

**Type:** Security  
**Effort:** 1  
**Dependencies:** CORE-003  
**TechSpec Reference:** Section 6.1 (Environment Variables), ADR-005  
**Status:** ✅ Already Implemented - Located at `src/credentials/vault.ts`

**Description:**  
Verify and integrate the existing CredentialVault implementation. The vault is complete with fallback chain, platform providers, and security controls.

**What's Already Implemented:**

- ✅ `CredentialVault` class with comprehensive implementation
- ✅ Bun secrets provider (platform-native vaults)
- ✅ Age-encrypted file provider (fallback)
- ✅ Development mode with WARNING logs
- ✅ Credential caching in process memory only
- ✅ Comprehensive test suite in `__tests__/vault.test.ts`

**Integration Tasks:**

- Wire vault into Orchestrator initialization
- Add credential provisioning CLI commands
- Verify fallback chain works on target platforms

**Acceptance Criteria (Gherkin):**

```gherkin
Given the Orchestrator starts
When CredentialVault is initialized
Then primary provider (Bun secrets) is attempted first
And fallback to age-encrypted file if primary unavailable
And development mode allows env var fallback with WARNING logs
And credentials are never written to logs
And missing credentials prevent startup with actionable error

Given owner runs "openkraken credentials set <key>"
When command executes
Then credential is stored in active provider
And appropriate permissions are set (0600 for files)
And operation is logged (without credential value)
```

**Definition of Done:**

- [ ] Vault integrated into Orchestrator startup
- [ ] CLI commands for credential management
- [ ] Platform-specific testing (Linux/macOS)
- [ ] Security audit: confirm no credential exposure
- [ ] Documentation for credential provisioning workflow

---

#### CORE-005: LLM Provider Factory

**Type:** Feature  
**Effort:** 3  
**Dependencies:** CORE-004  
**TechSpec Reference:** ADR-008 (Multi-LLM Provider Support)

**Description:**  
Implement LLM provider factory supporting the providers defined in TechSpec ADR-008: Anthropic, OpenAI, and Google. Handle API key retrieval from vault, model configuration, and provider-specific optimizations through LangChain provider packages.

**Implementation Details:**

- Primary provider configurable by Owner
- Supported providers: Anthropic, OpenAI, Google
- Provider factory pattern for extensibility
- API keys retrieved from CredentialVault
- Token counting for context management

**Acceptance Criteria (Gherkin):**

```gherkin
Given the Orchestrator is configured with a supported provider
When the Agent requires LLM inference
Then the LLM client is initialized with API key from vault
And model configuration is loaded from config
And Anthropic, OpenAI, and Google provider selections are supported by configuration
And token usage is tracked per request
And API errors are handled with exponential backoff retry
And failed requests after max retries log error and notify Owner
```

**Definition of Done:**

- [ ] LLM provider factory with Anthropic, OpenAI, and Google implementations
- [ ] Model configuration from config file
- [ ] Token counting integration
- [ ] Retry logic with exponential backoff
- [ ] Error handling and Owner notification

---

### Phase 2: Core Agent Layer

---

#### CORE-006: LangChain Agent Core

**Type:** Feature  
**Effort:** 5  
**Dependencies:** CORE-001, CORE-002, CORE-003, CORE-004, CORE-005  
**TechSpec Reference:** Section 1.2.1, ADR-001

**Description:**  
Implement the core agent execution loop using LangChain.js `createAgent()` with LangGraph state management. Integrate checkpointer, memory middleware, and constitution injection from `SOUL.md`, `SAFETY.md`, `CAPABILITIES.md`, and `DIRECTIVES.md`.

**Implementation Details:**

- Entry point: `createAgent()` from `langchain`
- System prompt: XML-tagged concatenation of `SOUL.md` + `SAFETY.md` + `CAPABILITIES.md` + `DIRECTIVES.md`
- Checkpointer: BunSqliteSaver from CORE-002
- Memory: RMM middleware from CORE-001
- Thread isolation: thread_id = YYYY-MM-DD (day-bounded sessions)

**Acceptance Criteria (Gherkin):**

```gherkin
Given all foundation components are initialized
When createAgent() is invoked
Then agent accepts LLM model from CORE-005
And system prompt includes SOUL.md identity
And system prompt includes SAFETY.md constraints
And system prompt includes CAPABILITIES.md environment context
And system prompt includes DIRECTIVES.md standing instructions
And the system prompt is strictly ordered (SOUL -> SAFETY -> CAPABILITIES -> DIRECTIVES) and wrapped in semantic XML tags
And checkpointer is configured for state persistence
And memory middleware is active for context injection
And agent loop processes messages with checkpoint persistence
And agent state can be restored after interruption
And each calendar day creates a new thread (YYYY-MM-DD)
```

**Definition of Done:**

- [ ] createAgent() integration
- [ ] System prompt injection (`SOUL.md` + `SAFETY.md` + `CAPABILITIES.md` + `DIRECTIVES.md`)
- [ ] Checkpointer integration
- [ ] Memory middleware wiring
- [ ] Thread-per-day session management
- [ ] State restoration test

---

#### CORE-007: Tool Registry System

**Type:** Feature  
**Effort:** 3  
**Dependencies:** CORE-006  
**TechSpec Reference:** Section 4.1.4 (Tool Definitions)

**Description:**  
Implement tool registry for managing built-in tools (filesystem, terminal) and dynamic tools (skills). Tools follow Open Responses format with JSON Schema parameters.

**Built-in Tools (MVP):**

- read_file: Read file contents from sandbox
- write_file: Write content to sandbox file
- list_directory: List directory contents
- execute_terminal: Execute terminal command in sandbox

**Deferred Tools (Phase 2):**

- browse_url: Browser automation
- search_web: Web search

**Acceptance Criteria (Gherkin):**

```gherkin
Given the tool registry is initialized
When tools are registered
Then each tool has name, description, and JSON Schema parameters
And tools are validated against Open Responses format
And tool conflicts are detected and logged
And tool availability can be checked by name
And tool execution returns structured results or errors
```

**Definition of Done:**

- [ ] Tool registry with registration/deregistration
- [ ] Open Responses format validation
- [ ] Tool execution wrapper with error handling
- [ ] Tool result serialization
- [ ] Unit tests for registry operations

---

#### CORE-008: Middleware Composition Framework

**Type:** Feature  
**Effort:** 5  
**Dependencies:** CORE-006, CORE-007  
**TechSpec Reference:** Section 5.5 (Middleware Composition Order)

**Description:**  
Implement middleware composition framework with defined execution order: Policy → PII → Cron → Web Search → Browser → Memory → MCP → Skill Loader → Sub-Agent → Summarization → Human-in-the-Loop.

**Middleware Interface (from TechSpec 5.5.3):**

```typescript
interface Middleware {
	validateInput(input: unknown): boolean;
	process(input: unknown): Promise<MiddlewareOutput>;
	handleError(error: Error): MiddlewareOutput;
	isHealthy(): boolean;
}

interface MiddlewareOutput {
	status: "proceed" | "block" | "error";
	data?: unknown;
	reason?: string;
	metadata?: Record<string, unknown>;
}
```

**Acceptance Criteria (Gherkin):**

```gherkin
Given the middleware framework is initialized
When middleware is registered
Then middleware executes in defined order
And each middleware receives output from previous middleware
And 'proceed' status continues to next middleware
And 'block' status bypasses downstream middleware
And 'error' status triggers error handling without cascading
And middleware health checks are available
And execution time is tracked per middleware
```

**Definition of Done:**

- [ ] Middleware composition framework
- [ ] Execution order enforcement
- [ ] Input/output contract validation
- [ ] Block/error handling logic
- [ ] Health check integration
- [ ] Performance tracking

---

### Phase 3: Tools Layer

---

#### CORE-009: Terminal Tool Integration

**Type:** Feature  
**Effort:** 3  
**Dependencies:** CORE-008  
**TechSpec Reference:** Section 4.1.4 (execute_terminal), CAP-002  
**Status:** ⚠️ Sandbox Infrastructure Exists - Located at `src/sandbox/index.ts`

**Description:**  
Complete the terminal tool by integrating with existing sandbox infrastructure. The sandbox framework exists with zone management; this ticket implements the tool wrapper, output capture, and policy enforcement.

**What's Already Implemented:**

- ✅ `src/sandbox/index.ts` with `initialize()` and `createSandbox()`
- ✅ Zone management (skills, inputs, work, outputs)
- ✅ `@anthropic-ai/sandbox-runtime` integration
- ✅ Sandbox configuration (timeout, memory, CPU limits)
- ✅ Zone mount generation (`toRuntimeBindMounts()`)

**What's Missing:**

- ❌ Tool registry integration (execute_terminal function)
- ❌ Command execution implementation (`executeInSandbox()` completion)
- ❌ Output capture (stdout/stderr streaming)
- ❌ Policy validation before execution
- ❌ Audit logging integration
- ❌ Tool result formatting for Agent

**Acceptance Criteria (Gherkin):**

```gherkin
Given a terminal tool request from agent
When execute_terminal is invoked
Then command is validated against Policy Middleware
And sandbox is created with appropriate zone mounts
And command executes with stdout/stderr capture
And timeout (300s default) is enforced
And exit code and output are returned to agent
And execution is logged to audit_events table
And sandbox cleanup occurs after completion
```

**Definition of Done:**

- [ ] Terminal tool function registered in Tool Registry
- [ ] Complete `executeInSandbox()` implementation
- [ ] Real-time output capture (stdout/stderr)
- [ ] Exit code handling
- [ ] Audit logging integration
- [ ] Error handling with structured responses
- [ ] Integration tests with safe commands (ls, echo, cat)

---

#### CORE-010: Filesystem Tools Adaptation

**Type:** Feature  
**Effort:** 3  
**Dependencies:** CORE-008  
**TechSpec Reference:** Section 4.1.4 (read_file, write_file, list_directory), CAP-003  
**Status:** ⚠️ External Project Available - `/home/oscar/GitHub/file-editor`

**Description:**  
Adapt filesystem tools from existing file-editor project. The file-editor is a complete MCP server with FileExplorer (read operations) and FileEditor (write operations) tools. Adapt for OpenKraken sandbox environment.

**What's Available:**

- ✅ Complete file-editor project at `/home/oscar/GitHub/file-editor`
- ✅ FileExplorer: directory listing, file search, content search, file viewing
- ✅ FileEditor: create, edit, insert with safety protocols
- ✅ .gitignore awareness
- ✅ Path validation and safety checks
- ✅ Bun-based TypeScript implementation

**Adaptation Tasks:**

- Extract core filesystem operations from file-editor
- Integrate with sandbox zone boundaries (restrict to work/output for writes)
- Add Policy Middleware validation
- Convert to Tool Registry format
- Add audit logging

**Acceptance Criteria (Gherkin):**

```gherkin
Given agent requests file operation
When filesystem tool is invoked
Then path is validated against sandbox zone boundaries
And read operations work in all zones (skills, inputs, work, outputs)
And write operations are restricted to work/output zones
And .gitignore rules are respected in directory listings
And operations are logged to audit_events
And structured results are returned to agent

Given a path outside allowed zones
When write is attempted
Then operation is rejected before execution
And structured error is returned
And violation is logged
```

**Definition of Done:**

- [ ] Core logic extracted from file-editor
- [ ] Sandbox zone enforcement integrated
- [ ] Policy Middleware validation added
- [ ] Tools registered in Tool Registry
- [ ] Audit logging implemented
- [ ] Unit tests for zone boundaries
- Path validation: Against allowlist before execution
- Zone enforcement: Read from all zones, write to work/output only
- .gitignore: Respected during directory listing

**Acceptance Criteria (Gherkin):**

```gherkin
Given a filesystem tool request
When read_file is invoked with valid path
Then file contents are returned
And path is validated against sandbox zone boundaries

Given a write_file request
When path is in work or output zone
Then content is written to file
And operation is logged to checkpointer
And path outside work/output zones is rejected with error

Given a list_directory request
When directory is within sandbox zones
Then directory contents are returned
And .gitignore rules are respected
And hidden files are excluded by default (configurable)

Given any filesystem operation
When path is outside allowed zones
Then operation is rejected before execution
And structured error is returned to agent
And violation is logged for security audit
```

**Definition of Done:**

- [ ] Filesystem tools adapted from file-editor
- [ ] Path allowlisting validation
- [ ] Sandbox zone enforcement
- [ ] .gitignore support
- [ ] Audit logging
- [ ] Error handling with structured responses

---

#### CORE-011: Policy Middleware

**Type:** Security  
**Effort:** 5  
**Dependencies:** CORE-008  
**TechSpec Reference:** Section 5.5.1 (Tier 1: Policy), CAP-014

**Description:**  
Implement foundational policy enforcement middleware (Tier 1). Validates tool requests against package/path allowlists, enforces rate limits, performs content scanning.

**Policy Checks:**

- Package validation: Terminal commands against approved packages
- Path validation: File operations against zone allowlists
- Rate limiting: Per-tool request limits (configurable)
- Content scanning: Block dangerous patterns (excluding PII - handled by CORE-012)

**Acceptance Criteria (Gherkin):**

```gherkin
Given a tool invocation request
When Policy Middleware processes it
Then terminal commands are validated against package allowlist
And file paths are validated against zone allowlist
And rate limits are enforced per tool (requests per minute)
And violations are logged and rejected with structured error
And 'block' status prevents downstream middleware execution
And blocked requests include reason for rejection
```

**Definition of Done:**

- [ ] Package allowlist validation
- [ ] Path allowlist validation
- [ ] Rate limiting with token bucket
- [ ] Content scanning for dangerous patterns
- [ ] Structured error responses
- [ ] Security audit logging

---

#### CORE-012: PII Middleware

**Type:** Security  
**Effort:** 3  
**Dependencies:** CORE-008  
**TechSpec Reference:** Section 5.5.1 (Tier 1: PII), Section 5.5.2

**Description:**  
Implement PII (Personally Identifiable Information) detection and scrubbing middleware using LangChain built-in piiMiddleware. Detects credentials, personal data, and sensitive patterns.

**Implementation Details:**

- Use LangChain's built-in `piiMiddleware`
- Detects: API keys, tokens, passwords, PII patterns
- Action: Scrub or block based on configuration
- Logging: Log detection events without exposing detected values

**Acceptance Criteria (Gherkin):**

```gherkin
Given user input containing potential PII
When PII Middleware processes it
Then PII patterns are detected (credentials, tokens, personal data)
And detected PII is scrubbed or request is blocked per configuration
And PII detection events are logged without exposing values
And sanitized input proceeds to downstream middleware
And configuration enables PII detection toggle
```

**Definition of Done:**

- [ ] PII Middleware integration
- [ ] LangChain piiMiddleware configuration
- [ ] Pattern detection for common PII types
- [ ] Scrub/block action implementation
- [ ] Audit logging (value-free)
- [ ] Configuration toggle

---

### Phase 4: Interface Layer

---

#### CORE-013: CLI Application (OpenTUI)

**Type:** Feature  
**Effort:** 8  
**Dependencies:** CORE-009, CORE-010, CORE-011, CORE-012  
**TechSpec Reference:** ADR-006 (OpenTUI), CAP-080

**Description:**  
Build CLI application using OpenTUI framework (@opentui/core). Provides TUI conversation interface, configuration management, and system diagnostics.

**CLI Commands:**

- `openkraken chat`: Interactive TUI conversation
- `openkraken config`: Configuration management
- `openkraken status`: System health and diagnostics
- `openkraken credentials`: Credential management
- `openkraken logs`: Observability data retrieval

**Implementation Details:**

- Framework: OpenTUI v0.1.76 (Bun-native)
- Authentication: Token-based (time-limited tokens)
- API: HTTP client to Orchestrator (127.0.0.1:3000)
- Accessibility: Full keyboard navigation, screen reader compatible

**Acceptance Criteria (Gherkin):**

```gherkin
Given the CLI is built and installed
When owner runs "openkraken chat"
Then TUI displays conversation interface with message history
And owner can type messages and send to agent
And agent responses display in real-time
And keyboard navigation works without mouse (arrow keys, tab, enter)
And screen reader announces messages and UI state

Given owner runs "openkraken status"
Then system health is displayed (services, connections, errors)
And recent activity is shown
And configuration status is summarized

Given owner runs "openkraken config"
Then configuration can be viewed and edited
And changes are validated before saving
And invalid configuration shows clear errors

Given CLI session starts
When owner authenticates
Then time-limited token is generated
And subsequent commands use token for authentication
And token expiry requires re-authentication
```

**Definition of Done:**

- [ ] OpenTUI-based TUI implementation
- [ ] chat command with conversation interface
- [ ] status command with system health
- [ ] config command with validation
- [ ] Token-based authentication
- [ ] Keyboard-only navigation
- [ ] Screen reader compatibility
- [ ] Feature parity checklist with Web UI

---

#### CORE-014: Web UI Core (SvelteKit)

**Type:** Feature  
**Effort:** 8  
**Dependencies:** CORE-009, CORE-010, CORE-011, CORE-012  
**TechSpec Reference:** ADR-007 (SvelteKit), CAP-081

**Description:**  
Build Web UI using SvelteKit + Svelte 5. Provides real-time conversation display, configuration panels, system dashboard. WebSocket communication for real-time updates.

**Features:**

- Real-time conversation display with streaming
- Configuration panels (read/write)
- System dashboard (status, health, recent activity)
- Responsive design
- WCAG 2.1 AA accessibility compliance

**Implementation Details:**

- Framework: Svelte 5 + SvelteKit
- Styling: Tailwind CSS (or similar)
- Real-time: WebSocket connection to Orchestrator
- API: REST endpoints for configuration, status
- State: Session persistence across reloads

**Acceptance Criteria (Gherkin):**

```gherkin
Given the Web UI is built and running
When owner accesses http://localhost:3000
Then login page loads (token-based authentication)
And after authentication, conversation interface displays
And messages stream in real-time via WebSocket
And owner can type and send messages
And configuration panel allows viewing and editing settings
And dashboard shows system status and recent activity
And session persists across page reload (localStorage/cookies)
And design is responsive (mobile, tablet, desktop)
And WCAG 2.1 AA compliance is met (contrast, keyboard nav, screen reader)
```

**Definition of Done:**

- [ ] SvelteKit project setup with Svelte 5
- [ ] Authentication flow (token-based)
- [ ] Conversation component with WebSocket
- [ ] Configuration panel with validation
- [ ] Dashboard with system status
- [ ] Responsive design
- [ ] WCAG 2.1 AA accessibility audit
- [ ] Feature parity checklist with CLI

---

#### CORE-015: Telegram Adapter

**Type:** Feature  
**Effort:** 5  
**Dependencies:** CORE-013, CORE-014  
**TechSpec Reference:** Section 4.2.1, CAP-052

**Description:**  
Implement Telegram Bot API integration using grammY framework. Webhook-based message receiving with secret token validation before update processing.

**Implementation Details:**

- Framework: grammY v1.39.3
- Mode: Webhook (production) or polling (development)
- Security: `X-Telegram-Bot-Api-Secret-Token` validation via grammY `secretToken`
- Bot commands: /start, /help
- Message types: Text (primary), limited support for other types

**Acceptance Criteria (Gherkin):**

```gherkin
Given Telegram bot token is configured in vault
And webhook URL is configured and accessible
When owner sends message via Telegram
Then webhook receives update with secret token validation
And invalid or missing secret tokens are rejected before update processing
And valid messages are routed to agent loop
And agent responses are sent back to Telegram chat
And /start command provides welcome message
And /help command lists available commands
And unsupported message types are handled gracefully
And webhook errors are logged and retried with exponential backoff
And delivery status is tracked (sent, delivered, failed)
```

**Definition of Done:**

- [ ] grammY integration
- [ ] Webhook endpoint with secret token validation
- [ ] Message routing to agent
- [ ] Response delivery to Telegram
- [ ] Bot commands (/start, /help)
- [ ] Error handling and retry logic
- [ ] Polling mode for development

---

### Phase 5: Operational Middleware

---

#### CORE-016: Summarization Middleware

**Type:** Feature  
**Effort:** 3  
**Dependencies:** CORE-008  
**TechSpec Reference:** Section 5.5.1 (Tier 3: Summarization)

**Description:**  
Implement context compression middleware that summarizes older messages when context exceeds token thresholds. Prevents context overflow while preserving conversation continuity.

**Implementation Details:**

- Trigger: Context size > summarizationThreshold (default: 80000 tokens)
- Strategy: Summarize oldest messages first, keep recent messages intact
- LLM: Use same provider as agent (configurable)
- Prompt: Configurable summarization prompt

**Acceptance Criteria (Gherkin):**

```gherkin
Given conversation context exceeds threshold
When Summarization Middleware processes
Then oldest messages are summarized using LLM
And summary preserves key information and decisions
And recent messages remain unsummarized
And compressed context fits within maxTokens limit
And summarization is logged with token savings metrics
And configuration allows threshold and prompt customization
```

**Definition of Done:**

- [ ] Token counting for context size
- [ ] Summarization trigger logic
- [ ] LLM-based summarization
- [ ] Context replacement strategy
- [ ] Metrics logging (before/after tokens)
- [ ] Configuration options

---

#### CORE-017: Human-in-the-Loop Middleware

**Type:** Feature  
**Effort:** 5  
**Dependencies:** CORE-008  
**TechSpec Reference:** Section 5.5.1 (Tier 3: HITL), docs/Architecture.md

**Description:**  
Implement Owner approval workflow for sensitive operations. Interrupts agent execution, persists state to checkpointer, and resumes after Owner decision.

**Operations Requiring Approval (configurable):**

- file:create, file:delete
- terminal:exec
- skill:install

**Implementation Details:**

- Interrupt: Agent state persisted to checkpointer
- Notification: Via Telegram (primary) or Web UI
- Timeout: None - indefinite suspension until Owner responds
- Resume: Checkpointer restores state, agent continues

**Acceptance Criteria (Gherkin):**

```gherkin
Given agent attempts operation requiring approval
When Human-in-the-Loop Middleware intercepts
Then agent execution is suspended
And state is persisted to checkpointer with interrupt metadata
And Owner is notified via Telegram with operation details
And Owner receives inline keyboard for Approve/Reject
And agent loop remains suspended indefinitely

Given Owner approves operation
When approval signal received
Then state is restored from checkpointer
And agent resumes execution
And approval is logged with timestamp and Owner ID

Given Owner rejects operation
When rejection signal received
Then agent receives rejection with explanation
And alternative approaches may be suggested
And rejection is logged with timestamp and Owner ID

Given Orchestrator restarts during pending approval
When Orchestrator recovers
Then pending approvals are restored from checkpointer
And Owner can still respond
And agent resumes after approval/rejection
```

**Definition of Done:**

- [ ] Operation classification (requires approval)
- [ ] State persistence on interrupt
- [ ] Telegram notification with inline keyboard
- [ ] Approval/rejection handling
- [ ] State restoration on resume
- [ ] Checkpointer integration for durability
- [ ] Audit logging

---

## Phase 2: Deferred Tickets

These tickets are defined but scheduled for Phase 2 post-MVP.

---

#### CORE-018: Web Search Middleware (Phase 2)

**Type:** Feature  
**Effort:** 5  
**Dependencies:** CORE-008  
**TechSpec Reference:** Section 5.5.1 (Tier 2: Web Search)

**Description:**  
Implement web search capability via Exa API (or configured provider). Routes requests through Egress Gateway for policy enforcement.

**Acceptance Criteria (Gherkin):**

```gherkin
Given agent invokes web_search tool
When Web Search Middleware processes
Then search query is sent to Exa API via Egress Gateway
And search results are returned to agent
And API usage is tracked and logged
And errors are handled with retry logic
```

---

#### CORE-019: Browser Middleware (Phase 2)

**Type:** Feature  
**Effort:** 8  
**Dependencies:** CORE-008  
**TechSpec Reference:** Section 5.5.1 (Tier 2: Browser), Section 1.3 (Vercel Agent Browser)

**Description:**  
Implement browser automation using Vercel Agent Browser. Manages isolated browser profiles per session, routes traffic through Egress Gateway.

**Acceptance Criteria (Gherkin):**

```gherkin
Given agent invokes browse_url tool
When Browser Middleware processes
Then isolated browser profile is created
And URL is loaded with JavaScript rendering
And page content is extracted and returned
And traffic routes through Egress Gateway
And browser profile is isolated per session
```

---

#### CORE-020: MCP Adapter (Phase 2)

**Type:** Feature  
**Effort:** 5  
**Dependencies:** CORE-008  
**TechSpec Reference:** Section 1.2 (MCP Adapters), Section 4.2.2

**Description:**  
Implement Model Context Protocol adapter for connecting to MCP servers (Slack, Discord, email, calendar, custom services).

**Acceptance Criteria (Gherkin):**

```gherkin
Given MCP server configuration exists
When MCP Adapter initializes
Then connection is established via stdio/streamable_http/sse
And MCP tools are exposed to agent
And tool calls are routed to appropriate MCP server
And connection health is monitored
```

---

#### CORE-021: Cron Middleware (Phase 2)

**Type:** Feature  
**Effort:** 5  
**Dependencies:** CORE-008  
**TechSpec Reference:** Section 5.5.1 (Tier 2: Cron), CAP-040

**Description:**  
Implement scheduled task detection and invocation. Registers with host timer system, ensures at-least-once execution semantics.

**Acceptance Criteria (Gherkin):**

```gherkin
Given scheduled task is configured
When trigger time arrives
Then Cron Middleware invokes agent with scheduled context
And execution is logged to checkpointer
And failed executions are retried
```

---

#### CORE-022: Sub-Agent Middleware (Phase 2)

**Type:** Feature  
**Effort:** 8  
**Dependencies:** CORE-008  
**TechSpec Reference:** Section 5.5.1 (Tier 2: Sub-Agent)

**Description:**  
Implement task delegation via createSubAgentMiddleware(). Spawns subordinate agent loops with inherited sandbox boundaries. Delegation limited to one level.

**Acceptance Criteria (Gherkin):**

```gherkin
Given agent invokes sub-agent tool
When Sub-Agent Middleware processes
Then new agent loop is spawned with inherited constraints
And sub-agent executes delegated task
And results are returned to parent agent
And sub-agents cannot spawn further sub-agents
```

---

#### CORE-023: Skill Loader Middleware (Phase 2)

**Type:** Feature  
**Effort:** 5  
**Dependencies:** CORE-008  
**TechSpec Reference:** Section 5.5.1 (Tier 2: Skill Loader), ADR-013

**Description:**  
Implement skill loading middleware that resolves approved skills, injects skill manifests and tools into the Agent runtime, and records skill version metadata for auditability.

**Acceptance Criteria (Gherkin):**

```gherkin
Given approved skill configuration exists
When Skill Loader Middleware initializes
Then skill manifests are resolved through the approved skills pipeline
And skill tools are exposed to the agent with version metadata
And unapproved or invalid skills are rejected before activation
And skill activation events are logged for audit
```

---

## Ticket Summary by Priority

### Prerequisites (Must Complete First)

| Ticket      | Title                | Effort | Notes                                  |
| ----------- | -------------------- | ------ | -------------------------------------- |
| CORE-PREP   | Install Dependencies | 1      | Critical gap - package.json incomplete |
| CORE-PREP-2 | Create Entry Points  | 1      | Critical gap - no main.ts exists       |

### Critical Path (MVP Blockers)

| Ticket   | Title                | Effort | Cumulative | Notes                              |
| -------- | -------------------- | ------ | ---------- | ---------------------------------- |
| CORE-001 | RMM Middleware       | 2      | 2          | Package exists, needs integration  |
| CORE-002 | Checkpointer         | 2      | 4          | Package exists, needs integration  |
| CORE-006 | LangChain Core       | 5      | 9          | Build from scratch                 |
| CORE-008 | Middleware Framework | 5      | 14         | Build from scratch                 |
| CORE-009 | Terminal Tool        | 3      | 17         | Sandbox exists, needs tool wrapper |
| CORE-013 | CLI App              | 8      | 25         | Build from scratch                 |
| CORE-015 | Telegram Adapter     | 5      | 30         | Build from scratch                 |

**Critical Path Total:** 32 Story Points  
**Total with Prerequisites:** 34 Story Points  
**Estimated Duration:** 4 weeks

### Parallel Work (Non-Critical)

| Ticket   | Title             | Effort | Timing   | Notes                                |
| -------- | ----------------- | ------ | -------- | ------------------------------------ |
| CORE-003 | Configuration     | 2      | Week 1   | Framework exists, needs extension    |
| CORE-004 | Credentials       | 1      | Week 1   | Fully implemented, needs integration |
| CORE-005 | LLM Factory       | 3      | Week 1   | Build from scratch                   |
| CORE-007 | Tool Registry     | 3      | Week 2   | Build from scratch                   |
| CORE-010 | Filesystem Tools  | 3      | Week 3   | file-editor exists, needs adaptation |
| CORE-011 | Policy Middleware | 5      | Week 3   | Build from scratch                   |
| CORE-012 | PII Middleware    | 3      | Week 3   | Build from scratch                   |
| CORE-014 | Web UI            | 8      | Week 4-5 | Build from scratch                   |
| CORE-016 | Summarization     | 3      | Week 4   | Build from scratch                   |
| CORE-017 | HITL Middleware   | 5      | Week 4   | Build from scratch                   |

**Total Epic Effort:** 51 Story Points (revised from 63)

---

## Verification Checklist

### Pre-Implementation Verification (Prerequisites)

- [ ] CORE-PREP: All dependencies installed (LangChain, grammY, RMM middleware, etc.)
- [ ] CORE-PREP: `bun install` completes without errors
- [ ] CORE-PREP-2: main.ts entry points created for orchestrator, CLI, and Web UI
- [ ] CORE-PREP-2: Directory structure created (agent/, tools/, middleware/)
- [ ] Infrastructure packages available (bun-sqlite-checkpointer, rmm-middleware)
- [ ] CUE schema validation passes
- [ ] Bun + LangChain compatibility verified
- [ ] Telegram bot token available in dev environment
- [ ] Anthropic API key available in dev environment

### Feature Verification

- [ ] Agent loop processes messages end-to-end
- [ ] Checkpointer persists state across restarts
- [ ] Terminal commands execute in sandbox
- [ ] Filesystem operations respect zone boundaries
- [ ] Policy middleware blocks unauthorized operations
- [ ] CLI provides conversation interface
- [ ] Telegram receives and responds to messages
- [ ] HITL workflow suspends and resumes correctly

### Security Verification

- [ ] Credentials never exposed in logs
- [ ] PII detection scrubs sensitive data
- [ ] Path traversal attempts are blocked
- [ ] Sandbox isolation prevents host access
- [ ] Audit logs contain complete operation history

---

## Risk Assessment

| Risk                                     | Probability | Impact | Mitigation                                                   |
| ---------------------------------------- | ----------- | ------ | ------------------------------------------------------------ |
| **Package dependency conflicts**         | Medium      | High   | Pin exact versions, test `bun install` before implementation |
| **Missing entry point structure**        | High        | Medium | CORE-PREP-2 must be completed before other work              |
| RMM middleware integration complexity    | Low         | High   | Early integration (CORE-001), comprehensive testing          |
| OpenTUI beta stability issues            | Medium      | Medium | Fallback to basic CLI commands if TUI fails                  |
| Telegram webhook verification complexity | Low         | Medium | Test with official Telegram test environment                 |
| LangChain middleware hook ordering       | Medium      | High   | Explicit ordering tests, middleware isolation                |
| Checkpointer performance at scale        | Low         | Medium | Benchmark early, WAL mode optimization                       |

---

## Next Steps (Execution Order)

### Phase 0: Prerequisites (Week 0 - Must Complete First)

1. **CORE-PREP: Install Dependencies**
   - Add LangChain, grammY, RMM middleware, and other deps to package.json files
   - Run `bun install` and verify no conflicts
   - Commit lockfiles

2. **CORE-PREP-2: Create Entry Points**
   - Create `packages/orchestrator/src/main.ts`
   - Create directory structure: agent/, tools/, middleware/
   - Create `apps/cli/src/main.ts` (expand from 25-line stub)
   - Create `apps/web-ui/src/` structure

### Phase 1: Foundation (Week 1)

3. **Parallel Foundation Work:**
   - CORE-001 (RMM): Install and configure @skroyc/rmm-middleware
   - CORE-002 (Checkpointer): Install and configure @skroyc/bun-sqlite-checkpointer
   - CORE-003 (Configuration): Extend existing config with env var interpolation
   - CORE-004 (Credentials): Integrate existing vault implementation
   - CORE-005 (LLM Factory): Implement LangChain-backed Anthropic, OpenAI, and Google providers

4. **Validation Gate:**
   - Before CORE-006: Verify all foundation components integrate
   - Test: Config → Vault → LLM → RMM → Checkpointer chain

### Phase 2: Core Engine (Week 2)

5. **Build Agent Core:**
   - CORE-006 (LangChain Core): Implement createAgent() with middleware wiring
   - CORE-007 (Tool Registry): Create tool registration system
   - CORE-008 (Middleware Framework): Build composition framework

### Phase 3: Tools (Week 3)

6. **Implement Tools:**
   - CORE-009 (Terminal): Complete sandbox integration (framework exists)
   - CORE-010 (Filesystem): Adapt file-editor project
   - CORE-011 (Policy): Build validation middleware
   - CORE-012 (PII): Build PII detection middleware

### Phase 4: Interfaces (Week 4-5)

7. **Build Interfaces:**
   - CORE-013 (CLI): OpenTUI-based interface
   - CORE-014 (Web UI): SvelteKit-based interface
   - CORE-016 (Summarization): Context compression
   - CORE-017 (HITL): Approval workflow

8. **Final Integration:**
   - CORE-015 (Telegram): grammY adapter
   - End-to-end test: Telegram → Agent → Tool → Response

---

## External Dependencies

| Package                         | Status    | Source           | Integration Point | In package.json? |
| ------------------------------- | --------- | ---------------- | ----------------- | ---------------- |
| @skroyc/bun-sqlite-checkpointer | Published | npm              | CORE-002          | Missing          |
| @skroyc/rmm-middleware          | Testing   | npm              | CORE-001          | Missing          |
| @opentui/core                   | Beta      | npm              | CORE-013          | Missing          |
| file-editor                     | Ready     | Local adaptation | CORE-010          | N/A (external)   |
| @anthropic-ai/sandbox-runtime   | Published | npm              | CORE-009          | Yes              |
| langchain                       | Published | npm              | CORE-006          | Missing          |
| @langchain/core                 | Published | npm              | CORE-006          | Missing          |
| @langchain/mcp-adapters         | Published | npm              | CORE-020          | Missing          |
| @langchain/anthropic            | Published | npm              | CORE-005          | Missing          |
| @langchain/openai               | Published | npm              | CORE-005          | Missing          |
| @langchain/google               | Published | npm              | CORE-005          | Missing          |
| grammY                          | Published | npm              | CORE-015          | Missing          |
| yaml                            | Published | npm              | CORE-003          | Missing          |
| zod                             | Published | npm              | Multiple          | Missing          |
| age-encryption                  | Published | npm              | CORE-004          | Yes              |

### Package.json Status

- **Orchestrator** (`packages/orchestrator/package.json`): Missing critical runtime dependencies
- **CLI** (`apps/cli/package.json`): Missing all dependencies (not initialized)
- **Web UI** (`apps/web-ui/package.json`): Missing all dependencies (not initialized)

**Action Required:** Complete CORE-PREP before any implementation work

---

_Document generated by Technical Project Manager (Task Layer)_  
_Version: 1.0_  
_Date: 2026-02-18_  
_Constitutional Basis: docs/PRD.md, docs/TechSpec.md, docs/Architecture.md_
