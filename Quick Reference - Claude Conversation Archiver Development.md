# Quick Reference - Claude Conversation Archiver Development

## 🚀 Starting a New Task Conversation

```bash
# 1. Navigate to project
cd claude-conversation-archiver

# 2. Update and create branch
git checkout main
git pull origin main
git checkout -b task-XX-description

# 3. Check status
cat HANDOFF.md | grep "Next Task"
```

**Conversation Starter Template:**
```
I'm continuing development of the Claude Conversation Archiver Chrome extension.
Current Task: Task [X] - [Name]
Branch: task-XX-description
[Paste relevant context from HANDOFF.md]
[Paste task prompt]
```

## 📁 Key Files Reference

| File | Purpose | Modified By Tasks |
|------|---------|-------------------|
| `manifest.json` | Extension configuration | Task 1 |
| `content.js` | DOM capture logic | Tasks 2, 5, 7 |
| `background.js` | Storage & sync | Tasks 3, 5, 6, 7, 9 |
| `popup.html` | User interface | Tasks 4, 6, 10 |
| `popup.js` | UI logic | Tasks 4, 6, 9, 10 |

## 🔄 Message Flow Quick Reference

```
content.js → background.js
├── saveConversation
└── (returns: success/error)

popup.js → background.js  
├── getAllConversations
├── exportConversations
├── clearAllConversations
└── updateSyncSettings
```

## 💾 Storage Locations

- **Local conversations**: IndexedDB (`ClaudeArchive`)
- **Settings**: `chrome.storage.local`
- **Cross-device sync**: `chrome.storage.sync`
- **Cloud backup**: GitHub Gist (optional)

## 🏁 Task Completion Checklist

1. ✅ Code complete and tested
2. ✅ HANDOFF.md updated
3. ✅ INTERFACES.md updated (if new interfaces)
4. ✅ PROGRESS.json updated
5. ✅ Git commit with message: `Task X: Description`

## 🚨 Common Commands

```bash
# Check current status
git status
git branch

# See what changed
git diff
git diff --staged

# Commit changes
git add .
git commit -m "Task X: What was implemented"

# View recent commits
git log --oneline -5

# Emergency reset (CAREFUL!)
git reset --hard HEAD
```

## 📊 Progress Tracking

```bash
# Check overall progress
cat PROGRESS.json | grep "completionPercentage"

# See completed tasks
cat HANDOFF.md | grep -A 20 "Completed Tasks"

# Check next task
cat HANDOFF.md | grep "Next Task"
```

## 🔧 Testing Commands

```bash
# Load extension in Chrome
1. Open chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select project directory

# Quick functionality test
- Visit claude.ai
- Check console for errors
- Open extension popup
- Verify basic operations
```

## 📝 Task Dependencies

```
Task 1 (Setup) → Task 2 (Capture) → Task 3 (Storage) → Task 4 (UI)
                                  ↓
                          Task 5 (Detection)
                                  ↓
                          Task 6 (Sync) → Task 7 (Performance)
                                  ↓
                          Task 9 (Multi-device)

All tasks → Task 8 (Testing) → Task 10 (Polish)
```

## 🎯 MVP Milestones

1. **Basic Capture** (Tasks 1-2): See conversations in console
2. **Local Storage** (Task 3): Persist across sessions  
3. **User Interface** (Task 4): Export conversations
4. **Cloud Sync** (Task 6): Backup to GitHub

## ⚡ Quick Fixes

**Extension won't load**: Check manifest.json syntax
**Content script not running**: Verify claude.ai permissions
**Storage errors**: Check IndexedDB in DevTools
**Sync fails**: Verify GitHub token and network

## 🔗 Important Links

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [IndexedDB Guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [GitHub Gist API](https://docs.github.com/en/rest/gists)

## 💡 Remember

- One task per conversation
- Always update tracking documents
- Test each component independently
- Commit early, commit often
- Ask for clarification if needed

---

**Emergency Contact**: If you get stuck, create a STATUS_AUDIT.md and analyze the situation systematically.