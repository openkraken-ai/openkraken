# ARCHITECTURE_CHANGELOG.md: Evolution of the Architecture

This document records recent architectural evolution. For full historical changes, see git history.

---

### v0.14.0 — 2026-02-07

**Skill Ingestion Pipeline and Vercel Skills Integration**

This version adds comprehensive skill ingestion pipeline architecture, integrating the Vercel skills CLI while applying OpenKraken's security model. The Agent discovers and activates skills autonomously per AgentSkills.io progressive disclosure.

**Skill Ingestion Pipeline**
* Added Section 5.4 to docs/Architecture.md detailing the complete ingestion pipeline:
  * Source Resolution: Integrated Vercel skills CLI (bundled via Nix) supports GitHub shorthand, full URLs, direct tree paths
  * Structure Validation: Deterministic checks against AgentSkills.io specification
  * LLM Security Analysis: Configurable model (default: Claude Haiku 4.5) analyzes skills for prompt injection, network calls, credential access
  * Owner Approval: Explicit Owner decisions with full analysis reports
  * Dependency Resolution: Nix packages provisioned from `metadata.x-openkraken.dependencies`
  * Activation: Skills moved to active directory with manifest exposed to Agent

**Tiered Trust Model**
* Three tiers defined: System (bundled, project-audited), Owner (uploaded, auto-approve for instruction-only), Community (external, always requires approval)
* Auto-update scope: Only approved skills within configured version bounds
* Provenance: All skill operations logged with source URL, timestamp, and analysis report reference

**Dependency Declaration via Metadata**
* Skills declare dependencies using `metadata.x-openkraken.dependencies` field per AgentSkills.io extensibility
* Example: `metadata.x-openkraken.dependencies.nix: ["ffmpeg", "imagemagick", "jq"]`
* Nix packages pre-provisioned before sandbox invocation, eliminating runtime package installation

**Vercel Skills CLI Integration**
* CLI bundled as Nix package (not `npx`) for reproducibility
* Added `cli/skills/` directory structure to project layout
* Commands: add, list, remove, update, check
* Supports all Vercel resolution patterns while applying security pipeline

**Database Schema Extensions**
* Added Section 3.7 Skill Pipeline Schema to docs/TechSpec.md:
  * `skills` table: skill metadata, version, tier, source, provenance
  * `skill_analysis_reports` table: security analysis findings, risk level, recommendation
  * `skill_audit_log` table: lifecycle actions with actor and details

**Middleware Updates**
* Skill Loader Middleware updated: Exposes manifests to Agent via system prompt, manages version tracking and auto-updates
* Agent discovers skills from manifest and activates them autonomously (not middleware-driven activation)

**Configuration Schema**
* Added `skills` section to docs/TechSpec.md configuration:
  * `enabled`, `defaultTier`, `autoApproveOwnerInstructionOnly`, `autoUpdate`, `analysisModel`, `sources`
  * Default source: `https://github.com/vercel-labs/skills` (community tier)

**Error Handling Extensions**
* Added skill-related degradation modes: ingestion failure (staging), analysis failure (deny-by-default), dependency failure (blocked activation), version drift (auto-update with notification)

---

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
  * Egress Gateway — Network boundary component (Go or Rust binary).
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
* Located at platform-appropriate paths (Linux: `/etc/openkraken/config.yaml`, macOS: `~/Library/Application Support/openkraken/config.yaml`).

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

---

### v0.12.0 — 2026-02-03

Architecture update following comprehensive research phase to verify technology stack versions, document constitutional framework, and add operational best practices. This version introduces the constitutional documents hierarchy (SOUL > SAFETY > AGENTS), cross-platform implementation details, and operational concerns guidance. All changes are additive and maintain backward compatibility with v0.11.0.

**Technology Stack Version Pinning:**
* Added explicit version pins for all dependencies to ensure reproducibility and prevent supply chain attacks.
* Bun Runtime: 1.3.8 (latest stable as of February 2026)
* LangChain.js: 1.2.16 (core library)
* LangGraph.js: 1.1.3 (@langchain/langgraph core) / 1.0.19 (langgraph wrapper)
* @langchain/mcp-adapters: 1.1.2 (Model Context Protocol integration)
* grammY: Supports Telegram Bot API 9.3 (December 2025 release)
* @anthropic-ai/sandbox-runtime: 0.0.34 (Beta Research Preview)
* Vercel Agent Browser: 0.9.0 (headless browser automation)
* All dependencies declared in `package.json` with exact semver ranges; transitive dependencies pinned via lockfile.

**Constitutional Documents Framework (Section 10.1):**
* Added comprehensive framework for three-tier constitutional hierarchy: SOUL.md > SAFETY.md > AGENTS.md
* SOUL.md: Agent identity and values inspired by Anthropic's Constitutional AI approach (https://www.anthropic.com/constitution)
* SAFETY.md: Environment and harness-specific context providing Defense in Depth alongside architectural sandboxing
* AGENTS.md: Owner configuration following the open AGENTS.md standard (https://agents.md/) stewarded by Agentic AI Foundation
* Document injection mechanism ensures constitutional documents exist only in Gateway runtime memory, never materialized in sandbox filesystem

**Cross-Platform Implementation Details (Section 7.x):**
* Added comprehensive comparison of Linux bubblewrap vs macOS sandbox-exec mechanisms
* Documented filesystem isolation differences: bind mounts vs Seatbelt profiles, glob support limitations
* Documented network isolation architecture: Unix socket bridges vs direct localhost TCP
* Documented Unix domain socket restrictions: seccomp BPF vs Seatbelt profile rules
* Documented violation detection: strace requirements on Linux vs native kernel log integration on macOS
* Added recommended configuration patterns with examples of platform-specific vs portable configurations

**Operational Concerns and Best Practices (Section 10.2):**
* Added health check and readiness monitoring specifications for `/health`, `/ready`, `/metrics`, `/version` endpoints
* Added graceful shutdown and recovery procedures with SIGINT/SIGTERM handling
* Added data persistence and backup strategy covering all SQLite databases and retention policies
* Added restart and recovery procedures for Gateway and sandbox runtime
* Added logging and audit trail integrity protections including append-only design and cryptographic signing
* Added resource management recommendations: memory limits, CPU allocation, session timeouts
* Added port and network configuration specifications (127.0.0.1 binding, default ports)

**Sandbox Runtime Maturity Note:**
* Added explicit documentation that Anthropic Sandbox Runtime is at version 0.0.34 (Beta Research Preview)
* Documented 0.x.y versioning indicates potential breaking changes before 1.0.0
* Clarified defense-in-depth measures ensure sandbox failures do not result in credential exposure or unauthorized network access

Major architectural enhancement integrating production-tested security infrastructure, comprehensive observability, and formalized integration protocols. This version replaces custom sandboxing with Anthropic's proven runtime, defines complete egress proxy behavior, and adds systematic observability and lifecycle management. The architecture shifts from "build everything ourselves" to "integrate battle-tested foundations where available, implement custom logic where necessary."

**Anthropic Sandbox Runtime Integration:**
* Replaced custom bubblewrap/sandbox-exec implementation with `@anthropic-ai/sandbox-runtime` for cross-platform consistent isolation.
* Runtime uses `bubblewrap` on Linux and `sandbox-exec` (Seatbelt) on macOS, presenting unified configuration interface.
* Added violation detection mechanisms: macOS taps into system sandbox violation log store; Linux detects via process exit codes.
* Added Unix socket restrictions via seccomp filters (Linux) and Seatbelt profiles (macOS).
* Updated Security Constraint #20: "Never bypass the Anthropic Sandbox Runtime for command execution."

**Comprehensive Egress Proxy Architecture:**
* Complete specification of dual-proxy system: HTTP CONNECT on port 8080 for web traffic, SOCKS5 on port 1080 for non-HTTP protocols.
* Defined connection flow with host-side DNS resolution preventing sandbox control over target IPs.
* Implemented structured JSON error responses with request IDs, timestamps, policy versions, and complete context for debugging.
* Specified comprehensive logging: 12 fields per request including timestamp, UUID, source process, destination domain/port, method, disposition, rule applied, bytes transferred, duration, and TLS SNI.
* Defined three-tier allowlist management: system domains (core functionality), skill domains (temporary during execution), owner domains (personal integrations).
* Added security measures: localhost-only binding, TLS hostname validation, IP address blocking by default.

**Observability Layer Implementation:**
* Added OpenTelemetry Middleware to middleware stack for distributed tracing and metrics collection.
* Exposes Prometheus-compatible metrics at `/metrics` endpoint with comprehensive instrumentation.
* Defined health endpoints: `/health` (liveness), `/ready` (dependency checks), `/metrics` (Prometheus), `/version` (debugging).
* Specified structured logging with SQLite storage, 100MB rotation, 30-day retention.
* Added security auditing with append-only logs and cryptographic signing for tamper prevention.
* Integrated observability into data flow as explicit "Observability Path" section.

**Credential Management Enhancement:**
* Replaced environment variable approach with OS-level credential vaults: macOS Keychain, Linux secret-service API (GNOME Keyring, KWallet, pass).
* Credentials read at startup, stored only in runtime memory, never written to filesystem or logs.
* Added credential rotation support without requiring full Gateway restart.
* Added Security Constraint #18: "Never log credentials or sensitive configuration data."

**Telegram Integration Lifecycle:**
* Added complete webhook mode specification with cryptographic signature verification preventing spoofing attacks.
* Defined long-polling mode for development environments.
* Implemented graceful shutdown handlers for SIGINT/SIGTERM with configurable timeout for in-flight requests.
* Added update deduplication via unique identifiers and rate limiting.
* Added Security Constraint #15: "Never skip webhook verification for Telegram integration."

**MCP Integration Formalization:**
* Added MCP Adapter Middleware to middleware stack using `@langchain/mcp-adapters`.
* Documented connection management with persistent connections, automatic reconnection, and exponential backoff.
* Defined capability negotiation during connection establishment for tool/resource discovery.
* Specified tool allowlist policy enforcement ensuring Agents access only Owner-approved MCP tools.
* Added Security Constraint #16: "Never connect MCP servers without capability negotiation."
* Added Security Constraint #17: "Never expose proxy management API to unauthenticated requests."
* Documented security considerations: MCP servers run outside sandbox, communication logged via observability middleware, schema validation prevents protocol confusion attacks.

**Middleware Stack Expansion:**
* Expanded from 10 to 12 middleware: added OpenTelemetry Middleware (position 2) and MCP Adapter Middleware (position 8).
* Enhanced Logger Middleware with complete specification of log entry fields and correlation identifiers.
* Updated middleware responsibilities to reflect new components and integration patterns.

**State Persistence and Backup:**
* Enhanced SqliteCheckpointer documentation with Write-Ahead Logging (WAL) mode for concurrent access.
* Specified two-table schema: checkpoints and writes for efficient retrieval and rollback.
* Implemented automated daily backups using SQLite online backup API ensuring consistency during operation.
* Defined 7-day retention with compression and automatic integrity checks for corruption detection.

**Core Philosophy Additions (#11, #15, #16, #17):**
* Added "Build on Proven Foundations" — integrate battle-tested solutions for security-critical infrastructure, implement custom only for gateway-specific concerns.
* Added "Observable by Default" — complete visibility into Agent behavior for debugging, audit, and optimization.
* Added "Credential Isolation" — OS-level vaults, never exposed to Agent or written to persistent storage.
* Expanded "Everything is Middleware" to include MCP integration and observability.

**Security Constraints Expansion:**
* Added constraints #15-20: webhook verification, MCP capability negotiation, proxy API authentication, credential logging prevention, Unix socket access control, Anthropic Sandbox Runtime mandate.
* Refined constraint #8 from "Never expose Nix internals" to "Never expose sandbox internals" reflecting runtime abstraction.

**Directory Structure Updates:**
* Added `observability/` directory for OpenTelemetry configuration and logging schemas.
* Added `mcp/` directory for MCP server configurations and connection definitions.
* Updated `system/` to include egress proxy configuration.
* Updated `runtime/` to reference Anthropic Sandbox Runtime settings.

**Platform Abstraction Enhancement:**
* Documented how Anthropic Sandbox Runtime achieves consistent security semantics across Linux and macOS.
* Eliminated previous "accepted limitation" for macOS resource limits — runtime handles platform differences transparently.
* Added observability layer compatibility statement for cross-platform consistency.

**Data Flow Expansion:**
* Added "Telegram Integration Lifecycle" section documenting webhook verification, graceful shutdown, and session mapping.
* Added "MCP Integration Path" section with adapter routing and capability negotiation.
* Added "Observability Path" section with logging, tracing, and metrics flow.
* Enhanced "Skill Execution Path" to include sandbox runtime configuration management.

**Scope Definition Updates:**
* Added observability as primary capability: comprehensive logging, distributed tracing, and metrics.
* Updated integration boundaries to include OpenTelemetry-compatible observability backends.
* Enhanced technology stack listing: Bun + LangChain.js v1 + grammY + @langchain/mcp-adapters + OpenTelemetry.

**Response to OpenClaw Failures:**
* Added new failure category: "Custom Security Infrastructure" — building custom sandboxing leads to gaps; leverage production-tested solutions.
* Enhanced existing failures with specific implementation details: cryptographic verification for Telegram, OS-level vaults for credentials, structured proxy errors and logging.

---

### Earlier Versions (v0.11.0, v0.10.0, v0.9.0, v0.8.0)

For complete history of earlier architectural iterations, see `git log --all -- "docs/Architecture.md" "ARCHITECTURE.md" "MIXED_ARCHITECTURE.md"`. Key developments include:

- **v0.11.0**: Callback vs middleware distinction, custom OpenTelemetry implementation clarification, platform path semantics, credential vault abstraction
- **v0.10.0**: Production-tested security infrastructure integration (Anthropic Sandbox Runtime, comprehensive egress proxy, observability layer)
- **v0.9.0**: Cross-distribution Nix support, identity injection security, scope definition, browser automation
- **v0.8.0**: Cross-platform support (macOS first-class), Nix-native design, lightweight sandboxing (bubblewrap/sandbox-exec)
