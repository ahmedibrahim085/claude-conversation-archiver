# Debugging Guide - Claude Conversation Archiver

## Issue: Extension shows 0 conversations even when logged in

### Step 1: Verify Extension is Active

1. On claude.ai (while logged in and in a chat)
2. Open Chrome DevTools (F12)
3. Go to Console tab
4. You should see: `Claude Archiver: Content script loaded on https://claude.ai/...`

If you DON'T see this message, the content script isn't loading.

### Step 2: Check for Selector Mismatches

1. Copy the entire contents of `debug-selectors.js`
2. Paste it in the Chrome DevTools Console on claude.ai
3. Press Enter to run it
4. Look for selectors that successfully find message elements

The output will show which selectors work on the current Claude UI.

### Step 3: Manual Message Detection Test

Run this in the Console to see what the extension sees:

```javascript
// Test current selectors
const turns = document.querySelectorAll('[data-testid="conversation-turn"]');
console.log('Primary selector found:', turns.length, 'elements');

const fallbackTurns = document.querySelectorAll('.group.w-full');
console.log('Fallback selector found:', fallbackTurns.length, 'elements');

// Show what's being captured
if (turns.length > 0) {
  console.log('First turn content:', turns[0].textContent.substring(0, 200));
} else if (fallbackTurns.length > 0) {
  console.log('First fallback turn:', fallbackTurns[0].textContent.substring(0, 200));
}
```

### Step 4: Check Message Sending

Run this to manually trigger a save:

```javascript
// Manually send a test message
chrome.runtime.sendMessage({
  action: 'saveConversation',
  data: {
    url: window.location.href,
    title: 'Test Conversation',
    conversationId: 'test_123',
    messages: [{
      role: 'user',
      content: 'Test message',
      timestamp: Date.now()
    }],
    capturedAt: Date.now()
  }
}, (response) => {
  console.log('Response:', response);
});
```

### Step 5: Check Background Script

1. Go to `chrome://extensions/`
2. Find Claude Conversation Archiver
3. Click "background page" or "service worker"
4. This opens DevTools for the background script
5. Check for any errors in the Console

### Step 6: Direct IndexedDB Check

In the extension's popup DevTools:

```javascript
// Check IndexedDB directly
async function checkDB() {
  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('ClaudeArchiver', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    const transaction = db.transaction(['conversations'], 'readonly');
    const store = transaction.objectStore('conversations');
    const all = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    console.log('Stored conversations:', all);
    db.close();
  } catch (error) {
    console.error('DB Error:', error);
  }
}

checkDB();
```

### Common Issues & Fixes

1. **Wrong Selectors**: Claude's UI may have changed. Use debug-selectors.js to find current selectors.

2. **Content Script Not Injected**: 
   - Refresh claude.ai after loading extension
   - Check manifest.json matches pattern

3. **Message Format Changed**: 
   - Claude's DOM structure might be different
   - Look for role indicators (You/Claude/Human/Assistant)

4. **Timing Issues**:
   - Messages might load dynamically
   - Initial capture might run too early

5. **Permissions**: 
   - Ensure extension has access to claude.ai
   - Check for any blocked permissions

### Quick Fix Attempt

If selectors are wrong, try this updated content.js snippet:

```javascript
// More generic selectors that might work
const SELECTORS = {
  conversationTurn: 'div[class*="group"][class*="w-full"]',
  role: 'div:has-text("You"), div:has-text("Claude")',
  content: 'div[class*="prose"], div[class*="whitespace-pre-wrap"]',
  fallbackTurn: 'article, [role="article"]',
  fallbackRole: '.font-semibold, .font-bold',
  fallbackContent: 'div[class*="text-base"]'
};
```

### Report Back

After running these tests, let me know:
1. Which selectors found elements
2. Any errors in the console
3. What the manual save test returned
4. Any errors in the background script console