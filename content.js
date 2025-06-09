/**
 * Content Script for Claude Conversation Archiver - FINAL VERSION
 * Based on actual Claude DOM structure analysis
 */

console.log('Claude Archiver: Content script loaded on', window.location.href);

// Set a marker so we can verify the script loaded
window.__CLAUDE_ARCHIVER_LOADED__ = true;

// Actual selectors from Claude's DOM
const SELECTORS = {
  // User messages have data-testid="user-message" 
  userMessage: '[data-testid="user-message"]',
  
  // Messages are identified by font classes
  userMessageClass: '.font-user-message',
  claudeMessageClass: '.font-claude-message',
  
  // Content within messages
  messageContent: '.whitespace-pre-wrap',
  
  // Parent containers that might have messages
  messageContainer: '[data-test-render-count]',
  
  // Code blocks and special content
  codeBlock: 'pre code',
  
  // Alternative selectors
  conversationArea: 'main',
  textContent: 'p.whitespace-pre-wrap, div.whitespace-pre-wrap'
};

let lastCaptureHash = '';
let observer = null;
let isArchivedConversation = false;

function extractConversationId() {
  try {
    // Extract from URL: /chat/[id]
    const urlMatch = window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
    
    // If on /new page, no conversation yet
    if (window.location.pathname === '/new') {
      return null;
    }
    
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  } catch (error) {
    console.warn('Claude Archiver: Error extracting conversation ID:', error);
    return `conv_${Date.now()}_fallback`;
  }
}

function generateContentHash(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function extractTextContent(element) {
  // Clone to avoid modifying DOM
  const clone = element.cloneNode(true);
  
  // Remove buttons and UI elements
  clone.querySelectorAll('button, [role="button"], svg').forEach(el => el.remove());
  
  // Extract text from different content types
  let text = '';
  
  // Handle code blocks specially
  const codeBlocks = clone.querySelectorAll('pre code');
  codeBlocks.forEach(code => {
    text += '\n```\n' + code.textContent + '\n```\n';
    code.remove(); // Remove after extracting
  });
  
  // Get remaining text
  const mainText = clone.textContent?.trim() || '';
  text = mainText + text;
  
  return text.trim();
}

function captureConversations() {
  console.log('Claude Archiver: Starting conversation capture...');
  const messages = [];
  
  try {
    // Check if we're on a conversation page
    const conversationId = extractConversationId();
    if (!conversationId) {
      console.log('Claude Archiver: Not on a conversation page');
      return messages;
    }
    
    // Method 1: Find user messages by data-testid
    const userMessages = document.querySelectorAll(SELECTORS.userMessage);
    console.log(`Claude Archiver: Found ${userMessages.length} user messages by testid`);
    
    userMessages.forEach((msgElement) => {
      const content = extractTextContent(msgElement);
      if (content) {
        messages.push({
          role: 'user',
          content: content,
          timestamp: Date.now()
        });
      }
    });
    
    // Method 2: Find all messages by font classes
    const allUserMessages = document.querySelectorAll(SELECTORS.userMessageClass);
    const allClaudeMessages = document.querySelectorAll(SELECTORS.claudeMessageClass);
    
    console.log(`Claude Archiver: Found ${allUserMessages.length} user + ${allClaudeMessages.length} Claude messages by class`);
    
    // Process Claude messages
    allClaudeMessages.forEach((msgElement) => {
      // Look for actual content within the message
      const contentElements = msgElement.querySelectorAll(SELECTORS.messageContent);
      let fullContent = '';
      
      if (contentElements.length > 0) {
        contentElements.forEach(el => {
          const text = extractTextContent(el);
          if (text) fullContent += text + '\n';
        });
      } else {
        // Fallback to entire element
        fullContent = extractTextContent(msgElement);
      }
      
      if (fullContent.trim()) {
        messages.push({
          role: 'assistant',
          content: fullContent.trim(),
          timestamp: Date.now()
        });
      }
    });
    
    // Method 3: If no messages found, try more generic approach
    if (messages.length === 0) {
      console.log('Claude Archiver: Trying generic message detection...');
      
      const containers = document.querySelectorAll(SELECTORS.messageContainer);
      containers.forEach(container => {
        // Check if it contains message-like content
        const text = container.textContent || '';
        
        // Skip if too short or contains UI elements
        if (text.length < 10 || text.includes('Copy') || text.includes('Retry')) {
          return;
        }
        
        // Try to determine role
        let role = 'unknown';
        if (container.querySelector('[data-testid="user-message"]') || 
            container.querySelector('.font-user-message')) {
          role = 'user';
        } else if (container.querySelector('.font-claude-message')) {
          role = 'assistant';
        }
        
        const content = extractTextContent(container);
        if (content && content.length > 5) {
          messages.push({
            role: role,
            content: content,
            timestamp: Date.now()
          });
        }
      });
    }
    
    // Sort messages by their appearance in DOM (approximate chronological order)
    console.log(`Claude Archiver: Total messages captured: ${messages.length}`);
    return messages;
    
  } catch (error) {
    console.error('Claude Archiver: Error in captureConversations:', error);
    return messages;
  }
}

async function sendConversationToBackground(messages) {
  if (messages.length === 0) {
    console.log('Claude Archiver: No messages to send');
    return;
  }
  
  try {
    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
      console.warn('Claude Archiver: Extension context invalidated, skipping save');
      return;
    }
    
    const conversationData = {
      url: window.location.href,
      title: document.title,
      conversationId: extractConversationId(),
      messages: messages,
      capturedAt: Date.now()
    };
    
    console.log('Claude Archiver: Sending conversation data:', {
      ...conversationData,
      messages: conversationData.messages.map(m => ({
        role: m.role,
        preview: m.content.substring(0, 50) + '...'
      }))
    });
    
    chrome.runtime.sendMessage({
      action: 'saveConversation',
      data: conversationData
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Check if it's a context invalidated error
        if (chrome.runtime.lastError.message?.includes('context invalidated')) {
          console.warn('Claude Archiver: Extension was reloaded, please refresh the page');
        } else {
          console.error('Claude Archiver: Error sending message:', chrome.runtime.lastError);
        }
      } else if (response) {
        console.log('Claude Archiver: Response from background:', response);
      }
    });
    
  } catch (error) {
    // Catch context invalidated errors
    if (error.message?.includes('context invalidated')) {
      console.warn('Claude Archiver: Extension context invalidated, please refresh the page');
    } else {
      console.error('Claude Archiver: Error sending conversation:', error);
    }
  }
}

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

const handleConversationCapture = debounce(() => {
  const messages = captureConversations();
  const currentHash = generateContentHash(JSON.stringify(messages));
  
  // For archived conversations, always send updates if content changed
  // This ensures new messages in existing conversations are captured
  if (isArchivedConversation && currentHash !== lastCaptureHash && messages.length > 0) {
    console.log('Claude Archiver: Updating archived conversation with new content');
    lastCaptureHash = currentHash;
    sendConversationToBackground(messages);
  } else if (currentHash !== lastCaptureHash && messages.length > 0) {
    console.log('Claude Archiver: Content changed, sending update');
    lastCaptureHash = currentHash;
    sendConversationToBackground(messages);
  } else if (messages.length === 0) {
    console.log('Claude Archiver: No messages found to capture');
  }
}, 1500); // Slightly longer debounce for Claude

function setupMutationObserver() {
  // Check if extension context is still valid before setting up observer
  if (!chrome.runtime?.id) {
    console.warn('Claude Archiver: Extension context invalidated, cannot setup observer');
    return;
  }
  
  const targetNode = document.querySelector('main') || document.body;
  console.log('Claude Archiver: Setting up observer on:', targetNode);
  
  const config = {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'data-testid']
  };
  
  observer = new MutationObserver((mutations) => {
    // Check context validity in observer callback
    if (!chrome.runtime?.id) {
      console.warn('Claude Archiver: Extension context invalidated, disconnecting observer');
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      return;
    }
    
    let hasRelevantChanges = false;
    
    for (const mutation of mutations) {
      // Check for added nodes
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if it's a message-related element
            const element = node;
            if (element.querySelector && (
              element.querySelector('.font-user-message') ||
              element.querySelector('.font-claude-message') ||
              element.querySelector('[data-testid="user-message"]') ||
              element.classList?.contains('font-user-message') ||
              element.classList?.contains('font-claude-message')
            )) {
              hasRelevantChanges = true;
              break;
            }
          }
        }
      }
      
      // Check for class changes
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target.classList && (
          target.classList.contains('font-user-message') ||
          target.classList.contains('font-claude-message')
        )) {
          hasRelevantChanges = true;
        }
      }
    }
    
    if (hasRelevantChanges) {
      console.log('Claude Archiver: Relevant DOM changes detected');
      handleConversationCapture();
    }
  });
  
  observer.observe(targetNode, config);
  console.log('Claude Archiver: MutationObserver started');
}

function checkIfArchived() {
  // Check if extension context is still valid
  if (!chrome.runtime?.id) {
    console.warn('Claude Archiver: Extension context invalidated');
    return;
  }
  
  const conversationId = extractConversationId();
  if (!conversationId || conversationId.startsWith('conv_')) {
    // Not a real conversation ID, clear badge
    try {
      chrome.runtime.sendMessage({ action: 'setBadge', show: false });
    } catch (error) {
      console.warn('Claude Archiver: Could not clear badge:', error.message);
    }
    isArchivedConversation = false;
    return;
  }
  
  // Check if this conversation is archived
  try {
    chrome.runtime.sendMessage({
      action: 'checkConversation',
      conversationId: conversationId
    }, (response) => {
      if (chrome.runtime.lastError) {
        if (chrome.runtime.lastError.message?.includes('context invalidated')) {
          console.warn('Claude Archiver: Extension was reloaded');
        } else {
          console.error('Claude Archiver: Error checking conversation:', chrome.runtime.lastError);
        }
        return;
      }
      
      if (response?.success && response.exists) {
        console.log('Claude Archiver: This conversation is archived');
        isArchivedConversation = true;
        // Show badge
        try {
          chrome.runtime.sendMessage({ action: 'setBadge', show: true });
        } catch (error) {
          console.warn('Claude Archiver: Could not set badge:', error.message);
        }
      } else {
        isArchivedConversation = false;
        // Clear badge
        try {
          chrome.runtime.sendMessage({ action: 'setBadge', show: false });
        } catch (error) {
          console.warn('Claude Archiver: Could not clear badge:', error.message);
        }
      }
    });
  } catch (error) {
    if (error.message?.includes('context invalidated')) {
      console.warn('Claude Archiver: Extension context invalidated');
    } else {
      console.error('Claude Archiver: Error in checkIfArchived:', error);
    }
  }
}

function initialize() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
    return;
  }
  
  console.log('Claude Archiver: Initializing...');
  setupMutationObserver();
  
  // Check if current conversation is archived
  checkIfArchived();
  
  // Monitor URL changes
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('Claude Archiver: URL changed to:', url);
      // Reset hash and archived status when navigating to new conversation
      lastCaptureHash = '';
      isArchivedConversation = false;
      // Check if new conversation is archived
      checkIfArchived();
      setTimeout(handleConversationCapture, 2000);
    }
  }).observe(document, {subtree: true, childList: true});
  
  // Initial capture after delay
  setTimeout(() => {
    console.log('Claude Archiver: Performing initial capture');
    handleConversationCapture();
  }, 3000); // Give Claude time to load
}

// Clean up on unload
window.addEventListener('beforeunload', () => {
  if (observer) {
    observer.disconnect();
  }
});

// Start
initialize();