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
    // Don't reuse cached connection to avoid closing issues
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Claude Archiver: Failed to open database', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const db = request.result;
        console.log('Claude Archiver: Database opened successfully');
        resolve(db);
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
      // Open a fresh connection for this save operation
      const db = await this.open();
      
      // Add device ID and timestamps
      const deviceId = await getDeviceId();
      const enrichedData = {
        ...data,
        deviceId: deviceId,
        lastModified: Date.now(),
        syncStatus: 'pending',
        syncedAt: null
      };

      // Generate a content hash to check for duplicates
      const contentHash = this.generateContentHash(enrichedData.messages);
      enrichedData.contentHash = contentHash;

      // Log data structure for debugging
      console.log('Claude Archiver: Attempting to save data:', {
        conversationId: enrichedData.conversationId,
        messageCount: enrichedData.messages?.length,
        capturedAt: new Date(enrichedData.capturedAt).toISOString(),
        url: enrichedData.url,
        dataSize: JSON.stringify(enrichedData).length + ' bytes',
        contentHash: contentHash
      });

      // Create transaction and store
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // Simple add without checking for duplicates first
      const request = store.add(enrichedData);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          console.log('Claude Archiver: Conversation saved with ID:', request.result);
          // Close the database connection after successful save
          db.close();
          resolve(request.result);
        };

        request.onerror = () => {
          console.error('Claude Archiver: Failed to save conversation', request.error);
          console.error('Claude Archiver: Error name:', request.error?.name);
          console.error('Claude Archiver: Error message:', request.error?.message);
          db.close();
          reject(request.error);
        };

        transaction.onerror = () => {
          console.error('Claude Archiver: Transaction failed', transaction.error);
          db.close();
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error('Claude Archiver: Save error', error);
      console.error('Claude Archiver: Error type:', error.constructor.name);
      console.error('Claude Archiver: Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Generate a hash of message contents to detect duplicates
   */
  generateContentHash(messages) {
    if (!messages || messages.length === 0) return '';
    
    // Simple hash based on message count and first/last message content
    const summary = `${messages.length}-${messages[0]?.content?.substring(0, 50)}-${messages[messages.length - 1]?.content?.substring(0, 50)}`;
    
    // Simple string hash function
    let hash = 0;
    for (let i = 0; i < summary.length; i++) {
      const char = summary.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
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
      
      // Log store info
      console.log('Claude Archiver: Getting all conversations from store:', this.storeName);
      
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const conversations = request.result || [];
          console.log(`Claude Archiver: Retrieved ${conversations.length} conversations`);
          
          // Log first conversation for debugging
          if (conversations.length > 0) {
            console.log('Claude Archiver: First conversation:', {
              id: conversations[0].id,
              conversationId: conversations[0].conversationId,
              messageCount: conversations[0].messages?.length,
              capturedAt: new Date(conversations[0].capturedAt).toISOString()
            });
          }
          
          // Close the database connection after use
          db.close();
          
          resolve(conversations);
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

// Test database on startup with error protection
(async function testDatabase() {
  try {
    console.log('Claude Archiver: Testing database connection...');
    
    // Just test that we can get conversations (don't hold connection)
    const conversations = await db.getAll();
    console.log(`Claude Archiver: Database test successful - ${conversations.length} conversations found`);
    
  } catch (error) {
    console.error('Claude Archiver: Database test failed:', error);
    console.error('Claude Archiver: Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Try to recover by recreating the database
    if (error.name === 'VersionError') {
      console.log('Claude Archiver: Attempting to recreate database...');
      try {
        // Delete the old database
        await new Promise((resolve, reject) => {
          const deleteReq = indexedDB.deleteDatabase('ClaudeArchiverDB');
          deleteReq.onsuccess = resolve;
          deleteReq.onerror = reject;
        });
        console.log('Claude Archiver: Old database deleted, extension should work on next reload');
      } catch (deleteError) {
        console.error('Claude Archiver: Failed to delete database:', deleteError);
      }
    }
  }
})();

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
            console.error('Error details:', {
              name: error.name,
              message: error.message,
              stack: error.stack
            });
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