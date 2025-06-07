/**
 * Content Script for Claude Conversation Archiver
 * Purpose: Captures conversations from Claude.ai DOM and sends to background script
 * Runs on: https://claude.ai/*
 */

// Initialization log to verify script loading
console.log('Claude Archiver: Content script loaded on', window.location.href);

// DOM Selectors from INTERFACES.md
const SELECTORS = {
  conversationTurn: '[data-testid="conversation-turn"]',
  role: '.font-semibold',
  content: '.prose',
  // Fallback selectors if primary ones fail
  fallbackTurn: '.group.w-full',
  fallbackRole: '[class*="font-bold"]',
  fallbackContent: '[class*="prose"]'
};

// State management
let lastCaptureHash = '';
let observer = null;

/**
 * Extracts conversation ID from URL if available
 * @returns {string} Conversation ID or generated fallback
 */
function extractConversationId() {
  try {
    // Try to extract from URL pattern /chat/[id]
    const urlMatch = window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
    
    // Fallback: generate deterministic ID from content and timestamp
    const timestamp = Date.now();
    const contentHash = generateContentHash(document.body.textContent);
    return `conv_${timestamp}_${contentHash.slice(0, 8)}`;
  } catch (error) {
    console.warn('Claude Archiver: Error extracting conversation ID:', error);
    return `conv_${Date.now()}_fallback`;
  }
}

/**
 * Simple hash function for content comparison
 * @param {string} content - Content to hash
 * @returns {string} Hexadecimal hash string
 */
function generateContentHash(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Captures conversations from the DOM
 * @returns {Array} Array of message objects
 */
function captureConversations() {
  const messages = [];
  
  try {
    // Try primary selector first
    let turns = document.querySelectorAll(SELECTORS.conversationTurn);
    
    // If no results, try fallback selector
    if (turns.length === 0) {
      console.log('Claude Archiver: Primary selector failed, trying fallback');
      turns = document.querySelectorAll(SELECTORS.fallbackTurn);
    }
    
    // Extract messages from each turn
    turns.forEach((turn, index) => {
      try {
        // Extract role (user or assistant)
        let roleElement = turn.querySelector(SELECTORS.role);
        if (!roleElement) {
          roleElement = turn.querySelector(SELECTORS.fallbackRole);
        }
        
        const roleText = roleElement?.textContent?.toLowerCase() || '';
        let role = 'unknown';
        
        if (roleText.includes('you') || roleText.includes('user')) {
          role = 'user';
        } else if (roleText.includes('claude') || roleText.includes('assistant')) {
          role = 'assistant';
        }
        
        // Extract content
        let contentElement = turn.querySelector(SELECTORS.content);
        if (!contentElement) {
          contentElement = turn.querySelector(SELECTORS.fallbackContent);
        }
        
        const content = contentElement?.textContent?.trim() || '';
        
        if (content) {
          messages.push({
            role: role,
            content: content,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.warn(`Claude Archiver: Error processing turn ${index}:`, error);
      }
    });
    
    console.log(`Claude Archiver: Captured ${messages.length} messages`);
    return messages;
    
  } catch (error) {
    console.error('Claude Archiver: Error in captureConversations:', error);
    return messages;
  }
}

/**
 * Sends captured conversation to background script
 * @param {Array} messages - Array of message objects
 */
async function sendConversationToBackground(messages) {
  if (messages.length === 0) return;
  
  try {
    const conversationData = {
      url: window.location.href,
      title: document.title,
      conversationId: extractConversationId(),
      messages: messages,
      capturedAt: Date.now()
    };
    
    // Send to background script
    chrome.runtime.sendMessage({
      action: 'saveConversation',
      data: conversationData
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Claude Archiver: Error sending message:', chrome.runtime.lastError);
      } else if (response) {
        if (response.success) {
          console.log('Claude Archiver: Conversation saved successfully');
        } else {
          console.error('Claude Archiver: Save failed:', response.error);
        }
      }
    });
    
  } catch (error) {
    console.error('Claude Archiver: Error sending conversation:', error);
  }
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Handles conversation capture with deduplication
 */
const handleConversationCapture = debounce(() => {
  const messages = captureConversations();
  
  // Generate hash for deduplication
  const currentHash = generateContentHash(JSON.stringify(messages));
  
  // Only send if content has changed
  if (currentHash !== lastCaptureHash && messages.length > 0) {
    lastCaptureHash = currentHash;
    sendConversationToBackground(messages);
  }
}, 1000); // 1 second debounce

/**
 * Sets up MutationObserver to monitor DOM changes
 */
function setupMutationObserver() {
  // Find the best target for observation
  const targetNode = document.querySelector('main') || document.body;
  
  // Observer configuration
  const config = {
    childList: true,
    subtree: true,
    characterData: true
  };
  
  // Create observer
  observer = new MutationObserver((mutations) => {
    // Check if any mutations are relevant
    let hasRelevantChanges = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if added nodes might contain messages
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            // Check if element or its children match our selectors
            if (element.matches && (
              element.matches(SELECTORS.conversationTurn) ||
              element.matches(SELECTORS.fallbackTurn) ||
              element.querySelector(SELECTORS.conversationTurn) ||
              element.querySelector(SELECTORS.fallbackTurn)
            )) {
              hasRelevantChanges = true;
              break;
            }
          }
        }
      }
    }
    
    if (hasRelevantChanges) {
      handleConversationCapture();
    }
  });
  
  // Start observing
  observer.observe(targetNode, config);
  console.log('Claude Archiver: MutationObserver started');
}

/**
 * Initializes the content script
 */
function initialize() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
    return;
  }
  
  console.log('Claude Archiver: Initializing...');
  
  // Setup observer
  setupMutationObserver();
  
  // Do initial capture after a short delay
  setTimeout(() => {
    console.log('Claude Archiver: Performing initial capture');
    handleConversationCapture();
  }, 2000);
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (observer) {
    observer.disconnect();
  }
});

// Start initialization
initialize();