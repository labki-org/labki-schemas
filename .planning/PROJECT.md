# Labki Schemas CI

## What This Is

A robust GitHub Actions CI pipeline for the labki-schemas ontology repository with automated release artifact generation. The CI validates PRs — whether from ontology-hub or manual submissions — ensuring schema compliance, reference integrity, and correct semantic versioning before changes merge. On merge, it automatically generates versioned module/bundle artifacts and commits them to the repository.

## Core Value

Every merged PR produces a valid, internally-consistent ontology with correct version semantics and versioned release artifacts.

## Requirements

### Validated

- Schema validation — each entity file validates against its `_schema.json` — v1.0
- ID-filename consistency — entity `id` field matches filename (without .json) — v1.0
- Reference integrity — all cross-references resolve to existing entities — v1.0
- Circular dependency detection — no cycles in category inheritance or module dependencies — v1.0
- Overlap rule enforcement — property can't appear in both required and optional arrays — v1.0
- Version calculation — CI determines correct version bump based on change type — v1.0
- Version format validation — VERSION file contains valid semver — v1.0
- Breaking change detection — warn/block when PR deletes or renames referenced entities — v1.0
- Per-module/bundle semver versioning with cascade propagation — v1.1
- VERSION_OVERRIDES.json support for manual version control (modules, bundles, ontology) — v1.1
- Combined JSON artifact generation per module/bundle version — v1.1
- GitHub Actions release workflow with automatic version application — v1.1
- Release workflow filters _schema.json changes (no false triggers) — v1.1.1
- Ontology bump derived from module/bundle bumps (null when no changes) — v1.1.1
- CI auto-increments VERSION (validation is informational only) — v1.1.1

### Active

(None — planning next milestone)

### Out of Scope

- Duplicating ontology-hub validation logic — CI is authoritative for version calculation, not a copy
- Wiki-side validation — that's SemanticSchemas extension's job
- Latest version tracking — ontology-hub responsibility
- Version rollback — future consideration
- Automatic GitHub releases — focus was on file generation

## Context

**Architecture:**
- This repo is the source of truth for the Labki ontology
- ontology-hub drafts changes and submits PRs here
- SemanticSchemas MW extension consumes this ontology via ontology-hub
- Manual PRs also occur, so CI must be self-contained

**Entity types:**
- Categories (entity types with inheritance)
- Properties (attributes with datatypes, cardinality)
- Subobjects (reusable nested structures)
- Templates (wikitext rendering)
- Modules (logical groupings with dependencies)
- Bundles (collections of modules)

**Reference graph:**
- Categories → Properties, Subobjects, Categories (parents)
- Subobjects → Properties
- Properties → Properties (parent), Templates
- Modules → Categories, Properties, Subobjects, Templates, Modules (dependencies)
- Bundles → Modules

**Current state:**
- Shipped v1.1.1 with ~4,000 LOC JavaScript (183 tests)
- Tech stack: Node.js, GitHub Actions, JSON Schema (Ajv)
- Validation + release pipeline fully automated
- Module artifacts: modules/{name}/versions/{version}.json
- Bundle manifests: bundles/{name}/versions/{version}.json
- Schema-only changes no longer trigger release workflow

**Schema improvements applied:**
- `properties/_schema.json` has `"additionalProperties": false`
- `modules/_schema.json` and `bundles/_schema.json` have semver `version` field

**Version semantics:**
- Major (breaking): delete/rename entity, change datatype/cardinality, remove allowed_values, optional→required
- Minor (non-breaking): add entity, add optional property, expand allowed_values
- Patch: description/label changes, documentation

## Constraints

- **Platform**: GitHub Actions
- **Tooling**: Node.js ecosystem (ajv for JSON Schema, custom scripts for graph validation)
- **No backwards compatibility concerns**: Early stage, can modify schemas as needed

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| CI owns version calculation | Single source of truth, works for manual PRs | Good |
| Node.js tooling | ajv is robust JSON Schema validator, easy scripting | Good |
| Strict semver (no prerelease) | Keeps versions simple for initial releases | Good |
| All entities start at 1.0.0 | Clean baseline for new versioning system | Good |
| Orphan entities affect ontology VERSION | Entities outside modules still need version tracking | Good |
| Bottom-up cascade via DepGraph | Ensures dependencies resolved before dependents | Good |
| MAX aggregation for bumps | major > minor > patch at all cascade levels | Good |
| Single override file for all entities | VERSION_OVERRIDES.json handles modules, bundles, and ontology | Good |
| Downgrade overrides allowed with warnings | PR authors have final control over versions | Good |
| Atomic commit of sources and artifacts | Version bumps and artifacts never separated in history | Good |
| Ontology bump derived from module/bundle bumps | Consistent cascade logic, null when no entity changes | Good |
| CI auto-increments VERSION | Removes manual burden, validation is informational | Good |

---
*Last updated: 2026-01-26 after v1.1.1 bug fixes*
