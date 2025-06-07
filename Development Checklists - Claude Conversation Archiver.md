# Development Checklists - Claude Conversation Archiver

## Pre-Task Checklist (Start of Each Conversation)

### 1. Environment Setup
- [ ] Navigate to project directory: `cd claude-conversation-archiver`
- [ ] Check current branch: `git branch`
- [ ] Pull latest changes: `git pull origin main`
- [ ] Check HANDOFF.md for current status
- [ ] Review INTERFACES.md for any dependencies
- [ ] Note which task number you're implementing

### 2. Branch Creation
- [ ] Create new task branch: `git checkout -b task-XX-description`
- [ ] Verify you're on correct branch: `git branch`
- [ ] Check no uncommitted changes: `git status`

### 3. Context Loading
- [ ] Read the specific task prompt completely
- [ ] Check dependencies in PROGRESS.json
- [ ] Review relevant interfaces in INTERFACES.md
- [ ] Note any files that need modification
- [ ] Understand expected outputs

### 4. Conversation Start Template
```
I'm continuing development of the Claude Conversation Archiver Chrome extension.

Current Task: Task [X] - [Task Name]
Branch: task-[XX]-[description]

Previous tasks completed:
[List completed tasks]

Files to modify:
[List files for this task]

Relevant interfaces:
[Paste from INTERFACES.md if needed]

Task specification:
[Paste the task prompt]
```

## Post-Task Checklist (End of Each Conversation)

### 1. Code Verification
- [ ] All files in task are complete and functional
- [ ] No hardcoded values (use constants/config)
- [ ] Basic error handling implemented
- [ ] Code follows established patterns
- [ ] No console.log statements left (or commented)

### 2. Interface Documentation
- [ ] New interfaces added to INTERFACES.md
- [ ] Existing interfaces not modified (unless required)
- [ ] Message formats documented
- [ ] Expected responses defined
- [ ] Error codes added if new ones created

### 3. Testing Verification
- [ ] Code can run independently (no missing dependencies)
- [ ] Edge cases considered (empty data, errors)
- [ ] Chrome extension loads without errors
- [ ] Basic functionality works as expected

### 4. Documentation Updates

#### Update HANDOFF.md:
```markdown
## Current Status
**Last Updated**: [Current DateTime]
**Last Task Completed**: Task [X] - [Name]
**Current Branch**: task-[XX]-[description]
**Next Task**: Task [X+1] - [Name]

## Completed Tasks
- [x] Task [X]: [Name] (branch: task-[XX]-[description])
  - [Brief summary of what was implemented]
  - Status: READY TO MERGE

## File Status
[Update the table with modified files]

## Next Conversation Should:
1. Pull latest from main
2. Merge task-[XX]-[description] to main
3. Create branch task-[XX+1]-[description]
4. [Specific instructions for next task]
```

#### Update PROGRESS.json:
```json
{
  "id": [X],
  "status": "completed",
  "actualHours": [X],
  "startedAt": "[Start time]",
  "completedAt": "[Current time]",
  "mergedToMain": false
}
```

### 5. Git Operations
- [ ] Stage all changes: `git add .`
- [ ] Commit with meaningful message: `git commit -m "Task X: Brief description of what was done"`
- [ ] Note commit hash for reference
- [ ] DO NOT merge to main (next conversation will handle)

### 6. Handoff Preparation
- [ ] List any unresolved issues or TODOs
- [ ] Note any decisions made during implementation
- [ ] Document any deviations from original plan
- [ ] Provide clear next steps

## Common Issues and Solutions

### Issue: Interface Mismatch
**Solution**: Never modify existing interfaces. If change is critical, document in HANDOFF.md and update all dependent code in same conversation.

### Issue: Scope Creep
**Solution**: Stick to task specification. Note additional features in HANDOFF.md for future tasks.

### Issue: Missing Dependencies
**Solution**: Check PROGRESS.json for task dependencies. Ensure previous tasks are completed.

### Issue: Merge Conflicts
**Solution**: Always pull latest before starting. Keep changes isolated to task files.

## Quick Commands Reference

```bash
# Start of conversation
git checkout main
git pull origin main
git checkout -b task-XX-description

# During development
git status
git diff
git add [specific file]

# End of conversation
git add .
git commit -m "Task X: Description"
git log --oneline -1  # Note commit hash

# DO NOT RUN (next conversation will)
# git checkout main
# git merge task-XX-description
```

## Communication Templates

### Asking for Clarification
"I notice that [specific issue]. The task specifies [requirement], but this conflicts with [existing code/interface]. Should I [option A] or [option B]?"

### Reporting Completion
"Task [X] is now complete. I've implemented [brief summary]. The code includes [key features]. Next conversation should [specific next steps]."

### Documenting Decisions
"I chose to implement [approach] because [reasoning]. This maintains compatibility with [existing interface] while allowing for [future enhancement]."