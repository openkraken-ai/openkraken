# Context_TechSpec.md
## Technical Specifications and Technology Stack

### Mandated Stack

- [Lines 201-208] **Technology Stack (Pinned Versions):**
  - **Bun Runtime:** 1.3.8 (latest stable as of February 2026) — exact version required
  - **LangChain.js:** 1.2.16 (core library) — agent orchestration and tool definitions
  - **LangGraph.js:** 1.1.3 (@langchain/langgraph core) / 1.0.19 (langgraph wrapper) — stateful workflow management
  - **@langchain/mcp-adapters:** 1.1.2 — Model Context Protocol integration
  - **grammY:** Supports Telegram Bot API 9.3 (December 2025 release) — Telegram protocol handling
  - **@anthropic-ai/sandbox-runtime:** 0.0.35 — cross-platform process isolation (Beta Research Preview)
  - **Vercel Agent Browser:** 0.9.0 — headless browser automation
  - **SQLite:** 3.x (bundled with Bun runtime) — durable state persistence

- [Lines 210] **Dependency Management:** All dependencies declared in `package.json` with exact semver ranges. Build process pins transitive dependencies via lockfile to prevent dependency confusion attacks.

- [Lines 126] **Platform Manager:** Nix Flakes with NixOS (Linux) and Nix Darwin (macOS) modules.

- [Lines 331] **Egress Gateway:** Go or Rust binary, managed by Nix as independent system service.

- [Lines 166] **Sandbox Technology:** Anthropic Sandbox Runtime (`@anthropic-ai/sandbox-runtime`).

- [Lines 307] **Skills Format:** AgentSkills.io format.

### Data Models

- [Lines 796-803] **Database Schema:**
  | Data Type | Database | Table(s) | Purpose |
  |-----------|----------|----------|---------|
  | Agent State | `checkpoints.db` | `checkpoints`, `writes` | LangGraph state persistence |
  | Message Log | `messages.db` | `messages` | Cross-session conversation history |
  | Semantic Memory | `memory.db` | `memories` | Long-term memory bank |
  | Audit Logs | `audit.db` | `logs` | Security-relevant events |
  | Proxy Access | `proxy.db` | `requests` | Network egress logging |

- [Lines 367-378] **Structured Error Response Format:**
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

- [Lines 385-386] **Proxy Log Entry Fields:** ISO8601 timestamp, UUID request identifier, source process ID, destination domain and port, request method, disposition (allowed/denied), specific rule applied, bytes transferred in each direction, request duration in milliseconds, TLS SNI hostname.

- [Lines 569-570] **Log Entry Fields:** Timestamp (ISO8601), UUID request identifier, operation type (tool_call, model_invoke, agent_turn), target resource, arguments/prompt content (sanitized), result/error, execution duration (ms), correlation identifiers.

### Infrastructure

- [Lines 132-134] **Service Generation:** Platform-appropriate service definitions from single configuration source. Linux: systemd units. macOS: launchd plists. Application receives configuration through environment variables.

- [Lines 134-136] **Directory Conventions:** Linux: XDG conventions under `/var/lib/`. macOS: Apple guidelines under `~/Library/`. Application adapts via environment variables.

- [Lines 160-161] **Network Binding:** Egress Gateway binds to `127.0.0.1` only. Orchestrator exposes interfaces via Unix domain socket. Sole access control mechanism: network reachability equals authorization.

- [Lines 869-872] **Default Ports:**
  - Orchestrator HTTP: 127.0.0.1:3000 (configurable)
  - Egress HTTP Proxy: 127.0.0.1:8080
  - Egress SOCKS5 Proxy: 127.0.0.1:1080

- [Lines 602-607] **Telegram Integration:** Webhook mode (production) with cryptographic signature verification. Long-polling mode (development). Rate limiting compliance with Telegram requirements.

- [Lines 619-626] **MCP Integration:** Persistent connections using MCP TypeScript SDK. Automatic reconnection with exponential backoff. Capability negotiation during connection establishment. Tool allowlist policy enforced.

### Observability and Health

- [Lines 528-532] **Callback Handlers:**
  - **Logger Callback Handler** — Instruments all hooks, writes structured records to SQLite. Captures tool invocations, model calls, and agent turn completions with timestamps, request IDs, and durations. All log entries include correlation identifiers for tracing related operations across middleware.
  - **OpenTelemetry Callback Handler** — Provides distributed tracing and metrics collection through custom implementation. Transforms events into canonical telemetry format for OTLP collectors, LangSmith, or SQLite audit purposes. Sanitizes sensitive data before export.
  - **Content Scanning Callback Handler** — Scans all outbound content for credential leaks, PII, and policy violations before delivery to any channel. Runs last in the callback chain to ensure complete response scanning.

- [Lines 379] **Proxy HTTP Status Codes:**
  - 407 Proxy Authentication Required — missing or invalid credentials
  - 403 Forbidden — domain not in the allowlist
  - 502 Bad Gateway — upstream proxy failure
  - 504 Gateway Timeout — request timeout

- [Lines 581-582] **Health Endpoints:**
  - `/health` — Liveness probe, returns 200 OK if process running
  - `/ready` — Readiness probe, returns 200 only when all dependencies healthy (database connectivity, MCP server availability, Egress Gateway status)
  - `/metrics` — Prometheus-compatible metrics endpoint
  - `/version` — Returns version information for debugging

- [Lines 805-808] **Backup Implementation:**
  - Automated daily backups using SQLite's online backup API
  - Ensures consistency while system is running
  - Compressed archives with 7-day retention
  - Automatic integrity checks during backup creation
  - Recovery commands available for Owners to restore from backup

### Cross-Platform Implementation Details

- [Lines 443-450] **Filesystem Isolation Mechanisms:**
  | Aspect | Linux (Bubblewrap) | macOS (Seatbelt) |
  |--------|-------------------|------------------|
  | **Mechanism** | Bind mounts (`--bind`, `--ro-bind`) | Seatbelt profile rules |
  | **Pattern Matching** | Literal paths only (no glob) | Native glob/regex |
  | **Deny Protection** | Mount `/dev/null` or tmpfs | Explicit `deny` rules |
  | **Non-existent Files** | Cannot protect (bind creates) | Pattern-based rules block |
  | **Symlink Handling** | Mount `/dev/null` at paths | `subpath` matching |

- [Lines 459-465] **Network Isolation Architecture:**
  | Aspect | Linux | macOS |
  |--------|-------|-------|
  | **Mechanism** | Network namespace + Unix socket bridges | Seatbelt rules |
  | **Proxy Communication** | Unix sockets + `socat` bridge | Direct localhost TCP |
  | **DNS Resolution** | Through SOCKS5 proxy | Same |
  | **Environment Variables** | `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` | Same set |

- [Lines 470-475] **Unix Domain Socket Restrictions:**
  | Aspect | Linux | macOS |
  |--------|-------|-------|
  | **Mechanism** | Seccomp BPF filter (syscall-level) | Seatbelt rules |
  | **Path-based Filtering** | Not possible (seccomp can't inspect) | Supported via `subpath` |
  | **Architecture Support** | x64 and ARM64 only (pre-built) | All architectures (native) |

- [Lines 480-485] **Violation Detection:**
  | Aspect | Linux | macOS |
  |--------|-------|-------|
  | **Built-in Logging** | None (requires strace) | Native kernel log |
  | **Real-time Monitoring** | Not available | Native via `log stream` |
  | **Implementation** | Manual syscall tracing | Event-driven via `os_log` |

- [Lines 452-455] **Platform Adapter Responsibilities:** Normalize paths to absolute literal form, warn when glob patterns used (won't work on Linux), expand glob patterns where possible, use platform-specific configuration for edge cases.

### Tool Specifications

- [Lines 273-277] **File Tools:**
  - **view** — Reads file contents or lists directory contents. Paths must be under `/sandbox/`.
  - **create_file** — Creates/overwrites files. Paths must be under `/sandbox/work/` or `/sandbox/outputs/`.
  - **str_replace** — Replaces unique string in existing file. Paths must be under writable zones.

- [Lines 281-285] **Terminal Tool:** Accepts command string, optional packages array. Packages made available via Nix without Agent understanding mechanism.

- [Lines 289-293] **Browser Tool:** Actions: `open`, `snapshot`, `click`, `type`, `screenshot`, `get_html`. Isolated per conversation thread with unique browser profiles. Network routed through egress proxy.

- [Lines 297] **Network Tools:** Web search, code search, web fetch implemented as Gateway-mediated HTTP calls.

- [Lines 301] **Delivery Tool:** Sends files from outputs zone to channels. Validates source path under `/sandbox/outputs/`.

### Credential Management

- [Lines 152-153] **CredentialVault Abstraction:** macOS: Keychain Services API. Linux: secret-service API (GNOME Keyring, KWallet, pass). Credentials read at startup, stored in memory, never written to filesystem/logs/error messages. Rotation support via re-reading from vaults.

- [Lines 136-137] **Credential Tiers:** Non-sensitive configuration (API endpoints, feature flags) via Nix at build time. Sensitive credentials (API keys, tokens) via OS-level vaults at runtime. Nix never handles sensitive values.

### Skill System

- [Lines 309-312] **Skill Structure:** Folder containing required `SKILL.md` file. Optionally includes `scripts/` directory with executables.

- [Lines 317-319] **Skill Script Pre-Analysis:** Lightweight LLM (Haiku-class) analyzes each script to extract requirements and assess risk. Identifies required interpreters, system packages, network access needs.

- [Lines 321-325] **Tiered Trust Model:** Platform skills (shipped with system), User skills (uploaded by Owner), Community skills (third-party registries).