# Simplest Claude AI Conversation Archiver: Weekend MVP Guide

Your research reveals that **Claude.ai uses a server-first architecture with minimal client-side storage**, meaning conversations aren't stored locally in browser storage. This actually simplifies your extension design - you'll need to capture conversations directly from the DOM as they appear.

## Core Architecture: The 3-Hour MVP

Based on the research findings, here's the absolute simplest implementation that can be built in a weekend:

### 1. Skip complex local storage checks - Claude doesn't use them

Claude.ai stores conversations server-side only. Browser extensions that archive Claude conversations capture data directly from the DOM rather than accessing existing storage. This means you can skip checking localStorage/IndexedDB entirely and focus on DOM monitoring.

### 2. Simple DOM capture with MutationObserver

Since Claude doesn't store conversations locally, the simplest approach is monitoring the conversation DOM:

```javascript
// content.js - Minimal conversation capture
const captureConversations = () => {
  const messages = document.querySelectorAll('[data-testid="conversation-turn"]');
  return Array.from(messages).map(msg => ({
    role: msg.querySelector('.font-semibold')?.textContent || 'unknown',
    content: msg.querySelector('.prose')?.textContent || '',
    timestamp: Date.now()
  }));
};

// Monitor for new messages
const observer = new MutationObserver(() => {
  const conversations = captureConversations();
  if (conversations.length > 0) {
    chrome.runtime.sendMessage({
      action: 'saveConversation',
      data: conversations
    });
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

### 3. Use GitHub Gists API for sync - 1 hour setup

**GitHub Gists emerges as the clear winner for weekend MVPs** - no backend setup, simple API, generous free tier:

```javascript
// background.js - Minimal sync implementation
const GITHUB_TOKEN = 'your_personal_access_token';
let gistId = null;

async function syncToGist(conversations) {
  const data = {
    files: {
      'claude-conversations.json': {
        content: JSON.stringify({
          conversations,
          lastModified: Date.now(),
          device: navigator.userAgent
        })
      }
    }
  };
  
  const response = await fetch(
    gistId ? `https://api.github.com/gists/${gistId}` : 'https://api.github.com/gists',
    {
      method: gistId ? 'PATCH' : 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }
  );
  
  if (!gistId) {
    const result = await response.json();
    gistId = result.id;
    chrome.storage.local.set({ gistId });
  }
}
```

### 4. Minimal manifest.json for quick approval

```json
{
  "manifest_version": 3,
  "name": "Claude Conversation Archive",
  "version": "1.0",
  "description": "Archive your Claude AI conversations locally",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["https://claude.ai/*"],
  "content_scripts": [{
    "matches": ["https://claude.ai/*"],
    "js": ["content.js"]
  }],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
```

## Complete Weekend Implementation

### File Structure (5 files total)
```
claude-archiver/
├── manifest.json
├── content.js      (50 lines)
├── background.js   (80 lines)
├── popup.html      (20 lines)
└── popup.js        (30 lines)
```

### content.js - DOM Capture
```javascript
// Simple conversation capture
let lastCaptureHash = '';

const captureConversations = () => {
  const turns = document.querySelectorAll('[data-testid="conversation-turn"]');
  const conversations = Array.from(turns).map(turn => ({
    role: turn.querySelector('.font-semibold')?.textContent || 'unknown',
    content: turn.querySelector('.prose')?.textContent || '',
    timestamp: Date.now()
  }));
  
  // Simple deduplication
  const hash = JSON.stringify(conversations);
  if (hash !== lastCaptureHash && conversations.length > 0) {
    lastCaptureHash = hash;
    chrome.runtime.sendMessage({
      action: 'saveConversation',
      data: {
        url: window.location.href,
        title: document.title,
        messages: conversations,
        capturedAt: Date.now()
      }
    });
  }
};

// Capture on page changes
const observer = new MutationObserver(debounce(captureConversations, 1000));
observer.observe(document.body, { childList: true, subtree: true });

// Simple debounce
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Initial capture
setTimeout(captureConversations, 2000);
```

### background.js - Storage & Sync
```javascript
// Simple IndexedDB wrapper
const db = {
  name: 'ClaudeArchive',
  version: 1,
  store: 'conversations',
  
  open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, this.version);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.store)) {
          db.createObjectStore(this.store, { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  },
  
  async save(data) {
    const database = await this.open();
    const tx = database.transaction([this.store], 'readwrite');
    const store = tx.objectStore(this.store);
    return store.add(data);
  },
  
  async getAll() {
    const database = await this.open();
    const tx = database.transaction([this.store], 'readonly');
    const store = tx.objectStore(this.store);
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });
  }
};

// Handle messages from content script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'saveConversation') {
    await db.save(message.data);
    console.log('Conversation saved:', message.data.title);
  }
});

// Simple GitHub Gist sync (optional)
async function syncToGist() {
  const conversations = await db.getAll();
  // Add your GitHub token here
  const GITHUB_TOKEN = await chrome.storage.local.get('githubToken');
  
  if (!GITHUB_TOKEN.githubToken) return;
  
  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN.githubToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      files: {
        'claude-archive.json': {
          content: JSON.stringify(conversations, null, 2)
        }
      },
      public: false
    })
  });
}

// Sync every hour when idle
chrome.alarms.create('sync', { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sync') syncToGist();
});
```

### popup.html - Minimal UI
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 300px; padding: 10px; }
    button { margin: 5px 0; padding: 8px; width: 100%; }
    .count { font-weight: bold; }
  </style>
</head>
<body>
  <h3>Claude Archive</h3>
  <p>Conversations saved: <span class="count">0</span></p>
  <button id="export">Export All</button>
  <button id="sync">Sync to GitHub</button>
  <script src="popup.js"></script>
</body>
</html>
```

### popup.js - Simple Controls
```javascript
document.addEventListener('DOMContentLoaded', async () => {
  // Show conversation count
  const conversations = await chrome.runtime.sendMessage({ action: 'getAll' });
  document.querySelector('.count').textContent = conversations?.length || 0;
  
  // Export button
  document.getElementById('export').addEventListener('click', async () => {
    const conversations = await chrome.runtime.sendMessage({ action: 'getAll' });
    const blob = new Blob([JSON.stringify(conversations, null, 2)], 
      { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claude-archive-${Date.now()}.json`;
    a.click();
  });
});
```

## Chrome Store Compliance: Minimal Requirements

### Privacy Policy (Required)
```
Privacy Policy for Claude Conversation Archive

Data Collection: This extension captures conversation text from Claude.ai
Data Use: Data is used solely to provide local archiving functionality
Data Storage: All data is stored locally in your browser
Data Sharing: No data is shared with third parties
Data Sync: Optional GitHub sync requires user-provided token

Contact: your-email@example.com
```

### Store Listing Tips
- Use only `activeTab` permission to avoid manual review
- Keep description focused: "Archive your Claude AI conversations locally"
- Include real screenshots of the popup
- Justify permissions clearly in developer dashboard

## Alternative Patterns from Similar Extensions

**Session Buddy approach**: Uses chrome.storage.local for everything, provides manual export/import. Perfect for MVP.

**Grammarly pattern**: Content script monitors DOM changes, batches updates to reduce overhead.

**The Great Suspender legacy**: Simple IndexedDB usage without complex wrappers, works reliably.

## Skip These Overengineering Traps

1. **Don't implement CRDTs or vector clocks** - Simple timestamp comparison is sufficient
2. **Don't encrypt locally** - Chrome storage is already sandboxed
3. **Don't use Firebase/Supabase** - Their Chrome extension auth is complex
4. **Don't try to intercept Claude's API calls** - DOM capture is simpler and more reliable

## Total Implementation Time

- **Hour 1**: Basic extension structure and manifest
- **Hour 2**: DOM capture and local storage
- **Hour 3**: Export functionality and UI
- **Hour 4**: GitHub Gist sync (optional)
- **Hour 5**: Testing and Chrome Store submission

This approach gives you a working Claude conversation archiver that can be built in a weekend, uses proven patterns from successful extensions, and avoids the complexity that kills most MVP projects.