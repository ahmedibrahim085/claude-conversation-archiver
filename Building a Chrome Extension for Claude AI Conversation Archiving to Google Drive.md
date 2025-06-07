# Building a Chrome Extension for Claude AI Conversation Archiving to Google Drive

## Architecture Overview

This technical guide provides comprehensive implementation details for building a Chrome extension that intercepts Claude AI conversations, archives them to Google Drive in JSON format, and handles incremental syncing across devices with offline support.

## Chrome Extension Manifest V3 Configuration

The extension requires specific permissions and configuration to intercept content from claude.ai and integrate with Google Drive:

```json
{
  "manifest_version": 3,
  "name": "Claude AI Conversation Archiver",
  "version": "1.0.0",
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "identity"
  ],
  "host_permissions": [
    "https://claude.ai/*",
    "https://www.googleapis.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://claude.ai/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/drive.file"
    ]
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none';"
  }
}
```

## Content Script Implementation for Conversation Interception

The content script monitors the Claude AI interface for conversation changes using MutationObserver:

```javascript
// content.js
class ClaudeMonitor {
  constructor() {
    this.conversationData = {
      conversationId: null,
      messages: [],
      lastSync: null,
      contentHash: null
    };
    this.observer = null;
    this.syncQueue = [];
    this.init();
  }

  init() {
    if (document.readyState === 'complete') {
      this.startMonitoring();
    } else {
      window.addEventListener('load', () => this.startMonitoring());
    }
  }

  startMonitoring() {
    this.extractConversationId();
    this.setupMutationObserver();
    this.extractExistingMessages();
    this.setupIncrementalSync();
  }

  extractConversationId() {
    // Try multiple methods to extract conversation ID
    const urlMatch = window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
    if (urlMatch) {
      this.conversationData.conversationId = urlMatch[1];
      return;
    }

    // Fallback: generate deterministic ID from content and timestamp
    const timestamp = Date.now();
    const contentHash = this.generateContentHash(document.body.textContent);
    this.conversationData.conversationId = `conv_${timestamp}_${contentHash.slice(0, 8)}`;
  }

  setupMutationObserver() {
    const conversationContainer = this.findConversationContainer();
    if (!conversationContainer) return;

    const config = {
      childList: true,
      subtree: true,
      characterData: true
    };

    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.observer.observe(conversationContainer, config);
  }

  findConversationContainer() {
    const selectors = [
      '[data-testid="conversation"]',
      '.conversation-container',
      '[role="main"]',
      '.messages-container'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }

    return null;
  }

  async handleMutations(mutations) {
    let hasNewMessages = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE && this.isMessageElement(node)) {
            hasNewMessages = true;
          }
        });
      }
    }

    if (hasNewMessages) {
      await this.processNewMessages();
    }
  }

  async processNewMessages() {
    const messages = this.extractMessages();
    const newContentHash = this.generateContentHash(JSON.stringify(messages));
    
    if (newContentHash !== this.conversationData.contentHash) {
      this.conversationData.messages = messages;
      this.conversationData.contentHash = newContentHash;
      this.conversationData.lastSync = Date.now();
      
      await this.queueForSync();
    }
  }

  generateContentHash(content) {
    // Simple hash function for content comparison
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  async queueForSync() {
    const syncData = {
      conversationId: this.conversationData.conversationId,
      messages: this.conversationData.messages,
      contentHash: this.conversationData.contentHash,
      timestamp: Date.now(),
      deviceId: await this.getDeviceId()
    };

    chrome.runtime.sendMessage({
      type: 'SYNC_CONVERSATION',
      data: syncData
    });
  }

  async getDeviceId() {
    const result = await chrome.storage.local.get('deviceId');
    if (result.deviceId) return result.deviceId;
    
    const deviceId = this.generateDeviceId();
    await chrome.storage.local.set({ deviceId });
    return deviceId;
  }

  generateDeviceId() {
    return `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

// Initialize monitor
const claudeMonitor = new ClaudeMonitor();
```

## Google Drive API Integration

The service worker handles authentication and Drive operations:

```javascript
// background.js
class DriveSync {
  constructor() {
    this.rateLimiter = new RateLimiter(10); // 10 requests per second
    this.syncQueue = new SyncQueue();
  }

  async getAuthToken() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });
  }

  async refreshToken(token) {
    return new Promise((resolve) => {
      chrome.identity.removeCachedAuthToken({ token }, async () => {
        const newToken = await this.getAuthToken();
        resolve(newToken);
      });
    });
  }

  async makeAuthenticatedRequest(url, options = {}) {
    await this.rateLimiter.throttle();
    
    let token = await this.getAuthToken();
    let response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (response.status === 401) {
      token = await this.refreshToken(token);
      response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
    }

    return response;
  }

  async findOrCreateConversationFile(conversationId) {
    const query = `name='conversation_${conversationId}.json' and mimeType='application/json'`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`;
    
    const response = await this.makeAuthenticatedRequest(searchUrl);
    const data = await response.json();
    
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
    
    return await this.createConversationFile(conversationId);
  }

  async createConversationFile(conversationId) {
    const metadata = {
      name: `conversation_${conversationId}.json`,
      mimeType: 'application/json',
      parents: ['appDataFolder'] // Use app data folder for privacy
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob(['{}'], { type: 'application/json' }));

    const response = await this.makeAuthenticatedRequest(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        body: form,
        headers: {} // Let browser set Content-Type for FormData
      }
    );

    return await response.json();
  }

  async updateConversationFile(fileId, conversationData) {
    const encryptedData = await this.encryptData(conversationData);
    
    const response = await this.makeAuthenticatedRequest(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        body: JSON.stringify(encryptedData, null, 2)
      }
    );

    return await response.json();
  }

  async encryptData(data) {
    // Implement client-side encryption for sensitive data
    const key = await this.getEncryptionKey();
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );

    return {
      encrypted: true,
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encryptedBuffer)),
      timestamp: Date.now()
    };
  }
}

// Message handler for content script communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_CONVERSATION') {
    handleConversationSync(message.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open
  }
});

async function handleConversationSync(data) {
  const driveSync = new DriveSync();
  
  // Check for existing conversation
  const file = await driveSync.findOrCreateConversationFile(data.conversationId);
  
  // Get existing data for incremental sync
  const existingData = await driveSync.getFileContent(file.id);
  
  // Merge conversation data
  const mergedData = await mergeConversationData(existingData, data);
  
  // Update file with merged data
  await driveSync.updateConversationFile(file.id, mergedData);
  
  // Store sync metadata locally
  await chrome.storage.local.set({
    [`sync_${data.conversationId}`]: {
      lastSync: Date.now(),
      contentHash: data.contentHash,
      fileId: file.id
    }
  });
  
  return { fileId: file.id, synced: true };
}
```

## Incremental Sync Strategy

The extension uses content hashing and conversation IDs for efficient incremental syncing:

```javascript
class IncrementalSync {
  constructor() {
    this.syncState = new Map();
  }

  async mergeConversationData(existingData, newData) {
    // Decrypt existing data if needed
    const decryptedExisting = existingData.encrypted 
      ? await this.decryptData(existingData)
      : existingData;

    // Create message map for efficient merging
    const messageMap = new Map();
    
    // Add existing messages
    if (decryptedExisting.messages) {
      decryptedExisting.messages.forEach(msg => {
        messageMap.set(msg.id || this.generateMessageId(msg), msg);
      });
    }

    // Merge new messages
    newData.messages.forEach(msg => {
      const msgId = msg.id || this.generateMessageId(msg);
      const existingMsg = messageMap.get(msgId);
      
      if (!existingMsg || msg.timestamp > existingMsg.timestamp) {
        messageMap.set(msgId, msg);
      }
    });

    return {
      conversationId: newData.conversationId,
      messages: Array.from(messageMap.values()).sort((a, b) => a.timestamp - b.timestamp),
      metadata: {
        lastSync: Date.now(),
        deviceId: newData.deviceId,
        contentHash: newData.contentHash,
        version: '1.0'
      }
    };
  }

  generateMessageId(message) {
    // Generate stable ID from message content and timestamp
    const content = `${message.role}:${message.content}:${message.timestamp}`;
    return this.hashString(content);
  }

  async detectCrossDeviceConversation(conversationId) {
    // Check if conversation exists from another device
    const syncData = await chrome.storage.local.get(`sync_${conversationId}`);
    
    if (syncData[`sync_${conversationId}`]) {
      const { lastSync, deviceId } = syncData[`sync_${conversationId}`];
      const currentDeviceId = await this.getDeviceId();
      
      if (deviceId !== currentDeviceId) {
        return {
          isCrossDevice: true,
          lastSyncDevice: deviceId,
          lastSyncTime: lastSync
        };
      }
    }
    
    return { isCrossDevice: false };
  }
}
```

## Offline Support with IndexedDB

The extension maintains offline functionality using IndexedDB:

```javascript
class OfflineStorage {
  constructor() {
    this.dbName = 'ClaudeArchiver';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const conversationStore = db.createObjectStore('conversations', { 
            keyPath: 'conversationId' 
          });
          conversationStore.createIndex('lastSync', 'lastSync');
          conversationStore.createIndex('deviceId', 'deviceId');
        }
        
        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          syncStore.createIndex('status', 'status');
          syncStore.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  async saveConversation(conversationData) {
    const transaction = this.db.transaction(['conversations'], 'readwrite');
    const store = transaction.objectStore('conversations');
    
    const request = store.put({
      ...conversationData,
      lastModified: Date.now(),
      syncStatus: 'pending'
    });
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async queueForSync(operation) {
    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    
    const request = store.add({
      operation,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    });
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async processSyncQueue() {
    const transaction = this.db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    const index = store.index('status');
    
    const request = index.getAll('pending');
    
    return new Promise((resolve, reject) => {
      request.onsuccess = async () => {
        const pendingOps = request.result;
        
        for (const op of pendingOps) {
          try {
            await this.executeSyncOperation(op);
            await this.markOperationComplete(op.id);
          } catch (error) {
            await this.handleSyncError(op, error);
          }
        }
        
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Background sync when coming online
self.addEventListener('online', async () => {
  const storage = new OfflineStorage();
  await storage.init();
  await storage.processSyncQueue();
});
```

## Security Implementation

The extension implements multiple security layers:

```javascript
class SecurityManager {
  async getEncryptionKey() {
    // Derive key from user password or generate secure key
    const keyMaterial = await this.getKeyMaterial();
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('claude-archiver-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encryptConversation(conversationData) {
    const key = await this.getEncryptionKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(conversationData));
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return {
      encrypted: true,
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encryptedData))
    };
  }

  sanitizeContent(content) {
    // Remove potentially malicious content
    const cleaned = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '');
    
    return cleaned;
  }
}
```

## JSON Storage Format

The extension uses a structured JSON format optimized for incremental syncing:

```json
{
  "version": "1.0",
  "conversationId": "conv_12345_abcdef",
  "metadata": {
    "created": "2025-06-07T10:00:00Z",
    "lastModified": "2025-06-07T11:30:00Z",
    "deviceId": "device_12345_xyz",
    "syncVersion": 1,
    "contentHash": "a1b2c3d4"
  },
  "messages": [
    {
      "id": "msg_001",
      "role": "user",
      "content": "Hello Claude",
      "timestamp": "2025-06-07T10:00:00Z",
      "hash": "e5f6g7h8"
    },
    {
      "id": "msg_002", 
      "role": "assistant",
      "content": "Hello! How can I help you today?",
      "timestamp": "2025-06-07T10:00:05Z",
      "hash": "i9j0k1l2"
    }
  ],
  "syncHistory": [
    {
      "deviceId": "device_12345_xyz",
      "timestamp": "2025-06-07T11:30:00Z",
      "messagesAdded": 2,
      "messagesModified": 0
    }
  ]
}
```

## Error Handling and Edge Cases

```javascript
class ErrorHandler {
  constructor() {
    this.retryQueue = [];
    this.maxRetries = 5;
  }

  async handleNetworkError(operation, error) {
    if (navigator.onLine) {
      // Network error despite being online
      await this.queueForRetry(operation, error);
    } else {
      // Offline - queue for later
      await this.offlineStorage.queueOperation(operation);
    }
  }

  async handleRateLimit(error) {
    const retryAfter = this.parseRetryAfter(error.headers);
    const delay = retryAfter || Math.pow(2, this.currentRetry) * 1000;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return this.retry();
  }

  async handleLargeConversation(conversationData) {
    // Split into chunks for processing
    const chunks = this.chunkMessages(conversationData.messages, 100);
    
    for (const chunk of chunks) {
      await this.processChunk({
        ...conversationData,
        messages: chunk,
        isPartial: true
      });
    }
  }

  setupConcurrencyControl() {
    // Prevent multiple tabs from syncing same conversation
    chrome.storage.local.get(['activeSyncs'], (result) => {
      const activeSyncs = result.activeSyncs || {};
      const tabId = chrome.tabs.TAB_ID_NONE;
      
      if (activeSyncs[this.conversationId]) {
        // Another tab is syncing - wait or skip
        return;
      }
      
      activeSyncs[this.conversationId] = {
        tabId,
        startTime: Date.now()
      };
      
      chrome.storage.local.set({ activeSyncs });
    });
  }
}
```

## Best Practices and Recommendations

**Performance optimization** requires careful attention to memory management in Manifest V3's service worker environment. Stream large conversations rather than loading entire datasets, implement content-defined chunking for efficient diff operations, and use IndexedDB for persistent storage instead of relying on service worker memory.

**Security considerations** demand end-to-end encryption for sensitive conversation data, secure token management using chrome.storage.session, and careful validation of all data extracted from web pages. Never store OAuth tokens or encryption keys in unencrypted storage.

**Cross-device synchronization** benefits from vector clocks for accurate ordering, content hashing for efficient change detection, and merge algorithms that handle conflicts gracefully. The extension should detect when conversations started on another device continue on the current device.

**Compliance requirements** include implementing GDPR-compliant data handling with user consent, following Chrome Web Store's Limited Use Policy, and providing clear privacy disclosures. Users must have control over their data with export and deletion options.

This architecture provides a robust foundation for archiving Claude AI conversations while maintaining security, performance, and cross-device functionality. The modular design allows for easy extension to support other AI platforms while the incremental sync approach minimizes bandwidth usage and ensures data consistency across devices.