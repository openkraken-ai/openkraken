# Context_PRD.md
## Product Requirements Document - Business Objectives and User Needs

### Raw Objectives

- [Lines 5-7] To build a **Deterministic, Security-First Agentic Runtime** that solves the architectural failures of the "OpenClaw" era while leveraging proven, production-tested components from the ecosystem. The system rejects the "Probabilistic Safety" model (trusting the AI to follow rules) in favor of **"Deterministic Safety"** (physically preventing the AI from breaking rules).

- [Lines 7-9] The system treats the Agent not as a user with a shell, but as a **Managed Sub-System** with strictly scoped capabilities. The project believes in **building on proven foundations** rather than reinventing security-critical infrastructure.

- [Lines 11-15] This system is designed for **one person, one instance, one device.** There is no multi-user, no multi-tenant, no shared hosting. Multi-user scenarios are explicitly out of scope. Each device runs exactly one Owner with full system access.

- [Lines 17-19] The system targets both **Linux** and **macOS** as first-class platforms. The Agent experience is identical across platforms — the Agent has no awareness of which operating system it runs on.

- [Lines 59-61] This project builds a **personal AI agent runtime** with bounded capabilities including conversational interaction, terminal execution, file operations, web automation, skill system, scheduled tasks, persistent memory, and observability.

### User Signals

- [Lines 27-29] **Owner Persona:** The person who installs and runs an instance. The Owner provisions credentials, configures integrations, uploads personal skills, and interacts with the Agent. In a single-tenant system, the Owner is the only human in the loop.

- [Lines 213-214] **Entry Points:** The system exposes two interfaces for Owner interaction. The CLI provides power-user operations for configuration, debugging, and automation. The Web UI provides a browser-based interface for casual interaction and monitoring.

- [Lines 159] **Timer Management:** The host system executes scheduled tasks via system timers. When a scheduled task fires, it triggers the Orchestrator, which then invokes the Agent through the normal execution path.

### Business Constraints

- [Lines 43-57] **OpenClaw Failures Informing Architecture:** The specific failures of OpenClaw (née Clawdbot → Moltbot) inform every decision: probabilistic safety vulnerabilities, localhost trust issues with 1,800+ exposed instances on Shodan, flat credential storage in plaintext, unaudited memory writes, uncontrolled egress, no supply chain integrity, no network isolation, and custom security infrastructure gaps.

- [Lines 74-75] **Integration Boundaries:** In Scope includes Telegram, MCP servers (Slack, Discord, email, calendar, custom services), and OpenTelemetry-compatible observability backends. Out of Scope includes Direct WhatsApp integration (requires MCP bridge), native mobile notifications, and voice interfaces.

- [Lines 77-80] **Security Boundaries:** All safety constraints are enforced architecturally, not probabilistically. Zero Trust model with no implicit trust for any input, network connection, or file access. Agent operates inside sandbox; credentials never enter sandbox context.

### Value Principles

- [Lines 697-700] **Anthropic-Inspired Framework:** Helpfulness (genuinely helpful while avoiding harmful actions), Honesty (truthful and acknowledge uncertainty rather than fabricating information), Harmlessness (avoid facilitating illegal, unethical, or dangerous activities), Transparency (clear about capabilities and limitations).

- [Lines 703-705] **Behavioral Guidelines:** How to handle requests that conflict with the Owner's best interests, guidelines for escalation and seeking clarification, principles for balancing competing values (e.g., helpfulness vs. safety).

### Scope Boundaries

- [Lines 703-707] The SOUL.md document is written with the Agent as its primary audience, optimized for precision over accessibility. It should be written in a way that the Agent can reason about and apply to novel situations.

- [Lines 723-726] **Failure Mode Awareness:** How to behave when system constraints are encountered, guidelines for handling errors and unexpected situations, principles for communicating limitations to the Owner.

### Core Philosophies (Lines 86-120)

- **Trust the Sandbox, Not the Model:** Safety is enforced by the sandbox and tool-level validation, not by the System Prompt.

- **Immutability by Default:** The Agent's identity (`SOUL.md`) and core configuration are injected at runtime and cannot be modified by the Agent.

- **Ephemeral Tooling:** Packages are available on-demand via Nix and require no pre-installation or system modification.

- **Capability-Based Security:** Blacklists fail. We use strict whitelisting for network egress and file access.

- **Supply Chain Integrity:** System packages resolve from nixpkgs. Language-specific Skill dependencies are converted at ingestion time from standard lockfiles into Nix derivations. Native package managers are never invoked at runtime.

- **Gated Egress:** Network access from sandboxed processes passes through an egress proxy with domain allowlisting. Direct internet access is blocked. The proxy enforces structured policies and logs all access for security auditing.

- **Minimal Tool Surface:** Every tool invocation is attack surface. The Agent prefers answering from knowledge when possible and only invokes tools when the task requires execution, file access, or capabilities beyond training data.

- **Middleware-Managed Memory:** The Agent does not manage its own long-term memory. Memory extraction, consolidation, retrieval, and injection are handled by Gateway middleware — invisible to the Agent and immune to prompt injection.

- **Single-Tenant by Design:** The system serves one Owner per instance. This is not a limitation to be overcome later — it is a deliberate architectural decision that eliminates multi-tenancy complexity.

- **Everything is Middleware:** Agent capabilities — scheduling, web search, sub-agent orchestration, memory, skills, MCP integration, observability — are implemented as composable LangChain middleware. No privileged internal mechanisms exist that custom middleware cannot replicate.

- **Build on Proven Foundations:** Where the ecosystem provides battle-tested solutions for security-critical infrastructure (sandboxing, observability, protocol implementations), we integrate them rather than reinventing. Custom implementation is reserved for gateway-specific concerns.

- **Nix-Native, Nix-Invisible:** The system leverages Nix for reproducibility, package management, and cross-platform configuration. However, Nix internals are never exposed to the Agent — packages simply become available when requested, with no awareness of the underlying mechanism.

- **Tool-Level Isolation:** Different tools enforce security boundaries appropriate to their function. File operations use path validation; command execution uses the Anthropic Sandbox Runtime; browser automation uses isolated browser profiles with proxy enforcement.

- **Identity Injection:** The Agent's core identity (`SOUL.md`) is never materialized as a file within the sandbox. It is injected directly into the system prompt by the Gateway. This prevents exfiltration of the "Constitution" via file copy operations.

- **Durable State Persistence:** Agent state survives Gateway restarts via LangGraph SqliteCheckpointer with WAL mode. Session continuity is an architectural guarantee, not an in-memory optimization.

- **Observable by Default:** All Agent operations are logged, traced, and metered. The Owner has complete visibility into Agent behavior for debugging, audit, and optimization purposes.

- **Credential Isolation:** Credentials are stored in OS-level vaults (Keychain on macOS, secret-service on Linux) and never exposed to the Agent or written to persistent storage beyond runtime memory.