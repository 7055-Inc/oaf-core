# MASTER SYSTEM REVIEW INSTRUCTIONS

**Execute this document to run the complete system analysis process**

## Pre-Execution Setup

1. **Verify Context**: Ensure you are in the main project directory (`/var/www/main`)
2. **Load Memories**: Review user preferences for minimal logging and thorough planning
3. **Set Analysis Mode**: Remember this is ANALYSIS ONLY - no code changes

## Execution Command

When ready to execute, user says: **"Read and execute MASTER_INSTRUCTIONS.md"**

## Phase 1: System Discovery and Architecture Mapping

**Objective**: Understand current system structure and create comprehensive map

### Step 1.1: File Inventory and Categorization
```
Execute codebase_search with queries:
- "What is the overall system architecture?"
- "How are components organized and structured?"
- "What are the main application entry points?"

Create complete file inventory in artifacts/file_inventory.json
```

### Step 1.2: Technology Stack Assessment
```
Execute grep searches for:
- Package.json files (dependencies)
- Requirements.txt or similar (backend dependencies)
- Configuration files (.env templates, config files)
- Database connection and schema files

Document in context/architecture_map.md
```

### Step 1.3: Application Flow Analysis
```
Execute codebase_search with queries:
- "How does the application handle user requests?"
- "What is the data flow from frontend to backend?"
- "How are routes and endpoints organized?"

Update context/architecture_map.md with flow diagrams
```

**Validation Checkpoint**: Architecture map complete with component relationships documented

---

## Phase 2: API Pattern Consistency Analysis

**Objective**: Determine if API follows consistent CRUD vs Service layer patterns

### Step 2.1: API Endpoint Discovery
```
Execute grep searches for:
- "app\\.get|app\\.post|app\\.put|app\\.delete" (Express routes)
- "router\\." (Router usage)
- "controller" (Controller patterns)
- "service" (Service layer patterns)

Document all endpoints in findings/api_analysis.md
```

### Step 2.2: Pattern Classification
```
For each endpoint, analyze:
- Is it direct CRUD (model → controller → route)?
- Does it use service layer (model → service → controller → route)?
- Where is business logic implemented?
- How is validation handled?

Execute codebase_search with queries:
- "How is business logic organized in the API?"
- "Where is data validation implemented?"
- "How are database operations structured?"
```

### Step 2.3: Consistency Assessment
```
Create matrix in findings/api_analysis.md:
- Pure CRUD endpoints
- Service layer endpoints  
- Mixed/inconsistent patterns
- Business logic distribution analysis
- Recommendations for standardization
```

**Validation Checkpoint**: Complete API pattern analysis with consistency recommendations

---

## Phase 3: Style and UI Consistency Audit

**Objective**: Analyze CSS organization and global.css consolidation opportunities

### Step 3.1: Style Sheet Inventory
```
Execute glob_file_search for:
- "*.css"
- "*.scss" 
- "*.sass"
- "*.less"

Execute grep searches for:
- "styled-components" (CSS-in-JS)
- "className" (component styling)
- "style=" (inline styles)

Document all styling approaches in findings/style_audit.md
```

### Step 3.2: Component Style Analysis
```
Execute codebase_search with queries:
- "How are UI components styled across the application?"
- "What styling patterns are used for tabs, buttons, forms?"
- "Where is global.css currently used?"

For each major UI pattern (tabs, buttons, forms, modals):
- Find all implementations
- Compare styling approaches
- Identify consolidation opportunities
```

### Step 3.3: Global CSS Consolidation Planning
```
Create consolidation plan in findings/style_audit.md:
- Current global.css analysis
- Component-level styles that could be consolidated
- Duplicate/redundant styling identification
- Migration complexity assessment
- Visual consistency impact analysis
```

**Validation Checkpoint**: Complete style audit with consolidation roadmap

---

## Phase 4: Testing Infrastructure Assessment

**Objective**: Analyze testing coverage and establish automation framework

### Step 4.1: Current Testing Inventory
```
Execute glob_file_search for:
- "*test*"
- "*spec*"
- "*.test.js"
- "*.spec.js"

Execute grep searches for:
- "describe|it|test" (test frameworks)
- "jest|mocha|chai" (testing libraries)
- "supertest|request" (API testing)

Document current testing state in findings/testing_review.md
```

### Step 4.2: Coverage Analysis
```
Execute codebase_search with queries:
- "What backend endpoints exist that need testing?"
- "How is authentication/authorization tested?"
- "What business logic requires test coverage?"

Create coverage matrix:
- Tested endpoints vs untested endpoints
- Critical business logic coverage
- Integration test gaps
- Security testing status
```

### Step 4.3: Automation Framework Design
```
Design automated testing system:
- Test directory structure recommendation
- Cron job configuration for automated runs
- Email notification integration with existing email system
- Test result logging and history tracking
- Failure alert thresholds and recovery procedures

Document in findings/testing_review.md
```

**Validation Checkpoint**: Complete testing assessment with automation roadmap

---

## Phase 5: Documentation Standardization Analysis

**Objective**: Audit scattered documentation and create standardization plan

### Step 5.1: Documentation Inventory
```
Execute glob_file_search for:
- "*.md"
- "README*"
- "*.txt" (documentation files)

Execute grep searches for:
- "# " (markdown headers)
- "TODO|FIXME|NOTE" (inline documentation)
- "/**" (code comments)

Catalog all documentation in findings/docs_analysis.md
```

### Step 5.2: Current Standards Analysis
```
Execute codebase_search in /docs directory:
- "What documentation standards are established?"
- "What is the current documentation structure?"
- "What templates or patterns exist for documentation?"

Analyze existing /docs structure as standardization template
```

### Step 5.3: Standardization Planning
```
Create standardization plan:
- Documentation template based on /docs patterns
- Scattered documentation consolidation strategy
- Missing documentation identification
- Maintenance process establishment
- Discoverability improvements

Document in findings/docs_analysis.md
```

**Validation Checkpoint**: Documentation standardization roadmap complete

---

## Phase 6: Security and Performance Analysis

**Objective**: Identify security vulnerabilities and performance optimization opportunities

### Step 6.1: Security Audit
```
Execute codebase_search with queries:
- "How is user authentication implemented?"
- "How are passwords and sensitive data handled?"
- "What input validation is in place?"
- "How are API endpoints secured?"

Execute grep searches for:
- "password|secret|key" (sensitive data handling)
- "auth|token|session" (authentication patterns)
- "sanitize|validate|escape" (input validation)

Document findings in findings/security_audit.md
```

### Step 6.2: Performance Analysis
```
Execute codebase_search with queries:
- "How are database queries optimized?"
- "What caching strategies are implemented?"
- "How are large datasets handled?"
- "What are the main performance bottlenecks?"

Execute grep searches for:
- "SELECT|INSERT|UPDATE|DELETE" (database operations)
- "cache|redis|memcache" (caching implementations)
- "async|await|Promise" (asynchronous operations)

Document findings in findings/performance_analysis.md
```

### Step 6.3: Optimization Opportunities
```
Create optimization roadmap:
- Database query optimization opportunities
- Caching implementation gaps
- Async operation improvements
- Resource usage optimization
- Scalability bottleneck identification

Document in findings/performance_analysis.md
```

**Validation Checkpoint**: Security and performance analysis complete

---

## Phase 7: Cross-Cutting Concerns Analysis

**Objective**: Analyze system-wide patterns for consistency

### Step 7.1: Error Handling Analysis
```
Execute codebase_search with queries:
- "How are errors handled across the application?"
- "What logging patterns are used?"
- "How are exceptions caught and processed?"

Execute grep searches for:
- "try|catch|throw" (error handling)
- "console\\.log|logger" (logging patterns)
- "error|Error|exception" (error management)

Document patterns in findings/cross_cutting_analysis.md
```

### Step 7.2: Configuration Management
```
Execute codebase_search with queries:
- "How are environment variables managed?"
- "What configuration patterns are used?"
- "How are feature flags implemented?"

Execute grep searches for:
- "process\\.env|config" (configuration)
- "development|production|staging" (environment handling)

Document in findings/cross_cutting_analysis.md
```

### Step 7.3: Consistency Assessment
```
Create consistency report:
- Error handling pattern standardization needs
- Logging consistency requirements (respect user preference for minimal logging)
- Configuration management improvements
- Code organization pattern compliance

Document in findings/cross_cutting_analysis.md
```

**Validation Checkpoint**: Cross-cutting concerns analysis complete

---

## Final Phase: Synthesis and Reporting

### Step 8.1: Findings Consolidation
```
Compile all findings into:
- reports/executive_summary.md (high-level overview)
- reports/technical_report.md (detailed technical findings)
- tracking/issues_log.md (prioritized issue list)
- tracking/remediation_plans.md (implementation roadmaps)
```

### Step 8.2: Impact Assessment
```
For each major finding, document:
- Implementation complexity (Low/Medium/High)
- Business impact (Critical/High/Medium/Low)
- Resource requirements (time estimates)
- Dependencies and sequencing requirements
- Risk assessment for changes vs status quo
```

### Step 8.3: Recommendations and Next Steps
```
Create reports/implementation_guide.md with:
- Prioritized recommendation list
- Resource allocation suggestions
- Timeline recommendations
- Risk mitigation strategies
- Success criteria definitions
```

**Final Validation**: Complete analysis package ready for decision-making

---

## Success Criteria

✅ **All phases completed with documented findings**  
✅ **Issues categorized and prioritized**  
✅ **Implementation roadmaps created**  
✅ **Resource requirements estimated**  
✅ **Decision-ready recommendations delivered**  

## Post-Execution

After completion, user reviews all findings and decides on implementation priorities. This analysis phase provides complete visibility for informed decision-making without committing to any changes.

---

**Note**: This is analysis only. No code changes are made during this process. All findings are documented for separate implementation decisions.

