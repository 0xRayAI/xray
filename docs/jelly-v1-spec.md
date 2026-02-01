# Jelly v1.0.0: Build the First StringRay Module

**Product:** Jelly - Project Intelligence Dashboard  
**Platform:** StringRay v1.3.5  
**Type:** Commercial Module (First Product)  
**Target:** $49/month subscription  

---

## The Mission

Build Jelly v1.0.0 - a dashboard that makes StringRay's 15 MCP servers accessible through a simple web interface.

**Jelly is the GUI that StringRay doesn't have.**

---

## Core Features (MVP)

### Feature 1: Project Auto-Discovery
**What it does:**
- Scans the current directory using librarian MCP
- Identifies project type (node, python, react, etc.)
- Maps project structure
- Displays: files, dependencies, complexity score

**Output:** Project overview card showing:
- Project name & type
- File count & structure
- Dependencies detected
- Complexity: Low/Medium/High

### Feature 2: Smart Agent Suggestions
**What it does:**
- Analyzes project using orchestrator MCP
- Recommends which StringRay agents to use
- Shows why each agent is suggested
- One-click agent activation

**Output:** Recommended agents panel:
- "Security Audit suggested (3 vulnerabilities likely)"
- "Code Review suggested (complex functions detected)"
- "Testing Strategy suggested (no test files found)"
- [Activate] buttons

### Feature 3: Task Complexity Estimator
**What it does:**
- Takes a user task ("refactor auth system")
- Uses complexity-analyzer MCP
- Estimates time and required agents
- Shows similar past tasks

**Output:** Task estimation card:
- Estimated time: 4 hours
- Recommended agents: architect, code-reviewer, test-architect
- Complexity: Medium
- Similar tasks completed: 12

### Feature 4: Real-Time Agent Monitor
**What it does:**
- Shows which agents are currently running
- Displays live MCP server status
- Shows agent output/logs
- Alert when agents complete/fail

**Output:** Live dashboard panel:
- 🟢 orchestrator: idle
- 🟡 enforcer: running (codex check)
- 🟢 security-audit: completed (2 issues found)
- 🔴 architect: failed (see logs)

### Feature 5: Project Health Score
**What it does:**
- Runs 5-minute automated audit using all MCPs
- Scores: Security, Code Quality, Test Coverage, Documentation
- Shows trends over time
- Recommendations for improvement

**Output:** Health score dashboard:
- Overall: 78/100 (Good)
- Security: 92/100 ✅
- Code Quality: 65/100 ⚠️
- Tests: 45/100 ❌
- [Run Full Audit] button

---

## Technical Requirements

### Stack
- **Frontend:** Simple HTML + CSS + vanilla JS (no framework bloat)
- **Backend:** Node.js express server
- **Integration:** Connects to StringRay's MCP servers via stdio
- **Port:** Runs on localhost:3333

### File Structure
```
jelly/
├── package.json          # Dependencies: strray-ai, express
├── server.js             # Express server + MCP integration
├── public/
│   ├── index.html        # Main dashboard
│   ├── style.css         # Clean, professional UI
│   └── app.js            # Frontend logic
└── agents/
    └── mcp-connector.js  # Talks to StringRay MCPs
```

### Integration Points
Jelly connects to these StringRay MCPs:
1. **librarian** - Project analysis
2. **orchestrator** - Task complexity & agent selection
3. **enforcer** - Health scoring
4. **code-reviewer** - Quality metrics
5. **security-auditor** - Security scan

---

## User Flow

### First-Time User
1. `npm install -g jelly-dashboard`
2. `cd my-project`
3. `jelly start`
4. Browser opens to localhost:3333
5. Sees project auto-discovered
6. Gets agent recommendations
7. Clicks "Run Security Audit"
8. Sees results in real-time

### Daily User
1. `jelly start` in project directory
2. Quick view of project health score
3. Check which agents are running
4. Click suggested task
5. Get time estimate
6. Approve agent execution
7. Monitor progress
8. View results

---

## Success Criteria

Jelly v1.0.0 is successful if:

✅ **Functionality:** All 5 features work end-to-end  
✅ **Integration:** Connects to all 15 StringRay MCPs  
✅ **UX:** Non-technical user can use it without reading docs  
✅ **Value:** User gets insights they couldn't get from StringRay CLI alone  
✅ **Stability:** Runs for 1 hour without crashes  

---

## The Commercial Pitch

**For StringRay (Free):**
"Install StringRay, configure agents, use CLI"

**For Jelly ($49/month):**
"See your project. Click buttons. Get insights. No config needed."

**Value Proposition:**
Jelly makes StringRay's power accessible to teams who don't have time to learn 15 MCP servers.

---

## Deliverable

Build Jelly v1.0.0 in `/Users/blaze/dev/jelly/`

**Files to Create:**
1. `package.json` - Project config, depends on strray-ai
2. `server.js` - Express server with MCP integration
3. `public/index.html` - Dashboard UI
4. `public/style.css` - Professional styling
5. `public/app.js` - Frontend interactions
6. `agents/mcp-connector.js` - StringRay MCP wrapper
7. `README.md` - Installation & usage

**Test It:**
```bash
cd ~/dev/jelly
npm install
npm start
# Open browser to localhost:3333
# Verify all 5 features work
```

---

## The Goal

**Build the first commercial StringRay module.**

Prove that:
1. StringRay can support paid products
2. Users will pay for convenience
3. The framework is commercially viable
4. Jelly is worth $49/month

**This is the first dollar.**
**Make it count.**

---

*Jelly v1.0.0 Specification*  
*StringRay First Module*  
*Build it. Test it. Ship it.*