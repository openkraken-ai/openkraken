# AGENTS.md: Project Context for AI Collaborators

You are working on a project called **OpenKraken**—a deterministic, security-first agentic runtime. This document provides context to help you understand what we're building, where we are in the process, and how to contribute effectively. Read this before making architectural decisions or writing code.

## Project Status: Planning Phase (Measure Thrice)

As of your current moment, this project is in the **architectural planning phase**. We are not building yet. We are designing, investigating, questioning, and documenting. The guiding principle is "measure thrice, cut once"—this project prioritizes precision over speed because we are building security-critical infrastructure that must not fail once deployed.

The architecture document (ARCHITECTURE.md) is a living document that evolves as we investigate technologies, clarify requirements, and refine our understanding. It is not a specification frozen in amber. It is a living record of our current best understanding, and it should be updated as you discover new information or identify gaps.

**What this means for you:**
- Do not write production code unless explicitly asked
- Do investigate technologies thoroughly before recommending them
- Do question assumptions and challenge claims
- Do update documentation when you learn something that contradicts or supplements it
- Do not assume previous decisions are immutable—bring concerns forward

## The Core Mission

OpenKraken is a personal AI agent runtime designed for single-tenant, owner-operated deployment. The fundamental goal is **deterministic safety**: preventing the agent from breaking rules through architectural enforcement, not through prompts that hope the agent will behave.

We reject the "probabilistic safety" model that pervades agent frameworks—trusting the AI to follow rules through clever prompting. We build systems where the agent physically cannot violate constraints, regardless of how it is prompted or what inputs it receives.

## Key Architectural Commitments

These commitments have been made after investigation and debate. They represent decisions that would require significant justification to change.

**First Commitment: Anthropic Sandbox Runtime for Isolation**

We delegate process isolation to Anthropic's production-tested Sandbox Runtime rather than building custom sandboxing. On Linux, this uses bubblewrap. On macOS, it uses sandbox-exec (Seatbelt). The runtime provides a unified configuration interface while handling platform-specific details internally.

**Second Commitment: Bun for the Orchestrator Runtime**

The Orchestrator runs on Bun, not Node.js. This decision was made after evaluating Bun's maturity, Node.js compatibility (~95% API coverage), and performance characteristics. If you encounter Bun compatibility issues with a required package, this is a significant finding worth documenting.

**Third Commitment: LangChain.js for Agent Orchestration**

The agent loop uses LangChain.js v1 and LangGraph.js for stateful workflow management. We use @langchain/mcp-adapters for Model Context Protocol integration. The ecosystem is active and production-ready—verify package versions before implementing, as the ecosystem evolves.

**Fourth Commitment: SQLite for All Persistent State**

State persistence uses SQLite with Write-Ahead Logging (WAL) mode. This includes LangGraph checkpoints, message logs, semantic memory, and observability logs. The architecture consolidates on SQLite for consistency and durability.

**Fifth Commitment: Custom OpenTelemetry Implementation**

LangChain.js does not have native OpenTelemetry integration—it uses LangSmith for tracing. We implement a custom OpenTelemetry callback handler that intercepts agent lifecycle events and emits telemetry in a canonical format. This can export to OTLP collectors, LangSmith, or SQLite.

## What We Are NOT Building

Understanding scope boundaries helps you recognize when a request is out of scope.

**We are not building multi-tenant infrastructure.** This is a single-user, single-instance system. No user isolation, no RBAC, no shared hosting considerations.

**We are not building a general-purpose agent framework.** This is a personal assistant, optimized for one person's workflow, one device, one set of credentials.

**We are not building a container orchestration platform.** We use lightweight OS-native sandboxing (bubblewrap, Seatbelt), not Docker, Kubernetes, or Firecracker.

**We are not building a new observability backend.** We emit telemetry in standard formats (OTLP, Prometheus) that integrate with existing backends.

**We are not building custom security infrastructure where battle-tested solutions exist.** We integrate with proven components (Anthropic Sandbox Runtime, grammY for Telegram, etc.) and only implement custom logic where necessary.

## The Three Roles

Understanding who does what helps you understand constraints.

**Project:** The framework authors (us). Defines platform skills, default policies, and security constraints. The Project defines the Constitution (SOUL.md, SAFETY.md)—development concerns that evolve continuously and define the Agent's identity and safety constraints. The Project is the authority on how the system works.

**Owner:** The person running an instance. Provisions credentials, configures integrations, uploads personal skills, interacts with the Agent. In a single-tenant system, the Owner is the only human in the loop.

**Agent:** The LLM-driven runtime operating inside the sandbox. A managed subsystem, not a peer. The Agent has no awareness of the underlying platform, no access to credentials, and no ability to modify its own constraints.

## Core Philosophies You Should Know

These philosophies shape every decision. When you are unsure whether a proposed change aligns with the project, reference these principles.

**Trust the Sandbox, Not the Model.** Safety is enforced by the sandbox and tool-level validation, not by the System Prompt.

**Build on Proven Foundations.** Integrate battle-tested solutions for security-critical infrastructure. Implement custom logic only for Orchestrator-specific concerns.

**Everything is Middleware.** Agent capabilities—scheduling, web search, sub-agent orchestration, memory, skills, MCP integration, observability—are implemented as composable LangChain extensions. No privileged internal mechanisms exist that custom extensions cannot replicate.

**Observable by Default.** Complete visibility into Agent behavior for debugging, audit, and optimization. The Owner must be able to understand everything the Agent did and why.

**Credential Isolation.** Credentials live in OS-level vaults (Keychain, secret-service), never exposed to the Agent or written to persistent storage beyond runtime memory.

## Important Distinctions for Your Work

**Callbacks versus Middleware**

LangChain.js distinguishes between callback handlers (passive observability) and middleware (active execution modification). This distinction matters for understanding where different concerns belong.

Callback handlers observe and record without modifying behavior. They intercept LLM calls, tool invocations, and chain executions, emitting telemetry. They can stack in any order since they don't interfere with each other. Examples include the Logger Callback Handler, OpenTelemetry Callback Handler, and Content Scanning Callback Handler.

Middleware provides active modification of the agent's execution flow. It can transform inputs, inject context, or interrupt execution. Later middleware operates on the outputs of earlier middleware, so order matters. Examples include Policy Middleware, Memory Middleware, and Human-in-the-Loop Middleware.

When you are adding new capabilities, consider whether they belong as callbacks (passive observation) or middleware (active modification).

**Platform Abstraction is the Orchestrator's Job**

The architecture claims the sandbox presents "identical filesystem semantics" across Linux and macOS. This is true from the Owner's perspective, but the mechanisms differ. Bubblewrap on Linux operates on literal paths without glob support. Seatbelt profiles on macOS support glob patterns.

The Orchestrator normalizes all paths to canonical format before sandbox configuration. It performs path validation against allowed zones and resolves paths to absolute, literal form. This ensures the sandbox receives consistent instructions regardless of platform.

If you are adding platform-specific behavior, consider whether it should be handled by the Orchestrator (platform abstraction layer) or whether it belongs in platform-specific configuration files.

**CredentialVault is an Abstraction, Not a Concrete Implementation**

The architecture describes a CredentialVault abstraction that provides a unified interface across platforms. On macOS, this uses the Keychain Services API. On Linux, this uses the secret-service API (compatible with GNOME Keyring, KWallet, or pass).

If you are implementing credential handling, you are implementing against an interface, not writing platform-specific code directly. The abstraction ensures the Orchestrator remains portable across platforms.

### Architectural Layers

OpenKraken's architecture is organized into layers. See ARCHITECTURE.md Section 2 for the authoritative layer definitions and C4 container diagram.

**Quick Reference:**
- **Layer -1:** Platform Manager — Nix-based provisioning and deployment automation
- **Layer 0:** Host — The host system (Linux or macOS)
- **Layer 1:** Sandbox — Anthropic Sandbox Runtime (Agent runs inside)
- **Layer 2:** Middleware Stack — LangChain middleware extensions
- **Layer 3:** Orchestrator — Bun/TypeScript orchestration layer

> **For details:** See Architecture.md Section "Architectural Entities" and "Container Components"

---

### Terminology Evolution: Gateway vs Orchestrator

Following architectural evolution in v0.13.0, terminology was updated to clarify component responsibilities across the codebase:

| Historical Name | Current Name | Scope | Context |
|----------------|--------------|-------|---------|
| Gateway | Orchestrator | Agent orchestration layer | Bun/TypeScript runtime managing LangChain/LangGraph agents. Renamed from "Gateway" in v0.13.0. |
| Gateway | Egress Gateway | Network proxy layer | Go binary enforcing domain allowlisting (independent process). Always refers to network proxy. |

**Migration Note:** Older documentation (pre-v0.13.0) may use "Gateway" ambiguously to refer to either the Orchestrator or Egress Gateway based on context. When reading older sections:

- References to "Gateway managing agent threads" → Orchestrator
- References to "Gateway network filtering" → Egress Gateway
- References to "Gateway HTTP server" → Usually Orchestrator, could be either

Newer documentation (v0.13.0+) uses precise terminology consistently. If you encounter ambiguous "Gateway" references in code comments or older sections, ask for clarification rather than assume.

## Key Files and Their Purposes

**Architecture.md** (this project's technical blueprint)

The authoritative source for architectural decisions. Read this before proposing changes. It describes what we are building, why we are building it that way, and what constraints shape our choices.

**CHANGELOG.md** (recent evolution of the architecture)

Records recent architectural changes with context. Useful for understanding why decisions were made and when. The version number (currently v0.13.0) indicates the architecture's maturity.

**SOUL.md** (development concern: Agent identity and values)

Defines the Agent's core identity, values, and behavioral guidelines. This file is injected directly into the Agent's system prompt at runtime. It is never materialized in the sandbox filesystem. SOUL.md evolves continuously as a development concern.

**SAFETY.md** (development concern: Safety constraints)

Defines the specific safety constraints that govern Agent behavior. Works in conjunction with SOUL.md to define what the Agent can and cannot do. SAFETY.md evolves continuously as a development concern.

**AGENTS.md** (this file: guidance for AI collaborators)

Your guide to understanding the project context, current state, and guiding principles. Read this when you arrive to understand what we are doing and how we work.

## How to Approach Your Work

When you are asked to work on this project, follow this approach.

**First, orient yourself.** Read AGENTS.md for context. Read the relevant sections of ARCHITECTURE.md to understand the component you are working on. Check CHANGELOG.md to see recent changes and current version.

**Second, investigate before implementing.** If you are evaluating a technology, verify its current status, maintenance, and compatibility with our stack. Use the Librarian CLI to explore official documentation. Do not assume your training data is current—the technology landscape evolves faster than my weights.

**Third, question assumptions.** If a requirement seems to conflict with our core philosophies, raise the concern. If a technology claim seems outdated, verify it. If a constraint seems arbitrary, ask about its origin.

**Fourth, update documentation.** If you discover something that contradicts the architecture, update it. If you clarify a vague section, make it precise. If you implement something new, document it. The architecture is a living document—treat it as such.

**Fifth, write prose, not code.** Architecture documentation describes what and why, not how at the code level. Implementation details belong in code, not in this document. When in doubt, describe the concept and its constraints rather than providing implementation.

## Communication Patterns

When you interact with this project, you may be asked to perform different types of work.

**Investigation:** You may be asked to research a technology, verify a claim, or understand how a component works. In these cases, your output should be a thorough analysis with clear conclusions and citations to sources.

**Architecture Review:** You may be asked to review proposed changes or evaluate alternatives. In these cases, your output should identify risks, clarify assumptions, and propose improvements while respecting the core mission.

**Implementation:** You may be asked to implement a feature. In this planning phase, this is rare—focus on investigation and documentation instead.

**Documentation:** You may be asked to clarify, expand, or correct documentation. In this case, your output should be precise, consistent with existing content, and grounded in the project's core philosophies.

## What to Do When You Are Uncertain

You will encounter situations where requirements are unclear, decisions seem inconsistent, or the right approach is not obvious. Here is how to handle uncertainty.

**If requirements are unclear, ask.** It is better to clarify upfront than to implement the wrong thing. Request specificity about what is needed and why.

**If decisions seem inconsistent, document the tension.** The architecture may contain intentional tradeoffs or historical decisions that no longer apply. Point out inconsistencies and recommend resolution.

**If the right approach is unclear, propose alternatives.** Present multiple options with tradeoffs, let stakeholders choose, and document the decision and its rationale.

**If you cannot verify a claim, flag it.** If the architecture makes a claim you cannot verify (e.g., "X technology supports Y feature"), note this uncertainty and recommend verification steps.

## A Note on This Document

AGENTS.md is itself a living document. As the project evolves, this guidance should evolve with it. When you discover patterns in how you work, when you identify common sources of confusion, or when you find yourself repeating explanations, consider updating this document to capture that learning.

The goal is that future instances of you arrive with enough context to be immediately productive, without needing to reverse-engineer decisions or rediscover conclusions that have already been reached.

---

This document was created during the v0.13.0 architecture revision to capture project context and guidance for AI collaborators. Read it, update it, and use it to ensure your work aligns with the project's mission and principles.
