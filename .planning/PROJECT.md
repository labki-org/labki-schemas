# Labki Schemas CI

## What This Is

A robust GitHub Actions CI pipeline for the labki-schemas ontology repository. The CI validates PRs — whether from ontology-hub or manual submissions — ensuring schema compliance, reference integrity, and correct semantic versioning before changes merge.

## Core Value

Every merged PR produces a valid, internally-consistent ontology with correct version semantics.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Schema validation — each entity file validates against its `_schema.json`
- [ ] ID-filename consistency — entity `id` field matches filename (without .json)
- [ ] Reference integrity — all cross-references resolve to existing entities
- [ ] Circular dependency detection — no cycles in category inheritance or module dependencies
- [ ] Overlap rule enforcement — property can't appear in both required and optional arrays
- [ ] Version calculation — CI determines correct version bump based on change type
- [ ] Version validation — VERSION file in PR matches calculated version
- [ ] Breaking change detection — warn/block when PR deletes or renames referenced entities

### Out of Scope

- Duplicating ontology-hub validation logic — CI is authoritative for version calculation, not a copy
- Wiki-side validation — that's SemanticSchemas extension's job
- Deployment/release automation — focus on validation first

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

**Existing assets:**
- `_schema.json` files for each entity type (JSON Schema draft 2020-12)
- `SCHEMA.md` documenting all validation rules
- `VERSION` file with semver string

**Version semantics:**
- Major (breaking): delete/rename entity, change datatype/cardinality, remove allowed_values, optional→required
- Minor (non-breaking): add entity, add optional property, expand allowed_values
- Patch: description/label changes, documentation

**Schema improvements needed:**
- `properties/_schema.json` missing `"additionalProperties": false`

## Constraints

- **Platform**: GitHub Actions
- **Tooling**: Node.js ecosystem preferred (ajv for JSON Schema, custom scripts for graph validation)
- **No backwards compatibility concerns**: Early stage, can modify schemas as needed

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| CI owns version calculation | Single source of truth, works for manual PRs | — Pending |
| Node.js tooling | ajv is robust JSON Schema validator, easy scripting | — Pending |

---
*Last updated: 2026-01-22 after initialization*
