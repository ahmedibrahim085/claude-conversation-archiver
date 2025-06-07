# Interface Contracts - Claude Conversation Archiver

This document defines all interfaces between components. **DO NOT MODIFY** existing interfaces without updating all dependent code.

## Message Passing Interfaces

### Content Script → Background Script

#### Save Conversation Message
```javascript
// From: content.js (Task 2)
// To: background.js (Task 3)
// When: New conversation data captured
chrome.runtime.sendMessage({
  action: 'saveConversation',
  data: {
    url: string,              // Full Claude.ai URL
    title: string,            // Page title
    conversationId: string,   // Extracted from URL if available
    messages: Array<{
      role: 'user' | 'assistant' | 'unknown',
      content: string,        // Text content of message
      timestamp: number       // Date.now() when captured
    }>,
    capturedAt: number        // Date.now() when conversation captured
  }
});

// Expected Response:
{
  success: boolean,
  conversationId?: string,
  error?: string
}
```

### Popup → Background Script

#### Get All Conversations
```javascript
// From: popup.js (Task 4)
// To: background.js (Task 3)
chrome.runtime.sendMessage({
  action: 'getAllConversations'
});

// Expected Response:
{
  success: boolean,
  conversations: Array<{
    id: number,
    url: string,
    title: string,
    messageCount: number,
    capturedAt: number,
    lastModified: number
  }>,
  error?: string
}
```

#### Export Conversations
```javascript
// From: popup.js (Task 4)
// To: background.js (Task 3)
chrome.runtime.sendMessage({
  action: 'exportConversations',
  format: 'json'  // Future: could support 'csv', 'markdown'
});

// Expected Response:
{
  success: boolean,
  data: string,  // JSON stringified data
  error?: string
}
```

#### Clear All Conversations
```javascript
// From: popup.js (Task 4)
// To: background.js (Task 3)
chrome.runtime.sendMessage({
  action: 'clearAllConversations'
});

// Expected Response:
{
  success: boolean,
  error?: string
}
```

#### Sync Settings (Task 6)
```javascript
// From: popup.js
// To: background.js
chrome.runtime.sendMessage({
  action: 'updateSyncSettings',
  settings: {
    githubToken: string,
    syncEnabled: boolean,
    gistId?: string
  }
});

// Expected Response:
{
  success: boolean,
  error?: string
}
```

## Storage Schemas

### IndexedDB Schema
```javascript
// Database: ClaudeArchive
// Version: 1
// Object Store: conversations

{
  // Auto-generated
  id: IDBKey (auto-increment),
  
  // From content script
  url: string,
  title: string,
  conversationId: string,
  messages: Array<{
    role: string,
    content: string,
    timestamp: number
  }>,
  capturedAt: number,
  
  // Added by background script
  deviceId: string,
  lastModified: number,
  syncStatus: 'pending' | 'synced' | 'error',
  syncedAt?: number
}
```

### Chrome Storage Schema
```javascript
// chrome.storage.local
{
  // Device identification
  deviceId: string,  // Generated UUID
  
  // Sync configuration (Task 6)
  syncSettings: {
    githubToken: string,
    syncEnabled: boolean,
    gistId?: string,
    lastSync?: number
  },
  
  // Performance metrics (Task 7)
  metrics: {
    totalCaptures: number,
    totalSyncs: number,
    lastCaptureTime: number,
    lastSyncTime: number
  }
}

// chrome.storage.sync (for cross-device)
{
  deviceId: string,
  gistId?: string
}
```

## DOM Selectors (Task 2)

```javascript
// Primary selectors for conversation capture
const SELECTORS = {
  conversationTurn: '[data-testid="conversation-turn"]',
  role: '.font-semibold',
  content: '.prose',
  // Fallback selectors if primary ones fail
  fallbackTurn: '.group.w-full',
  fallbackRole: '[class*="font-bold"]',
  fallbackContent: '[class*="prose"]'
};
```

## GitHub Gist Structure (Task 6)

```javascript
// Gist filename: claude-conversations.json
{
  version: '1.0',
  devices: {
    [deviceId]: {
      lastSync: number,
      name: string  // User agent or custom name
    }
  },
  conversations: Array<{
    // All fields from IndexedDB schema
    // Plus multi-device sync fields:
    devices: Array<string>,  // Device IDs that have this conversation
    versions: {
      [deviceId]: number     // Version number per device
    }
  }>
}
```

## Event Patterns

### Tab Navigation Detection (Task 5)
```javascript
// Background script listens for:
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url?.includes('claude.ai/chat/')) {
    // Extract conversation ID and check if archived
    const conversationId = extractConversationId(tab.url);
    // Send message to content script
  }
});
```

### Idle State Detection (Task 7)
```javascript
// Background script listens for:
chrome.idle.onStateChanged.addListener((newState) => {
  // newState: 'active' | 'idle' | 'locked'
  if (newState === 'idle') {
    // Trigger sync
  }
});
```

## Error Codes

| Code | Description | Recovery Action |
|------|-------------|-----------------|
| E001 | IndexedDB initialization failed | Use chrome.storage as fallback |
| E002 | DOM structure changed | Try fallback selectors |
| E003 | GitHub API rate limited | Retry after X seconds |
| E004 | Network offline | Queue for later sync |
| E005 | Storage quota exceeded | Prompt user to clean old data |

## Version History

- v1.0: Initial interface definitions (Tasks 1-10)

**Note**: When adding new interfaces, always increment version and document changes.