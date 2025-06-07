/**
 * Background Service Worker for Claude Conversation Archiver
 * Purpose: Handles storage operations, message passing, and sync functionality
 * Manifest V3 Service Worker
 */

// Installation listener to verify service worker setup
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Claude Archiver: Extension installed', {
    reason: details.reason,
    version: chrome.runtime.getManifest().version
  });
  
  // Initialize device ID on first install
  if (details.reason === 'install') {
    initializeDeviceId();
  }
});

/**
 * IndexedDB wrapper class for conversation storage
 */
class ConversationDB {
  constructor() {
    this.dbName = 'ClaudeArchive';
    this.version = 1;
    this.storeName = 'conversations';
    this.db = null;
  }

  /**
   * Opens the database connection
   * @returns {Promise<IDBDatabase>}
   */
  async open() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Claude Archiver: Failed to open database', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Claude Archiver: Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: true
          });

          // Create indexes for efficient querying
          objectStore.createIndex('conversationId', 'conversationId', { unique: false });
          objectStore.createIndex('capturedAt', 'capturedAt', { unique: false });
          objectStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          
          console.log('Claude Archiver: Object store created');
        }
      };
    });
  }

  /**
   * Saves a conversation to the database
   * @param {Object} data - Conversation data from content script
   * @returns {Promise<number>} The ID of the saved conversation
   */
  async save(data) {
    try {
      const db = await this.open();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      // Add device ID and timestamps
      const deviceId = await getDeviceId();
      const enrichedData = {
        ...data,
        deviceId: deviceId,
        lastModified: Date.now(),
        syncStatus: 'pending',
        syncedAt: null
      };

      const request = store.add(enrichedData);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log('Claude Archiver: Conversation saved with ID:', request.result);
          resolve(request.result);
        };

        request.onerror = () => {
          console.error('Claude Archiver: Failed to save conversation', request.error);
          reject(request.error);
        };

        transaction.onerror = () => {
          console.error('Claude Archiver: Transaction failed', transaction.error);
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error('Claude Archiver: Save error', error);
      throw error;
    }
  }

  /**
   * Retrieves all conversations from the database
   * @returns {Promise<Array>} Array of all conversations
   */
  async getAll() {
    try {
      const db = await this.open();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log(`Claude Archiver: Retrieved ${request.result.length} conversations`);
          resolve(request.result);
        };

        request.onerror = () => {
          console.error('Claude Archiver: Failed to retrieve conversations', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Claude Archiver: GetAll error', error);
      throw error;
    }
  }

  /**
   * Retrieves a conversation by ID
   * @param {number} id - Conversation ID
   * @returns {Promise<Object>} The conversation object
   */
  async getById(id) {
    try {
      const db = await this.open();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Claude Archiver: GetById error', error);
      throw error;
    }
  }

  /**
   * Deletes a conversation by ID
   * @param {number} id - Conversation ID to delete
   * @returns {Promise<void>}
   */
  async delete(id) {
    try {
      const db = await this.open();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log('Claude Archiver: Conversation deleted:', id);
          resolve();
        };

        request.onerror = () => {
          console.error('Claude Archiver: Failed to delete conversation', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Claude Archiver: Delete error', error);
      throw error;
    }
  }

  /**
   * Clears all conversations from the database
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      const db = await this.open();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log('Claude Archiver: All conversations cleared');
          resolve();
        };

        request.onerror = () => {
          console.error('Claude Archiver: Failed to clear conversations', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Claude Archiver: Clear error', error);
      throw error;
    }
  }
}

// Create database instance
const db = new ConversationDB();

/**
 * Generates a unique device ID
 * @returns {string} UUID v4 device ID
 */
function generateDeviceId() {
  return crypto.randomUUID();
}

/**
 * Gets or creates the device ID
 * @returns {Promise<string>} The device ID
 */
async function getDeviceId() {
  try {
    const result = await chrome.storage.local.get('deviceId');
    
    if (result.deviceId) {
      return result.deviceId;
    }
    
    // Generate new device ID if none exists
    const deviceId = generateDeviceId();
    await chrome.storage.local.set({ deviceId });
    console.log('Claude Archiver: Generated new device ID:', deviceId);
    return deviceId;
  } catch (error) {
    console.error('Claude Archiver: Error getting device ID', error);
    // Return a temporary ID if storage fails
    return `temp_${generateDeviceId()}`;
  }
}

/**
 * Initializes device ID on first install
 */
async function initializeDeviceId() {
  const deviceId = await getDeviceId();
  console.log('Claude Archiver: Device initialized with ID:', deviceId);
}

/**
 * Message handler for communication with content script and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Claude Archiver: Received message', message.action);

  // Handle async operations
  (async () => {
    try {
      switch (message.action) {
        case 'saveConversation':
          // Save conversation from content script
          if (!message.data) {
            sendResponse({ success: false, error: 'No data provided' });
            return;
          }

          try {
            const conversationId = await db.save(message.data);
            sendResponse({ 
              success: true, 
              conversationId: conversationId 
            });
          } catch (error) {
            console.error('Claude Archiver: Save failed', error);
            sendResponse({ 
              success: false, 
              error: error.message || 'Failed to save conversation' 
            });
          }
          break;

        case 'getAllConversations':
          // Get all conversations for popup
          try {
            const conversations = await db.getAll();
            
            // Transform data for popup display
            const summaries = conversations.map(conv => ({
              id: conv.id,
              url: conv.url,
              title: conv.title || 'Untitled Conversation',
              messageCount: conv.messages ? conv.messages.length : 0,
              capturedAt: conv.capturedAt,
              lastModified: conv.lastModified
            }));

            sendResponse({ 
              success: true, 
              conversations: summaries 
            });
          } catch (error) {
            console.error('Claude Archiver: GetAll failed', error);
            sendResponse({ 
              success: false, 
              error: error.message || 'Failed to retrieve conversations' 
            });
          }
          break;

        case 'exportConversations':
          // Export all conversations as JSON
          try {
            const conversations = await db.getAll();
            const exportData = {
              version: '1.0',
              exportedAt: new Date().toISOString(),
              deviceId: await getDeviceId(),
              conversationCount: conversations.length,
              conversations: conversations
            };

            sendResponse({ 
              success: true, 
              data: JSON.stringify(exportData, null, 2) 
            });
          } catch (error) {
            console.error('Claude Archiver: Export failed', error);
            sendResponse({ 
              success: false, 
              error: error.message || 'Failed to export conversations' 
            });
          }
          break;

        case 'clearAllConversations':
          // Clear all conversations
          try {
            await db.clear();
            sendResponse({ success: true });
          } catch (error) {
            console.error('Claude Archiver: Clear failed', error);
            sendResponse({ 
              success: false, 
              error: error.message || 'Failed to clear conversations' 
            });
          }
          break;

        default:
          sendResponse({ 
            success: false, 
            error: `Unknown action: ${message.action}` 
          });
      }
    } catch (error) {
      console.error('Claude Archiver: Message handler error', error);
      sendResponse({ 
        success: false, 
        error: error.message || 'Internal error' 
      });
    }
  })();

  // Return true to indicate async response
  return true;
});

// Log when service worker starts
console.log('Claude Archiver: Background service worker started');