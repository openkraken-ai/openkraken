# Context_Tasks.md
## Task Planning and Temporal Constraints

### Temporal Hardpoints

- [Lines 138-140] **Update Orchestration:** Atomic service updates via Nix. New generation entirely replaces old generation. Services restarted. No rolling restart or gradual rollout. Service startup order declared in Nix module ensuring Egress Gateway available before Orchestrator network operations.

- [Lines 224-226] **Session Lifecycle:** Agent sessions are day-boundaries. Session spans one calendar day, identified by date-based thread ID. Same day = same session with continuous context. New day = fresh context with memory injection. Sandbox persistent while system runs but can be restarted by Owner at any time. Terminal sessions destroyed at session boundaries.

- [Lines 230-231] **Backup Schedule:** Automated daily backups of SQLite checkpoint database using online backup API. Compressed archives with 7-day retention. Integrity checks run automatically during backup to detect corruption early.

- [Lines 810-814] **Data Retention Policy:**
  - Proxy logs: 30 days rolling with 100MB automatic rotation
  - Audit logs: 30 days rolling (appended, cryptographically signed)
  - Messages: Retained indefinitely (Owner-configurable)
  - Memories: Retained indefinitely (Owner-configurable)

- [Lines 860-863] **Resource Timeouts:**
  - Memory limit: 2GB per Orchestrator instance
  - CPU limit: 80% of available cores
  - Session timeout: 4 hours of inactivity (triggers graceful session end)
  - Tool execution timeout: 300 seconds per command

- [Lines 782-785] **Graceful Shutdown Timeout:** Drain timeout for in-flight requests configurable (default: 30 seconds). Final acknowledgment before termination. State persistence to SQLite before exit.

### Ordering Constraints

- [Lines 140-141] **Startup Ordering:** Egress Gateway must be available before Orchestrator attempts network operations. Service startup order declared in Nix module.

- [Lines 154-155] **Egress Gateway Communication:** Orchestrator communicates with Egress Gateway via HTTP over Unix domain socket. Orchestrator manages allowlists and retrieves audit logs. Proxy enforces allowlist-only policy.

- [Lines 349-355] **Connection Flow Sequence:**
  1. Sandboxed process initiates connection through proxy settings
  2. Proxy extracts destination domain from HTTP CONNECT or SOCKS5 handshake
  3. Proxy checks domain against current allowlist (exact string + wildcard support)
  4. If allowed, establishes bidirectional connection; if denied, returns structured JSON error

- [Lines 359-361] **Allowlist Management Sequence:** Before skill execution begins, Orchestrator calls proxy management API to temporarily expand allowlist with skill-required domains. When skill execution completes, Orchestrator resets allowlist to baseline. Three tiers maintained separately: system domains (core, immutable), skill domains (temporary during execution), owner domains (personal integrations).

- [Lines 602-614] **Telegram Processing Sequence:** Webhook request received via POST. Cryptographic signature verification before processing. Updates deduplicated using unique identifiers. Rate limiting compliance. Update processed within session context (chat ID + date).

- [Lines 619-626] **MCP Integration Sequence:** Persistent connections established during Orchestrator startup. Capability negotiation during connection establishment. Tool allowlist enforced during capability negotiation. Request routing through MCP adapter.

- [Lines 741-750] **Constitutional Document Injection Sequence:** Read by Orchestrator at startup from Host filesystem (`identity/` directory). Injected into Agent's system prompt in priority order: SOUL.md + SAFETY.md + AGENTS.md + Runtime Context. Never materialized in sandbox filesystem.

- [Lines 781-786] **Graceful Shutdown Sequence:**
  1. Signal reception (SIGINT/SIGTERM)
  2. Stop accepting new requests
  3. In-flight requests complete or timeout
  4. Final acknowledgment
  5. State persistence to LangGraph checkpointer
  6. Process exit

### Resource Constraints

- [Lines 15-16] **Single-Tenant Limitation:** No multi-user, no multi-tenant, no shared hosting. Each device runs exactly one Owner with full system access. No user isolation, role-based access control, or shared instance management.

- [Lines 856-858] **Platform-Specific Resource Limits:**
  - Linux: cgroups enforce CPU time, memory consumption, process count limits
  - macOS: Seatbelt profile restrictions combined with process timeout mechanisms

- [Lines 623-624] **MCP Tool Allowlist:** Orchestrator enforces tool allowlist policy ensuring Agent can only access MCP tools explicitly approved by Owner.

- [Lines 686] **Constitutional Document Priority:** SOUL.md (highest), SAFETY.md (medium), AGENTS.md (lowest). Prevents Owner configuration from overriding Agent's immutable identity.

- [Lines 752-756] **Security Properties of Constitutional Documents:** Documents exist only in Orchestrator's runtime memory, never written to sandbox filesystem. Agent cannot read documents, copy documents, or reason about documents as manipulable entities.

- [Lines 876-898] **Security Constraints (The "Never" List):**
  1. Never run terminal sessions as root inside sandbox
  2. Never mount credentials into sandbox or expose in Agent's context
  3. Never mount `identity/` files into sandbox (identity via prompt only)
  4. Never bypass path validation for file operations
  5. Never allow direct network access from sandbox (all egress through Egress Gateway)
  6. Never bind services to `0.0.0.0`
  7. Never persist terminal sessions across Orchestrator restarts
  8. Never expose sandbox internals to Agent (packages available without explanation)
  9. Never trust path input without resolution and validation
  10. Never return silent failures
  11. Never allow Agent to directly read/write memory storage
  12. Never execute skill scripts without prior LLM analysis and Owner approval
  13. Never allow browser automation without Egress Gateway enforcement
  14. Never share browser profiles between conversations
  15. Never skip webhook verification for Telegram integration
  16. Never connect MCP servers without capability negotiation
  17. Never expose Egress Gateway management API to unauthenticated requests
  18. Never log credentials or sensitive configuration data
  19. Never allow Unix socket access from sandboxed processes without explicit configuration
  20. Never bypass Anthropic Sandbox Runtime for command execution

### Middleware Processing Order

- [Lines 536-537] **Middleware Stack Organization:** Three tiers with defined order. Later middleware operates on outputs of earlier middleware. Order matters.

- [Lines 540-564] **Middleware Execution Sequence:**
  **Tier 1: Foundational Policy**
  1. **Policy Middleware** — Validates terminal package requests, gates delivery with content scanning, enforces rate limits
  
  **Tier 2: Agent Capabilities**
  2. **Cron Middleware** — Detects scheduled task triggers
  3. **Web Search Middleware** — Provides web search tools
  4. **Browser Middleware** — Provides browser automation
  5. **Memory Middleware** — Retrieves relevant memories, extracts/consolidates after completion
  6. **MCP Adapter Middleware** — Provides MCP server access
  7. **Skill Loader Middleware** — Injects skill manifests
  8. **Sub-Agent Middleware** — Provides task delegation
  
  **Tier 3: Operational Concerns**
  9. **Summarization Middleware** — Compresses older messages when context exceeds thresholds
  10. **Human-in-the-Loop Middleware** — Interrupts for Owner approval

### Callback Handler Order

- [Lines 522-523] **Callback Handlers vs Middleware:** Callback handlers passive observability (can stack in any order). Middleware active execution modification (order matters).

- [Lines 526-532] **Callback Handler Sequence:**
  1. **Logger Callback Handler** — Instruments all hooks, writes structured records to SQLite
  2. **OpenTelemetry Callback Handler** — Distributed tracing and metrics collection
  3. **Content Scanning Callback Handler** — Scans outbound content for credential leaks, PII, policy violations (runs last)

### Operational Procedures

- [Lines 767-770] **Health Check Endpoints:**
  - `/health` (Liveness) — Returns 200 OK if process running. Used by process supervisors to detect hung processes.
  - `/ready` (Readiness) — Returns 200 OK only when all dependencies healthy. Verifies database connectivity, MCP server availability, and Egress Gateway status. Owners can configure middleware.
  - `/metrics` ( additional health checks viaPrometheus) — Exposes Prometheus-compatible metrics for monitoring systems. Key metrics include HTTP request counts, tool invocation counts, proxy dispositions, and resource utilization.
  - `/version` — Returns version information for debugging and support.

- [Lines 773-775] **Recommended Monitoring Thresholds:**
  - Liveness failures trigger immediate restart via process supervision
  - Readiness failures trigger alerts to the Owner and prevent new session starts
  - Egress Gateway denial rate > 1% of total requests triggers alerts (potential misconfiguration)

- [Lines 788-790] **Recovery Properties:**
  - LangGraph SqliteCheckpointer ensures session state survives Orchestrator restarts
  - SQLite Write-Ahead Logging (WAL) mode ensures crash consistency
  - Daily automated backups protect against database corruption

- [Lines 819-835] **Restart and Recovery Procedures:**
  **Graceful Restart:**
  1. Owner sends SIGTERM or uses management command
  2. Orchestrator stops accepting new requests
  3. In-flight requests complete or timeout
  4. State is persisted to SQLite
  5. Orchestrator exits cleanly

  **Force Restart:**
  1. Process supervisor sends SIGKILL or restarts the process
  2. LangGraph checkpointer recovers state from SQLite
  3. Session continues from the last checkpoint
  4. No data loss beyond the last checkpoint

  **Sandbox Runtime Recovery:**
  - Sandbox violations are detected and logged
  - Failed tool invocations return structured error responses
  - The Agent receives error context and can retry with corrected parameters
  - Persistent violations trigger Owner alerts

- [Lines 841-845] **Logging Integrity Protections:**
  - **Append-Only Design:** Log entries are never modified after insertion
  - **Correlation Identifiers:** Each operation includes a UUID for tracing across middleware
  - **Sanitization:** Credentials and sensitive data are removed before logging
  - **Cryptographic Signing:** Security-relevant events are signed to detect tampering

- [Lines 847-851] **Audit Events:**
  - Authentication attempts (successful and failed)
  - Authorization decisions (allowed and denied)
  - Configuration changes
  - Session lifecycle events (start, end, termination)
  - Security constraint violations

- [Lines 870-873] **Default Ports:**
  - Orchestrator HTTP: 127.0.0.1:3000 (configurable)
  - Egress HTTP Proxy: 127.0.0.1:8080
  - Egress SOCKS5 Proxy: 127.0.0.1:1080