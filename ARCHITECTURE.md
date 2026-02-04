# ARCHITECTURE.md: The Foundation

## 1. Mission Statement

To build a **Deterministic, Security-First Agentic Runtime** that solves the architectural failures of the "OpenClaw" era while leveraging proven, production-tested components from the ecosystem.

We reject the "Probabilistic Safety" model (trusting the AI to follow rules) in favor of **"Deterministic Safety"** (physically preventing the AI from breaking rules). This system treats the Agent not as a user with a shell, but as a **Managed Sub-System** with strictly scoped capabilities.

We believe in **building on proven foundations** rather than reinventing security-critical infrastructure. Where the ecosystem provides battle-tested solutions (Anthropic's Sandbox Runtime, LangChain's middleware system, OpenTelemetry's observability), we integrate them. Where custom implementation is necessary (gateway orchestration, credential management, skill processing), we implement with rigor.

### Deployment Model: Single-Tenant, Owner-Operated

This system is designed for **one person, one instance, one device.** There is no multi-user, no multi-tenant, no shared hosting. This assumption simplifies authentication, session management, concurrency, and resource allocation — and eliminates entire categories of complexity that do not serve the target use case.

Multi-user scenarios are explicitly out of scope. The system does not implement user isolation, role-based access control, or shared instance management. Each device runs exactly one Owner with full system access.

### Cross-Platform Requirement

The system targets both **Linux** and **macOS** as first-class platforms. Platform-specific implementation details are isolated behind clear abstractions. The Agent experience is identical across platforms — the Agent has no awareness of which operating system it runs on. The system achieves this uniformity through the Anthropic Sandbox Runtime, which provides consistent filesystem and network isolation semantics across both operating systems using OS-native sandboxing primitives under the hood.

### Terminology

Four architectural entities appear throughout this document, each with distinct technology stacks, lifecycles, and trust boundaries:

**Project** — The framework itself, authored and maintained by us. The Project defines platform skills, default policies, security constraints, and the "Constitution" (`SOUL.md`, `SAFETY.md`). The Project is the authority on _how_ the system works.

**Owner** — The person who installs and runs an instance. The Owner provisions credentials, configures integrations, uploads personal skills, and interacts with the Agent. In a single-tenant system, the Owner is the only human in the loop.

**Agent** — The LLM-driven runtime operating inside the sandbox. A managed sub-system, not a peer.

**Egress Gateway** — The network boundary component implementing HTTP CONNECT proxy with domain allowlisting. Implemented as a separate Go or Rust binary with independent lifecycle, managed by Nix as a system service. Enforces strict allowlist-only network policy for all sandbox egress.

**Orchestrator** — The agent orchestration component managing the LangChain/LangGraph runtime. Implemented in Bun with TypeScript. Owns session management, tool dispatching, prompt injection, and coordinates all other components. Runs as an independent Nix-managed service.

**Platform Adapter** — The cross-platform abstraction layer handling OS-specific behaviors for sandbox invocation and credential retrieval. Implemented with runtime detection within the Orchestrator binary, abstracting differences between Linux (bubblewrap, secret-service) and macOS (Seatbelt, Keychain).

The Owner trusts the Project (by choosing to install it). The Project trusts the Owner (by giving them full configuration authority). Neither trusts the Agent (which operates under deterministic constraints). The Orchestrator does not trust the Egress Gateway — communication follows strict RPC patterns with no implicit trust.

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

## 3. The 4-Layer Architecture

### Layer -1: The Platform Manager

**Technology:** Nix Flakes with NixOS (Linux) and Nix Darwin (macOS) modules.

**Role:** The infrastructure layer that packages, deploys, and manages the entire system as Nix-managed services. It operates below all application code, generating platform-specific service configurations from a unified declarative specification.

**Responsibilities:**

- **Service Generation:** Generates platform-appropriate service definitions from a single configuration source. On Linux, this produces systemd units. On macOS, this produces launchd plists. The application binary receives its configuration through environment variables and well-known paths, remaining platform-agnostic.

- **Directory Convention Management:** Establishes platform-appropriate paths for state, runtime, and configuration directories. On Linux, these follow XDG conventions under `/var/lib/`. On macOS, these follow Apple guidelines under `~/Library/`. The application adapts to these paths at runtime through environment variables set by Nix.

- **Credential Boundary:** Credentials exist in two tiers. Non-sensitive configuration values (API endpoints, feature flags) are provided via Nix at build time. Sensitive credentials (API keys, tokens) are provisioned through OS-level vaults (Keychain on macOS, secret-service on Linux) at runtime. Nix never handles sensitive credential values.

- **Update Orchestration:** Manages atomic service updates. When a new version is deployed, Nix performs an atomic switchover — the old generation is replaced entirely by the new generation, and services are restarted. There is no rolling restart or gradual rollout.

- **Process Lifecycle:** Services are managed by the platform init system. The Orchestrator and Egress Gateway run as independent long-running services with automatic restart on failure. Service startup order is declared in the Nix module, ensuring the Egress Gateway is available before the Orchestrator attempts network operations.

### Layer 0: The Host (The Bedrock)

**Technology:** Unix/Linux/macOS user-space with Nix-managed services.

**Role:** The host system that provides the runtime environment for the Orchestrator and Egress Gateway, manages credentials, and provides the egress proxy. It runs on any modern Linux distribution or macOS, provided Nix is installed.

**Responsibilities:**

- **Identity Injection:** Stores the core `SOUL.md` and `SAFETY.md` files on the secure Host filesystem. These are **never** exposed to the sandbox filesystem. The Orchestrator reads them and injects their content directly into the Agent's system prompt at runtime.

- **Credential Storage:** API keys, bot tokens, and OAuth credentials are retrieved from OS-level credential vaults at startup. The Orchestrator implements a **CredentialVault** abstraction that provides a unified interface across platforms. On macOS, the vault uses the Keychain Services API. On Linux, the vault uses the secret-service API (compatible with GNOME Keyring, KWallet, or pass). The Orchestrator reads credentials from these vaults at startup and stores them in memory for the process duration. Credentials are never written to filesystem, log files, or error messages. The Orchestrator provides credential rotation support by re-reading from vaults without requiring full restart. This abstraction serves the single-tenant model by making credential management explicit and auditable — the Owner provisions credentials through their platform's native tools, and the Orchestrator reads them into memory at startup.

- **Egress Proxy:** The Egress Gateway runs as an independent process managed by Nix. It implements a domain-filtering HTTP CONNECT proxy bound to localhost. The Orchestrator communicates with the Egress Gateway via HTTP over Unix domain socket, managing allowlists and retrieving audit logs. The proxy enforces a strict allowlist-only policy for all network egress from sandboxed processes.

- **Process Supervision:** The Orchestrator and Egress Gateway run as independent Nix-managed services. Both processes can restart independently without affecting the other. The Orchestrator manages Agent processes through the Platform Adapter, not through system-level init systems.

- **Timer Management:** Hosts scheduled task execution. The Orchestrator registers jobs; the host executes them via system timers. When a scheduled task fires, it triggers the Orchestrator, which then invokes the Agent through the normal execution path.

- **Network Binding:** The Egress Gateway binds to `127.0.0.1` only. The Orchestrator exposes its interfaces via Unix domain socket for local communication. This is the sole access control mechanism — in a single-tenant deployment, network reachability equals authorization.

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

### Layer 3: The Orchestrator (The Brain)

**Technology Stack (Pinned Versions):** The system pins all dependencies to specific versions to ensure reproducibility and prevent supply chain attacks. The following versions are verified and tested:

- **Bun Runtime:** 1.3.8 (latest stable as of February 2026) — `bun --version` returns the exact version string
- **LangChain.js:** 1.2.16 (core library) — provides agent orchestration and tool definitions
- **LangGraph.js:** 1.1.3 (@langchain/langgraph core) / 1.0.19 (langgraph wrapper) — provides stateful workflow management
- **@langchain/mcp-adapters:** 1.1.2 — provides Model Context Protocol integration
- **grammY:** Supports Telegram Bot API 9.3 (December 2025 release) — provides Telegram protocol handling
- **@anthropic-ai/sandbox-runtime:** 0.0.35 — provides cross-platform process isolation (Beta Research Preview)
- **Vercel Agent Browser:** 0.9.0 — provides headless browser automation
- **SQLite:** 3.x (bundled with Bun runtime) — provides durable state persistence

All dependencies are declared in `package.json` with exact semver ranges. The build process pins transitive dependencies via the lockfile to prevent dependency confusion attacks.

**Role:** The orchestration layer that runs the Agent loop, dispatches tools, enforces policies, and manages state. The Orchestrator provides the runtime environment for the Agent, coordinating interactions between the Owner, the Agent, and external services while maintaining security boundaries.

**Entry Points:** The system exposes two interfaces for Owner interaction. The CLI provides power-user operations for configuration, debugging, and automation. The Web UI provides a browser-based interface for casual interaction and monitoring. Both interfaces communicate with the Orchestrator through internal APIs.

**Responsibilities:**

- **Agent Orchestration:** Uses the LangChain.js v1 `createAgent()` API as the canonical entry point. The agent loop, tool dispatch, and state management are handled by LangGraph. All agent capabilities are implemented as middleware — there are no privileged internal mechanisms.

- **Primary Channel (Telegram):** Telegram is the Orchestrator's native conversational I/O surface. The Orchestrator uses grammY for Telegram protocol handling. Webhook requests are cryptographically verified before processing to prevent spoofing attacks. Responses are not streamed — complete responses are scanned for credential leaks and PII before delivery.

- **Secondary Channels (MCP Servers):** All other external services — Slack, Discord, email, calendars — are accessed as MCP servers via the LangChain MCP adapter. The Agent explicitly calls tools to reach them. These go through the full policy middleware stack. The MCP adapter handles connection management, capability negotiation, and protocol translation transparently.

- **Session Lifecycle:** Agent sessions are day-boundaries. A session spans one calendar day, identified by a date-based thread ID. Same day means same session with continuous context. New day means fresh context with memory injection. The sandbox itself is persistent while the system runs but can be restarted by the Owner at any time. Terminal sessions are bound to this lifecycle and are destroyed at session boundaries.

- **Sandbox Management:** The Orchestrator manages sandbox lifecycle through the Platform Adapter. Sandboxes are persistent worker processes that handle Agent commands. The Owner can request sandbox restart for updates or reset without affecting the overall system.

- **Durable State:** LangGraph `SqliteCheckpointer` persists agent state across Orchestrator restarts. The checkpointer stores conversation state, tool call sequences, and checkpoint metadata in SQLite using Write-Ahead Logging (WAL) mode for concurrent access. The checkpointer maintains a two-table schema with checkpoints and writes, enabling efficient retrieval and rollback when needed.

- **Backup and Recovery:** The Orchestrator implements automated daily backups of the SQLite checkpoint database. Backups are performed using SQLite's online backup API to ensure consistency while the system is running. Backups are stored in compressed format with 7-day retention. The Orchestrator provides recovery commands for Owners to restore from backup when needed. Integrity checks run automatically during backup to detect corruption early.

- **Tool Dispatch:** The Orchestrator dispatches tool calls to appropriate handlers based on tool type.

- **Memory Middleware:** Three-tier recall system:
  - **Checkpointer:** Within-session state persistence (LangGraph SqliteCheckpointer)
  - **Message Log:** Cross-session message storage and retrieval (SQLite `messages` table)
  - **Memory Bank:** Semantic long-term memory with embedding-based retrieval (SQLite `memories` table)

- **Content Scanning:** The `afterModel` hook scans all outbound content for credential leaks, PII, and policy violations before delivery to any channel.

- **Egress Gateway Communication:** The Orchestrator manages the Egress Gateway through a well-defined RPC interface over Unix domain socket. Operations include allowlist management, statistics retrieval, and audit log streaming. The Orchestrator never assumes implicit trust — all gateway operations require explicit API calls.

### Inter-Process Communication

The system uses well-defined RPC patterns for component communication:

**Orchestrator to Egress Gateway:** HTTP over Unix domain socket. The Orchestrator sends management commands (add/remove domains, reload configuration) and receives audit log streams. Endpoints include `POST /api/v1/allowlist/add`, `POST /api/v1/allowlist/remove`, `GET /api/v1/logs/stream`, and `POST /api/v1/reload`.

**Orchestrator to MCP Servers:** stdio-based JSON-RPC following the Model Context Protocol standard. Each MCP server is spawned as a subprocess with configuration passed via environment or stdin.

**Orchestrator to Sandbox:** stdio-based JSON-RPC for command execution and file operations. PTY file descriptors are passed for interactive terminal sessions.

**Configuration Management:** All configuration is managed through a unified YAML file located at platform-appropriate paths. Nix generates default values at build time; Owners override through user configuration. Environment variables set by Nix provide runtime paths to the configuration file.

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

## 6. Egress Gateway Architecture

**Technology:** Go or Rust binary, managed by Nix as an independent system service.

The Egress Gateway operates as an independent process with its own lifecycle managed by the platform init system (systemd on Linux, launchd on macOS). It is not embedded within the Orchestrator but communicates via RPC over Unix domain socket.

### Service Architecture

The Egress Gateway consists of two complementary proxy servers that work together to enforce network isolation. The Orchestrator manages the gateway's allowlist through a well-defined HTTP API, ensuring that network policy remains under Orchestrator control while the proxy itself runs as a separate trust boundary.

**HTTP/HTTPS Proxy (Primary):**
The primary proxy listens on a configurable port and implements the HTTP CONNECT method per RFC 7231. When a sandboxed process requests a connection to an external host, the proxy validates the destination domain against the current allowlist before establishing the tunnel. HTTPS traffic is handled transparently — the proxy establishes a tunnel to the target hostname without terminating TLS, preserving end-to-end encryption while allowing domain-based filtering.

**SOCKS5 Proxy (Secondary):**
The secondary proxy handles non-HTTP TCP traffic such as database connections, SSH tunnels, and other protocol-specific communication. The SOCKS5 proxy enforces identical domain allowlist restrictions as the HTTP proxy, ensuring consistent security policy regardless of protocol.

### Connection Flow

When a sandboxed process attempts network communication, the following sequence occurs:

First, the sandboxed process initiates a connection through the configured proxy settings. The Platform Adapter ensures these environment variables are set (`HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`) and that the process cannot bypass them by removing network namespace access.

Second, the proxy receives the connection request and extracts the destination domain from the HTTP CONNECT request (for HTTP) or SOCKS5 handshake (for other protocols). DNS resolution occurs on the host side, preventing the sandboxed process from controlling which IP addresses are contacted.

Third, the proxy checks the destination domain against the current allowlist. Domains are matched using exact string comparison with wildcard support for subdomains. Denied domains take precedence over allowed domains.

Fourth, if the domain is allowed, the proxy establishes the connection to the target and tunnels data bidirectionally. If the domain is denied, the proxy returns a structured JSON error response and closes the connection.

### Allowlist Management

The Orchestrator manages the proxy allowlist through the RPC interface. Before skill execution begins, the Orchestrator calls the proxy management API to temporarily expand the allowlist with domains required by the skill. When skill execution completes, the Orchestrator resets the allowlist to its baseline configuration.

The allowlist supports three tiers of domains: system domains (required for core functionality, cannot be modified), skill domains (temporarily added during skill execution), and owner domains (configured by the Owner for personal integrations). The Orchestrator maintains these tiers separately to ensure skill modifications cannot persist beyond their execution context.

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

Every request processed by the Egress Gateway is logged to SQLite with complete context for security auditing and operational debugging. The Orchestrator retrieves these logs through the RPC interface for centralized analysis.

Log entries include the ISO8601 timestamp, a UUID request identifier, the source process ID, the destination domain and port, the request method, the disposition (allowed or denied), the specific rule that was applied, bytes transferred in each direction, request duration in milliseconds, and the TLS SNI hostname for HTTPS requests.

Log data is retained for 30 days rolling with automatic rotation at 100 megabytes. The Orchestrator provides query APIs for Owners to search and analyze log data for debugging and audit purposes.

### Security Considerations

The proxy implements several security measures beyond simple domain filtering. All proxy connections originate from localhost, preventing external access to the proxy service. The proxy performs hostname validation at the TLS layer, preventing certificate spoofing attacks. CONNECT requests to IP addresses instead of hostnames are denied by default, forcing all traffic through DNS resolution on the host side.

The proxy does not perform content inspection of HTTPS traffic, preserving the confidentiality and integrity of encrypted connections while still enforcing domain-based access control.

---

## 7. Platform Abstractions

The architecture supports both Linux and macOS through clear abstractions that hide platform differences from the Gateway and Agent layers.

### Sandbox Isolation

The system delegates platform-specific sandboxing to the Anthropic Sandbox Runtime, which provides a unified configuration interface while using optimal native mechanisms for each platform. On Linux, the runtime uses `bubblewrap` for filesystem and network isolation with bind mounts for directory permissions. On macOS, the runtime uses `sandbox-exec` with dynamically generated Seatbelt profiles for filesystem restrictions and proxy-based network isolation.

**Runtime Maturity Note:** The Anthropic Sandbox Runtime (`@anthropic-ai/sandbox-runtime`) is currently at version 0.0.35 and is labeled as a "Beta Research Preview." The project is actively maintained with regular CI/CD runs but uses `0.x.y` versioning indicating potential breaking changes before 1.0.0. RealClaw pins to a specific version and monitors the project's changelog for breaking changes. Defense-in-depth measures (egress proxy, credential isolation, content scanning) ensure that sandbox failures do not result in credential exposure or unauthorized network access.

### Platform Path Semantics

The architecture claims the sandbox presents "identical filesystem semantics" across Linux and macOS, but this requires clarification at the Gateway level. The underlying mechanisms differ: bubblewrap on Linux operates on literal paths without glob support, while Seatbelt profiles on macOS support glob patterns for path matching.

The Gateway normalizes all paths to a canonical format before sandbox configuration, ensuring consistent behavior. The Gateway performs path validation against a whitelist of allowed zones—skills, inputs, work, outputs—and resolves all paths to their absolute, literal form. This validation occurs before any sandbox configuration, ensuring the sandbox receives consistent instructions regardless of platform.

This approach means the Gateway bears responsibility for platform compatibility, keeping the sandbox configuration simple and uniform. The Owner experiences identical behavior on both platforms, with the Gateway handling platform-specific details transparently.

### Process Supervision

The Gateway remains the process supervisor, managing child processes directly to ensure they terminate when the session ends or the Gateway shuts down. The Gateway invokes the Anthropic Sandbox Runtime for each command execution, passing the appropriate configuration for the current context (skill execution, interactive session, or scheduled task).

### Resource Limits

Resource limits are applied transparently by the sandbox runtime. On Linux, cgroups provide hard limits on CPU time, memory consumption, and process count. On macOS, the runtime combines Seatbelt profile restrictions with process timeout mechanisms to achieve similar isolation. The runtime handles platform-specific resource limit configuration internally, presenting a consistent API to the Gateway.

### Filesystem Zones

Both platforms support the same zone taxonomy through the sandbox runtime's bind mount (Linux) and Seatbelt profile (macOS) mechanisms. The Gateway specifies zones in platform-agnostic terms, and the runtime handles the translation to platform-specific isolation primitives.

### Browser Automation

Vercel Agent Browser provides cross-platform browser automation. The Gateway wraps Agent Browser commands with appropriate isolation, network policy enforcement, and session management. The Agent Browser is configured to route all traffic through the egress proxy, ensuring browser network activity is subject to the same domain allowlist restrictions as other sandboxed operations.

### Observability Layer

The Gateway exposes a comprehensive observability interface that functions identically on both platforms. The custom OpenTelemetry callback handler provides distributed tracing and metrics collection regardless of underlying platform mechanisms. Health endpoints (`/health`, `/ready`, `/metrics`) use standard Bun runtime HTTP handling that works consistently across Linux and macOS.

Logs are stored in SQLite with platform-agnostic schema, enabling the same querying and analysis workflows regardless of where the system runs. The Gateway ensures log files are written to platform-appropriate data directories (systemd-compatible on Linux, standard application support directories on macOS) while maintaining consistent access patterns for the Owner.

### Cross-Platform Implementation Details

The Gateway implements several patterns to ensure consistent behavior across Linux and macOS despite underlying platform differences.

**Filesystem Isolation Mechanisms:**

| Aspect | Linux (Bubblewrap) | macOS (Sandbox-exec) |
|--------|-------------------|---------------------|
| **Mechanism** | Bind mounts (`--bind`, `--ro-bind`) | Seatbelt profile rules |
| **Pattern Matching** | Literal paths only (no glob support) | Native glob/regex via regex conversion |
| **Deny Protection** | Mount `/dev/null` or tmpfs over paths | Explicit `deny` rules in profile |
| **Non-existent Files** | Cannot protect (bind mount creates files) | Pattern-based rules block creation |
| **Symlink Handling** | Detects and mounts `/dev/null` at symlink paths | Uses `subpath` matching |

The Platform Adapter handles these differences by:
1. Normalizing all paths to absolute, literal form before validation
2. Warning when glob patterns are used (they won't work on Linux)
3. Expanding glob patterns to literal paths where possible
4. Using platform-specific configuration for edge cases

**Network Isolation Architecture:**

| Aspect | Linux (Bubblewrap) | macOS (Sandbox-exec) |
|--------|-------------------|---------------------|
| **Mechanism** | Network namespace + Unix socket bridges | Seatbelt profile rules |
| **Proxy Communication** | Unix domain sockets + `socat` bridge processes | Direct localhost TCP connections |
| **DNS Resolution** | Through SOCKS5 proxy | Same, via proxy configuration |
| **Environment Variables** | `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` | Same set |

Both platforms route all network traffic through the Egress Gateway (HTTP CONNECT on configurable port, SOCKS5 on configurable port) with domain allowlist enforcement.

**Unix Domain Socket Restrictions:**

| Aspect | Linux (Bubblewrap) | macOS (Sandbox-exec) |
|--------|-------------------|---------------------|
| **Mechanism** | Seccomp BPF filter (syscall-level) | Seatbelt profile rules |
| **Path-based Filtering** | Not possible (seccomp can't inspect paths) | Supported via `subpath` rules |
| **Architecture Support** | x64 and ARM64 only (pre-built binaries) | All architectures (native) |

On Linux, the sandbox runtime blocks `socket(AF_UNIX, ...)` syscalls at the kernel level. Path-specific allowlisting is not supported on Linux; the Gateway can only allow or disallow all Unix sockets.

**Violation Detection and Monitoring:**

| Aspect | Linux (Bubblewrap) | macOS (Sandbox-exec) |
|--------|-------------------|---------------------|
| **Built-in Logging** | None (requires strace) | Native kernel log integration |
| **Real-time Monitoring** | Not available | Native via `log stream` |
| **Implementation** | Manual syscall tracing | Event-driven via `os_log` |

The Platform Adapter configures macOS violation monitoring where available and logs violations to the audit trail.

**Recommended Configuration Patterns:**

```json
// ❌ Avoid: Glob patterns that won't work on Linux
{
  "filesystem": {
    "allowWrite": ["src/**/*.ts"]
  }
}

// ✅ Use: Literal paths that work everywhere
{
  "filesystem": {
    "allowWrite": ["src/", "test/"]
  }
}

// ✅ Use: Platform-specific fallback for advanced cases
{
  "filesystem": {
    "allowWrite": ["src/"],
    "linux": {
      "allowWrite": ["src/utils/", "src/components/"]
    }
  }
}
```

---

## 8. Middleware Composition

The Orchestrator composes multiple LangChain.js extensions in a defined order. The architecture distinguishes between **callback handlers** (passive observability instrumentation) and **middleware** (active execution modification). This distinction matters: callback handlers observe and record without modifying behavior, while middleware can transform inputs, inject context, or interrupt execution.

Callback handlers provide passive instrumentation for logging, tracing, metrics collection, and content scanning. They can stack in any order since they don't interfere with each other. Middleware provides active modification of the agent's execution flow—later middleware operates on the outputs of earlier middleware, so order matters.

### 8.1 Callback Handlers: Observability Foundation

The Orchestrator implements callback handlers that intercept all agent lifecycle events and emit telemetry. These handlers are always active and form the observability foundation.

**Logger Callback Handler** instruments all hooks, writes structured records to SQLite. Captures tool invocations, model calls, and agent turn completions with timestamps, request IDs, and durations. All log entries include correlation identifiers for tracing related operations across middleware.

**OpenTelemetry Callback Handler** provides distributed tracing and metrics collection through custom implementation. The handler intercepts LLM calls, tool invocations, chain executions, and memory operations, transforming events into a canonical telemetry format. This format can be exported to OpenTelemetry collectors for enterprise environments, to LangSmith for development debugging, or retained in SQLite for audit purposes. The handler sanitizes sensitive data before export, ensuring credentials never flow through telemetry pipelines.

**Content Scanning Callback Handler** scans all outbound content for credential leaks, PII, and policy violations before delivery to any channel. This handler runs last in the callback chain to ensure complete response scanning.

### 8.2 Middleware Stack: Agent Orchestration

Middleware provides active execution modification. The stack is organized into three tiers: foundational policy, agent capabilities, and operational concerns. The ordering matters — later middleware operates on the outputs of earlier middleware, so order matters.

**Tier 1: Foundational Policy**

1. **Policy Middleware** validates terminal package requests, gates delivery with content scanning, and enforces rate limits. This middleware enforces the security boundaries that define what the Agent can do.

**Tier 2: Agent Capabilities**

2. **Cron Middleware** detects scheduled task triggers and invokes the Agent with scheduled task context.

3. **Web Search Middleware** provides web search tools (web_search, code_search, web_fetch) through Gateway-mediated Exa API calls.

4. **Browser Middleware** provides browser automation tools via Vercel Agent Browser, managing session isolation and proxy enforcement.

5. **Memory Middleware** retrieves relevant memories before model calls, extracts and consolidates memories after agent completion. Manages three-tier recall: checkpointer (state), message log (conversation history), memory bank (semantic).

6. **MCP Adapter Middleware** provides access to Model Context Protocol servers through the LangChain MCP adapter. Handles connection lifecycle, capability negotiation, and tool routing for MCP-connected services.

7. **Skill Loader Middleware** injects skill manifests into the agent's context based on the current task.

8. **Sub-Agent Middleware** provides task delegation capabilities for complex work distribution.

**Tier 3: Operational Concerns**

9. **Summarization Middleware** compresses older messages when context exceeds configured token thresholds.

10. **Human-in-the-Loop Middleware** interrupts on configured operations for Owner approval via Telegram inline keyboards.

### Observability Layer

The Gateway implements a comprehensive observability layer built on callback handlers that provide operational visibility, performance monitoring, and security auditing. This layer is essential for debugging, incident response, and ensuring the system operates within expected parameters.

**Structured Logging:**
The Logger Callback Handler captures all Agent operations with complete context. Each log entry includes the timestamp (ISO8601 format), a UUID request identifier, the operation type (tool_call, model_invoke, agent_turn), the target resource (tool name, model identifier), the arguments or prompt content (sanitized of credentials), the result or error, the execution duration in milliseconds, and correlation identifiers for tracing related operations across middleware.

Logs are stored in SQLite with automatic rotation at 100 megabytes and retention for 30 days. The Gateway provides query APIs for the Owner to search and analyze log data for debugging and audit purposes.

**Distributed Tracing:**
The OpenTelemetry Callback Handler creates distributed traces through custom implementation. Unlike native OpenTelemetry integrations, the Gateway implements a callback handler that intercepts LLM calls, tool invocations, and chain executions, transforming these events into a canonical telemetry format. This format can be exported to OpenTelemetry Protocol (OTLP) collectors for enterprise environments, to LangSmith for development debugging, or retained in SQLite for audit purposes.

Traces capture the complete execution path of each Agent operation: from initial request receipt through callback processing, model invocations, tool calls, and final response delivery. Each trace includes span data for timing, span relationships for call hierarchy, span attributes for operation context, and span events for significant occurrences. The handler sanitizes sensitive data—including credentials and PII—before export, ensuring security boundaries are respected in telemetry pipelines.

**Metrics Collection:**
The Gateway exposes Prometheus-compatible metrics at the `/metrics` endpoint. Key metrics include HTTP request counts by status code and endpoint, tool invocation counts by tool name and success/failure, Agent turn counts by session type, egress proxy request counts by disposition, model invocation counts by provider and model, and resource utilization metrics (memory, CPU where available).

**Health Endpoints:**
The Gateway exposes standardized health endpoints for operational monitoring. The `/health` endpoint returns a simple 200 OK response indicating the process is running. The `/ready` endpoint performs dependency checks (database connectivity, MCP server availability) and returns 200 only when all dependencies are healthy. The `/metrics` endpoint serves Prometheus metrics for monitoring systems. The `/version` endpoint returns version information for debugging.

**Security Auditing:**
All security-relevant events are logged with complete context for audit purposes. These events include authentication attempts (successful and failed), authorization decisions (allowed and denied), configuration changes, session lifecycle events (start, end, termination), and security constraint violations. Audit logs are append-only and cryptographically signed to prevent tampering.

---

## 9. Data Flow

### Interactive Path

When the Owner sends a message via Telegram, grammY receives the update. The Orchestrator computes the day-based thread ID and invokes the agent. **The `SOUL.md` identity is injected into the system prompt.** The Agent processes the request.

### Scheduled Path

When a scheduled task fires, the Orchestrator invokes the Agent with the scheduled task.

### Telegram Integration Lifecycle

The Orchestrator integrates with Telegram through grammY, supporting webhook mode for production deployments and long-polling mode for development environments.

**Webhook Mode (Production):**
The Orchestrator exposes an HTTP endpoint that receives Telegram updates via POST requests. Before accepting any update, the Orchestrator verifies the request originated from Telegram by validating the cryptographic signature computed from the bot token and update payload. Updates are deduplicated using their unique update identifiers to prevent duplicate processing during webhook retries. The Orchestrator implements rate limiting to comply with Telegram's requirements and protect against abuse.

**Long Polling Mode (Development):**
For development environments where exposing a webhook endpoint is impractical, the Orchestrator uses grammY's long-polling mechanism to receive updates. This mode provides equivalent functionality while simplifying local development workflow.

**Graceful Shutdown:**
The Orchestrator registers handlers for SIGINT and SIGTERM signals to ensure clean shutdown. On shutdown, the Orchestrator stops accepting new updates, waits for in-flight requests to complete (up to a configurable timeout), acknowledges the final update, and then terminates. This ensures no messages are lost during Orchestrator restarts.

**Update Processing:**
Updates are processed within the context of a session identified by the combination of chat identifier and date. The Orchestrator maps each update to its corresponding session, enabling conversation continuity within a single day while maintaining clean session boundaries across days.

### MCP Integration

The Orchestrator integrates with Model Context Protocol servers through the LangChain MCP adapter (`@langchain/mcp-adapters`). This integration enables the Agent to access external services (Slack, Discord, email, calendars, custom services) through a standardized protocol interface.

**Connection Management:**
The Orchestrator maintains persistent connections to configured MCP servers using the MCP TypeScript SDK. Connections are established during Orchestrator startup and persist throughout the Orchestrator lifecycle. The Orchestrator handles connection failures with automatic reconnection and exponential backoff.

**Capability Negotiation:**
During connection establishment, the Orchestrator negotiates capabilities with each MCP server, determining which tools, resources, and prompts are available. The Orchestrator enforces a tool allowlist policy, ensuring the Agent can only access MCP tools that have been explicitly approved by the Owner.

**Request Routing:**
When the Agent invokes an MCP tool, the Orchestrator routes the request through the MCP adapter to the appropriate server. The adapter handles protocol serialization, request routing, and response deserialization transparently. Tool results are sanitized before being returned to the Agent, removing any protocol-specific metadata.

**Security Considerations:**
MCP servers run as separate processes outside the sandbox, preventing them from accessing sandboxed resources directly. All MCP communication is logged through the observability middleware, providing complete audit trails. The Orchestrator validates all MCP responses against expected schemas to prevent protocol confusion attacks.

### Terminal Execution Path

When the Agent calls the terminal tool, the Orchestrator invokes the Anthropic Sandbox Runtime with the appropriate configuration for the current context. The sandbox runtime enforces filesystem and network restrictions, routing all network traffic through the Egress Gateway.

### Browser Execution Path

When the Agent calls the browser tool, the Orchestrator invokes Agent Browser with the appropriate action. The browser is configured with proxy settings that route all network traffic through the Egress Gateway, enforcing domain allowlists on all web requests. Browser sessions are isolated per conversation thread with unique profiles to prevent state leakage between conversations.

### Skill Execution Path

When the Agent executes skill scripts, the Orchestrator detects the skill context and updates the Egress Gateway allowlist to include any domains the skill requires. The Orchestrator also updates the sandbox runtime configuration to match the skill's trust tier and required filesystem permissions. After skill execution completes, the Orchestrator resets both the proxy allowlist and sandbox configuration to baseline values.

### MCP Integration Path

When the Agent calls an MCP tool, the Orchestrator routes the request through the LangChain MCP adapter to the appropriate MCP server. The MCP adapter handles connection lifecycle, capability negotiation, and error handling transparently. MCP tool calls are subject to the same observability and logging middleware as native tools, ensuring complete audit trails regardless of the tool's origin.

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

## 10.1 Constitutional Documents Framework

RealClaw implements a three-tier constitutional hierarchy that defines the Agent's identity, boundaries, and operational context. These documents are never materialized in the sandbox filesystem — they are injected directly into the Agent's system prompt by the Gateway at runtime. This design prevents exfiltration of the "Constitution" via file copy operations and ensures the Agent cannot reason about or manipulate its own constraints.

### The Constitutional Hierarchy (Priority Order)

The three constitutional documents have a strict priority order that reflects their purpose and scope:

1. **SOUL.md (Highest Priority)** — Defines the Agent's immutable identity, core values, and fundamental behavioral principles. This document shapes who the Agent is at the deepest level.

2. **SAFETY.md (Medium Priority)** — Defines environment-specific safety constraints, sandbox boundaries, and operational limits. This document provides the Agent with context about its execution environment and the defensive measures in place.

3. **AGENTS.md (Lowest Priority)** — Owner-managed configuration providing context about the specific deployment, user preferences, and operational guidance. This document tailors the Agent to the Owner's needs.

### SOUL.md: Agent Identity and Values

The SOUL.md document draws inspiration from Anthropic's Constitutional AI approach as documented in https://www.anthropic.com/constitution. This document should contain:

**Core Identity Elements:**
- The Agent's name, role, and primary purpose
- The context in which the Agent operates (personal AI assistant)
- The relationship between the Agent, the Owner, and the Project

**Value Principles (Anthropic-Inspired Framework):**
- **Helpfulness:** The Agent should be genuinely helpful to the Owner while avoiding harmful actions
- **Honesty:** The Agent should be truthful and acknowledge uncertainty rather than fabricating information
- **Harmlessness:** The Agent should avoid facilitating illegal, unethical, or dangerous activities
- **Transparency:** The Agent should be clear about its capabilities and limitations

**Behavioral Guidelines:**
- How to handle requests that conflict with the Owner's best interests
- Guidelines for escalation and seeking clarification
- Principles for balancing competing values (e.g., helpfulness vs. safety)

The SOUL.md document is written with the Agent as its primary audience, optimized for precision over accessibility. It should be written in a way that the Agent can reason about and apply to novel situations.

### SAFETY.md: Environment and Harness Context

The SAFETY.md document provides the Agent with explicit context about its execution environment and the defensive measures that protect both the Owner and the system. This document serves as a "Defense in Depth" layer alongside the architectural sandboxing and policy enforcement mechanisms. It should contain:

**Sandbox Context:**
- Description of the filesystem isolation zones and their purposes
- Explanation that network access is mediated through an egress proxy
- Clarification that terminal commands run in an isolated environment

**Operational Boundaries:**
- Specific categories of actions that require human approval (Human-in-the-Loop)
- Guidelines for interacting with external services (Telegram, MCP servers)
- Constraints on data handling and information disclosure

**Failure Mode Awareness:**
- How to behave when system constraints are encountered
- Guidelines for handling errors and unexpected situations
- Principles for communicating limitations to the Owner

The SAFETY.md document helps the Agent understand why certain constraints exist, making it more likely to work within them effectively rather than attempting to circumvent them.

### AGENTS.md: Owner Configuration (Following the AGENTS.md Standard)

RealClaw follows the AGENTS.md standard (https://agents.md/) — an open format for guiding AI agents, stewarded by the Agentic AI Foundation under the Linux Foundation. This document provides operational context specific to the Owner's deployment. The AGENTS.md standard is widely adopted across the AI coding agent ecosystem with support from OpenAI Codex, Google Jules, Cursor, Aider, and over 60,000 open-source projects.

**Expected AGENTS.md Sections:**
- **Dev Environment Tips:** Commands and conventions specific to this deployment
- **Testing Instructions:** How to verify the Agent is functioning correctly
- **Operational Notes:** Common issues and their resolutions
- **Configuration Guidelines:** How to customize the Agent's behavior

**Nesting Support:** In a monorepo context, AGENTS.md files can be placed in subdirectories for specialized configurations. RealClaw follows this pattern where applicable.

### Document Injection Mechanism

All three constitutional documents are read by the Orchestrator at startup from the Host filesystem (`identity/` directory) and injected directly into the Agent's system prompt. The injection order follows the priority hierarchy:

```
System Prompt = SOUL.md + SAFETY.md + AGENTS.md + Runtime Context
```

This ensures that the Agent's immutable identity (SOUL.md) is never overridden by situational context (AGENTS.md), while still allowing the Owner to provide meaningful operational guidance.

**Security Property:** Since the constitutional documents exist only in the Orchestrator's runtime memory and are never written to the sandbox filesystem, the Agent cannot:
- Read the documents to identify gaps or inconsistencies
- Copy the documents to preserve them across sessions
- Reason about the documents as external entities that could be manipulated

---

## 10.2 Operational Concerns and Best Practices

RealClaw is designed for single-tenant, owner-operated deployment. While the architecture document focuses on foundational design rather than operational procedures, the following best practices inform the implementation and should be documented in the operational handbook.

### Health Checks and Readiness Monitoring

The Orchestrator exposes standardized health endpoints for operational monitoring:

- **`/health` (Liveness):** Returns 200 OK if the process is running. Used by process supervisors to detect hung processes.
- **`/ready` (Readiness):** Returns 200 OK only when all dependencies are healthy. Verifies database connectivity, MCP server availability, and Egress Gateway status. Owners can configure additional health checks via middleware.
- **`/metrics` (Prometheus):** Exposes Prometheus-compatible metrics for monitoring systems. Key metrics include HTTP request counts, tool invocation counts, proxy dispositions, and resource utilization.
- **`/version`:** Returns version information for debugging and support.

**Recommended Monitoring Thresholds:**
- Liveness failures trigger immediate restart via process supervision
- Readiness failures trigger alerts to the Owner and prevent new session starts
- Egress Gateway denial rate > 1% of total requests triggers alerts (potential misconfiguration)

### Graceful Shutdown and Recovery

The Orchestrator implements graceful shutdown handlers for SIGINT and SIGTERM signals:

1. **Signal Reception:** The Orchestrator stops accepting new requests
2. **Drain Timeout:** In-flight requests complete within a configurable timeout (default: 30 seconds)
3. **Final Acknowledgment:** The final update is acknowledged before termination
4. **State Persistence:** LangGraph checkpointer ensures durable state is flushed
5. **Process Exit:** The Orchestrator terminates cleanly

**Recovery Properties:**
- LangGraph SqliteCheckpointer ensures session state survives Orchestrator restarts
- SQLite Write-Ahead Logging (WAL) mode ensures crash consistency
- Daily automated backups protect against database corruption

### Data Persistence and Backup Strategy

All persistent state is stored in SQLite databases:

| Data Type | Database | Table(s) | Purpose |
|-----------|----------|----------|---------|
| Agent State | `checkpoints.db` | `checkpoints`, `writes` | LangGraph state persistence |
| Message Log | `messages.db` | `messages` | Cross-session conversation history |
| Semantic Memory | `memory.db` | `memories` | Long-term memory bank |
| Audit Logs | `audit.db` | `logs` | Security-relevant events |
| Proxy Access | `proxy.db` | `requests` | Network egress logging |

**Backup Strategy:**
- Automated daily backups using SQLite's online backup API
- Compressed archives with 7-day retention
- Automatic integrity checks during backup creation
- Recovery commands available for Owners to restore from backup

**Data Retention:**
- Proxy logs: 30 days rolling with 100MB automatic rotation
- Audit logs: 30 days rolling (appended, cryptographically signed)
- Messages: Retained indefinitely (Owner-configurable retention)
- Memories: Retained indefinitely (Owner-configurable retention)

### Restart and Recovery Procedures

**Orchestrator Restart (Graceful):**
1. Owner sends SIGTERM or uses management command
2. Orchestrator stops accepting new requests
3. In-flight requests complete or timeout
4. State is persisted to SQLite
5. Orchestrator exits cleanly

**Orchestrator Restart (Force):**
1. Process supervisor sends SIGKILL or restarts the process
2. LangGraph checkpointer recovers state from SQLite
3. Session continues from the last checkpoint
4. No data loss beyond the last checkpoint

**Sandbox Runtime Recovery:**
- Sandbox violations are detected and logged
- Failed tool invocations return structured error responses
- The Agent receives error context and can retry with corrected parameters
- Persistent violations trigger Owner alerts

### Logging and Audit Trail Integrity

All logs are stored in SQLite with the following integrity protections:

- **Append-Only Design:** Log entries are never modified after insertion
- **Correlation Identifiers:** Each operation includes a UUID for tracing across middleware
- **Sanitization:** Credentials and sensitive data are removed before logging
- **Cryptographic Signing:** Security-relevant events are signed to detect tampering

**Audit Events:**
- Authentication attempts (successful and failed)
- Authorization decisions (allowed and denied)
- Configuration changes
- Session lifecycle events (start, end, termination)
- Security constraint violations

### Resource Management

**Resource Limits (Platform-Specific):**
- **Linux:** cgroups enforce CPU time, memory consumption, and process count limits
- **macOS:** Seatbelt profile restrictions combined with process timeout mechanisms

**Recommended Resource Allocation:**
- Memory limit: 2GB per Orchestrator instance
- CPU limit: 80% of available cores (prevents resource contention)
- Session timeout: 4 hours of inactivity (triggers graceful session end)
- Tool execution timeout: 300 seconds per command

### Port and Network Configuration

The Orchestrator and Egress Gateway bind to `127.0.0.1` or a Tailscale interface only. No network-level authentication is required since network reachability equals authorization in a single-tenant deployment.

**Default Ports:**
- Orchestrator HTTP: 127.0.0.1:3000 (configurable)
- Egress HTTP Proxy: 127.0.0.1:8080
- Egress SOCKS5 Proxy: 127.0.0.1:1080

---

## 11. Security Constraints (The "Never" List)

1.  **Never** run terminal sessions as root inside the sandbox.
2.  **Never** mount credentials into the sandbox or expose them in the Agent's context.
3.  **Never** mount `identity/` files into the sandbox. Identity is injected via prompt only.
4.  **Never** bypass path validation for file operations.
5.  **Never** allow direct network access from the sandbox — all egress routes through the Egress Gateway.
6.  **Never** bind services to `0.0.0.0`.
7.  **Never** persist terminal sessions across Orchestrator restarts.
8.  **Never** expose sandbox internals to the Agent — packages appear available without explanation.
9.  **Never** trust path input without resolution and validation.
10. **Never** return silent failures.
11. **Never** allow the Agent to directly read or write memory storage.
12. **Never** execute skill scripts without prior LLM analysis and Owner approval.
13. **Never** allow browser automation without Egress Gateway enforcement.
14. **Never** share browser profiles between conversations.
15. **Never** skip webhook verification for Telegram integration.
16. **Never** connect MCP servers without capability negotiation.
17. **Never** expose Egress Gateway management API to unauthenticated requests.
18. **Never** log credentials or sensitive configuration data.
19. **Never** allow Unix socket access from sandboxed processes without explicit configuration.
20. **Never** bypass the Anthropic Sandbox Runtime for command execution.
