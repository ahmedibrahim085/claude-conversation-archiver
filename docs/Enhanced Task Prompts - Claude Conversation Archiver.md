# Enhanced Task Prompts - Claude Conversation Archiver

## Task 1: Project Setup & Manifest Configuration

```
I'm starting development of the Claude Conversation Archiver Chrome extension.
Current Task: Task 1 - Project Setup & Manifest Configuration
Branch: task-01-project-setup

Tracking Documents:
- HANDOFF.md exists with project overview
- INTERFACES.md defines expected message formats
- PROGRESS.json tracks task completion

Create the initial Chrome extension structure with:

1. manifest.json with:
   - Manifest V3 format
   - name: "Claude Conversation Archiver"
   - version: "1.0.0"
   - description: "Archive your Claude AI conversations locally with optional cloud sync"
   - Permissions: ["storage", "activeTab"] only
   - host_permissions: ["https://claude.ai/*", "https://api.github.com/*"]
   - content_scripts targeting claude.ai with run_at: "document_idle"
   - background service_worker: "background.js"
   - action with default_popup: "popup.html"
   - icons: {"128": "icons/icon-128.png"} (placeholder path)

2. File structure:
   ├── manifest.json (complete)
   ├── content.js (placeholder with initialization log)
   ├── background.js (placeholder with onInstalled listener)
   ├── popup.html (basic HTML structure)
   ├── popup.js (placeholder with DOMContentLoaded)
   └── icons/ (empty folder for future icons)

3. Each placeholder file should have:
   - File header comment explaining purpose
   - One console.log to verify loading
   - Basic boilerplate (HTML structure, event listeners)

4. Update README.md with:
   - Project description
   - Installation instructions for development
   - File structure explanation

Validation Criteria:
- Extension loads in Chrome without errors
- All scripts show console.log when visiting claude.ai
- Popup opens when clicking extension icon

Update HANDOFF.md:
- Mark Task 1 as complete
- Update file status table
- Note manifest version and permissions used
```

---

## Task 2: DOM Capture Implementation

```
I'm continuing development of the Claude Conversation Archiver Chrome extension.
Current Task: Task 2 - DOM Capture Implementation
Branch: task-02-dom-capture

Previous work: Task 1 created project structure and manifest.json
Required: Read INTERFACES.md section "DOM Selectors" and "Message Passing"

Implement content.js with these specific functions:

1. Conversation capture function:
   ```javascript
   function captureConversations() {
     // Use selectors from INTERFACES.md
     // Return array of message objects
   }
   ```

2. Message extraction logic:
   - Primary selector: '[data-testid="conversation-turn"]'
   - Role selector: '.font-semibold'
   - Content selector: '.prose'
   - Fallback selectors from INTERFACES.md
   - Extract conversation ID from URL: /chat/([a-zA-Z0-9-]+)

3. MutationObserver implementation:
   - Target: document.body
   - Config: { childList: true, subtree: true }
   - Debounce function: 1000ms delay
   - Deduplication using content hash

4. Message sending following INTERFACES.md:
   ```javascript
   chrome.runtime.sendMessage({
     action: 'saveConversation',
     data: { url, title, conversationId, messages, capturedAt }
   });
   ```

5. Error handling:
   - Try-catch around selector queries
   - Fallback selectors if primary fail
   - Console.warn for non-critical issues
   - Never throw errors that break the page

6. Initialization:
   - Wait for DOM ready
   - Initial capture after 2 seconds
   - Log "Claude Archiver: Content script loaded"

Test Validation:
- Visit claude.ai and start a conversation
- Check console for capture logs
- Verify message format matches INTERFACES.md
- Test with new messages appearing

Update HANDOFF.md:
- Document selector strategy used
- Note any Claude.ai specific findings
- Update file status for content.js
```

---

## Task 3: Local Storage with IndexedDB

```
I'm continuing development of the Claude Conversation Archiver Chrome extension.
Current Task: Task 3 - Local Storage with IndexedDB
Branch: task-03-local-storage

Previous work: 
- Task 1: Project structure complete
- Task 2: content.js sends saveConversation messages

Required: Read INTERFACES.md sections "Message Passing" and "Storage Schemas"

Implement background.js with:

1. IndexedDB wrapper class:
   ```javascript
   class ConversationDB {
     constructor() {
       this.dbName = 'ClaudeArchive';
       this.version = 1;
       this.storeName = 'conversations';
     }
     
     async open() { /* Initialize DB */ }
     async save(data) { /* Add conversation */ }
     async getAll() { /* Return all */ }
     async getById(id) { /* Return one */ }
     async delete(id) { /* Remove one */ }
     async clear() { /* Remove all */ }
   }
   ```

2. Schema implementation (match INTERFACES.md exactly):
   - Object store: 'conversations' with keyPath: 'id', autoIncrement: true
   - Indexes: 'conversationId', 'capturedAt'
   - Add deviceId and syncStatus fields

3. Message handlers:
   ```javascript
   chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
     if (message.action === 'saveConversation') {
       // Save and return {success: true, conversationId: id}
     }
     // Handle other actions per INTERFACES.md
     return true; // Keep channel open for async
   });
   ```

4. Device ID management:
   - Check chrome.storage.local.get('deviceId')
   - Generate UUID if not exists: crypto.randomUUID()
   - Store and reuse for all conversations

5. Error handling:
   - Wrap all DB operations in try-catch
   - Return {success: false, error: string} format
   - Log errors with context: console.error('DB Error:', error)
   - Handle quota exceeded errors specifically

6. Chrome runtime handlers:
   - onInstalled: Initialize DB and log version
   - onStartup: Verify DB connection

Test Validation:
- Check DevTools > Application > IndexedDB
- Verify conversations save with all fields
- Test message responses match INTERFACES.md
- Verify error handling with bad data

Update HANDOFF.md and INTERFACES.md:
- Document any schema decisions
- Note IndexedDB size limits encountered
- Update implementation notes
```

---

## Task 4: Popup Interface & Export

```
I'm continuing development of the Claude Conversation Archiver Chrome extension.
Current Task: Task 4 - Popup Interface & Export
Branch: task-04-popup-interface

Previous work:
- Task 1: Project structure
- Task 2: Content script captures conversations
- Task 3: Background script stores in IndexedDB

Required: Read INTERFACES.md section "Popup → Background Script"

Implement popup interface:

1. popup.html structure:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <meta charset="utf-8">
     <style>
       body { width: 350px; min-height: 400px; margin: 0; padding: 15px; }
       /* Add provided styles */
     </style>
   </head>
   <body>
     <h2>Claude Conversation Archiver</h2>
     <div class="stats">
       <p>Conversations saved: <span id="count">0</span></p>
       <p>Last capture: <span id="lastCapture">Never</span></p>
     </div>
     <div class="actions">
       <button id="exportBtn">Export All Conversations</button>
       <button id="clearBtn">Clear All Data</button>
     </div>
     <div id="status" class="status"></div>
   </body>
   <script src="popup.js"></script>
   </html>
   ```

2. popup.js implementation:
   - DOMContentLoaded listener
   - Load conversation count on open
   - Format dates with toLocaleDateString()
   - Show status messages with auto-hide

3. Export functionality:
   ```javascript
   async function exportConversations() {
     const response = await chrome.runtime.sendMessage({
       action: 'exportConversations',
       format: 'json'
     });
     // Create blob and download
   }
   ```

4. Clear functionality:
   - Confirm dialog: "This will delete all archived conversations. Are you sure?"
   - Show success/error status
   - Update count after clear

5. Styling requirements:
   - Clean, minimal design
   - Buttons: Full width, padding, hover states
   - Status messages: Green success, red error
   - Responsive to content

6. Error handling:
   - Handle failed message sends
   - Show user-friendly error messages
   - Disable buttons during operations

Test Validation:
- Popup opens and shows correct count
- Export creates valid JSON file
- Clear function works with confirmation
- Status messages appear and auto-hide
- No console errors

Update HANDOFF.md:
- Note UI decisions made
- Document any usability findings
- Mark popup files complete
```

---

## Task 5: Conversation Detection & Retrieval

```
I'm continuing development of the Claude Conversation Archiver Chrome extension.
Current Task: Task 5 - Conversation Detection & Retrieval
Branch: task-05-conversation-detection

Previous work:
- Tasks 1-4: Complete MVP with capture, storage, and export
- All basic functionality working

Required: Review INTERFACES.md for tab navigation patterns

Enhance the extension with conversation detection:

1. Update background.js with tab monitoring:
   ```javascript
   chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
     if (changeInfo.status === 'complete' && 
         tab.url?.includes('claude.ai/chat/')) {
       const conversationId = extractConversationId(tab.url);
       checkIfArchived(conversationId, tabId);
     }
   });
   ```

2. Add conversation lookup method:
   - Query IndexedDB by conversationId
   - Return exists: boolean and messageCount
   - Cache results for performance

3. Badge notification system:
   - Show badge when archived conversation detected
   - chrome.action.setBadgeText({text: "✓", tabId})
   - chrome.action.setBadgeBackgroundColor({color: "#4CAF50"})
   - Clear badge when leaving conversation

4. Update content.js for incremental capture:
   - Check if conversation exists via message to background
   - Only capture new messages (compare counts)
   - Update existing conversation instead of duplicating

5. Add retrieval message handler:
   ```javascript
   case 'getConversation':
     const conversation = await db.getByConversationId(message.conversationId);
     sendResponse({success: true, data: conversation});
   ```

6. Notification when viewing archived conversation:
   - Simple chrome.notifications.create()
   - "This conversation is archived (X messages)"
   - Auto-dismiss after 3 seconds

Edge Cases:
- Handle URL changes without page reload (SPA navigation)
- Clear badge when tab closes
- Handle multiple Claude tabs

Test Validation:
- Open existing conversation - see badge
- Capture new messages in existing conversation
- Verify no duplicate conversations created
- Test with multiple tabs open

Update HANDOFF.md and INTERFACES.md:
- Document new message types
- Note conversation ID format
- Update with badge behavior
```

---

## Task 6: GitHub Gist Sync Implementation

```
I'm continuing development of the Claude Conversation Archiver Chrome extension.
Current Task: Task 6 - GitHub Gist Sync Implementation
Branch: task-06-github-sync

Previous work:
- Tasks 1-5: Full local functionality complete
- Ready for cloud sync feature

Required: Read INTERFACES.md section "GitHub Gist Structure"

Implement GitHub Gist sync:

1. Update popup.html with sync section:
   ```html
   <div class="sync-section">
     <h3>Cloud Sync (Optional)</h3>
     <input type="password" id="githubToken" placeholder="GitHub Personal Access Token">
     <label>
       <input type="checkbox" id="syncEnabled"> Enable automatic sync
     </label>
     <button id="syncNowBtn">Sync Now</button>
     <div id="syncStatus"></div>
   </div>
   ```

2. Token management in popup.js:
   - Save token to chrome.storage.local (not sync!)
   - Validate token format (40 chars, alphanumeric)
   - Show/hide token with eye icon
   - Clear status messages

3. Background.js sync implementation:
   ```javascript
   class GitHubSync {
     constructor() {
       this.gistId = null;
       this.token = null;
     }
     
     async initialize() { /* Load token and gistId */ }
     async createOrUpdateGist(conversations) { /* Main sync */ }
     async findExistingGist() { /* Search for our gist */ }
     async validateToken() { /* Test token works */ }
   }
   ```

4. Gist format (from INTERFACES.md):
   - Filename: 'claude-conversations.json'
   - Include device information
   - Timestamp-based versioning
   - Private gist by default

5. Sync logic:
   - Manual sync via button
   - Auto-sync on idle (if enabled)
   - Incremental updates (only changed conversations)
   - Handle rate limits (5000 requests/hour)

6. Error handling:
   - Invalid token: Clear and prompt
   - Network errors: Queue for retry
   - Rate limit: Show wait time
   - Parse errors: Log and skip

7. Sync status indicators:
   - "Last synced: [time]" in popup
   - Syncing spinner during operation
   - Success/error messages
   - Count of synced conversations

Test Validation:
- Token saves and persists
- Gist creates on first sync
- Updates existing gist on subsequent syncs
- Handles invalid tokens gracefully
- Works offline (queues for later)

Update HANDOFF.md:
- Document GitHub token scope needed (gist)
- Note rate limit handling
- Add sync troubleshooting guide
```

---

## Task 7: Idle Sync & Performance Optimization

```
I'm continuing development of the Claude Conversation Archiver Chrome extension.
Current Task: Task 7 - Idle Sync & Performance Optimization
Branch: task-07-performance

Previous work:
- Tasks 1-6: Full functionality with manual sync
- Need optimization for battery/performance

Required: Review all previous implementation for optimization opportunities

Implement performance optimizations:

1. Chrome idle API integration:
   ```javascript
   // In background.js
   chrome.idle.setDetectionInterval(60); // 60 seconds
   
   chrome.idle.onStateChanged.addListener((newState) => {
     if (newState === 'idle' && syncEnabled) {
       performIdleSync();
     }
   });
   ```

2. Chrome alarms for periodic sync:
   ```javascript
   chrome.alarms.create('periodicSync', {
     periodInMinutes: 30
   });
   
   chrome.alarms.onAlarm.addListener((alarm) => {
     if (alarm.name === 'periodicSync') {
       syncIfNeeded();
     }
   });
   ```

3. Content script optimizations:
   - Disconnect observer when not on claude.ai
   - Specific target node instead of body:
     ```javascript
     const targetNode = document.querySelector('main') || document.body;
     ```
   - Batch DOM reads in single pass
   - Limit captures to 1000 messages max

4. Background script optimizations:
   - Implement conversation size limits
   - LRU cache for recent conversations
   - Batch database operations
   - Debounce sync operations (5 min minimum)

5. Memory management:
   ```javascript
   class ConversationCache {
     constructor(maxSize = 50) {
       this.cache = new Map();
       this.maxSize = maxSize;
     }
     // LRU implementation
   }
   ```

6. Performance metrics:
   - Track capture time
   - Track sync duration
   - Log to chrome.storage.local
   - Show in popup (advanced section)

7. Battery-aware sync:
   ```javascript
   navigator.getBattery?.().then(battery => {
     if (battery.level < 0.2) {
       // Reduce sync frequency
     }
   });
   ```

Test Validation:
- Idle sync triggers after 60 seconds
- Periodic sync every 30 minutes
- Memory usage stays reasonable
- No performance impact on Claude.ai
- Battery consideration works

Performance Benchmarks:
- Capture time < 100ms
- Sync time < 5 seconds for 100 conversations
- Memory usage < 50MB

Update HANDOFF.md:
- Document performance improvements
- Note optimization decisions
- Add performance baseline metrics
```

---

## Task 8: Testing & Chrome Store Preparation

```
I'm continuing development of the Claude Conversation Archiver Chrome extension.
Current Task: Task 8 - Testing & Chrome Store Preparation
Branch: task-08-testing-store

Previous work:
- Tasks 1-7: All features implemented
- Need testing and store preparation

Required: Review all functionality for testing needs

Create comprehensive testing and store preparation:

1. Create test-scenarios.md with:
   ```markdown
   ## Core Functionality Tests
   - [ ] New conversation capture
   - [ ] Existing conversation update
   - [ ] Export with 0, 1, 100 conversations
   - [ ] Clear all with confirmation
   - [ ] Offline behavior
   
   ## Sync Tests
   - [ ] First-time sync setup
   - [ ] Update existing gist
   - [ ] Invalid token handling
   - [ ] Network failure recovery
   - [ ] Rate limit handling
   
   ## Edge Cases
   - [ ] Very long conversations (1000+ messages)
   - [ ] Special characters in messages
   - [ ] Multiple tabs open
   - [ ] Extension update/reload
   ```

2. Create privacy-policy.html:
   ```html
   <!DOCTYPE html>
   <html>
   <head><title>Privacy Policy - Claude Conversation Archiver</title></head>
   <body>
     <h1>Privacy Policy</h1>
     <p>Last updated: [Date]</p>
     
     <h2>Data Collection</h2>
     <p>This extension collects conversation text from Claude.ai...</p>
     
     <h2>Data Storage</h2>
     <p>All data is stored locally in your browser...</p>
     
     <h2>Data Sync (Optional)</h2>
     <p>If you enable GitHub sync...</p>
     
     <h2>Contact</h2>
     <p>Email: [your-email]</p>
   </body>
   </html>
   ```

3. Chrome Store assets (store-assets/):
   - icon-128.png (128x128 extension icon)
   - screenshot-1.png (1280x800 - popup view)
   - screenshot-2.png (1280x800 - conversation capture)
   - screenshot-3.png (1280x800 - export feature)

4. Store listing content (store-listing.txt):
   - Name: Claude Conversation Archiver
   - Short description (132 chars max)
   - Detailed description (benefits, features, privacy)
   - Key features bullet points
   - Why minimal permissions needed

5. Pre-submission checklist:
   - [ ] All console.logs removed/commented
   - [ ] Error handling for all edge cases
   - [ ] No hardcoded development values
   - [ ] Icons and screenshots created
   - [ ] Privacy policy hosted and linked
   - [ ] Manifest description clear
   - [ ] Version number appropriate (1.0.0)

6. Create simple test harness (test.js):
   ```javascript
   // Basic automated tests
   async function runTests() {
     console.log('Testing IndexedDB...');
     // Test DB operations
     
     console.log('Testing message passing...');
     // Test chrome.runtime.sendMessage
     
     console.log('Testing export format...');
     // Verify JSON structure
   }
   ```

Test Validation:
- All scenarios in test-scenarios.md pass
- No console errors in any scenario
- Memory usage acceptable
- Export format valid JSON
- Privacy policy accessible

Update HANDOFF.md:
- Mark ready for submission
- Note any issues found
- Document test results
```

---

## Task 9: Cross-Device Sync Enhancement

```
I'm continuing development of the Claude Conversation Archiver Chrome extension.
Current Task: Task 9 - Cross-Device Sync Enhancement
Branch: task-09-cross-device

Previous work:
- Tasks 1-8: Complete with basic sync
- Enhance for better multi-device support

Required: Read INTERFACES.md section on device identification

Enhance cross-device synchronization:

1. Improve device identification:
   ```javascript
   function generateDeviceInfo() {
     return {
       id: crypto.randomUUID(),
       name: navigator.userAgent.split(' ').slice(-2).join(' '),
       created: Date.now(),
       lastSeen: Date.now()
     };
   }
   ```

2. Update sync to use chrome.storage.sync:
   ```javascript
   // Store device ID in sync storage for persistence
   chrome.storage.sync.set({
     deviceId: deviceInfo.id,
     gistId: this.gistId // Share gist across devices
   });
   ```

3. Implement merge strategy in background.js:
   ```javascript
   function mergeConversations(local, remote) {
     const merged = new Map();
     
     // Add all local conversations
     local.forEach(conv => {
       merged.set(conv.conversationId, conv);
     });
     
     // Merge remote, newest wins
     remote.forEach(conv => {
       const existing = merged.get(conv.conversationId);
       if (!existing || conv.lastModified > existing.lastModified) {
         merged.set(conv.conversationId, conv);
       }
     });
     
     return Array.from(merged.values());
   }
   ```

4. Add sync conflict UI in popup:
   ```html
   <div id="syncInfo" style="display:none;">
     <h4>Sync Status</h4>
     <p>Devices: <span id="deviceCount">1</span></p>
     <p>Last sync: <span id="lastSyncTime">Never</span></p>
     <button id="pullFromCloud">Pull from Cloud</button>
   </div>
   ```

5. Version tracking per conversation:
   - Add 'version' field, increment on changes
   - Track which device made last change
   - Show in UI when conflicts exist

6. Add manual conflict resolution:
   - When conflicts detected, show both versions
   - Let user choose which to keep
   - Option to keep both (duplicate)

7. Sync indicators:
   - Show device count in popup
   - Indicate sync direction (up/down arrows)
   - Warning icon for conflicts

Edge Cases:
- First device sets up gist
- Second device finds existing gist
- Simultaneous edits on different devices
- Device offline for extended period

Test Validation:
- Install on two browsers/profiles
- Verify shared gist ID via chrome.storage.sync
- Test conversation appears on both devices
- Conflict resolution works correctly
- Device count shows accurately

Update HANDOFF.md and INTERFACES.md:
- Document merge algorithm
- Note device identification approach
- Update sync documentation
```

---

## Task 10: Final Polish & Documentation

```
I'm continuing development of the Claude Conversation Archiver Chrome extension.
Current Task: Task 10 - Final Polish & Documentation
Branch: task-10-polish

Previous work:
- Tasks 1-9: All features complete and tested
- Ready for final polish

Required: Review entire codebase for polish opportunities

Add final polish and complete documentation:

1. Add search/filter to popup.html:
   ```html
   <div class="search-section">
     <input type="text" id="searchInput" placeholder="Search conversations...">
     <select id="dateFilter">
       <option value="all">All time</option>
       <option value="today">Today</option>
       <option value="week">This week</option>
       <option value="month">This month</option>
     </select>
   </div>
   <div id="conversationList"></div>
   ```

2. Implement search in popup.js:
   - Real-time filter as user types
   - Search in conversation content
   - Date range filtering
   - Show match count

3. Add keyboard shortcuts:
   ```javascript
   chrome.commands.onCommand.addListener((command) => {
     if (command === 'export-conversations') {
       exportConversations();
     }
   });
   ```
   Update manifest.json with commands section

4. Visual polish:
   - Smooth transitions (CSS transitions)
   - Loading states with spinners
   - Empty states with helpful messages
   - Icon animations on capture

5. Create comprehensive README.md:
   ```markdown
   # Claude Conversation Archiver
   
   ## Features
   - ✅ Automatic conversation capture
   - ✅ Local storage with IndexedDB
   - ✅ Export to JSON
   - ✅ Optional GitHub sync
   - ✅ Cross-device support
   
   ## Installation
   ### From Chrome Web Store
   [Coming soon]
   
   ### Development
   1. Clone repository
   2. Open chrome://extensions
   3. Enable Developer mode
   4. Load unpacked
   
   ## Usage Guide
   [Screenshots and explanations]
   
   ## GitHub Sync Setup
   [Step-by-step with screenshots]
   
   ## Privacy
   [Link to privacy policy]
   
   ## Troubleshooting
   [Common issues and solutions]
   ```

6. Add inline documentation:
   - JSDoc comments for main functions
   - Explain complex algorithms
   - Add TODO comments for future enhancements

7. Create GitHub Pages site (docs/):
   - index.html with features
   - privacy.html with full policy
   - Simple, clean design
   - Installation instructions

8. Final cleanup:
   - Remove all console.logs
   - Optimize images/icons
   - Minify CSS if large
   - Version bump if needed

Final Validation:
- Search works smoothly
- Keyboard shortcuts function
- Documentation complete and accurate
- GitHub Pages site loads
- All features polished

Update HANDOFF.md:
- Mark project complete
- List any future enhancement ideas
- Final statistics (lines of code, features)
- Lessons learned summary
```

---

## Summary

All 10 task prompts are now enhanced with:
- ✅ Clear context and dependencies
- ✅ Specific implementation requirements
- ✅ Code examples where helpful
- ✅ Test validation criteria
- ✅ Required tracking document updates
- ✅ Edge cases to consider
- ✅ Integration with INTERFACES.md

Each prompt is now self-contained enough that you can start a conversation and complete the task without ambiguity.