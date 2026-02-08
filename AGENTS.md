# AGENTS.md: Project Context for AI Collaborators

You are working on **OpenKraken**—a deterministic, security-first agentic runtime. Read this before making architectural decisions or writing code.

## Project Status: Planning Phase (Measure Thrice)

This project is in the **architectural planning phase**. The guiding principle is "measure thrice, cut once"—precision over speed because this is security-critical infrastructure.

**What this means for you:**
- Do not write production code unless explicitly asked
- Do investigate technologies thoroughly before recommending them
- Do question assumptions and challenge claims
- Do update documentation when you learn something that contradicts or supplements it
- Do not assume previous decisions are immutable—bring concerns forward

## The Core Mission

OpenKraken is a personal AI agent runtime for single-tenant, owner-operated deployment. The fundamental goal is **deterministic safety**: preventing the agent from breaking rules through architectural enforcement, not clever prompting.

We reject the "probabilistic safety" model. We build systems where the agent physically cannot violate constraints, regardless of how it is prompted.

## Key Architectural Commitments

These commitments have been made after investigation and debate. They would require significant justification to change.

| Commitment | Decision |
|------------|----------|
| Isolation | Anthropic Sandbox Runtime (bubblewrap on Linux, sandbox-exec on macOS) |
| Orchestrator Runtime | Bun (not Node.js) |
| Agent Orchestration | LangChain.js v1 and LangGraph.js with MCP adapters |
| Persistent State | SQLite with WAL mode |
| Observability | Langfuse v4 (OpenTelemetry) |

## What We Are NOT Building

| Out of Scope | Rationale |
|--------------|-----------|
| Multi-tenant infrastructure | Single-user, single-instance system. No RBAC, no shared hosting. |
| General-purpose agent framework | Personal assistant optimized for one person's workflow. |
| Container orchestration platform | Uses lightweight OS-native sandboxing, not Docker/Kubernetes/Firecracker. |
| New observability backend | Emits telemetry in standard formats (OTLP, Prometheus). |
| Custom security infrastructure | Integrates with proven components; custom logic only where necessary. |

## The Three Roles

| Role | Description |
|------|-------------|
| **Project** | Framework authors (us). Defines platform skills, default policies, and security constraints. Defines the Constitution (SOUL.md, SAFETY.md). |
| **Owner** | The person running an instance. Provisions credentials, configures integrations, uploads personal skills, interacts with the Agent. |
| **Agent** | The LLM-driven runtime operating inside the sandbox. A managed subsystem with no awareness of the platform, no access to credentials, and no ability to modify its own constraints. |

## Core Philosophies

These philosophical commitments shape every architectural decision. Deviations require explicit justification and ADR documentation.

OpenKraken operates according to foundational philosophical principles documented in **Architecture.md**. Key principles include:

- **Trust the Sandbox, Not the Model.** Safety is enforced by the sandbox and tool-level validation, not by the System Prompt.
- **Build on Proven Foundations.** Integrate battle-tested solutions for security-critical infrastructure.
- **Everything is Middleware.** All capabilities are composable LangChain extensions with no privileged internal mechanisms.
- **Observable by Default.** Complete visibility into Agent behavior for debugging and audit.
- **Credential Isolation.** Credentials live in OS-level vaults, never exposed to the Agent.

For the complete list of 18 Core Philosophies, see **Architecture.md Section 1.3**.

## Important Distinctions

**Callbacks vs Middleware**

- **Callbacks** observe and record without modifying behavior. They can stack in any order. Examples: Logger, OpenTelemetry, Content Scanning.
- **Middleware** provides active modification of execution flow. Order matters. Examples: Policy, Memory, Human-in-the-Loop.

**Platform Abstraction**

The Orchestrator normalizes all paths to canonical format before sandbox configuration. If adding platform-specific behavior, consider whether it belongs in the Orchestrator (platform abstraction layer) or platform-specific configuration files.

**CredentialVault**

An abstraction providing a unified interface across platforms (macOS Keychain, Linux secret-service). Implement against the interface, not platform-specific code.

## Architectural Layers

| Layer | Component |
|-------|-----------|
| -1 | Platform Manager — Nix-based provisioning and deployment |
| 0 | Host — The host system (Linux or macOS) |
| 1 | Sandbox — Anthropic Sandbox Runtime (Agent runs inside) |
| 2 | Middleware Stack — LangChain middleware extensions |
| 3 | Orchestrator — Bun/TypeScript orchestration layer |

### Terminology Evolution: Gateway vs Orchestrator

Following v0.13.0, terminology was updated:

| Historical Name | Current Name | Context |
|-----------------|--------------|---------|
| Gateway | Orchestrator | Bun/TypeScript runtime managing LangChain/LangGraph agents |
| Gateway | Egress Gateway | Go binary enforcing domain allowlisting |

**Migration Note:** Pre-v0.13.0 documentation may use "Gateway" ambiguously. Ask for clarification if unsure.

## Key Files

| File | Purpose |
|------|---------|
| **Architecture.md** | Authoritative source for architectural decisions |
| **CHANGELOG.md** | Recent architectural changes with context |
| **SOUL.md** | Agent identity and values (injected into system prompt) |
| **SAFETY.md** | Safety constraints governing Agent behavior |
| **AGENTS.md** | This file — guidance for AI collaborators |

## How to Approach Your Work

1. **Orient yourself.** Read AGENTS.md for context. Read relevant sections of Architecture.md. Check CHANGELOG.md for recent changes.
2. **Investigate before implementing.** Verify technology status, maintenance, and compatibility. Use the Librarian CLI. Do not assume your training data is current.
3. **Question assumptions.** If a requirement conflicts with core philosophies, raise the concern.
4. **Update documentation.** If you discover something that contradicts the architecture, update it.
5. **Write prose, not code.** Architecture documentation describes what and why, not how at the code level.

## Communication Patterns

- **Investigation:** Thorough analysis with clear conclusions and citations.
- **Architecture Review:** Identify risks, clarify assumptions, propose improvements.
- **Implementation:** Rare in planning phase—focus on investigation and documentation.
- **Documentation:** Precise, consistent, grounded in core philosophies.

## What to Do When Uncertain

- **Requirements unclear?** Ask. Better to clarify upfront than implement the wrong thing.
- **Decisions inconsistent?** Document the tension and recommend resolution.
- **Approach unclear?** Propose alternatives with tradeoffs.
- **Cannot verify a claim?** Flag it and recommend verification steps.

## Documentation Boundaries

These layers separate business intent from technical implementation.

### PRD.md: The No-Tech Rule

PRD.md remains technology-agnostic. It describes **what** the system does, never **how**.

**Includes:** Business capabilities, user stories, constraints, success metrics

**Excludes:** Technology names, implementation patterns, file paths, protocols, environment variables

| Good (What-focused) | Bad (How-focused) |
|---------------------|-------------------|
| "The System shall provide integration adapters for external messaging services" | "The System shall provide MCP adapters via @langchain/mcp-adapters" |
| "The System shall isolate Agent execution within an isolation environment" | "The System shall isolate Agent execution using bubblewrap on Linux and Seatbelt on macOS" |

**Test:** Would this requirement still be valid if we changed the underlying technology?
- Yes -> Belongs in PRD
- No -> Belongs in Architecture.md or TechSpec.md

### Architecture.md: The Category Rule

Architecture.md names technology **categories**, not **instances**.

**Includes:** Design patterns, component relationships, technology categories ("JavaScript runtime", "Relational database")

**Excludes:** Version numbers, specific libraries, OS-specific mechanisms, file paths, environment variables, API signatures

| Category (Architecture) | Instance (TechSpec) |
|-------------------------|---------------------|
| "JavaScript runtime" | "Bun 1.3.8" |
| "Sandboxing runtime" | "Anthropic Sandbox Runtime 0.0.34" |
| "Relational database" | "SQLite 3.45.1 with WAL mode" |

**Test:** Could I replace the technology with an equivalent alternative without changing the architecture's validity?
- Yes -> Belongs in Architecture.md
- No -> Belongs in TechSpec.md

### TechSpec.md: The Code Rule

TechSpec.md specifies concrete contracts and constraints, not implementation code.

**Includes:** Version specifications, API contracts, database schemas, configuration schemas, package dependencies

**Excludes:** Algorithm details, business logic implementations, internal helper functions, build scripts

**Deferred Implementation Pattern:**

Wrong: "Implementation of the migration runner is deferred to development phase."

Right: "Migration contract: Must support forward-only migrations with checksum verification. Implementation must use bun:sqlite transactions."

**Test:** Would I need to update this if I refactored the implementation without changing behavior?
- No (behavior changed) -> Belongs in TechSpec.md
- Yes (implementation detail) -> Belongs in code

---

This document was created during the v0.13.0 architecture revision to capture project context and guidance for AI collaborators.
