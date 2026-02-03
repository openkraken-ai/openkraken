# ARCHITECTURE.md: The Foundation

## 1. Mission Statement

To build a **Deterministic, Security-First Agentic Runtime** that solves the architectural failures of the "OpenClaw" era.

We reject the "Probabilistic Safety" model (trusting the AI to follow rules) in favor of **"Deterministic Safety"** (physically preventing the AI from breaking rules). This system treats the Agent not as a user with a shell, but as a **Managed Sub-System** with strictly scoped capabilities.

### Deployment Model: Single-Tenant, Owner-Operated

This system is designed for **one person, one instance, one device.** There is no multi-user, no multi-tenant, no shared hosting. This assumption simplifies authentication, session management, concurrency, and resource allocation — and eliminates entire categories of complexity that do not serve the target use case.

### Cross-Platform Requirement

The system targets both **Linux** and **macOS** as first-class platforms. Platform-specific implementation details are isolated behind clear abstractions. The Agent experience is identical across platforms — the Agent has no awareness of which operating system it runs on.

### Terminology

Three roles appear throughout this document:

- **Project** — The framework itself, authored and maintained by us. The Project defines platform skills, default policies, security constraints, and the "Constitution" (`SOUL.md`, `SAFETY.md`). The Project is the authority on _how_ the system works.
- **Owner** — The person who installs and runs an instance. The Owner provisions credentials, configures integrations, uploads personal skills, and interacts with the Agent. In a single-tenant system, the Owner is the only human in the loop.
- **Agent** — The LLM-driven runtime operating inside the sandbox. A managed sub-system, not a peer.

The Owner trusts the Project (by choosing to install it). The Project trusts the Owner (by giving them full configuration authority). Neither trusts the Agent (which operates under deterministic constraints).

### What We're Responding To

OpenClaw (née Clawdbot → Moltbot) demonstrated that agentic AI works — and that the dominant architecture for it is fundamentally unsafe. Its specific failures inform every decision in this document:

- **Probabilistic Safety:** OpenClaw's safety relies on `AGENTS.md` directives — system prompt rules telling the LLM "don't do dangerous things." One prompt injection through any connected messaging channel can yield full shell access. We enforce safety at the sandbox and tool level, not the prompt level.
- **Localhost Trust / No Auth by Default:** OpenClaw auto-trusts connections from `127.0.0.1`. Behind any reverse proxy, all external traffic appears local. 1,800+ exposed instances were found on Shodan. We bind to `127.0.0.1` or Tailscale only, with no implicit trust model.
- **Flat Credential Storage:** API keys, OAuth tokens, and bot tokens stored in plaintext on the local filesystem, fully accessible to the agent. We isolate credentials on the host and never expose them to the sandbox.
- **Unaudited Memory Writes:** OpenClaw's Markdown-based memory is readable and writable by the agent with no gating. A prompt injection can silently rewrite the agent's long-term memory. We remove the agent from the memory write path entirely — memory extraction and consolidation are handled by middleware, not agent-initiated tool calls.
- **Uncontrolled Egress:** The agent can compose and send messages to any connected channel without content validation, rate limiting, or approval gates. We gate all outbound delivery through a single auditable egress chokepoint.
- **No Supply Chain Integrity:** 300+ contributors, a skills/plugin ecosystem pulling arbitrary code, no hermetic builds, no hash verification. We pin and hash everything via Nix.
- **No Network Isolation:** The agent inherits the host's full network access. We default to offline and whitelist explicitly via egress proxy.

### Scope Definition: What This Project Does

This project builds a **personal AI agent runtime** with the following bounded capabilities:

**Primary Capabilities:**
- **Conversational Interaction:** Bidirectional messaging via Telegram (primary) and MCP-connected services (secondary)
- **Terminal Execution:** Sandboxed command execution with on-demand package provisioning via Nix
- **File Operations:** Read/write access within scoped filesystem zones
- **Web Automation:** Browser automation via Vercel Agent Browser for form filling, navigation, and data extraction
- **Skill System:** Extensible capability bundles following AgentSkills.io format with LLM pre-analysis and Owner approval
- **Scheduled Tasks:** Cron-based task execution with full agent capabilities
- **Persistent Memory:** Three-tier recall system (checkpointer, message log, semantic memory) backed by SQLite

**Integration Boundaries:**
- **In Scope:** Telegram, MCP servers (Slack, Discord, email, calendar, custom services)
- **Out of Scope:** Direct WhatsApp integration (requires MCP bridge), native mobile notifications, voice interfaces

**Security Boundaries:**
- **Deterministic Enforcement:** All safety constraints are enforced architecturally, not probabilistically
- **Zero Trust:** No implicit trust for any input, network connection, or file access
- **Isolated Execution:** Agent operates inside sandbox; credentials never enter sandbox context

---

## 2. Core Philosophies

1.  **Trust the Sandbox, Not the Model:** Safety is enforced by the sandbox and tool-level validation, not by the System Prompt.

2.  **Immutability by Default:** The Agent's identity (`SOUL.md`) and core configuration are injected at runtime and cannot be modified by the Agent.

3.  **Ephemeral Tooling:** Packages are available on-demand via Nix and require no pre-installation or system modification.

4.  **Capability-Based Security:** Blacklists fail. We use strict whitelisting for network egress and file access.

5.  **Supply Chain Integrity:** System packages resolve from nixpkgs. Language-specific Skill dependencies are converted at ingestion time from standard lockfiles into Nix derivations. Native package managers are never invoked at runtime.

6.  **Gated Egress:** Network access from sandboxed processes passes through an egress proxy with domain allowlisting. Direct internet access is blocked.

7.  **Minimal Tool Surface:** Every tool invocation is attack surface. The Agent prefers answering from knowledge when possible and only invokes tools when the task requires execution, file access, or capabilities beyond training data.

8.  **Middleware-Managed Memory:** The Agent does not manage its own long-term memory. Memory extraction, consolidation, retrieval, and injection are handled by Gateway middleware — invisible to the Agent and immune to prompt injection.

9.  **Single-Tenant by Design:** The system serves one Owner per instance. This is not a limitation to be overcome later — it is a deliberate architectural decision that eliminates multi-tenancy complexity.

10. **Everything is Middleware:** Agent capabilities — scheduling, web search, sub-agent orchestration, memory, skills — are implemented as composable LangChain middleware. No privileged internal mechanisms exist that custom middleware cannot replicate.

11. **Nix-Native, Nix-Invisible:** The system leverages Nix for reproducibility, package management, and cross-platform configuration. However, Nix internals are never exposed to the Agent — packages simply become available when requested, with no awareness of the underlying mechanism.

12. **Tool-Level Isolation:** Different tools enforce security boundaries appropriate to their function. File operations use path validation; command execution uses process isolation; browser automation uses isolated browser profiles.

13. **Identity Injection:** The Agent's core identity (`SOUL.md`) is never materialized as a file within the sandbox. It is injected directly into the system prompt by the Gateway. This prevents exfiltration of the "Constitution" via file copy operations.

14. **Durable State Persistence:** Agent state survives Gateway restarts via LangGraph SqliteCheckpointer. Session continuity is an architectural guarantee, not an in-memory optimization.

---

## 3. The 3-Layer Architecture

### Layer 0: The Host (The Bedrock)

**Technology:** Nix Flakes (Universal).

**Role:** The host system that runs the Gateway, manages credentials, supervises processes, and provides the egress proxy. It runs on any modern Linux distribution or macOS, provided Nix is installed.

**Responsibilities:**

- **Identity Injection:** Stores the core `SOUL.md` and `SAFETY.md` files on the secure Host filesystem. These are **never** exposed to the sandbox filesystem. The Gateway reads them and injects their content directly into the Agent's system prompt at runtime.

- **Credential Storage:** API keys, bot tokens, and OAuth credentials live on the host filesystem, outside the sandbox. The Gateway process receives credentials via environment variables at startup. Credentials never enter the sandbox filesystem or the Agent's context.

- **Egress Proxy:** Runs a domain-filtering HTTP CONNECT proxy (Go or Rust) bound to localhost. All network egress from sandboxed processes routes through this proxy. The proxy maintains an allowlist of permitted domains, returns structured JSON errors for denied requests, and logs all access attempts.

- **Process Supervision:** The Gateway manages the lifecycle of agent processes directly. It does not rely on system-level init systems (like systemd) for agent execution, allowing the entire stack to run as a user-space application via `nix run`.

- **Timer Management:** Hosts scheduled task execution. The Gateway registers jobs; Layer 0 executes them via system timers or a dedicated scheduler process. When a scheduled task fires, it triggers the Gateway, which then invokes the Agent through the normal execution path. Scheduled tasks receive the same isolation as interactive tasks.

- **Network Binding:** The Gateway binds to `127.0.0.1` or a Tailscale interface only. This is the sole access control mechanism — in a single-tenant deployment, network reachability equals authorization. The Gateway never binds to `0.0.0.0`.

- **Filesystem Zones:** Provides the directory structure that forms the sandbox filesystem. The host maintains the actual directories, which are exposed at `/sandbox/` paths through symlinks or bind-mounts.

### Layer 1: The Sandbox (The Isolation)

**Technology:** `bubblewrap` (bwrap) on Linux, `sandbox-exec` on macOS.

**Role:** Provides filesystem isolation and process isolation for command execution.

The sandbox is not a container in the Docker/Podman sense. We use lightweight, OS-native sandboxing mechanisms that provide process isolation without the overhead of full containerization.

**Responsibilities:**

- **Filesystem Boundary:** The Agent sees a filesystem rooted at `/sandbox/` with named zones. Each zone has defined permissions — some read-only, some read-write.

- **Process Isolation:** Command execution runs in isolated processes with restricted filesystem views, no direct network access, and limited capabilities.

- **Network Isolation:** Sandboxed processes cannot access the internet directly. They receive proxy configuration (`HTTP_PROXY`, `HTTPS_PROXY`) pointing to the Layer 0 egress proxy.

- **Resource Limits:** Enforced via cgroups (Linux) or `ulimit` (macOS).

**Filesystem Zone Taxonomy:**

The Agent's filesystem is partitioned into named zones with distinct permissions. Note that `Identity` is notably absent from the filesystem — identity is injected via prompt, not filesystem.

| Zone     | Path                 | Permissions | Persistence           | Purpose                                   |
| -------- | -------------------- | ----------- | --------------------- | ----------------------------------------- |
| Skills   | `/sandbox/skills/`   | Read-Only   | Immutable per session | Skill folders organized by trust tier     |
| Inputs   | `/sandbox/inputs/`   | Read-Only   | Per-session           | User-provided files, channel attachments  |
| Work     | `/sandbox/work/`     | Read-Write  | Per-session           | Scratch space, intermediate files         |
| Outputs  | `/sandbox/outputs/`  | Read-Write  | Per-session           | Delivery staging area                     |

The Work and Outputs zones are cleared at session boundaries. Identity is injected via Prompt. Memory is managed by Middleware/SQLite. Browser state is isolated per session via Agent Browser profiles.

### Layer 2: The Gateway (The Brain)

**Technology:** Bun + LangChain.js v1, grammY for Telegram integration. Database: **SQLite**.

**Role:** The orchestration layer that runs the Agent loop, dispatches tools, enforces policies, and manages state.

**Responsibilities:**

- **Agent Orchestration:** Uses the LangChain.js v1 `createAgent()` API as the canonical entry point. The agent loop, tool dispatch, and state management are handled by LangGraph. All agent capabilities are implemented as middleware — there are no privileged internal mechanisms.

- **Primary Channel (Telegram):** Telegram is the Gateway's native conversational I/O surface. The Gateway uses grammY for Telegram protocol handling. Responses are not streamed — complete responses are scanned for credential leaks and PII before delivery.

- **Secondary Channels (MCP Servers):** All other external services — Slack, Discord, email, calendars — are accessed as MCP servers via the LangChain MCP adapter. The Agent explicitly calls tools to reach them. These go through the full policy middleware stack.

- **Session Lifecycle:** A session spans one calendar day, identified by a date-based thread ID. Same day means same session with continuous context. New day means fresh context with memory injection. Terminal sessions are bound to this lifecycle and are destroyed at session boundaries.

- **Durable State:** LangGraph `SqliteCheckpointer` persists agent state across Gateway restarts. The checkpointer stores conversation state, tool call sequences, and checkpoint metadata in SQLite.

- **Tool Dispatch:** The Gateway dispatches tool calls to appropriate handlers based on tool type.

- **Memory Middleware:** Three-tier recall system:
  - **Checkpointer:** Within-session state persistence (LangGraph SqliteCheckpointer)
  - **Message Log:** Cross-session message storage and retrieval (SQLite `messages` table)
  - **Memory Bank:** Semantic long-term memory with embedding-based retrieval (SQLite `memories` table)

- **Content Scanning:** The `afterModel` hook scans all outbound content for credential leaks, PII, and policy violations before delivery to any channel.

---

## 4. Tool Architecture

The Agent interacts with the system through a defined set of tools. These tools mirror the capabilities available in Claude.ai's computer use environment.

### Tool Isolation Model

**Path Validation** is used for file operations. These tools validate that all paths resolve to locations within `/sandbox/` and respect zone permissions.

**Process Isolation** is used for command execution. The terminal tool wraps commands in OS-native sandboxing.

**Gateway Mediation** is used for network operations. Web search and fetch tools are implemented as Gateway HTTP calls using Gateway-held credentials.

**Browser Isolation** is used for web automation. The Agent Browser tool runs in isolated browser profiles with restricted capabilities and network routing through the egress proxy.

### File Tools

**view** reads file contents or lists directory contents. Paths must be under `/sandbox/`.

**create_file** creates a new file or overwrites an existing file. Paths must be under `/sandbox/work/` or `/sandbox/outputs/`.

**str_replace** replaces a unique string in an existing file. Paths must be under writable zones.

### Terminal Tool

The terminal tool provides command execution with session management.

For execution, the tool accepts a command string, an optional packages array specifying packages to make available.

Packages specified in the array become available in the session without the Agent needing to understand how. The underlying mechanism uses Nix to provide these packages.

### Browser Tool

The browser tool provides web automation via Vercel Agent Browser. The tool accepts actions: `open` (navigate to URL), `snapshot` (capture page state), `click` (interact with elements), `type` (input text), `screenshot`, and `get_html`.

Browser sessions are isolated per conversation thread. Each session uses a unique browser profile to prevent state leakage between conversations.

Network requests made by the browser are routed through the egress proxy, enforcing domain allowlists.

### Network Tools

Web search, code search, and web fetch are implemented as Gateway-mediated HTTP calls.

### Delivery Tool

The delivery tool sends files from the outputs zone to channels. It validates that the source path is under `/sandbox/outputs/`.

---

## 5. Handling Agent Skills

Skills are self-contained capability packages following the AgentSkills.io format.

### Skill Structure

A skill is a folder containing a required `SKILL.md` file. It may optionally include a `scripts/` directory with executables.

### How Skills Work

The Agent reads skill instructions using the `view` tool, follows those instructions, and executes any referenced scripts using the `terminal` tool.

### Skill Script Pre-Analysis

When a skill containing scripts is ingested, a lightweight LLM (Haiku-class) analyzes each script to extract its requirements and assess risk. This analysis identifies required interpreters, required system packages, and whether network access is needed.

### Tiered Trust Model

**Platform skills** are shipped with the system.
**User skills** are uploaded by the Owner.
**Community skills** come from third-party registries.

---

## 6. Egress Proxy Architecture

All network access from sandboxed processes routes through a local HTTP CONNECT proxy running on Layer 0.

### How It Works

The proxy listens on localhost and accepts HTTP CONNECT requests. It checks the destination domain against the current allowlist.

### Allowlist Management

The allowlist operates in tiers. The Gateway updates the proxy's allowlist before skill script execution and resets to baseline afterward.

### Structured Errors

When the proxy denies a request, it returns a JSON response containing the error type, the denied domain, and the policy that caused the denial.

---

## 7. Platform Abstractions

The architecture supports both Linux and macOS through clear abstractions.

### Process Isolation

On Linux, process isolation uses `bubblewrap`. On macOS, process isolation uses `sandbox-exec` (Seatbelt).

### Process Supervision

The Gateway is the process supervisor. It manages child processes directly, ensuring they are terminated when the session ends or the Gateway shuts down.

### Resource Limits

On Linux, cgroups provide hard limits on CPU, memory, and process count. On macOS, these mechanisms are not available; soft limits via `ulimit` and process timeout provide partial coverage. This is an accepted limitation — in a single-tenant system, the consequence of resource exhaustion is the Owner's own machine becoming slow, not a security boundary violation.

### Filesystem Zones

Both platforms support the same zone taxonomy.

### Browser Automation

Vercel Agent Browser provides cross-platform browser automation. The Gateway wraps Agent Browser commands with appropriate isolation and network policy enforcement.

---

## 8. Middleware Composition

The Gateway composes multiple LangChain.js middleware in a defined order. The ordering matters — earlier middleware runs first for `before*` hooks and last for `after*` hooks.

The middleware stack, in order:

1.  **Logger Middleware** — Instruments all hooks, writes structured records to SQLite. Must be outermost to capture everything.

2.  **Policy Middleware** — Validates terminal package requests, gates delivery with content scanning, enforces rate limits.

3.  **Cron Middleware** — Detects scheduled task triggers.

4.  **Web Search Middleware** — Provides web search tools.

5.  **Browser Middleware** — Provides browser automation tools via Agent Browser, manages browser session isolation.

6.  **Memory Middleware** — Retrieves relevant memories before model calls, extracts and consolidates memories after agent completion. Manages three-tier recall: checkpointer (state), message log (conversation history), memory bank (semantic).

7.  **Skill Loader Middleware** — Injects skill manifests.

8.  **Sub-Agent Middleware** — Provides task delegation.

9.  **Summarization Middleware** — Compresses older messages.

10. **Human-in-the-Loop Middleware** — Interrupts on configured operations.

---

## 9. Data Flow

### Interactive Path

When the Owner sends a message via Telegram, grammY receives the update. The Gateway computes the day-based thread ID and invokes the agent. **The `SOUL.md` identity is injected into the system prompt.** The Agent processes the request.

### Scheduled Path

When a scheduled task fires, the Gateway invokes the Agent with the scheduled task.

### Terminal Execution Path

When the Agent calls the terminal tool, the Gateway executes the command inside the sandbox.

### Browser Execution Path

When the Agent calls the browser tool, the Gateway invokes Agent Browser with the appropriate action. Browser network traffic routes through the egress proxy.

### Skill Execution Path

When the Agent executes skill scripts, the Gateway detects the skill context and updates the proxy allowlist.

---

## 10. Directory Structure

### Host (Source Repository)

The repository is organized by layer:

- `system/`: Layer 0 host configuration (flake definition, service configs)
- `runtime/`: Layer 1 sandbox configuration (bubblewrap profiles)
- `gateway/`: Layer 2 Gateway implementation (Bun/TS code)
- `skills/`: Ingested skills
- `identity/`: The Constitution: `SOUL.md` and `SAFETY.md`. **(Host Only)**

### Sandbox (What the Agent Sees)

The Agent sees a filesystem rooted at `/sandbox/` containing four zones: skills (read-only), inputs (read-only), work (read-write), and outputs (read-write). **Identity is not present.**

---

## 11. Security Constraints (The "Never" List)

1.  **Never** run terminal sessions as root inside the sandbox.
2.  **Never** mount credentials into the sandbox or expose them in the Agent's context.
3.  **Never** mount `identity/` files into the sandbox. Identity is injected via prompt only.
4.  **Never** bypass path validation for file operations.
5.  **Never** allow direct network access from the sandbox — all egress routes through the proxy.
6.  **Never** bind the Gateway to `0.0.0.0`.
7.  **Never** persist terminal sessions across Gateway restarts.
8.  **Never** expose Nix internals to the Agent — packages appear available without explanation.
9.  **Never** trust path input without resolution and validation.
10. **Never** return silent failures.
11. **Never** allow the Agent to directly read or write memory storage.
12. **Never** execute skill scripts without prior LLM analysis and Owner approval.
13. **Never** allow browser automation without egress proxy enforcement.
14. **Never** share browser profiles between conversations.
