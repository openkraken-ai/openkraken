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

---

## 2. Core Philosophies

1.  **Trust the Sandbox, Not the Model:** Safety is enforced by the sandbox and tool-level validation, not by the System Prompt.

2.  **Immutability by Default:** The Agent's identity (`SOUL.md`) and core configuration are read-only.

3.  **Ephemeral Tooling:** Packages are available on-demand via Nix and require no pre-installation or system modification.

4.  **Capability-Based Security:** Blacklists fail. We use strict whitelisting for network egress and file access.

5.  **Supply Chain Integrity:** System packages resolve from nixpkgs. Language-specific Skill dependencies are converted at ingestion time from standard lockfiles into Nix derivations. Native package managers are never invoked at runtime.

6.  **Gated Egress:** Network access from sandboxed processes passes through an egress proxy with domain allowlisting. Direct internet access is blocked.

7.  **Minimal Tool Surface:** Every tool invocation is attack surface. The Agent prefers answering from knowledge when possible and only invokes tools when the task requires execution, file access, or capabilities beyond training data.

8.  **Middleware-Managed Memory:** The Agent does not manage its own long-term memory. Memory extraction, consolidation, retrieval, and injection are handled by Gateway middleware — invisible to the Agent and immune to prompt injection.

9.  **Single-Tenant by Design:** The system serves one Owner per instance. This is not a limitation to be overcome later — it is a deliberate architectural decision that eliminates multi-tenancy complexity.

10. **Everything is Middleware:** Agent capabilities — scheduling, web search, sub-agent orchestration, memory, skills — are implemented as composable LangChain middleware. No privileged internal mechanisms exist that custom middleware cannot replicate.

11. **Nix-Native, Nix-Invisible:** The system leverages Nix for reproducibility, package management, and cross-platform configuration. However, Nix internals are never exposed to the Agent — packages simply become available when requested, with no awareness of the underlying mechanism.

12. **Tool-Level Isolation:** Different tools enforce security boundaries appropriate to their function. File operations use path validation; command execution uses process isolation. Not everything requires the same isolation mechanism.

---

## 3. The 3-Layer Architecture

### Layer 0: The Host (The Bedrock)

**Technology:** Nix Flakes with NixOS (Linux) or nix-darwin (macOS).

**Role:** The host system that runs the Gateway, manages credentials, supervises processes, and provides the egress proxy.

**Responsibilities:**

- **Identity Storage:** Stores the core `SOUL.md` and `SAFETY.md` files, exposed to the sandbox as read-only. These files constitute the Agent's "Constitution" and cannot be modified by the Agent.

- **Credential Storage:** API keys, bot tokens, and OAuth credentials live on the host filesystem, outside the sandbox. The Gateway process receives credentials via environment variables at startup. Credentials never enter the sandbox filesystem or the Agent's context. For the MVP, credentials are stored in a simple environment file with restricted permissions; future versions may integrate with platform keychains.

- **Egress Proxy:** Runs a domain-filtering HTTP CONNECT proxy implemented in Go. All network egress from sandboxed processes routes through this proxy. The proxy maintains an allowlist of permitted domains, returns structured JSON errors for denied requests, and logs all access attempts. Direct internet access from the sandbox is blocked at the network level.

- **Process Supervision:** Manages the lifecycle of the Gateway and proxy processes using platform-native mechanisms — systemd on Linux, launchd on macOS — configured through Nix abstractions. This provides automatic restart on failure and proper startup ordering.

- **Timer Management:** Hosts scheduled task execution. The Gateway registers jobs; Layer 0 executes them via system timers. When a scheduled task fires, it triggers the Gateway, which then invokes the Agent through the normal execution path. Scheduled tasks receive the same isolation as interactive tasks.

- **Network Binding:** The Gateway binds to `127.0.0.1` or a Tailscale interface only. This is the sole access control mechanism — in a single-tenant deployment, network reachability equals authorization. The Gateway never binds to `0.0.0.0`.

- **Filesystem Zones:** Provides the directory structure that forms the sandbox filesystem. The host maintains the actual directories, which are exposed at `/sandbox/` paths through symlinks or bind-mounts depending on platform capabilities.

### Layer 1: The Sandbox (The Isolation)

**Technology:** bubblewrap on Linux, sandbox-exec on macOS.

**Role:** Provides filesystem isolation and process isolation for command execution.

The sandbox is not a container in the Docker/Podman sense. We use lightweight, OS-native sandboxing mechanisms that provide process isolation without the overhead of full containerization. On Linux, bubblewrap uses namespaces to create isolated process environments. On macOS, sandbox-exec (Seatbelt) uses the same mechanism that sandboxes App Store applications.

**Responsibilities:**

- **Filesystem Boundary:** The Agent sees a filesystem rooted at `/sandbox/` with named zones. Each zone has defined permissions — some read-only, some read-write. Tools enforce access to this boundary appropriately based on their function.

- **Process Isolation:** Command execution runs in isolated processes with restricted filesystem views, no direct network access, and limited capabilities. The isolation mechanism is invisible to the Agent — commands simply execute in a restricted environment.

- **Network Isolation:** Sandboxed processes cannot access the internet directly. They receive proxy configuration through environment variables, routing all HTTP/HTTPS traffic through the Layer 0 egress proxy. The proxy enforces domain allowlists and provides structured error responses for denied requests.

- **Resource Limits:** On Linux, resource limits (CPU, memory, process count) are enforced via cgroups. On macOS, soft limits via ulimit and timeout are used. Hard cgroup-style limits are not available on macOS — this is an accepted platform limitation appropriate for single-tenant deployment where the risk is self-inflicted denial of service.

**Filesystem Zone Taxonomy:**

The Agent's filesystem is partitioned into named zones with distinct permissions:

| Zone     | Path                 | Permissions | Persistence           | Purpose                                   |
| -------- | -------------------- | ----------- | --------------------- | ----------------------------------------- |
| Identity | `/sandbox/identity/` | Read-Only   | Immutable             | `SOUL.md`, `SAFETY.md` — the Constitution |
| Skills   | `/sandbox/skills/`   | Read-Only   | Immutable per session | Skill folders organized by trust tier     |
| Inputs   | `/sandbox/inputs/`   | Read-Only   | Per-session           | User-provided files, channel attachments  |
| Work     | `/sandbox/work/`     | Read-Write  | Per-session           | Scratch space, intermediate files         |
| Outputs  | `/sandbox/outputs/`  | Read-Write  | Per-session           | Delivery staging area                     |

The Work and Outputs zones are cleared at session boundaries. Long-term memory is not a filesystem zone — it is managed by Gateway middleware and stored in the Gateway's database, invisible to the Agent as a storage concern.

### Layer 2: The Gateway (The Brain)

**Technology:** Bun + LangChain.js v1, grammY for Telegram integration.

**Role:** The orchestration layer that runs the Agent loop, dispatches tools, enforces policies, and manages state.

**Responsibilities:**

- **Agent Orchestration:** Uses the LangChain.js v1 `createAgent()` API as the canonical entry point. The agent loop, tool dispatch, and state management are handled by LangGraph. All agent capabilities are implemented as middleware — there are no privileged internal mechanisms.

- **Primary Channel (Telegram):** Telegram is the Gateway's native conversational I/O surface. Inbound messages trigger agent invocation; outbound responses are sent back after full completion and content scanning. The Gateway uses grammY for Telegram protocol handling, with LangChain middleware handling safety concerns. Responses are not streamed — complete responses are scanned for credential leaks and PII before delivery.

- **Secondary Channels (MCP Servers):** All other external services — Slack, Discord, email, calendars — are accessed as MCP servers via the LangChain MCP adapter. The Agent explicitly calls tools to reach them. These go through the full policy middleware stack.

- **Session Lifecycle:** A session spans one calendar day, identified by a date-based thread ID. Same day means same session with continuous context. New day means fresh context with memory injection. Terminal sessions are bound to this lifecycle and are destroyed at session boundaries.

- **Tool Dispatch:** The Gateway dispatches tool calls to appropriate handlers based on tool type. File tools perform path validation and direct I/O. The terminal tool invokes the sandbox for process isolation. Network tools are mediated by the Gateway itself, which makes HTTP calls using its own credentials. Delivery tools validate paths and dispatch to channels.

- **Memory Middleware:** Extracts memories from conversations after each exchange, retrieves relevant memories before model calls, and handles consolidation. The Agent receives memories as injected context but never directly reads or writes memory storage.

- **Content Scanning:** The `afterModel` hook scans all outbound content for credential leaks, PII, and policy violations before delivery to any channel.

---

## 4. Tool Architecture

The Agent interacts with the system through a defined set of tools. These tools mirror the capabilities available in Claude.ai's computer use environment, providing a familiar interface. The Agent has no knowledge of underlying implementation details such as Nix, bubblewrap, or proxy configuration.

### Tool Isolation Model

Different tools enforce security boundaries in ways appropriate to their function:

**Path Validation** is used for file operations. These tools validate that all paths resolve to locations within `/sandbox/` and respect zone permissions (read-only vs read-write). No process isolation is needed because the Gateway performs the I/O directly — there is no untrusted code execution.

**Process Isolation** is used for command execution. The terminal tool wraps commands in OS-native sandboxing (bubblewrap or sandbox-exec) that restricts filesystem access, blocks direct network access, and limits capabilities. This is necessary because executed commands could attempt to escape path validation, access sensitive files, or make unauthorized network connections.

**Gateway Mediation** is used for network operations. Web search and fetch tools are implemented as Gateway HTTP calls using Gateway-held credentials. The Agent never makes network requests directly — the Gateway acts as a proxy for these operations.

### File Tools

The file tools provide the same interface as Claude.ai's computer use environment:

**view** reads file contents or lists directory contents. It accepts a path and optional line range for partial file viewing. Paths must be under `/sandbox/`. The tool works on all zones.

**create_file** creates a new file or overwrites an existing file. Paths must be under `/sandbox/work/` or `/sandbox/outputs/`. Parent directories are created if needed.

**str_replace** replaces a unique string in an existing file. The old string must appear exactly once. Paths must be under writable zones.

### Terminal Tool

The terminal tool provides command execution with session management. Unlike a simple exec tool, it maintains persistent sessions that survive across tool calls within a day, allowing for stateful workflows and background processes.

The tool accepts an action parameter that defaults to "execute" but can also be "view" (to check output from a background process) or "kill" (to terminate a process or session).

For execution, the tool accepts a command string, an optional packages array specifying packages to make available, an optional session ID to reuse an existing session, a background flag for non-blocking execution, and a timeout value.

Packages specified in the array become available in the session without the Agent needing to understand how. The underlying mechanism uses Nix to provide these packages, but this is invisible to the Agent. If the Agent requests packages on an existing session, those packages are added to the session.

Sessions are created implicitly when executing without a session ID. They persist across tool calls within a calendar day and are destroyed at session boundaries, on explicit kill, or on Gateway restart.

Network policy for terminal sessions defaults to offline. During skill script execution, the Gateway adjusts the proxy allowlist to include the skill's approved domains.

### Network Tools

Web search, code search, and web fetch are implemented as Gateway-mediated HTTP calls. The Gateway makes requests to external APIs (Exa for search) using its own credentials. The Agent receives results but never makes network requests directly. This provides a clean security boundary — network access for these tools is not subject to sandbox restrictions because the sandbox is not involved.

### Delivery Tool

The delivery tool sends files from the outputs zone to channels. It validates that the source path is under `/sandbox/outputs/`, scans content for policy violations, and dispatches to the target channel. All deliveries pass through the `wrapToolCall` middleware for logging, rate limiting, and optional approval gates.

---

## 5. Handling Agent Skills

Skills are self-contained capability packages following the AgentSkills.io format. They teach the Agent how to accomplish specific tasks and may include executable scripts.

### Skill Structure

A skill is a folder containing a required `SKILL.md` file with YAML frontmatter (name, description) and markdown body (instructions). It may optionally include a `scripts/` directory with executables, a `references/` directory with documentation, and an `assets/` directory with templates or other resources.

### How Skills Work

Skills are not invoked through a special mechanism. The Agent reads skill instructions using the `view` tool, follows those instructions, and executes any referenced scripts using the `terminal` tool. This unified approach means skills use the same tools as any other Agent task.

### Skill Script Pre-Analysis

When a skill containing scripts is ingested, a lightweight LLM (Haiku-class) analyzes each script to extract its requirements and assess risk. This analysis identifies required interpreters, required system packages, whether network access is needed and to which domains, file access patterns, and an overall risk assessment.

This pre-analysis serves as an additional security layer and simplifies capability handling. Rather than relying on fragile regex parsing of the AgentSkills.io `compatibility` field, the LLM reads the actual script content and understands what it does. The analysis is presented to the Owner for review before the skill is approved.

The stored analysis feeds into runtime policy enforcement. When the Agent executes a skill script, the Gateway knows which packages to provision and which domains to allow through the proxy.

### Tiered Trust Model

Skills are organized by trust tier, which determines the approval workflow:

**Platform skills** are shipped with the system and audited by the Project. They are pre-analyzed and pre-approved, requiring no Owner action.

**User skills** are uploaded by the Owner. They are analyzed by the lightweight LLM at ingestion time, and the Owner reviews and approves the analysis before the skill becomes available.

**Community skills** come from third-party registries. They receive the same LLM analysis and require Owner approval. Network access is restricted by default for community skills.

All tiers use the same sandbox mechanism at runtime. The trust tier affects the approval workflow, not the isolation level.

---

## 6. Egress Proxy Architecture

All network access from sandboxed processes routes through a local HTTP CONNECT proxy running on Layer 0. This provides domain-based filtering without requiring complex network namespace configuration or platform-specific firewall rules.

### How It Works

The proxy listens on localhost and accepts HTTP CONNECT requests from sandboxed processes. When a request arrives, the proxy extracts the destination domain and checks it against the current allowlist. If the domain is allowed, the proxy establishes a tunnel and passes traffic through. If denied, the proxy returns a structured JSON error explaining which policy denied the request and what domains are allowed.

Sandboxed processes receive proxy configuration through environment variables. Tools that respect standard proxy configuration automatically route through the proxy. The sandbox blocks direct internet access, so tools that ignore proxy configuration simply fail to connect.

### Allowlist Management

The allowlist operates in tiers. The baseline tier includes domains always allowed: the Nix binary cache and the LLM API endpoint. The instance tier includes additional domains configured by the Owner for their specific needs. The skill tier includes domains approved for specific skills, activated only during that skill's script execution.

The Gateway updates the proxy's allowlist before skill script execution and resets to baseline afterward. This provides fine-grained network control without requiring per-process network namespaces.

### Structured Errors

When the proxy denies a request, it returns a JSON response containing the error type, the denied domain, the policy that caused the denial, and the list of currently allowed domains. This enables the Agent to understand why a request failed and potentially suggest remediation to the user.

---

## 7. Platform Abstractions

The architecture supports both Linux and macOS through clear abstractions that hide platform differences from both the Agent and most of the Gateway code.

### Process Isolation

On Linux, process isolation uses bubblewrap, which leverages Linux namespaces to create isolated environments. On macOS, process isolation uses sandbox-exec (Seatbelt), the same mechanism used by App Store applications. Both provide filesystem restriction, process isolation, and network control. The terminal tool abstracts over these differences.

### Process Supervision

On Linux, systemd manages process lifecycle. On macOS, launchd serves the same role. Nix configuration abstracts this — the same logical service definition produces appropriate systemd units or launchd plists depending on platform.

### Resource Limits

On Linux, cgroups provide hard limits on CPU, memory, and process count. On macOS, these mechanisms are not available; soft limits via ulimit and process timeout provide partial coverage. This is an accepted limitation — in a single-tenant system, the consequence of resource exhaustion is the Owner's own machine becoming slow, not a security boundary violation.

### Filesystem Zones

Both platforms support the same zone taxonomy. Implementation differs slightly — Linux can use bind mounts while macOS may use symlinks — but the Agent sees identical paths with identical permissions.

---

## 8. Middleware Composition

The Gateway composes multiple LangChain.js middleware in a defined order. The ordering matters — earlier middleware runs first for `before*` hooks and last for `after*` hooks.

The middleware stack, in order:

1.  **Logger Middleware** — Instruments all hooks, writes structured records to SQLite. Must be outermost to capture everything.

2.  **Policy Middleware** — Validates terminal package requests against the policy registry, gates delivery with content scanning, enforces rate limits.

3.  **Cron Middleware** — Detects scheduled task triggers, injects job metadata, provides the schedule tool.

4.  **Web Search Middleware** — Provides web search, code search, and web fetch tools via Gateway-mediated HTTP calls.

5.  **Memory Middleware** — Retrieves relevant memories before model calls, extracts and consolidates memories after agent completion.

6.  **Skill Loader Middleware** — Injects skill manifests into context, manages network policy during skill execution.

7.  **Sub-Agent Middleware** — Provides the task delegation tool, manages sub-agent context isolation.

8.  **Summarization Middleware** — Compresses older messages when context exceeds token thresholds.

9.  **Human-in-the-Loop Middleware** — Interrupts on configured operations, persists state, resumes on Owner decision.

---

## 9. Data Flow

### Interactive Path

When the Owner sends a message via Telegram, grammY receives the update and extracts message content. Any attachments are staged to the inputs zone. The Gateway computes the day-based thread ID and invokes the agent. Middleware injects memories and skill manifests. The Agent processes the request, potentially calling tools. Tool calls are dispatched according to their type — file tools perform path-validated I/O, terminal tools invoke the sandbox, network tools make Gateway-mediated requests. After the Agent completes, the `afterModel` hook scans the response. If clean, the response is sent to Telegram. The `afterAgent` hook extracts memories from the exchange.

### Scheduled Path

When a scheduled task fires, the system timer invokes the Gateway's schedule endpoint with the job payload. The Gateway reconstructs context and invokes the Agent with the scheduled task. Execution proceeds as normal — tools are available, sandbox isolation applies. Results are delivered to the primary channel.

### Terminal Execution Path

When the Agent calls the terminal tool, the Gateway checks for an existing session or creates a new one. If packages are requested, they are provisioned via Nix (invisible to the Agent). The command is executed inside the sandbox with appropriate filesystem mounts and network configuration. Standard output, standard error, and exit code are captured and returned. If the command is backgrounded, the process ID is returned and the session remains available for status checks.

### Skill Execution Path

When the Agent reads a skill's instructions and executes scripts, the Gateway detects the skill context through middleware. Before script execution, the proxy allowlist is updated to include the skill's approved domains. The script runs in the terminal with provisioned packages. After execution, the allowlist returns to baseline.

---

## 10. Directory Structure

### Host (Source Repository)

The repository is organized by layer:

The `system/` directory contains Layer 0 host configuration: the flake definition, common service configurations, and platform-specific modules for Linux and Darwin. Secrets are stored encrypted in this directory and decrypted at deployment time.

The `runtime/` directory contains Layer 1 sandbox configuration: sandbox profile templates for both platforms and zone definitions.

The `gateway/` directory contains Layer 2 Gateway implementation: the entry point, Telegram integration, middleware implementations, tool definitions, memory management, skill handling, and MCP configuration.

The `skills/` directory contains ingested skills organized by trust tier: platform skills shipped with the system, user skills uploaded by the Owner, and community skills from external sources.

The `identity/` directory contains the Constitution: `SOUL.md` and `SAFETY.md`.

### Sandbox (What the Agent Sees)

The Agent sees a filesystem rooted at `/sandbox/` containing five zones: identity (read-only, the Constitution), skills (read-only, organized by tier), inputs (read-only, session uploads), work (read-write, scratch space), and outputs (read-write, delivery staging).

The Agent navigates this filesystem using standard tools. It has no visibility into the host filesystem, the Nix store structure, or implementation details.

---

## 11. Security Constraints (The "Never" List)

1.  **Never** run terminal sessions as root inside the sandbox.
2.  **Never** mount credentials into the sandbox or expose them in the Agent's context.
3.  **Never** allow write access to identity or skills zones.
4.  **Never** bypass path validation for file operations.
5.  **Never** allow direct network access from the sandbox — all egress routes through the proxy.
6.  **Never** bind the Gateway to `0.0.0.0`.
7.  **Never** persist terminal sessions across Gateway restarts.
8.  **Never** expose Nix internals to the Agent — packages appear available without explanation.
9.  **Never** trust path input without resolution and validation — handle `..`, symlinks, and other traversal attempts.
10. **Never** return silent failures — all errors are structured and attributable.
11. **Never** allow the Agent to directly read or write memory storage — memory is middleware-managed.
12. **Never** execute skill scripts without prior LLM analysis and Owner approval.

