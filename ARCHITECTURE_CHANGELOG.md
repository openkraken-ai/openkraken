## Changelog

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

