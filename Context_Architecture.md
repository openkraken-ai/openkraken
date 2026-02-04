# Context_Architecture.md
## Architectural Structure and System Design

### Structural Hints

- [Lines 23-35] **Four Architectural Entities:**
  - **Project** — The framework itself defining platform skills, default policies, security constraints, and the "Constitution" (`SOUL.md`, `SAFETY.md`). Authority on _how_ the system works.
  - **Owner** — The person installing and running an instance with full system access.
  - **Agent** — The LLM-driven runtime operating inside the sandbox as a managed sub-system.
  - **Egress Gateway** — Network boundary component implementing HTTP CONNECT proxy with domain allowlisting (Go or Rust binary).
  - **Orchestrator** — Agent orchestration component managing LangChain/LangGraph runtime (Bun with TypeScript).
  - **Platform Adapter** — Cross-platform abstraction layer handling OS-specific behaviors (runtime detection within Orchestrator).

- [Lines 37-38] **Trust Boundaries:** Owner trusts Project (by choosing to install). Project trusts Owner (full configuration authority). Neither trusts Agent (deterministic constraints). Orchestrator does not trust Egress Gateway — communication follows strict RPC patterns.

- [Lines 124-142] **Layer -1: Platform Manager:** Nix Flakes with NixOS (Linux) and Nix Darwin (macOS) modules. Generates platform-appropriate service definitions, manages directory conventions, establishes credential boundaries, handles update orchestration with atomic switchover, and manages process lifecycle.

- [Lines 142-164] **Layer 0: The Host:** Unix/Linux/macOS user-space with Nix-managed services. Responsibilities include identity injection, credential storage (CredentialVault abstraction), egress proxy provision, process supervision, timer management, network binding (127.0.0.1 only), and filesystem zones.

- [Lines 164-197] **Layer 1: The Sandbox:** Anthropic Sandbox Runtime (`@anthropic-ai/sandbox-runtime`) providing filesystem and network isolation. Uses OS-native sandboxing mechanisms without container overhead. Bubblewrap on Linux, sandbox-exec (Seatbelt) on macOS.

- [Lines 197-243] **Layer 3: The Orchestrator:** Bun/TypeScript runtime managing agent loop, tool dispatch, policy enforcement, state management. Uses LangChain.js v1 `createAgent()` API, LangGraph for state management. Primary channel: Telegram (grammY). Secondary channels: MCP servers.

- [Lines 659-666] **Repository Organization:**
  - `system/` — Layer 0 host configuration (flake definition, service configs, egress proxy)
  - `runtime/` — Layer 1 sandbox configuration (Anthropic Sandbox Runtime settings)
  - `gateway/` — Layer 2 Gateway implementation (Bun/TypeScript)
  - `skills/` — Ingested skills
  - `identity/` — The Constitution: `SOUL.md` and `SAFETY.md` (Host Only)
  - `observability/` — OpenTelemetry setup, logging schemas
  - `mcp/` — MCP server configurations and connection definitions

### Flow Requirements

- [Lines 591-593] **Interactive Path:** When Owner sends message via Telegram, grammY receives update. Orchestrator computes day-based thread ID and invokes agent. `SOUL.md` identity is injected into system prompt.

- [Lines 595-597] **Scheduled Path:** When scheduled task fires, Orchestrator invokes Agent with scheduled task context.

- [Lines 631-633] **Terminal Execution Path:** When Agent calls terminal tool, Orchestrator invokes Anthropic Sandbox Runtime with appropriate configuration. Sandbox runtime enforces filesystem and network restrictions, routing all traffic through Egress Gateway.

- [Lines 635-637] **Browser Execution Path:** When Agent calls browser tool, Orchestrator invokes Agent Browser with appropriate action. Browser configured with proxy settings routing all traffic through Egress Gateway, enforcing domain allowlists.

- [Lines 639-641] **Skill Execution Path:** When Agent executes skill scripts, Orchestrator detects skill context and updates Egress Gateway allowlist to include required domains. Orchestrator updates sandbox configuration to match skill's trust tier and required permissions. After execution, Orchestrator resets both to baseline.

- [Lines 243-252] **Inter-Process Communication:** Well-defined RPC patterns: Orchestrator to Egress Gateway (HTTP over Unix domain socket), Orchestrator to MCP servers (stdio-based JSON-RPC), Orchestrator to Sandbox (stdio-based JSON-RPC with PTY for interactive sessions).

### Scale/Performance Hints

- [Lines 228-230] **Durable State:** LangGraph `SqliteCheckpointer` persists agent state across Orchestrator restarts using Write-Ahead Logging (WAL) mode for concurrent access. Automated daily backups with compressed archives, 7-day retention, integrity checks.

- [Lines 860-863] **Resource Allocation:** Memory limit: 2GB per Orchestrator instance. CPU limit: 80% of available cores (prevents resource contention). Session timeout: 4 hours of inactivity. Tool execution timeout: 300 seconds per command.

- [Lines 385-387] **Proxy Logging:** Log data retained for 30 days rolling with automatic rotation at 100 megabytes. Orchestrator provides query APIs for Owners to search and analyze log data.

- [Lines 569-571] **Structured Logging:** SQLite storage with automatic rotation at 100 megabytes and 30-day retention. Correlation identifiers for tracing related operations across middleware.

### Filesystem Zone Taxonomy

- [Lines 188-195] **Zone Structure:**
  | Zone     | Path                 | Permissions | Persistence           | Purpose                                   |
  | -------- | -------------------- | ----------- | --------------------- | ----------------------------------------- |
  | Skills   | `/sandbox/skills/`   | Read-Only   | Immutable per session | Skill folders organized by trust tier     |
  | Inputs   | `/sandbox/inputs/`   | Read-Only   | Per-session           | User-provided files, channel attachments  |
  | Work     | `/sandbox/work/`     | Read-Write  | Per-session           | Scratch space, intermediate files         |
  | Outputs  | `/sandbox/outputs/`   | Read-Write  | Per-session           | Delivery staging area                     |

### Constitutional Hierarchy

- [Lines 677-686] **Priority Order:**
  1. **SOUL.md (Highest)** — Agent's immutable identity, core values, fundamental behavioral principles.
  2. **SAFETY.md (Medium)** — Environment-specific safety constraints, sandbox boundaries, operational limits.
  3. **AGENTS.md (Lowest)** — Owner-managed configuration providing deployment context, user preferences, operational guidance.

- [Lines 746-750] **Document Injection Mechanism:** System Prompt = SOUL.md + SAFETY.md + AGENTS.md + Runtime Context. Constitutional documents exist only in Orchestrator's runtime memory, never written to sandbox filesystem.

### Platform-Specific Details

- [Lines 415-417] **Process Supervision:** The Gateway remains the process supervisor, managing child processes directly to ensure they terminate when the session ends or the Gateway shuts down. The Gateway invokes the Anthropic Sandbox Runtime for each command execution, passing the appropriate configuration for the current context (skill execution, interactive session, or scheduled task).

- [Lines 419-421] **Resource Limits:** Resource limits are applied transparently by the sandbox runtime. On Linux, cgroups provide hard limits on CPU time, memory consumption, and process count. On macOS, the runtime combines Seatbelt profile restrictions with process timeout mechanisms to achieve similar isolation. The runtime handles platform-specific resource limit configuration internally, presenting a consistent API to the Gateway.

- [Lines 423-425] **Filesystem Zones:** Both platforms support the same zone taxonomy through the sandbox runtime's bind mount (Linux) and Seatbelt profile (macOS) mechanisms. The Gateway specifies zones in platform-agnostic terms, and the runtime handles the translation to platform-specific isolation primitives.

- [Lines 427-429] **Browser Automation:** Vercel Agent Browser provides cross-platform browser automation. The Gateway wraps Agent Browser commands with appropriate isolation, network policy enforcement, and session management. The Agent Browser is configured to route all traffic through the egress proxy, ensuring browser network activity is subject to the same domain allowlist restrictions as other sandboxed operations.

- [Lines 431-435] **Observability Layer:** The Gateway exposes a comprehensive observability interface that functions identically on both platforms. The custom OpenTelemetry callback handler provides distributed tracing and metrics collection regardless of underlying platform mechanisms. Health endpoints (`/health`, `/ready`, `/metrics`) use standard Bun runtime HTTP handling that works consistently across Linux and macOS. Logs are stored in SQLite with platform-agnostic schema, enabling the same querying and analysis workflows regardless of where the system runs. The Gateway ensures log files are written to platform-appropriate data directories (systemd-compatible on Linux, standard application support directories on macOS) while maintaining consistent access patterns for the Owner.

### Recommended Configuration Patterns

- [Lines 490-514] **JSON Configuration Examples:**
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