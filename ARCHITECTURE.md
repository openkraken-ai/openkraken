# ARCHITECTURE.md: The Foundation

## 1. Mission Statement

To build a **Deterministic, Security-First Agentic Runtime** that solves the architectural failures of the "OpenClaw" era while leveraging proven, production-tested components from the ecosystem.

We reject the "Probabilistic Safety" model (trusting the AI to follow rules) in favor of **"Deterministic Safety"** (physically preventing the AI from breaking rules). This system treats the Agent not as a user with a shell, but as a **Managed Sub-System** with strictly scoped capabilities.

We believe in **building on proven foundations** rather than reinventing security-critical infrastructure. Where the ecosystem provides battle-tested solutions (Anthropic's Sandbox Runtime, LangChain's middleware system, OpenTelemetry's observability), we integrate them. Where custom implementation is necessary (gateway orchestration, credential management, skill processing), we implement with rigor.

### Deployment Model: Single-Tenant, Owner-Operated

This system is designed for **one person, one instance, one device.** There is no multi-user, no multi-tenant, no shared hosting. This assumption simplifies authentication, session management, concurrency, and resource allocation — and eliminates entire categories of complexity that do not serve the target use case.

### Cross-Platform Requirement

The system targets both **Linux** and **macOS** as first-class platforms. Platform-specific implementation details are isolated behind clear abstractions. The Agent experience is identical across platforms — the Agent has no awareness of which operating system it runs on. The system achieves this uniformity through the Anthropic Sandbox Runtime, which provides consistent filesystem and network isolation semantics across both operating systems using OS-native sandboxing primitives under the hood.

### Terminology

Three roles appear throughout this document:

- **Project** — The framework itself, authored and maintained by us. The Project defines platform skills, default policies, security constraints, and the "Constitution" (`SOUL.md`, `SAFETY.md`). The Project is the authority on _how_ the system works.
- **Owner** — The person who installs and runs an instance. The Owner provisions credentials, configures integrations, uploads personal skills, and interacts with the Agent. In a single-tenant system, the Owner is the only human in the loop.
- **Agent** — The LLM-driven runtime operating inside the sandbox. A managed sub-system, not a peer.

The Owner trusts the Project (by choosing to install it). The Project trusts the Owner (by giving them full configuration authority). Neither trusts the Agent (which operates under deterministic constraints).

### What We're Responding To

OpenClaw (née Clawdbot → Moltbot) demonstrated that agentic AI works — and that the dominant architecture for it is fundamentally unsafe. Its specific failures inform every decision in this document:

- **Probabilistic Safety:** OpenClaw's safety relies on `AGENTS.md` directives — system prompt rules telling the LLM "don't do dangerous things." One prompt injection through any connected messaging channel can yield full shell access. We enforce safety at the sandbox and tool level, not the prompt level, using the Anthropic Sandbox Runtime for deterministic isolation.

- **Localhost Trust / No Auth by Default:** OpenClaw auto-trusts connections from `127.0.0.1`. Behind any reverse proxy, all external traffic appears local. 1,800+ exposed instances were found on Shodan. We bind to `127.0.0.1` or Tailscale only, with no implicit trust model. Telegram webhooks require cryptographic signature verification.

- **Flat Credential Storage:** API keys, OAuth tokens, and bot tokens stored in plaintext on the local filesystem, fully accessible to the agent. We store credentials in OS-level vaults (Keychain, secret-service) and never expose them to the sandbox context.

- **Unaudited Memory Writes:** OpenClaw's Markdown-based memory is readable and writable by the agent with no gating. A prompt injection can silently rewrite the agent's long-term memory. We remove the agent from the memory write path entirely — memory extraction and consolidation are handled by middleware, not agent-initiated tool calls.

- **Uncontrolled Egress:** The agent can compose and send messages to any connected channel without content validation, rate limiting, or approval gates. We gate all outbound delivery through a single auditable egress chokepoint with structured JSON errors and comprehensive request logging.

- **No Supply Chain Integrity:** 300+ contributors, a skills/plugin ecosystem pulling arbitrary code, no hermetic builds, no hash verification. We pin and hash everything via Nix and analyze skill scripts before execution.

- **No Network Isolation:** The agent inherits the host's full network access. We default to offline and whitelist explicitly via egress proxy. The Anthropic Sandbox Runtime ensures all network traffic routes through the proxy.

- **Custom Security Infrastructure:** Building custom sandboxing implementations leads to gaps and inconsistencies. We leverage Anthropic's production-tested Sandbox Runtime for consistent cross-platform isolation.

### Scope Definition: What This Project Does

This project builds a **personal AI agent runtime** with the following bounded capabilities:

**Primary Capabilities:**
- **Conversational Interaction:** Bidirectional messaging via Telegram (primary) and MCP-connected services (secondary)
- **Terminal Execution:** Sandboxed command execution with on-demand package provisioning via Nix and the Anthropic Sandbox Runtime
- **File Operations:** Read/write access within scoped filesystem zones
- **Web Automation:** Browser automation via Vercel Agent Browser for form filling, navigation, and data extraction
- **Skill System:** Extensible capability bundles following AgentSkills.io format with LLM pre-analysis and Owner approval
- **Scheduled Tasks:** Cron-based task execution with full agent capabilities
- **Persistent Memory:** Three-tier recall system (checkpointer, message log, semantic memory) backed by SQLite
- **Observability:** Comprehensive logging, distributed tracing, and metrics for operational visibility

**Integration Boundaries:**
- **In Scope:** Telegram, MCP servers (Slack, Discord, email, calendar, custom services), OpenTelemetry-compatible observability backends
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

6.  **Gated Egress:** Network access from sandboxed processes passes through an egress proxy with domain allowlisting. Direct internet access is blocked. The proxy enforces structured policies and logs all access for security auditing.

7.  **Minimal Tool Surface:** Every tool invocation is attack surface. The Agent prefers answering from knowledge when possible and only invokes tools when the task requires execution, file access, or capabilities beyond training data.

8.  **Middleware-Managed Memory:** The Agent does not manage its own long-term memory. Memory extraction, consolidation, retrieval, and injection are handled by Gateway middleware — invisible to the Agent and immune to prompt injection.

9.  **Single-Tenant by Design:** The system serves one Owner per instance. This is not a limitation to be overcome later — it is a deliberate architectural decision that eliminates multi-tenancy complexity.

10. **Everything is Middleware:** Agent capabilities — scheduling, web search, sub-agent orchestration, memory, skills, MCP integration, observability — are implemented as composable LangChain middleware. No privileged internal mechanisms exist that custom middleware cannot replicate.

11. **Build on Proven Foundations:** Where the ecosystem provides battle-tested solutions for security-critical infrastructure (sandboxing, observability, protocol implementations), we integrate them rather than reinventing. Custom implementation is reserved for gateway-specific concerns.

12. **Nix-Native, Nix-Invisible:** The system leverages Nix for reproducibility, package management, and cross-platform configuration. However, Nix internals are never exposed to the Agent — packages simply become available when requested, with no awareness of the underlying mechanism.

13. **Tool-Level Isolation:** Different tools enforce security boundaries appropriate to their function. File operations use path validation; command execution uses the Anthropic Sandbox Runtime; browser automation uses isolated browser profiles with proxy enforcement.

14. **Identity Injection:** The Agent's core identity (`SOUL.md`) is never materialized as a file within the sandbox. It is injected directly into the system prompt by the Gateway. This prevents exfiltration of the "Constitution" via file copy operations.

15. **Durable State Persistence:** Agent state survives Gateway restarts via LangGraph SqliteCheckpointer with WAL mode. Session continuity is an architectural guarantee, not an in-memory optimization.

16. **Observable by Default:** All Agent operations are logged, traced, and metered. The Owner has complete visibility into Agent behavior for debugging, audit, and optimization purposes.

17. **Credential Isolation:** Credentials are stored in OS-level vaults (Keychain on macOS, secret-service on Linux) and never exposed to the Agent or written to persistent storage beyond runtime memory.

---

## 3. The 3-Layer Architecture

### Layer 0: The Host (The Bedrock)

**Technology:** Nix Flakes (Universal).

**Role:** The host system that runs the Gateway, manages credentials, supervises processes, and provides the egress proxy. It runs on any modern Linux distribution or macOS, provided Nix is installed.

**Responsibilities:**

- **Identity Injection:** Stores the core `SOUL.md` and `SAFETY.md` files on the secure Host filesystem. These are **never** exposed to the sandbox filesystem. The Gateway reads them and injects their content directly into the Agent's system prompt at runtime.

- **Credential Storage:** API keys, bot tokens, and OAuth credentials are retrieved from OS-level credential vaults at startup. On macOS, credentials are stored in the system Keychain. On Linux, credentials are accessed through the secret-service API (compatible with GNOME Keyring, KWallet, or pass). The Gateway reads credentials from these vaults at startup and stores them in memory for the process duration. Credentials are never written to filesystem, log files, or error messages. The Gateway provides credential rotation support by re-reading from vaults without requiring full restart.

- **Egress Proxy:** Runs a domain-filtering HTTP CONNECT proxy bound to localhost. The proxy enforces a strict allowlist-only policy for all network egress from sandboxed processes. The proxy returns structured JSON error responses containing the error type, the denied domain, the current allowlist, and the policy that caused the denial. All access attempts are logged to SQLite with timestamps, request IDs, destination domains, and disposition (allowed or denied). The proxy supports both HTTP CONNECT for web traffic and SOCKS5 for non-HTTP protocols, ensuring comprehensive network isolation.

- **Process Supervision:** The Gateway manages the lifecycle of agent processes directly. It does not rely on system-level init systems (like systemd) for agent execution, allowing the entire stack to run as a user-space application via `nix run`.

- **Timer Management:** Hosts scheduled task execution. The Gateway registers jobs; Layer 0 executes them via system timers or a dedicated scheduler process. When a scheduled task fires, it triggers the Gateway, which then invokes the Agent through the normal execution path. Scheduled tasks receive the same isolation as interactive tasks.

- **Network Binding:** The Gateway binds to `127.0.0.1` or a Tailscale interface only. This is the sole access control mechanism — in a single-tenant deployment, network reachability equals authorization. The Gateway never binds to `0.0.0.0`.

- **Filesystem Zones:** Provides the directory structure that forms the sandbox filesystem. The host maintains the actual directories, which are exposed at `/sandbox/` paths through symlinks or bind-mounts.

### Layer 1: The Sandbox (The Isolation)

**Technology:** Anthropic Sandbox Runtime (`@anthropic-ai/sandbox-runtime`).

**Role:** Provides filesystem isolation and network isolation for command execution. The sandbox is not a container in the Docker/Podman sense. The system leverages OS-native sandboxing mechanisms that provide process isolation without the overhead of full containerization. The Anthropic Sandbox Runtime abstracts platform differences by using `bubblewrap` on Linux and `sandbox-exec` (Seatbelt) on macOS, presenting a unified configuration interface across both platforms.

**Responsibilities:**

- **Filesystem Boundary:** The Agent sees a filesystem rooted at `/sandbox/` with named zones. Each zone has defined permissions — some read-only, some read-write. The sandbox runtime enforces these restrictions at the OS level using bind mounts (Linux) and Seatbelt profiles (macOS).

- **Process Isolation:** Command execution runs in isolated processes with restricted filesystem views, no direct network access, and limited capabilities. The sandbox runtime applies these restrictions automatically based on configuration.

- **Network Isolation:** Sandboxed processes cannot access the internet directly. They receive proxy configuration (`HTTP_PROXY`, `HTTPS_PROXY`) pointing to the Layer 0 egress proxy. The sandbox runtime ensures all network traffic routes through the proxy by removing network namespace access and binding proxy endpoints into the sandbox.

- **Resource Limits:** Enforced via cgroups (Linux) or process timeout mechanisms (macOS). The sandbox runtime manages these limits transparently.

- **Violation Detection:** On macOS, the sandbox runtime taps into the system's sandbox violation log store for real-time alerts when restricted resources are accessed. On Linux, violations are detectable through process exit codes and error messages.

- **Unix Socket Restrictions:** The sandbox runtime blocks Unix domain socket creation at the syscall level using seccomp filters (Linux) or Seatbelt profiles (macOS), preventing sandboxed processes from communicating with local services outside the sandbox boundary.

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

**Technology:** Bun + LangChain.js v1, grammY for Telegram integration, @langchain/mcp-adapters for MCP integration, OpenTelemetry for observability. Database: **SQLite**.

**Role:** The orchestration layer that runs the Agent loop, dispatches tools, enforces policies, and manages state. The Gateway provides the runtime environment for the Agent, coordinating interactions between the Owner, the Agent, and external services while maintaining security boundaries.

**Responsibilities:**

- **Agent Orchestration:** Uses the LangChain.js v1 `createAgent()` API as the canonical entry point. The agent loop, tool dispatch, and state management are handled by LangGraph. All agent capabilities are implemented as middleware — there are no privileged internal mechanisms.

- **Primary Channel (Telegram):** Telegram is the Gateway's native conversational I/O surface. The Gateway uses grammY for Telegram protocol handling. Webhook requests are cryptographically verified before processing to prevent spoofing attacks. Responses are not streamed — complete responses are scanned for credential leaks and PII before delivery.

- **Secondary Channels (MCP Servers):** All other external services — Slack, Discord, email, calendars — are accessed as MCP servers via the LangChain MCP adapter. The Agent explicitly calls tools to reach them. These go through the full policy middleware stack. The MCP adapter handles connection management, capability negotiation, and protocol translation transparently.

- **Session Lifecycle:** A session spans one calendar day, identified by a date-based thread ID. Same day means same session with continuous context. New day means fresh context with memory injection. Terminal sessions are bound to this lifecycle and are destroyed at session boundaries.

- **Durable State:** LangGraph `SqliteCheckpointer` persists agent state across Gateway restarts. The checkpointer stores conversation state, tool call sequences, and checkpoint metadata in SQLite using Write-Ahead Logging (WAL) mode for concurrent access. The checkpointer maintains a two-table schema with checkpoints and writes, enabling efficient retrieval and rollback when needed.

- **Backup and Recovery:** The Gateway implements automated daily backups of the SQLite checkpoint database. Backups are performed using SQLite's online backup API to ensure consistency while the system is running. Backups are stored in compressed format with 7-day retention. The Gateway provides recovery commands for Owners to restore from backup when needed. Integrity checks run automatically during backup to detect corruption early.

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

All network access from sandboxed processes routes through a local HTTP CONNECT proxy running on Layer 0. The proxy implements a strict allowlist-only security model with comprehensive logging and structured error responses.

### Proxy Architecture

The egress proxy system consists of two complementary proxy servers that work together to enforce network isolation:

**HTTP/HTTPS Proxy (Primary):**
The primary proxy listens on port 8080 and implements the HTTP CONNECT method per RFC 7231. When a sandboxed process requests a connection to an external host, the proxy validates the destination domain against the current allowlist before establishing the tunnel. HTTPS traffic is handled transparently — the proxy establishes a tunnel to the target hostname without terminating TLS, preserving end-to-end encryption while allowing domain-based filtering.

**SOCKS5 Proxy (Secondary):**
The secondary proxy listens on port 1080 and handles non-HTTP TCP traffic such as database connections, SSH tunnels, and other protocol-specific communication. The SOCKS5 proxy enforces identical domain allowlist restrictions as the HTTP proxy, ensuring consistent security policy regardless of protocol.

### Connection Flow

When a sandboxed process attempts network communication, the following sequence occurs:

First, the sandboxed process initiates a connection through the configured proxy settings (HTTP_PROXY, HTTPS_PROXY, ALL_PROXY environment variables). The sandbox runtime ensures these environment variables are set and that the process cannot bypass them by removing network namespace access.

Second, the proxy receives the connection request and extracts the destination domain from the HTTP CONNECT request (for HTTP) or SOCKS5 handshake (for other protocols). The proxy performs DNS resolution on the host side, preventing the sandboxed process from controlling which IP addresses are contacted.

Third, the proxy checks the destination domain against the current allowlist. Domains are matched using exact string comparison with wildcard support for subdomains (e.g., "*.github.com" matches "api.github.com" but not "notgithub.com"). Denied domains take precedence over allowed domains.

Fourth, if the domain is allowed, the proxy establishes the connection to the target and tunnels data bidirectionally. If the domain is denied, the proxy returns a structured JSON error response and closes the connection.

### Allowlist Management

The Gateway manages the proxy allowlist through a well-defined update protocol. Before skill execution begins, the Gateway calls the proxy management API to temporarily expand the allowlist with domains required by the skill. When skill execution completes, the Gateway resets the allowlist to its baseline configuration.

The allowlist supports three tiers of domains: system domains (required for core functionality, cannot be modified), skill domains (temporarily added during skill execution), and owner domains (configured by the Owner for personal integrations). The Gateway maintains these tiers separately to ensure skill modifications cannot persist beyond their execution context.

### Structured Error Responses

When the proxy denies a request, it returns a structured JSON response containing complete context for debugging and audit:

```json
{
  "errorType": "domain_not_allowed",
  "deniedDomain": "malicious-site.com",
  "allowedDomains": ["*.trusted.com", "api.github.com"],
  "requestMethod": "CONNECT",
  "timestamp": "2026-02-03T12:00:00Z",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "policyVersion": "sha256-hash-of-current-allowlist"
}
```

The proxy uses standard HTTP status codes to indicate error categories: 407 Proxy Authentication Required indicates missing or invalid credentials, 403 Forbidden indicates a domain not in the allowlist, 502 Bad Gateway indicates an upstream proxy failure, and 504 Gateway Timeout indicates a request timeout.

### Logging Specification

Every request processed by the proxy is logged to SQLite with complete context for security auditing and operational debugging. Log entries include the ISO8601 timestamp, a UUID request identifier, the source process ID, the destination domain and port, the request method, the disposition (allowed or denied), the specific rule that was applied, bytes transferred in each direction, request duration in milliseconds, and the TLS SNI hostname for HTTPS requests.

Log data is retained for 30 days rolling with automatic rotation at 100 megabytes. The Gateway provides an API endpoint for Owners to query recent denied requests, enabling troubleshooting when legitimate operations are blocked.

### Security Considerations

The proxy implements several security measures beyond simple domain filtering. All proxy connections originate from localhost, preventing external access to the proxy service. The proxy performs hostname validation at the TLS layer, preventing certificate spoofing attacks. CONNECT requests to IP addresses instead of hostnames are denied by default, forcing all traffic through DNS resolution on the host side.

The proxy does not perform content inspection of HTTPS traffic, preserving the confidentiality and integrity of encrypted connections while still enforcing domain-based access control.

---

## 7. Platform Abstractions

The architecture supports both Linux and macOS through clear abstractions that hide platform differences from the Gateway and Agent layers.

### Sandbox Isolation

The system delegates platform-specific sandboxing to the Anthropic Sandbox Runtime, which provides a unified configuration interface while using optimal native mechanisms for each platform. On Linux, the runtime uses `bubblewrap` for filesystem and network isolation with bind mounts for directory permissions. On macOS, the runtime uses `sandbox-exec` with dynamically generated Seatbelt profiles for filesystem restrictions and proxy-based network isolation.

The runtime presents identical filesystem semantics on both platforms — read and write permissions are specified using the same configuration format regardless of underlying mechanism. Path glob patterns work consistently, with the runtime handling platform-specific path resolution internally.

### Process Supervision

The Gateway remains the process supervisor, managing child processes directly to ensure they terminate when the session ends or the Gateway shuts down. The Gateway invokes the Anthropic Sandbox Runtime for each command execution, passing the appropriate configuration for the current context (skill execution, interactive session, or scheduled task).

### Resource Limits

Resource limits are applied transparently by the sandbox runtime. On Linux, cgroups provide hard limits on CPU time, memory consumption, and process count. On macOS, the runtime combines Seatbelt profile restrictions with process timeout mechanisms to achieve similar isolation. The runtime handles platform-specific resource limit configuration internally, presenting a consistent API to the Gateway.

### Filesystem Zones

Both platforms support the same zone taxonomy through the sandbox runtime's bind mount (Linux) and Seatbelt profile (macOS) mechanisms. The Gateway specifies zones in platform-agnostic terms, and the runtime handles the translation to platform-specific isolation primitives.

### Browser Automation

Vercel Agent Browser provides cross-platform browser automation. The Gateway wraps Agent Browser commands with appropriate isolation, network policy enforcement, and session management. The Agent Browser is configured to route all traffic through the egress proxy, ensuring browser network activity is subject to the same domain allowlist restrictions as other sandboxed operations.

### Observability Layer

The Gateway exposes a comprehensive observability interface that functions identically on both platforms. The OpenTelemetry integration provides distributed tracing and metrics collection regardless of underlying platform mechanisms. Health endpoints (`/health`, `/ready`, `/metrics`) use standard Bun runtime HTTP handling that works consistently across Linux and macOS.

Logs are stored in SQLite with platform-agnostic schema, enabling the same querying and analysis workflows regardless of where the system runs. The Gateway ensures log files are written to platform-appropriate data directories (systemd-compatible on Linux, standard application support directories on macOS) while maintaining consistent access patterns for the Owner.

---

## 8. Middleware Composition

The Gateway composes multiple LangChain.js middleware in a defined order. The ordering matters — earlier middleware runs first for `before*` hooks and last for `after*` hooks.

The middleware stack, in order:

1.  **Logger Middleware** — Instruments all hooks, writes structured records to SQLite. Must be outermost to capture everything. Logs tool invocations, model calls, and Agent turn completions with timestamps, request IDs, and durations.

2.  **OpenTelemetry Middleware** — Provides distributed tracing and metrics collection. Exports traces to configured backend (Jaeger, Zipkin) and exposes Prometheus-compatible metrics at `/metrics`. Correlates all operations within a session for comprehensive observability.

3.  **Policy Middleware** — Validates terminal package requests, gates delivery with content scanning, enforces rate limits.

4.  **Cron Middleware** — Detects scheduled task triggers.

5.  **Web Search Middleware** — Provides web search tools.

6.  **Browser Middleware** — Provides browser automation tools via Agent Browser, manages browser session isolation.

7.  **Memory Middleware** — Retrieves relevant memories before model calls, extracts and consolidates memories after agent completion. Manages three-tier recall: checkpointer (state), message log (conversation history), memory bank (semantic).

8.  **MCP Adapter Middleware** — Provides access to Model Context Protocol servers through the LangChain MCP adapter. Handles connection lifecycle, capability negotiation, and tool routing for MCP-connected services.

9.  **Skill Loader Middleware** — Injects skill manifests.

10. **Sub-Agent Middleware** — Provides task delegation.

11. **Summarization Middleware** — Compresses older messages.

12. **Human-in-the-Loop Middleware** — Interrupts on configured operations.

### Observability Layer

The Gateway implements a comprehensive observability layer that provides operational visibility, performance monitoring, and security auditing capabilities. This layer is essential for debugging, incident response, and ensuring the system operates within expected parameters.

**Structured Logging:**
The Logger Middleware captures all Agent operations with complete context. Each log entry includes the timestamp (ISO8601 format), a UUID request identifier, the operation type (tool_call, model_invoke, agent_turn), the target resource (tool name, model identifier), the arguments or prompt content (sanitized of credentials), the result or error, the execution duration in milliseconds, and correlation identifiers for tracing related operations across middleware.

Logs are stored in SQLite with automatic rotation at 100 megabytes and retention for 30 days. The Gateway provides query APIs for the Owner to search and analyze log data for debugging and audit purposes.

**Distributed Tracing:**
The OpenTelemetry Middleware creates distributed traces that capture the complete execution path of each Agent operation. Traces span from initial request receipt through middleware processing, model invocations, tool calls, and final response delivery. Each trace includes span data for timing, span relationships for call hierarchy, span attributes for operation context, and span events for significant occurrences.

Traces are exported to configured backends (Jaeger, Zipkin, or compatible collectors) for visualization and analysis. The trace context is propagated through all asynchronous operations, enabling complete request tracing across the system.

**Metrics Collection:**
The Gateway exposes Prometheus-compatible metrics at the `/metrics` endpoint. Key metrics include HTTP request counts by status code and endpoint, tool invocation counts by tool name and success/failure, Agent turn counts by session type, egress proxy request counts by disposition, model invocation counts by provider and model, and resource utilization metrics (memory, CPU where available).

**Health Endpoints:**
The Gateway exposes standardized health endpoints for operational monitoring. The `/health` endpoint returns a simple 200 OK response indicating the process is running. The `/ready` endpoint performs dependency checks (database connectivity, MCP server availability) and returns 200 only when all dependencies are healthy. The `/metrics` endpoint serves Prometheus metrics for monitoring systems. The `/version` endpoint returns version information for debugging.

**Security Auditing:**
All security-relevant events are logged with complete context for audit purposes. These events include authentication attempts (successful and failed), authorization decisions (allowed and denied), configuration changes, session lifecycle events (start, end, termination), and security constraint violations. Audit logs are append-only and cryptographically signed to prevent tampering.

---

## 9. Data Flow

### Interactive Path

When the Owner sends a message via Telegram, grammY receives the update. The Gateway computes the day-based thread ID and invokes the agent. **The `SOUL.md` identity is injected into the system prompt.** The Agent processes the request.

### Scheduled Path

When a scheduled task fires, the Gateway invokes the Agent with the scheduled task.

### Telegram Integration Lifecycle

The Gateway integrates with Telegram through grammY, supporting webhook mode for production deployments and long-polling mode for development environments.

**Webhook Mode (Production):**
The Gateway exposes an HTTP endpoint that receives Telegram updates via POST requests. Before accepting any update, the Gateway verifies the request originated from Telegram by validating the cryptographic signature computed from the bot token and update payload. Updates are deduplicated using their unique update identifiers to prevent duplicate processing during webhook retries. The Gateway implements rate limiting to comply with Telegram's requirements and protect against abuse.

**Long Polling Mode (Development):**
For development environments where exposing a webhook endpoint is impractical, the Gateway uses grammY's long-polling mechanism to receive updates. This mode provides equivalent functionality while simplifying local development workflow.

**Graceful Shutdown:**
The Gateway registers handlers for SIGINT and SIGTERM signals to ensure clean shutdown. On shutdown, the Gateway stops accepting new updates, waits for in-flight requests to complete (up to a configurable timeout), acknowledges the final update, and then terminates. This ensures no messages are lost during Gateway restarts.

**Update Processing:**
Updates are processed within the context of a session identified by the combination of chat identifier and date. The Gateway maps each update to its corresponding session, enabling conversation continuity within a single day while maintaining clean session boundaries across days.

### MCP Integration

The Gateway integrates with Model Context Protocol servers through the LangChain MCP adapter (`@langchain/mcp-adapters`). This integration enables the Agent to access external services (Slack, Discord, email, calendars, custom services) through a standardized protocol interface.

**Connection Management:**
The Gateway maintains persistent connections to configured MCP servers using the MCP TypeScript SDK. Connections are established during Gateway startup and persist throughout the Gateway lifecycle. The Gateway handles connection failures with automatic reconnection and exponential backoff.

**Capability Negotiation:**
During connection establishment, the Gateway negotiates capabilities with each MCP server, determining which tools, resources, and prompts are available. The Gateway enforces a tool allowlist policy, ensuring the Agent can only access MCP tools that have been explicitly approved by the Owner.

**Request Routing:**
When the Agent invokes an MCP tool, the Gateway routes the request through the MCP adapter to the appropriate server. The adapter handles protocol serialization, request routing, and response deserialization transparently. Tool results are sanitized before being returned to the Agent, removing any protocol-specific metadata.

**Security Considerations:**
MCP servers run as separate processes outside the sandbox, preventing them from accessing sandboxed resources directly. All MCP communication is logged through the observability middleware, providing complete audit trails. The Gateway validates all MCP responses against expected schemas to prevent protocol confusion attacks.

### Terminal Execution Path

When the Agent calls the terminal tool, the Gateway invokes the Anthropic Sandbox Runtime with the appropriate configuration for the current context. The sandbox runtime enforces filesystem and network restrictions, routing all network traffic through the egress proxy.

### Browser Execution Path

When the Agent calls the browser tool, the Gateway invokes Agent Browser with the appropriate action. The browser is configured with proxy settings that route all network traffic through the egress proxy, enforcing domain allowlists on all web requests. Browser sessions are isolated per conversation thread with unique profiles to prevent state leakage between conversations.

### Skill Execution Path

When the Agent executes skill scripts, the Gateway detects the skill context and updates the egress proxy allowlist to include any domains the skill requires. The Gateway also updates the sandbox runtime configuration to match the skill's trust tier and required filesystem permissions. After skill execution completes, the Gateway resets both the proxy allowlist and sandbox configuration to baseline values.

### MCP Integration Path

When the Agent calls an MCP tool, the Gateway routes the request through the LangChain MCP adapter to the appropriate MCP server. The MCP adapter handles connection lifecycle, capability negotiation, and error handling transparently. MCP tool calls are subject to the same observability and logging middleware as native tools, ensuring complete audit trails regardless of the tool's origin.

### Observability Path

All Agent operations flow through the observability middleware layer. Tool invocations, model calls, and Agent turn completions are logged to SQLite with timestamps, request IDs, and durations. Distributed traces capture the complete execution path from initial request through tool calls and model responses. Prometheus metrics track system health, performance, and security events for operational monitoring.

---

## 10. Directory Structure

### Host (Source Repository)

The repository is organized by layer:

- `system/`: Layer 0 host configuration (flake definition, service configs, egress proxy configuration)
- `runtime/`: Layer 1 sandbox configuration (Anthropic Sandbox Runtime settings)
- `gateway/`: Layer 2 Gateway implementation (Bun/TypeScript code)
- `skills/`: Ingested skills
- `identity/`: The Constitution: `SOUL.md` and `SAFETY.md`. **(Host Only)**
- `observability/`: Observability configuration (OpenTelemetry setup, logging schemas)
- `mcp/`: MCP server configurations and connection definitions

### Sandbox (What the Agent Sees)

The Agent sees a filesystem rooted at `/sandbox/` containing four zones: skills (read-only), inputs (read-only), work (read-write), and outputs (read-write). **Identity is not present.**

---

## 11. Security Constraints (The "Never" List)

1.  **Never** run terminal sessions as root inside the sandbox.
2.  **Never** mount credentials into the sandbox or expose them in the Agent's context.
3.  **Never** mount `identity/` files into the sandbox. Identity is injected via prompt only.
4.  **Never** bypass path validation for file operations.
5.  **Never** allow direct network access from the sandbox — all egress routes through the egress proxy.
6.  **Never** bind the Gateway to `0.0.0.0`.
7.  **Never** persist terminal sessions across Gateway restarts.
8.  **Never** expose sandbox internals to the Agent — packages appear available without explanation.
9.  **Never** trust path input without resolution and validation.
10. **Never** return silent failures.
11. **Never** allow the Agent to directly read or write memory storage.
12. **Never** execute skill scripts without prior LLM analysis and Owner approval.
13. **Never** allow browser automation without egress proxy enforcement.
14. **Never** share browser profiles between conversations.
15. **Never** skip webhook verification for Telegram integration.
16. **Never** connect MCP servers without capability negotiation.
17. **Never** expose proxy management API to unauthenticated requests.
18. **Never** log credentials or sensitive configuration data.
19. **Never** allow Unix socket access from sandboxed processes without explicit configuration.
20. **Never** bypass the Anthropic Sandbox Runtime for command execution.
