### v0.13.0 — 2026-02-03

**Architectural Evolution: Nix Platform Layer, IPC/RPC Communication, and Terminology Disambiguation**

This version represents a significant architectural evolution following investigation into OpenClaw's architecture, Nix's role as a platform layer, and cross-platform communication patterns. Key changes establish the system as a Nix-managed service architecture with independent components communicating via RPC.

**Layer -1: The Platform Manager**
* Added new architectural layer describing Nix's role as the infrastructure layer that packages, deploys, and manages the system as Nix-managed services.
* Covers service generation (systemd on Linux, launchd on macOS), directory convention management, credential boundary definition, update orchestration (atomic switchover), and process lifecycle.
* Clarifies that Nix operates below all application code, generating platform-specific service configurations from a unified declarative specification.

**IPC/RPC Communication Patterns**
* Added explicit communication patterns between system components.
* Orchestrator to Egress Gateway: HTTP over Unix domain socket with management commands (allowlist add/remove, stats retrieval, log streaming).
* Orchestrator to MCP Servers: stdio-based JSON-RPC following Model Context Protocol standard.
* Orchestrator to Sandbox: stdio-based JSON-RPC for command execution and file operations with PTY file descriptor passing.
* Configuration Management: Unified YAML configuration with Nix providing defaults, Owners providing overrides, environment variables for runtime paths.

**Terminology Disambiguation**
* Expanded terminology section to clarify four distinct architectural entities:
  * Project — The framework itself.
  * Owner — The person running the instance.
  * Agent — The LLM-driven runtime.
  * Egress Gateway — Network boundary component (Go/Rust binary).
  * Orchestrator — Agent orchestration component (Bun/TypeScript).
  * Platform Adapter — Cross-platform abstraction layer within Orchestrator.

**Layer Renumbering**
* Renumbered architecture layers to reflect the new understanding:
  * Layer -1: Platform Manager (Nix infrastructure).
  * Layer 0: Host (Unix/Linux/macOS user-space with Nix-managed services).
  * Layer 1: Sandbox (Isolation via Anthropic Sandbox Runtime).
  * Layer 2: Agent (LLM-driven runtime inside sandbox).
  * Layer 3: Orchestrator (Agent orchestration and coordination).

**Gateway → Orchestrator Renaming**
* Renamed Layer 2 from "Gateway" to "Orchestrator" throughout the document to clarify architectural boundaries.
* The Orchestrator is now explicitly the agent orchestration component implemented in Bun/TypeScript.
* The Egress Gateway is a separate Go/Rust binary with independent lifecycle, managed by Nix.
* All "Gateway" references were reviewed and updated to the correct entity (Orchestrator or Egress Gateway).

**Egress Gateway Independence**
* Clarified that the Egress Gateway runs as an independent process with its own lifecycle managed by the platform init system.
* Communicates with the Orchestrator via RPC over Unix domain socket.
* Orchestrator manages allowlists through the RPC interface but does not embed the proxy functionality.

**Credential Provisioning Model**
* Updated to reflect dual-tier credential strategy:
  * Non-sensitive configuration (API endpoints, feature flags) via Nix at build time.
  * Sensitive credentials (API keys, tokens) via OS-level vaults (Keychain on macOS, secret-service on Linux) at runtime.
* Nix never handles sensitive credential values; runtime retrieval keeps credentials out of Nix store.

**Session Lifecycle Model**
* Clarified sandbox persistence model:
  * Sandbox is persistent while the system runs (Owner-controlled restarts).
  * Agent sessions are day-boundaries with continuous context within a day, fresh context on new days.
  * Terminal sessions are bound to session lifecycle and destroyed at boundaries.

**Configuration Format**
* Specified YAML as the unified configuration format for the system.
* Located at platform-appropriate paths (Linux: `/etc/realclaw/config.yaml`, macOS: `~/Library/Application Support/realclaw/config.yaml`).

**Multi-User Clarification**
* Explicitly stated that multi-user scenarios are out of scope.
* No user isolation, role-based access control, or shared instance management.
* Each device runs exactly one Owner with full system access.

**Entry Point Interfaces**
* Documented dual entry points:
  * CLI provides power-user operations for configuration, debugging, and automation.
  * Web UI provides browser-based interface for casual interaction and monitoring.
* Both interfaces communicate with the Orchestrator through internal APIs.

**Section Updates**
* Section 1 (Mission Statement): Minor updates to reflect architectural terminology changes.
* Section 3 (Architecture): Complete rewrite of Layer 0 and new Layer -1 sections, renamed Layer 2 to Layer 3 (Orchestrator).
* Section 6 (Egress Gateway): Complete rewrite to reflect independent service model, RPC management interface, Nix-managed lifecycle.
* Section 7 (Platform): Renamed to Platform Adapter, clarifying role within Orchestrator for runtime platform detection and adaptation.
* Section 8 (Middleware): Updated terminology from Gateway to Orchestrator.
* Section 9 (Data Flow): Updated terminology and clarified Orchestrator's role in all data paths.
* Section 10.1 (Constitutional Documents): Updated document injection mechanism to reference Orchestrator.
* Section 10.2 (Operational Concerns): Updated health checks, shutdown procedures, and recovery properties to reference Orchestrator.
* Section 11 (Security Constraints): Updated constraints to reference Egress Gateway and Orchestrator correctly.

**Fixes**
* Platform Path Semantics: Clarified that Platform Adapter handles path normalization and validation.
* Network Isolation: Corrected all references to use "Egress Gateway" for network proxy functionality, "Orchestrator" for agent orchestration.
* Process Supervision: Clarified Nix-managed service lifecycle for both Egress Gateway and Orchestrator.

### v0.11.0 — 2026-02-03

Architectural clarification and terminology precision addressing technology stack inconsistencies discovered through systematic review. This version distinguishes between LangChain.js callback handlers (passive observability) and middleware (active execution modification), clarifies the custom OpenTelemetry implementation, and formalizes platform path handling and credential vault abstractions.

**Terminology Clarification: Callbacks versus Middleware:**
*   Distinguished between LangChain.js callback handlers (passive observability instrumentation) and agent middleware (active execution modification).
*   Callback handlers observe and record without modifying behavior—they can stack in any order since they don't interfere with each other. Used for logging, tracing, metrics collection, and content scanning.
*   Middleware provides active modification of the agent's execution flow—later middleware operates on the outputs of earlier middleware, so order matters. Used for policy enforcement, capability injection, and operational concerns.
*   Updated Section 8 (Middleware Composition) to clarify this distinction and reorganize the stack into three tiers: foundational policy, agent capabilities, and operational concerns.

**OpenTelemetry Implementation Clarification:**
*   Acknowledged that LangChain.js uses LangSmith for distributed tracing, not native OpenTelemetry integration.
*   The architecture now specifies a **custom OpenTelemetry callback handler** that intercepts agent lifecycle events (LLM calls, tool invocations, chain executions) and transforms them into a canonical telemetry format.
*   This format can be exported to OpenTelemetry Protocol (OTLP) collectors for enterprise environments, to LangSmith for development debugging, or retained in SQLite for audit purposes.
*   The handler sanitizes sensitive data before export, ensuring credentials never flow through telemetry pipelines.
*   Updated technology stack description from "OpenTelemetry for observability" to "custom OpenTelemetry implementation for observability."

**Middleware Stack Reorganization:**
*   Reorganized the middleware stack into three tiers for clarity: Tier 1 (Foundational Policy: Policy Middleware), Tier 2 (Agent Capabilities: Cron, Web Search, Browser, Memory, MCP Adapter, Skill Loader, Sub-Agent), Tier 3 (Operational Concerns: Summarization, Human-in-the-Loop).
*   Moved Logger, OpenTelemetry, and Content Scanning from middleware list to callback handler section as foundational observability components.
*   Clarified that callback handlers form the observability foundation while middleware provides active execution modification.

**Platform Path Semantics:**
*   Added explicit documentation that the Gateway normalizes all paths to canonical format before sandbox configuration.
*   Acknowledged that bubblewrap on Linux operates on literal paths without glob support, while Seatbelt profiles on macOS support glob patterns.
*   The Gateway performs path validation against allowed zones and resolves paths to absolute, literal form before sandbox configuration.
*   This ensures consistent behavior across platforms with the Gateway handling platform-specific details transparently.

**Credential Vault Abstraction:**
*   Formalized the **CredentialVault** abstraction that provides unified interface across platforms.
*   On macOS, the vault uses the Keychain Services API. On Linux, the vault uses the secret-service API (compatible with GNOME Keyring, KWallet, or pass).
*   Credentials are read at startup, stored in memory only, never written to filesystem or logs.
*   Rotation support via re-reading from vaults without full restart.
*   Clarified the single-tenant model: Owner provisions credentials through platform-native tools; Gateway reads into memory at startup.

**Observability Layer Refinement:**
*   Updated all references from "OpenTelemetry Middleware" to "OpenTelemetry Callback Handler" to reflect the correct abstraction level.
*   Clarified that traces are created through custom implementation, not native LangChain.js OpenTelemetry integration.
*   Updated health endpoints description to reflect current implementation.

**Security Constraint Refinement:**
*   Updated Security Constraint #8 from "Never expose sandbox internals" to clarify the Gateway's role in platform abstraction and path normalization.

### v0.12.0 — 2026-02-03

Architecture update following comprehensive research phase to verify technology stack versions, document constitutional framework, and add operational best practices. This version introduces the constitutional documents hierarchy (SOUL > SAFETY > AGENTS), cross-platform implementation details, and operational concerns guidance. All changes are additive and maintain backward compatibility with v0.11.0.

**Technology Stack Version Pinning:**
*   Added explicit version pins for all dependencies to ensure reproducibility and prevent supply chain attacks.
*   Bun Runtime: 1.3.8 (latest stable as of February 2026)
*   LangChain.js: 1.2.16 (core library)
*   LangGraph.js: 1.1.3 (@langchain/langgraph core) / 1.0.19 (langgraph wrapper)
*   @langchain/mcp-adapters: 1.1.2 (Model Context Protocol integration)
*   grammY: Supports Telegram Bot API 9.3 (December 2025 release)
*   @anthropic-ai/sandbox-runtime: 0.0.35 (Beta Research Preview)
*   Vercel Agent Browser: 0.9.0 (headless browser automation)
*   All dependencies declared in `package.json` with exact semver ranges; transitive dependencies pinned via lockfile.

**Constitutional Documents Framework (Section 10.1):**
*   Added comprehensive framework for three-tier constitutional hierarchy: SOUL.md > SAFETY.md > AGENTS.md
*   SOUL.md: Agent identity and values inspired by Anthropic's Constitutional AI approach (https://www.anthropic.com/constitution)
*   SAFETY.md: Environment and harness-specific context providing Defense in Depth alongside architectural sandboxing
*   AGENTS.md: Owner configuration following the open AGENTS.md standard (https://agents.md/) stewarded by Agentic AI Foundation
*   Document injection mechanism ensures constitutional documents exist only in Gateway runtime memory, never materialized in sandbox filesystem

**Cross-Platform Implementation Details (Section 7.x):**
*   Added comprehensive comparison of Linux bubblewrap vs macOS sandbox-exec mechanisms
*   Documented filesystem isolation differences: bind mounts vs Seatbelt profiles, glob support limitations
*   Documented network isolation architecture: Unix socket bridges vs direct localhost TCP
*   Documented Unix domain socket restrictions: seccomp BPF vs Seatbelt profile rules
*   Documented violation detection: strace requirements on Linux vs native kernel log integration on macOS
*   Added recommended configuration patterns with examples of platform-specific vs portable configurations

**Operational Concerns and Best Practices (Section 10.2):**
*   Added health check and readiness monitoring specifications for `/health`, `/ready`, `/metrics`, `/version` endpoints
*   Added graceful shutdown and recovery procedures with SIGINT/SIGTERM handling
*   Added data persistence and backup strategy covering all SQLite databases and retention policies
*   Added restart and recovery procedures for Gateway and sandbox runtime
*   Added logging and audit trail integrity protections including append-only design and cryptographic signing
*   Added resource management recommendations: memory limits, CPU allocation, session timeouts
*   Added port and network configuration specifications (127.0.0.1 binding, default ports)

**Sandbox Runtime Maturity Note:**
*   Added explicit documentation that Anthropic Sandbox Runtime is at version 0.0.35 (Beta Research Preview)
*   Documented 0.x.y versioning indicates potential breaking changes before 1.0.0
*   Clarified defense-in-depth measures ensure sandbox failures do not result in credential exposure or unauthorized network access

Major architectural enhancement integrating production-tested security infrastructure, comprehensive observability, and formalized integration protocols. This version replaces custom sandboxing with Anthropic's proven runtime, defines complete egress proxy behavior, and adds systematic observability and lifecycle management. The architecture shifts from "build everything ourselves" to "integrate battle-tested foundations where available, implement custom logic where necessary."

Major architectural enhancement integrating production-tested security infrastructure, comprehensive observability, and formalized integration protocols. This version replaces custom sandboxing with Anthropic's proven runtime, defines complete egress proxy behavior, and adds systematic observability and lifecycle management. The architecture shifts from "build everything ourselves" to "integrate battle-tested foundations where available, implement custom logic where necessary."

**Anthropic Sandbox Runtime Integration:**
*   Replaced custom bubblewrap/sandbox-exec implementation with `@anthropic-ai/sandbox-runtime` for cross-platform consistent isolation.
*   Runtime uses `bubblewrap` on Linux and `sandbox-exec` (Seatbelt) on macOS, presenting unified configuration interface.
*   Added violation detection mechanisms: macOS taps into system sandbox violation log store; Linux detects via process exit codes.
*   Added Unix socket restrictions via seccomp filters (Linux) and Seatbelt profiles (macOS).
*   Updated Security Constraint #20: "Never bypass the Anthropic Sandbox Runtime for command execution."

**Comprehensive Egress Proxy Architecture:**
*   Complete specification of dual-proxy system: HTTP CONNECT on port 8080 for web traffic, SOCKS5 on port 1080 for non-HTTP protocols.
*   Defined connection flow with host-side DNS resolution preventing sandbox control over target IPs.
*   Implemented structured JSON error responses with request IDs, timestamps, policy versions, and complete context for debugging.
*   Specified comprehensive logging: 12 fields per request including timestamp, UUID, source process, destination domain/port, method, disposition, rule applied, bytes transferred, duration, and TLS SNI.
*   Defined three-tier allowlist management: system domains (core functionality), skill domains (temporary during execution), owner domains (personal integrations).
*   Added security measures: localhost-only binding, TLS hostname validation, IP address blocking by default.

**Observability Layer Implementation:**
*   Added OpenTelemetry Middleware to middleware stack for distributed tracing and metrics collection.
*   Exposes Prometheus-compatible metrics at `/metrics` endpoint with comprehensive instrumentation.
*   Defined health endpoints: `/health` (liveness), `/ready` (dependency checks), `/metrics` (Prometheus), `/version` (debugging).
*   Specified structured logging with SQLite storage, 100MB rotation, 30-day retention.
*   Added security auditing with append-only logs and cryptographic signing for tamper prevention.
*   Integrated observability into data flow as explicit "Observability Path" section.

**Credential Management Enhancement:**
*   Replaced environment variable approach with OS-level credential vaults: macOS Keychain, Linux secret-service API (GNOME Keyring, KWallet, pass).
*   Credentials read at startup, stored only in runtime memory, never written to filesystem or logs.
*   Added credential rotation support without requiring full Gateway restart.
*   Added Security Constraint #18: "Never log credentials or sensitive configuration data."

**Telegram Integration Lifecycle:**
*   Added complete webhook mode specification with cryptographic signature verification preventing spoofing attacks.
*   Defined long-polling mode for development environments.
*   Implemented graceful shutdown handlers for SIGINT/SIGTERM with configurable timeout for in-flight requests.
*   Added update deduplication via unique identifiers and rate limiting.
*   Added Security Constraint #15: "Never skip webhook verification for Telegram integration."

**MCP Integration Formalization:**
*   Added MCP Adapter Middleware to middleware stack using `@langchain/mcp-adapters`.
*   Documented connection management with persistent connections, automatic reconnection, and exponential backoff.
*   Defined capability negotiation during connection establishment for tool/resource discovery.
*   Specified tool allowlist policy enforcement ensuring Agents access only Owner-approved MCP tools.
*   Added Security Constraint #16: "Never connect MCP servers without capability negotiation."
*   Added Security Constraint #17: "Never expose proxy management API to unauthenticated requests."
*   Documented security considerations: MCP servers run outside sandbox, communication logged via observability middleware, schema validation prevents protocol confusion attacks.

**Middleware Stack Expansion:**
*   Expanded from 10 to 12 middleware: added OpenTelemetry Middleware (position 2) and MCP Adapter Middleware (position 8).
*   Enhanced Logger Middleware with complete specification of log entry fields and correlation identifiers.
*   Updated middleware responsibilities to reflect new components and integration patterns.

**State Persistence and Backup:**
*   Enhanced SqliteCheckpointer documentation with Write-Ahead Logging (WAL) mode for concurrent access.
*   Specified two-table schema: checkpoints and writes for efficient retrieval and rollback.
*   Implemented automated daily backups using SQLite online backup API ensuring consistency during operation.
*   Defined 7-day retention with compression and automatic integrity checks for corruption detection.

**Core Philosophy Additions (#11, #15, #16, #17):**
*   Added "Build on Proven Foundations" — integrate battle-tested solutions for security-critical infrastructure, implement custom only for gateway-specific concerns.
*   Added "Observable by Default" — complete visibility into Agent behavior for debugging, audit, and optimization.
*   Added "Credential Isolation" — OS-level vaults, never exposed to Agent or written to persistent storage.
*   Expanded "Everything is Middleware" to include MCP integration and observability.

**Security Constraints Expansion:**
*   Added constraints #15-20: webhook verification, MCP capability negotiation, proxy API authentication, credential logging prevention, Unix socket access control, Anthropic Sandbox Runtime mandate.
*   Refined constraint #8 from "Never expose Nix internals" to "Never expose sandbox internals" reflecting runtime abstraction.

**Directory Structure Updates:**
*   Added `observability/` directory for OpenTelemetry configuration and logging schemas.
*   Added `mcp/` directory for MCP server configurations and connection definitions.
*   Updated `system/` to include egress proxy configuration.
*   Updated `runtime/` to reference Anthropic Sandbox Runtime settings.

**Platform Abstraction Enhancement:**
*   Documented how Anthropic Sandbox Runtime achieves consistent security semantics across Linux and macOS.
*   Eliminated previous "accepted limitation" for macOS resource limits — runtime handles platform differences transparently.
*   Added observability layer compatibility statement for cross-platform consistency.

**Data Flow Expansion:**
*   Added "Telegram Integration Lifecycle" section documenting webhook verification, graceful shutdown, and session mapping.
*   Added "MCP Integration Path" section with adapter routing and capability negotiation.
*   Added "Observability Path" section with logging, tracing, and metrics flow.
*   Enhanced "Skill Execution Path" to include sandbox runtime configuration management.

**Scope Definition Updates:**
*   Added observability as primary capability: comprehensive logging, distributed tracing, and metrics.
*   Updated integration boundaries to include OpenTelemetry-compatible observability backends.
*   Enhanced technology stack listing: Bun + LangChain.js v1 + grammY + @langchain/mcp-adapters + OpenTelemetry.

**Response to OpenClaw Failures:**
*   Added new failure category: "Custom Security Infrastructure" — building custom sandboxing leads to gaps; leverage production-tested solutions.
*   Enhanced existing failures with specific implementation details: cryptographic verification for Telegram, OS-level vaults for credentials, structured proxy errors and logging.

### v0.9.0 — 2026-02-03

Architectural iteration addressing three key concerns: cross-distribution Nix support, identity injection security, and explicit scope definition. Removes NixOS dependency, eliminates filesystem-based identity, and defines bounded project scope.

**Nix Distribution Support:**
*   Changed from "Nix Flakes with NixOS (Linux) or nix-darwin (macOS)" to "Nix Flakes (Universal)."
*   System now runs on any modern Linux distribution with Nix installed, not just NixOS.
*   Removed systemd/launchd dependency for process supervision — Gateway manages processes directly as user-space application.
*   Works across Ubuntu, Debian, Fedora, Arch, CentOS, and other distributions.

**Identity Injection Security:**
*   Removed `/sandbox/identity/` zone from filesystem taxonomy. Identity files are no longer materialized in the sandbox.
*   Added Core Philosophy #13: "Identity Injection" — `SOUL.md` and `SAFETY.md` are injected directly into the Agent's system prompt by the Gateway at runtime.
*   Prevents exfiltration of the "Constitution" via file copy operations.
*   Updated Security Constraint #3: "Never mount `identity/` files into the sandbox. Identity is injected via prompt only."

**Explicit Scope Definition:**
*   Added new section "Scope Definition: What This Project Does" with bounded capabilities.
*   Primary Capabilities: Conversational Interaction (Telegram + MCP), Terminal Execution, File Operations, Web Automation (Vercel Agent Browser), Skill System, Scheduled Tasks, Persistent Memory.
*   Integration Boundaries: In Scope (Telegram, MCP servers), Out of Scope (direct WhatsApp, native mobile, voice).
*   Security Boundaries: Deterministic enforcement, Zero Trust, Isolated Execution.

**Browser Automation:**
*   Added Vercel Agent Browser as new tool capability for web automation.
*   Browser sessions isolated per conversation thread with unique browser profiles.
*   Browser network traffic routes through egress proxy with domain allowlist enforcement.
*   Added Browser Middleware to handle session isolation.
*   Added Security Constraints #13, #14: never allow browser automation without proxy enforcement, never share browser profiles between conversations.

**Memory Architecture Formalization:**
*   Explicitly defined three-tier recall system: Checkpointer (LangGraph SqliteCheckpointer), Message Log (SQLite messages table), Memory Bank (SQLite memories table).
*   All memory backends consolidated to SQLite for consistency and durability.

**Core Philosophy Additions (#13, #14):**
*   Added "Identity Injection" — identity files never materialized in sandbox, injected via prompt only.
*   Added "Durable State Persistence" — LangGraph SqliteCheckpointer ensures session continuity across Gateway restarts.

**Process Supervision Simplification:**
*   Removed systemd/launchd abstraction — Gateway acts as direct process supervisor.
*   Timer Management restored: Layer 0 executes scheduled tasks via system timers or dedicated scheduler process.

**Resource Limits Clarification:**
*   Restored explanation of macOS limitations and why they are acceptable for single-tenant deployment.

### v0.8.0 — 2026-02-03

Major architectural revision focused on cross-platform support, Nix-native design, and simplified isolation model. Collapses the 4-layer model to 3 layers, replaces containerization with lightweight sandboxing, and introduces the terminal tool with session management. This version makes macOS a first-class platform and ensures the Agent has no awareness of underlying implementation details.

**Architectural Model Change (4 Layers → 3 Layers):**
*   Merged the previous "Layer 2: Environment" into Layer 0 and Layer 1. Nix package management is now an implementation detail of the terminal tool, not a separate architectural layer.
*   The new model: Layer 0 (Host), Layer 1 (Sandbox), Layer 2 (Gateway). Cleaner separation of concerns with host-level services, process isolation, and application logic.

**Cross-Platform Support:**
*   Added macOS as a first-class target alongside Linux. All architectural decisions now consider both platforms.
*   Platform-specific implementations (systemd vs launchd, bubblewrap vs sandbox-exec, cgroups vs ulimit) are hidden behind abstractions.
*   Accepted macOS resource limit limitations as appropriate for single-tenant deployment.

**Core Philosophy Additions (#11, #12):**
*   Added "Nix-Native, Nix-Invisible" — the system leverages Nix for reproducibility and package management, but the Agent never sees Nix internals. Packages become available without explanation.
*   Added "Tool-Level Isolation" — different tools enforce security boundaries appropriate to their function. File operations use path validation; command execution uses process isolation. Not everything needs containerization.

**Sandboxing Model Change:**
*   Replaced "OCI Containers (Podman/Docker) or MicroVMs (Firecracker)" with lightweight OS-native sandboxing: bubblewrap on Linux, sandbox-exec on macOS.
*   Sandboxing is now per-tool-invocation with shared filesystem zones, not a persistent container environment.
*   Process isolation is only applied where needed (command execution), not universally. File operations use path validation instead.

**Terminal Tool (Replaces `package_run`):**
*   Introduced the `terminal` tool with session management, replacing the simpler `package_run` tool.
*   Sessions persist across tool calls within a calendar day, enabling stateful workflows and background processes.
*   Supports an `action` parameter: "execute" (default), "view" (check background process output), "kill" (terminate process or session).
*   Packages are specified via array parameter and become available transparently — the Agent requests packages, not Nix commands.
*   Background process support with PID tracking and output retrieval.

**Egress Proxy Architecture:**
*   Replaced the impossible "domain-based firewall filtering" with explicit HTTP CONNECT proxy architecture.
*   Proxy implemented in Go, runs on Layer 0, enforces domain allowlists with structured JSON error responses.
*   Sandboxed processes receive `HTTP_PROXY` environment variables; direct internet access is blocked.
*   Tiered allowlist: baseline (always allowed), instance (Owner-configured), skill (activated during skill execution).

**Skill Script Pre-Analysis:**
*   Added lightweight LLM (Haiku-class) analysis of skill scripts at ingestion time.
*   Extracts: required interpreters, required packages, network requirements, file access patterns, risk assessment.
*   Replaces fragile regex parsing of AgentSkills.io `compatibility` field with semantic understanding.
*   Analysis is presented to Owner for approval and stored for runtime policy enforcement.
*   Added security constraint #12: never execute skill scripts without prior analysis and Owner approval.

**File Tools Alignment:**
*   Aligned file tool interface with Claude.ai's computer use environment: `view`, `create_file`, `str_replace`.
*   These tools use path validation for isolation, not process isolation — simpler and sufficient for their function.
*   Clear zone permission enforcement: identity/skills/inputs are read-only, work/outputs are read-write.

**Credential Management Clarification:**
*   Specified MVP approach: environment file with restricted permissions, read by Gateway at startup.
*   Credentials never enter sandbox filesystem or Agent context.
*   Future keychain integration noted but deferred.

**Telemetry Simplification:**
*   Removed incorrect claims about cgroup-based network connection monitoring.
*   Telemetry is now Gateway-level: tool calls, proxy access logs, middleware instrumentation.
*   Platform-specific resource metrics where available (cgroups on Linux, limited on macOS).

**Documentation Style:**
*   Rewrote as prose document without implementation code.
*   Architecture describes what and why; implementation details belong in code.

**Removed:**
*   "Layer 2: Environment" as separate layer — absorbed into other layers.
*   "OCI Containers / Firecracker" — replaced with bubblewrap/sandbox-exec.
*   "nftables firewall rules" — replaced with proxy-based filtering.
*   "Per-task network isolation" claim — clarified as per-session with proxy.
*   `package_run` tool — replaced with `terminal` tool.
*   Implementation code blocks throughout document.

**Security Constraint Additions:**
*   #11: Never expose Nix internals to the Agent.
*   #12: Never execute skill scripts without prior LLM analysis and Owner approval.

### v0.7.0 — 2026-02-02

Adds three major capability expansions: agent-managed scheduling, web search via Exa, and sub-agent orchestration. All three are implemented as middleware — reinforcing the "everything is middleware" philosophy now codified as core philosophy #10. The 4-layer model is unchanged; this version fills feature gaps identified through competitive analysis of OpenClaw.

**Core Philosophy Addition (#10 — Everything is Middleware):**
*   Codified the principle that all agent capabilities — scheduling, web search, sub-agents, memory, skills — are implemented as composable LangChain middleware. No privileged internal mechanisms exist that custom middleware cannot replicate.
*   This mirrors Flutter's "everything is a widget" — once you internalize the primitive, the design space collapses to "which hooks, what order."
*   Future Owner-configured hooks will also be middleware, not a separate event system. The Owner learns the same six hooks the Project uses.

**Agent-Managed Scheduling (Cron Middleware):**
*   Added the `schedule` tool enabling the Agent to create, list, modify, and cancel scheduled tasks. Jobs are registered via a `schedule({ action, at|every|cron, task, threadPolicy })` interface.
*   **Thread policy:** Jobs can continue the same day's thread (`"continue"`, default) or spawn a fresh context (`"fresh"`). `"continue"` is for tasks that should be part of the main Agent's day — sharing context with ongoing work. `"fresh"` is for focused, isolated tasks that don't need to pollute the day's thread (similar to sub-agent execution). Both policies return results to the Primary Channel (Telegram).
*   **Persistence:** Job definitions are stored in a `schedules` table in SQLite. Layer 0's cron daemon owns the timers; the Gateway owns the job registry. Jobs survive Gateway restarts.
*   **Data flow:** Added "Scheduled Path: Cron → Agent → Primary Channel" section documenting the full lifecycle from registration through execution to delivery.
*   Added `system/cron.nix` to host directory structure and "Timer Management" to Layer 0 responsibilities.
*   Cron Middleware added to the middleware stack (position 3, after Policy, before Web Search).

**Web Search via Exa API:**
*   Added three tools: `web_search` (general web), `code_search` (GitHub/Stack Overflow/docs), `web_fetch` (full page retrieval from specific URLs).
*   **Gateway-mediated:** The sandbox never makes external HTTP calls. The Gateway holds Exa API credentials (Layer 0 environment variables) and proxies requests.
*   **Network allowlist:** Added `api.exa.ai` to standing network exceptions alongside `cache.nixos.org`.
*   **Why Exa:** Returns LLM-optimized content (cleaned text, not raw HTML), provides semantic search, and differentiates from OpenClaw's Tavily integration.
*   Added "Web Search Path: Agent → Exa API" section to data flow documentation.
*   Web Search Middleware added to the middleware stack (position 4, after Cron, before Memory).

**Sub-Agent Orchestration (SubAgentMiddleware):**
*   Added the `task` tool enabling the Agent to delegate complex work to sub-agents with isolated context windows.
*   **Context isolation:** Sub-agents do not inherit the main Agent's conversation context — this keeps the main context clean while going deep on sub-tasks. Sub-agents share the sandbox filesystem but not the context window.
*   **Sub-agent types:** General-purpose (always available, same tools as main Agent) and specialized (custom prompts, restricted tools, domain-specific). Definitions are declarative and fixed at Gateway startup.
*   **Policy consistency:** Sub-agents go through the same `wrapToolCall` pipeline as the main Agent. Added security constraint #12: sub-agents cannot bypass the main Agent's policy stack.
*   Added "Sub-Agent Path: Task Delegation" section to data flow documentation.
*   Added `gateway/subagents/` to host directory structure.
*   Sub-Agent Middleware added to the middleware stack (position 7, after Skill Loader, before Summarization).

**Technology Stack Update:**
*   Added `deepagents` to Layer 3 technology list for sub-agent support.

**Core Tools Expansion:**
*   Core tools registered with the agent now include: `package_run`, `deliver_output`, `search_history`, `schedule`, `web_search`, `code_search`, `web_fetch`, `task`.

**Observability Updates:**
*   `beforeAgent` hook now includes "cron trigger detection" in its observability role.
*   `wrapModelCall` hook now includes "sub-agent routing" in its observability role.

**Runtime Context Expansion:**
*   Added "cron job metadata (when applicable)" to the runtime context schema.

**Security Constraint Addition (#12):**
*   Added: "Never allow sub-agents to bypass the main Agent's policy stack. Sub-agents share the sandbox and go through the same `wrapToolCall` pipeline — they are context-isolated, not policy-isolated."

**`deliver_output` Scope Clarification:**
*   Clarified that `deliver_output` gates **all file delivery** — including to the Primary Channel (Telegram), not just secondary channels. Plain text responses to Telegram bypass `deliver_output` but file attachments always go through it.

### v0.6.0 — 2026-02-02

Removes `request_service`, commits to no-streaming delivery, resolves the webhook architecture, and tightens dependency management. The 4-layer model and core philosophies are unchanged. This is a simplification release — the system has fewer tools, fewer data flow paths, and fewer open questions than v0.5.0.

**`request_service` Removal:**
*   Removed the `request_service` tool and the entire "Slow Path" (container rebuild for service provisioning). `package_run` is now the sole execution mechanism for agent tool access.
*   The slow path was an artifact of the isolation model — a complex mechanism to punch holes in the sandbox for long-running services. Analysis of OpenClaw and realistic personal assistant tasks found no scenario where the Agent genuinely needs to provision a database or daemon inside its sandbox that `package_run` cannot handle. OpenClaw — the most adopted system in this space — has no equivalent concept.
*   If persistent project environments with services become a real need, `devenv.sh` (Nix-native, declarative, handles service lifecycle via `process-compose`) is the right future primitive — but that is out of scope for the current architecture.
*   Removed `request_service` from: core tool list (Section 6), directory structure tool definitions, HITL approval defaults, and all data flow documentation.

**No-Streaming Delivery Model:**
*   The Agent generates a complete response. `afterModel` middleware scans the full text for credential leaks and PII. Only after validation does the response reach the Telegram chat. This is a deliberate tradeoff: response latency increases, but the content scanning security model is honest — no race between streaming tokens and scanning them.
*   Removed all "streaming" language from the Primary Channel description and inbound data flow path.

**Webhook Architecture (Tailscale Funnel):**
*   Production mode uses Telegram webhooks delivered via Tailscale Funnel. The Gateway binds to its Tailscale interface; Funnel exposes a public HTTPS endpoint for Telegram to POST to. This preserves constraint #5 (never bind to `0.0.0.0`) without a generic reverse proxy.
*   Development/fallback mode uses grammY long polling, requiring no inbound connectivity.
*   The webhook endpoint validates Telegram's `X-Telegram-Bot-Api-Secret-Token` header as defense-in-depth.
*   Generic reverse proxies are explicitly unsupported — this is the OpenClaw localhost-trust vulnerability.

**Dependency Management Reframing (Layer 2 / Philosophy #5):**
*   Reframed Philosophy #5 around **ingestion-time resolution**: system packages resolve from nixpkgs; language-specific Skill dependencies are converted at ingestion time from standard lockfiles into Nix derivations via bridge tools (`dream2nix`, `poetry2nix`). Native package managers (`pip`, `npm`) are never invoked at runtime.
*   Removed "Service Provisioning (Full Rebuild Path)" from Layer 2 responsibilities.

**Session Terminology:**
*   Clarified that **session = thread = one calendar day**. Filesystem zones with "Per-session" persistence (Inputs, Outputs) are cleared at session boundaries. The Work zone defaults to ephemeral (cleared at session boundary); persistent workspaces via named volumes are Owner-configurable but lifecycle details remain an open design question.

**`search_history` LLM Reader:**
*   `search_history` is now **retrieval-augmented recall**, not a raw database query. The tool queries the `messages` table, then passes results through a lightweight LLM (Haiku-class) that filters for relevance, summarizes lengthy exchanges, and preserves factual precision. The main Agent receives processed summaries, not raw transcripts.
*   Formalized the three temporal recall layers: Checkpointer (within-session, automatic), `search_history` (cross-session, agent-initiated, summarized), Memory bank (semantic long-term, automatic).

**Outputs Zone Clarification:**
*   The Outputs zone is Read-Write at the filesystem level. The gating applies to egress — only the `deliver_output` tool transmits content from this zone to external channels. Previous wording ("Write, tool-gated") incorrectly implied filesystem writes required a tool call.

**Security Constraint #7 Refinement:**
*   Softened from "the Agent must not be able to influence what gets stored via any mechanism" to "the Agent must not have direct write access to memory storage." Acknowledged that the Agent has indirect influence via its contributions to the conversation transcript, with the extraction model's independent topic filtering as the mitigation. The constraint was previously overstating the guarantee.

**Vocabulary Precision:**
*   Established consistent terminology: **tools** are Agent-facing interfaces (`deliver_output`, `package_run`, `search_history`); **middleware** is the policy/lifecycle infrastructure; middleware has **hooks** (`wrapToolCall`, `beforeModel`, etc.). Fixed instances where `deliver_output` was called "middleware" when it is a tool gated by the Policy Middleware's `wrapToolCall` hook.

### v0.5.0 — 2026-02-02

Defines the deployment model, channel architecture, session lifecycle, and operational decisions left unresolved in v0.4.0. The 4-layer model and core philosophies remain unchanged; this version fills the gaps between the security architecture and a working system.

**Single-Tenant Declaration and Terminology:**
*   Formally declared the system as **single-tenant, Owner-operated**. One person, one instance, one device. Added as core philosophy #9.
*   Defined three roles — **Project** (the framework authors), **Owner** (the person running an instance), **Agent** (the managed sub-system). Replaced inconsistent "operator" and "user" terminology throughout.
*   Eliminated multi-user concepts: removed `userId` from the runtime context (single-tenant, so instance-scoped), eliminated RBAC, removed session-to-user mapping.

**Authentication Model:**
*   No application-level authentication. Network-level isolation (bind to `127.0.0.1` or Tailscale) is the sole access control. If you can reach the Gateway, you're the Owner.
*   External service credentials (bot tokens, API keys) are stored on the host filesystem (Layer 0) and injected into processes via environment variables at startup. Credentials never enter the sandbox. Added security constraint #11.

**Primary Channel Architecture (Telegram):**
*   Telegram is the Gateway's **native conversational I/O surface**, not an MCP server or plugin. Inbound Telegram messages trigger `agent.invoke()`; outbound responses stream directly back to the same chat. This is the Agent's stdin/stdout.
*   Integrated via grammY (TypeScript Telegram Bot framework). grammY handles Telegram protocol concerns; LangChain middleware handles agent safety concerns. Clean separation.
*   All other external services (Slack, Discord, email, calendars) are **secondary channels**, accessed as MCP servers via `@langchain/mcp-adapters`. The Agent explicitly calls tools to reach them; they go through the full `wrapToolCall` policy pipeline.
*   Refined `deliver_output` scope: gates all file delivery (including to Telegram) and messages to secondary channels. Plain text responses to the Primary Channel do not go through `deliver_output` — but outbound content scanning (credential leaks, PII) still applies via the `afterModel` hook.

**Session Lifecycle:**
*   Each calendar day is a new LangGraph thread, identified by a date-based `thread_id`. Same day = same thread; new day = fresh context with memory injection.
*   `afterAgent` fires once per `invoke()` call (per user message + agent response cycle), so memory extraction is incremental — not dependent on session boundaries.
*   Built-in `summarizationMiddleware` compresses older messages within a thread when context exceeds a configured token threshold.

**Message Persistence Layer:**
*   Added a logger middleware that writes every message (user, assistant, tool) to a structured `messages` table in the SQLite database, tagged with thread ID and timestamp.
*   Added `search_history` tool enabling cross-thread recall ("What did we discuss about X last week?"). Three temporal layers: checkpointer (within-thread), message log (cross-thread), memory bank (semantic long-term).

**MCP Server Lifecycle:**
*   MCP servers are declared in a host-level config file, initialized at Gateway startup via `MultiServerMCPClient` from `@langchain/mcp-adapters`. Tools are injected dynamically via `wrapModelCall` middleware.
*   `stdio` transport MCP servers run as child processes of the Gateway on the host network. `http` transport MCP servers are external services the Gateway connects to. The sandbox never makes external connections — the Gateway mediates.
*   MCP tool failures return structured errors via `wrapToolCall`, same pattern as any other tool failure. No special recovery mechanism.

**Human-in-the-Loop via Telegram:**
*   Approval requests are delivered as Telegram messages with **inline keyboards** (Approve/Reject buttons). Owner taps a button → callback query → grammY handles it → Gateway resumes the interrupted LangGraph thread.
*   Configurable timeout per operation type. Owner-configurable approval gates with sensible defaults.

**Network Policy Granularity:**
*   Three-level scoping: **instance-level allowlist** (Owner-configured base domains), **skill-declared domains** (via the AgentSkills.io `compatibility` frontmatter field), and **runtime enforcement** (per-container dynamic firewall rules managed by Layer 0).
*   Platform skills auto-approved for network access; Community skills require explicit Owner approval. Default is offline.

**Observability:**
*   Logger middleware writes structured JSON records to a `logs` table in the SQLite database, instrumenting all middleware lifecycle hooks. This is the durable audit trail, replacing the in-memory private state fields from v0.4.0.

**ACE Removal:**
*   Removed all references to ACE (Zhang et al. 2025). ACE's operational knowledge model (playbooks, strategies, heuristics) is out of scope. RMM alone handles memory as a plug-and-play middleware component. ACE may be reintroduced as a separate middleware in a future version if warranted.

**Simplification:**
*   Removed the Gateway Implementation Sketch (Section 6). Replaced with an architectural description of middleware composition order and responsibilities. The architecture document describes *what* and *why*, not *how* at the code level.
*   Removed concrete TypeScript code blocks and zod schema definitions. Runtime context is described in prose. Implementation details belong in code, not architecture.
*   Renamed Section 6 to "Middleware Composition" — describes the middleware stack order, responsibilities, and registered tools without code.

**Directory Structure Updates:**
*   Added `gateway/telegram/` for grammY integration, `gateway/mcp/` for MCP client initialization, and `system/secrets/` for host-level credential storage.
*   Updated skill tier labels from "Operator-audited" to "Project-audited" and "User-uploaded" to "Owner-uploaded."

### v0.4.0 — 2026-02-01

Middleware-managed memory replaces agent-managed memory. This is the largest single-concept change since v0.1.0. The 4-layer model remains unchanged; the change moves memory from Layer 1 (filesystem zone) to Layer 3 (Gateway middleware), informed by two research papers and one production deployment.

**Memory Architecture Overhaul:**
*   Replaced the v0.3.0 agent-managed memory model (`/sandbox/memory/` zone + `memory_write` tool) with **middleware-managed memory** inspired by:
    *   **RMM** (Tan et al. 2025, ACL) — topic-based memory with prospective reflection (extraction + consolidation at session end) and retrospective reflection (RL-refined retrieval via citation signals). Now productionized as Google Cloud Vertex AI Agent Engine Memory Bank.
    *   **ACE** (Zhang et al. 2025, Stanford/SambaNova) — evolving "playbooks" of strategies and heuristics refined through a Generator → Reflector → Curator cycle.
*   RMM and ACE serve complementary purposes: RMM manages **personal knowledge** (user preferences, facts, history), ACE manages **operational knowledge** (task strategies, failure modes, procedural heuristics). Both implementable as LangChain.js v1 middleware.
*   The Agent no longer has a memory write tool. Memory extraction happens automatically in `afterAgent` middleware; retrieval and injection happen in `beforeModel` middleware. The Agent receives memories as context but cannot influence what gets stored.

**Write Path (Prospective Reflection):**
*   At session end, `afterAgent` middleware extracts topic-based memory entries from the conversation transcript via LLM call. Configurable **memory topics** control what information is considered worth persisting.
*   Extracted memories are consolidated against existing bank entries via embedding similarity — the LLM determines whether to add (new topic), merge (updated info), or discard (redundant).
*   Contradictions are resolved in favor of the most recent session. Full revision history is maintained for audit.

**Read Path (Retrospective Reflection):**
*   `beforeModel` middleware retrieves Top-K memories via embedding similarity, optionally reranked to Top-M by a lightweight reranker.
*   The reranker can be trained online via REINFORCE using LLM citation behavior as reward signal: cited memories receive +1, uncited receive -1. This aligns retrieval with actual utility over time.
*   Retrieved memories are injected as a structured context block, alongside skill manifests and ephemeral state.

**Backing Store:**
*   Memory entries stored in the same SQLite database as the LangGraph checkpointer (dedicated `memories` table), with scope, topic summary, embeddings, source references, timestamps, and revision history.

**Filesystem Zone Changes:**
*   Removed `/sandbox/memory/` zone. Memory storage lives in the Gateway's SQLite database, outside the sandbox filesystem. The Agent has no filesystem access to memory storage.
*   Zone taxonomy reduced from six zones to five: Identity, Skills, Inputs, Work, Outputs.

**Security Model Change:**
*   Replaced constraint #7 ("gated memory writes") with "never expose a memory write tool to the Agent." The attack surface for memory poisoning is eliminated rather than mitigated — the Agent cannot write to memory by any mechanism.
*   Added core philosophy #8: "Middleware-Managed Memory."

**Implementation Sketch Updates:**
*   Added `memoryMiddleware` to the implementation sketch showing `beforeModel` (retrieval/injection) and `afterAgent` (extraction/consolidation) hooks.
*   Removed `memoryWriteTool` from the agent's tool list.
*   Added `gateway/memory/` module to the directory structure for extraction, consolidation, retrieval, and reranking logic.
*   Added `userId` and `memoryTopics` to `contextSchema`.

### v0.3.0 — 2026-02-01

Agent-facing UX, egress control, and operational hardening. The 4-layer model remains unchanged. Core philosophies extended with two new entries (Gated Egress, Minimal Tool Surface) that codify patterns implicit in the v0.2.0 design. These changes address how the Agent discovers capabilities, navigates its environment, delivers outputs, persists state, and understands failures.

**Filesystem Zone Taxonomy (Layer 1):**
*   Defined six named zones within the sandbox: Identity (read-only), Skills (read-only), Inputs (read-only), Work (read-write, ephemeral by default), Memory (read-free, write-gated, persistent), and Outputs (write-gated, delivery staging).
*   The container namespace is the access control boundary — no path-validation logic in application code. The Agent navigates zones with standard filesystem primitives (`ls`, `find`, `cat`, `grep`).
*   Work zone supports optional persistence via `persistWorkspace` flag in `contextSchema` for long-running projects.
*   Added dual directory structure documentation: Host (source repository) and Sandbox (what the Agent sees at runtime).

**Delivery Layer / Output Egress (Layer 3):**
*   Added `deliver_output` as a first-class egress chokepoint. All outbound communication (messages, files, responses) passes through `wrapToolCall` middleware.
*   Middleware scans outbound content for credential leaks, PII, and policy violations. Enforces per-channel rate limits. Routes sensitive deliveries to `humanInTheLoopMiddleware`.
*   The Agent's work directory is never directly visible to the user. Only content staged via `deliver_output` reaches the outside world.

**Persistent Memory (Layer 1 + Layer 3):** *(Superseded by v0.4.0 — middleware-managed memory)*
*   Added `/sandbox/memory/` zone backed by a persistent named volume. Inspired by OpenClaw's Markdown-based memory (human-readable, grep-friendly) but with gated writes.
*   Reads are unrestricted (standard filesystem primitives). Writes are gated through `memory_write` tool → `wrapToolCall` middleware for audit and validation.
*   Closes the OpenClaw vulnerability where prompt injection through a messaging channel could silently rewrite the Agent's memory files.

**Progressive Disclosure for Skills (Section 4):**
*   Adopted the AgentSkills.io three-tier loading model: Tier 1 (manifests always in context, ~100 words/skill), Tier 2 (SKILL.md body loaded via filesystem read on activation), Tier 3 (bundled resources loaded as needed).
*   Skill manifests (name + description from YAML frontmatter) are parsed at ingestion and injected via `beforeModel` middleware. Full skill instructions are never bulk-loaded into the system prompt.
*   Documented the full AgentSkills.io-compliant skill folder structure (SKILL.md, scripts/, references/, assets/).

**Tiered Skill Trust Model (Section 4):**
*   Replaced the flat "all skills are untrusted" model with three named trust tiers: Platform (operator-audited, lightweight isolation), User (uploaded by user, sidecar default), Community (third-party, always sidecar, strictest isolation).
*   Trust tier is recorded in `contextSchema` and enforced at dispatch time by `wrapToolCall` middleware.

**MCP vs. Skills Distinction (Layer 3):**
*   Explicitly documented Skills and MCP Servers as two orthogonal extension axes. Skills are local capability packages dispatched to sidecars/sandboxes. MCP Servers are remote service integrations dispatched to MCP endpoints. Both pass through the same `wrapToolCall` policy enforcement.

**Debuggable Denial Responses (All Layers):**
*   All policy denials now produce structured, attributable error messages. Layer 0 egress proxy returns `x-deny-reason` headers. Layer 2 policy middleware returns specific policy names and denied items. Layer 3 delivery validation returns content scan results.
*   Added denial response table mapping each layer to its error format.

**Tool Minimization Policy (Layer 3 / SOUL.md):**
*   Added guidance that the Agent should prefer answering from knowledge when possible. Unnecessary tool invocations expand attack surface, increase sandbox load, and bloat audit logs.

**Checkpointer Change:**
*   Switched from `MemorySaver` (in-memory) to `SqliteSaver` for durable state persistence across agent restarts.

**Security Constraints:**
*   Added constraints #7–#10: gated memory writes, gated output delivery, no silent denial failures, trust tier isolation consistency.

**Ephemeral Middleware State:**
*   Operational reminders (rate limit counters, active network policy, session info) are injected via ephemeral middleware state fields rather than system prompt mutation. Safety-critical instructions remain in SOUL.md (persistent, read-only).

### v0.2.0 — 2026-02-01

Architectural decisions refined through design review. No philosophical changes — the core mission and 4-layer model remain intact. Changes reflect implementation-level decisions.

**Gateway Technology Decision:**
*   Resolved from "Go/Rust/Python + LangChain" → **Bun + LangChain.js v1**. The `createAgent()` API from LangChain.js v1 is the canonical agent entry point, running on LangGraph under the hood. This is now a concrete technology choice, not an open question.

**`package_run` Tool (Fast Path for Tool Access):**
*   Added the `package_run` tool wrapping `nix shell nixpkgs#<packages> --command <cmd>`. This collapses the previous 7-step "Safe Mutation Loop" into a 5-step fast path for the 90% case (stateless CLI tools). No container rebuild, no restart — packages resolve from the Nix binary cache in seconds.
*   The previous full rebuild path is retained as the "Slow Path" for long-running services (databases, daemons) that cannot be handled ephemerally.
*   Added `cache.nixos.org` as a standing network exception in Layer 0/Layer 1 to enable binary cache fetches within the sandbox.

**Middleware as Layer 3 Implementation:**
*   All Gateway responsibilities (intent validation, context partitioning, dynamic tool discovery, audit logging) are now explicitly mapped to LangChain.js v1 middleware hooks (`wrapToolCall`, `beforeModel`, `wrapModelCall`, `afterModel`, etc.).
*   Added a Gateway Implementation Sketch (Section 6) showing the concrete middleware composition.
*   Added middleware lifecycle table to Layer 3 documentation.

**Observability Model:**
*   Clarified the two-tier observability story:
    *   **Agent-level (Layer 3):** Middleware covers the full audit trail — tool requests, policy decisions, args, results, durations, denied requests, session lifecycle. This is ~90% of observability needs.
    *   **Container-level (Layer 0):** Sub-process telemetry (network connections within allowed whitelists, filesystem writes, CPU/RAM saturation) lives at the host/container layer via cgroup metrics. This is standard ops, not an architectural gap.

**Skills Contract:**
*   Documented the explicit skill contract: what a skill folder must contain (`SKILL.md`), what it can contain (shell scripts with declared deps, static resources), and what gets rejected (arbitrary native extensions, unpinned dependencies, root access).
*   Added graduated isolation: sidecar containers for complex skills, lighter sandboxing (`nsjail`/`bubblewrap`) as an operator-level option for simple scripts.

**Context Partitioning Clarification:**
*   XML tag wrapping of skill instructions (`<external_skill>`) is now explicitly documented as **defense-in-depth only**, not a primary security boundary. The structural isolation (skills cannot access agent memory or host secrets) is the real protection.

**Security Constraints:**
*   Added constraint #6: "Never rely solely on prompt-level safety as a primary security boundary."

### v0.1.0 — Initial Draft

*   Established the 4-layer architecture (System, Runtime, Environment, Gateway).
*   Defined core philosophies: sandbox trust, immutability, ephemeral tooling, capability-based security, supply chain integrity.
*   Documented the Agent Skills ingestion lifecycle.
*   Defined the "Never" list for security constraints.

