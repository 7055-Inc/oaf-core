# Agent/Sub-Agent Development Methodology

A guide for using multiple AI agents in parallel to accelerate complex development projects.

---

## Overview

This methodology uses a **primary "architect" agent** that maintains overall context and vision, while delegating implementation work to **fresh "sub-agents"** that execute specific sprints. This approach:

- Preserves context across a large project
- Allows parallel development on independent features
- Reduces context window bloat in any single agent
- Maintains architectural consistency

---

## Roles

### Architect Agent (Primary)
- **Maintains**: Overall system design, specifications, and vision
- **Creates**: Master specification document, sprint breakdowns, kick-off prompts
- **Verifies**: Sub-agent deliverables, fixes integration issues
- **Never**: Gets bogged down in implementation details

### Sub-Agents (Workers)
- **Receive**: Detailed kick-off prompt with full context
- **Execute**: One sprint/feature at a time
- **Return**: Completed code + delivery notes
- **Fresh**: Each sub-agent starts with zero prior context

---

## The Process

### Step 1: Create a Master Specification Document

Before any sub-agents, the architect creates a comprehensive spec doc that serves as the "source of truth."

**Location**: `/docs/PROJECT_NAME_SPEC.md`

**Contents**:
```markdown
# Project Name - System Specification

## Overview
- What the system does
- High-level architecture
- Key technologies/dependencies

## Current State
- What already exists
- Relevant existing files/modules
- Database tables in use

## Sprint Breakdown
### Sprint A: [Name]
- Objective
- Target structure (files to create)
- Database schema (if any)
- API endpoints (if any)
- Success criteria

### Sprint B: [Name]
...

## Environment Variables
- List all needed config

## Notes
- Design decisions
- Known limitations
- Future considerations
```

**Key Principles**:
- Be exhaustive - sub-agents have NO context beyond what you give them
- Include file paths, table schemas, endpoint patterns
- List what already exists so they don't recreate it
- Define success criteria so completion is measurable

---

### Step 2: Break Work into Independent Sprints

Each sprint should be:
- **Self-contained**: Can be completed without other sprints
- **Parallelizable**: Ideally can run alongside other sprints
- **Scoped**: One agent can complete in a single session
- **Testable**: Has clear success criteria

**Good Sprint Examples**:
- "Build the authentication module"
- "Create database schema and migrations"
- "Implement social media publishers"
- "Build the video processing pipeline"

**Bad Sprint Examples**:
- "Build the whole system" (too big)
- "Fix the bug" (too vague)
- "Finish what we started" (no context)

---

### Step 3: Write Effective Kick-Off Prompts

The kick-off prompt is **everything** the sub-agent knows. Structure it as:

```markdown
## Sprint [X]: [Name] - Kick-off Prompt

**Copy everything below this line to your new agent:**

---

You are implementing Sprint [X] ([Name]) of [Project]. Read the full specification at `[path to spec doc]` first.

### Your Objective
[1-2 sentences on what to build]

### What Already Exists
- [File]: [What it does]
- [Table]: [Already created]
- [Pattern]: [Follow this existing pattern]

### What You Need to Build

1. **[Component Name]** (`[file path]`)
   ```javascript
   // Method signatures or structure hints
   - methodOne(params)
   - methodTwo(params)
   ```

2. **[Next Component]** (`[file path]`)
   ...

3. **Database Tables** (migration `XXX_name.sql`)
   ```sql
   CREATE TABLE example (...);
   ```

4. **API Routes** (add to `routes.js`)
   ```
   GET  /api/v2/resource
   POST /api/v2/resource
   ```

### Environment Variables
```
VAR_NAME=description
```

### Key Requirements
1. [Specific requirement]
2. [Another requirement]
3. [Pattern to follow]

### Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Health check passing

### Deliverables
1. All files created/modified
2. Update spec doc's Sprint [X] section with implementation notes
3. List any issues or placeholders

**Do NOT modify [existing thing] unless absolutely necessary. Build new files.**

---
```

**Key Principles**:
- Start with "Read the spec doc first" - they need the full picture
- List what exists so they don't overwrite or duplicate
- Provide structure hints (method signatures, table schemas)
- Be explicit about what NOT to touch
- Request spec doc updates so knowledge returns to architect

---

### Step 4: Launch Sub-Agent

1. Open a **new, fresh chat window** (not a continuation)
2. Paste the entire kick-off prompt
3. Attach the spec doc if your system supports it
4. Let it run to completion

**While it runs**, you can:
- Launch other independent sprints in parallel
- Continue planning with the architect agent
- Work on credentials, config, or other prep

---

### Step 5: Verify and Integrate

When the sub-agent reports completion:

1. **Check for delivery doc**: Sub-agents often create `SPRINT_X_DELIVERY.md`
2. **Verify health endpoints**: `curl http://localhost:PORT/health`
3. **Check for errors**: `pm2 logs service-name --lines 50`
4. **Run migrations**: If created but not executed
5. **Fix integration issues**: Path errors, missing dependencies
6. **Clean up**: Delete redundant delivery docs, merge notes into main spec
7. **Restart services**: `pm2 restart service-name`

**Common Issues**:
- Wrong import paths (sub-agents guess at project structure)
- Missing dependencies in package.json
- Migrations created but not run
- Module not exported from index.js

---

### Step 6: Update Master Spec

After verification, the architect updates the spec doc:
- Mark sprint as complete
- Add implementation notes
- Document any deviations from plan
- Note any issues for future sprints

This keeps the spec doc as the living source of truth.

---

## Best Practices

### For the Architect Agent

1. **Stay high-level**: Don't get pulled into implementation
2. **Maintain the spec**: It's your primary artifact
3. **Verify, don't trust blindly**: Sub-agents make mistakes
4. **Fix integration issues yourself**: Faster than re-prompting
5. **Keep sprint scope small**: Better to have more sprints than stuck agents

### For Kick-Off Prompts

1. **Over-communicate context**: They know nothing
2. **Include file paths**: Don't make them guess
3. **Show patterns**: "Follow the pattern in existing XService.js"
4. **List what exists**: Prevent duplicate work
5. **Be explicit about scope**: "Build X, do NOT modify Y"

### For Sub-Agents

1. **One sprint per agent**: Fresh context each time
2. **Don't continue failed runs**: Start fresh with updated prompt
3. **Request spec updates**: Knowledge should flow back

### For Parallel Execution

1. **Max 3-4 concurrent agents**: More causes confusion
2. **Ensure independence**: No sprint should depend on another in-flight sprint
3. **Stagger verification**: Don't merge all at once

---

## Example Project Flow

```
Day 1:
├── Architect creates PROJECT_SPEC.md
├── Architect breaks into Sprints A, B, C, D
├── Launch Sprint A (sub-agent)
├── Launch Sprint B (sub-agent) [parallel]
└── Architect plans Sprint C details

Day 2:
├── Sprint A complete → Architect verifies & merges
├── Sprint B complete → Architect verifies & merges  
├── Launch Sprint C (sub-agent)
├── Launch Sprint D (sub-agent) [parallel]
└── Architect handles integration issues

Day 3:
├── Sprint C complete → Verify & merge
├── Sprint D complete → Verify & merge
├── Architect does final integration testing
└── Project complete
```

---

## Template: Master Spec Document

```markdown
# [Project Name] - System Specification

## Overview
[What this system does in 2-3 sentences]

## Architecture
[High-level diagram or description]

## Current State
### Existing Files
- `path/to/file.js` - [Description]

### Existing Database Tables
- `table_name` - [Description]

### Existing Patterns
- [Pattern name]: [How it works]

## Sprint Breakdown

### Sprint A: [Name] ⏳ Pending
**Objective**: [What to build]
**Files**: [List of files to create]
**Schema**: [Tables to create]
**Endpoints**: [APIs to add]
**Success Criteria**: [How to verify]

### Sprint B: [Name] ⏳ Pending
...

## Environment Variables
```env
VAR_NAME=description
```

## Implementation Notes
[Updated as sprints complete]

## Known Limitations
[Document constraints and future work]
```

---

## Template: Kick-Off Prompt

```markdown
## Sprint [X]: [Name] - Kick-off Prompt

**Copy everything below this line to your new agent:**

---

You are implementing Sprint [X] ([Name]) of [Project]. Read the full specification at `[/path/to/SPEC.md]` first.

### Your Objective
[Clear 1-2 sentence goal]

### What Already Exists
- [Existing relevant files/tables/patterns]

### What You Need to Build
[Detailed breakdown with file paths and structure]

### Environment Variables
[Any config needed]

### Key Requirements
[Numbered list of must-haves]

### Success Criteria
[Checkboxes for completion verification]

### Deliverables
1. All files created/modified
2. Update spec doc's Sprint [X] section
3. List any placeholders or issues

---
```

---

## Checklist: Post-Sprint Verification

- [ ] Health endpoint responds
- [ ] No errors in PM2 logs
- [ ] Database migrations run
- [ ] Services restart without errors
- [ ] Module exports working
- [ ] Integration with existing code verified
- [ ] Spec doc updated with completion notes
- [ ] Delivery doc cleaned up (deleted or merged)

---

## Why This Works

1. **Context Preservation**: Architect never loses the big picture
2. **Parallel Speed**: Multiple features built simultaneously  
3. **Fresh Thinking**: Each sub-agent approaches with no baggage
4. **Clear Contracts**: Kick-off prompts define exactly what's needed
5. **Quality Gates**: Architect verifies before integration
6. **Living Documentation**: Spec doc grows with the project

---

*Document created: February 2026*
*Based on successful Leo Marketing System implementation*
