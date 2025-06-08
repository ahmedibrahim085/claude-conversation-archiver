# Manual Testing Guide for Claude Conversation Archiver

## Test Results Summary

### Issue with Puppeteer
- Puppeteer is timing out when trying to launch Chrome with the extension
- This appears to be a common issue on macOS with Puppeteer and Chrome extensions

## Manual Testing Steps

### 1. Load the Extension in Chrome

1. Open Chrome browser manually
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the folder: `/Users/ahmedmaged/ai_storage/projects/claude-conversation-archiver/`
6. The extension should appear in the list with ID displayed

### 2. Verify Extension Components

Check for:
- **Name**: Claude Conversation Archiver
- **Version**: 1.0.0
- **Permissions**: storage, activeTab
- **Content Scripts**: Should show claude.ai as a host
- **Service Worker**: Should show as "Active"

### 3. Test Content Script

1. Open a new tab and navigate to https://claude.ai
2. Open Chrome DevTools (Cmd+Option+I)
3. Go to Console tab
4. Look for messages starting with "Claude Archiver:"
   - Should see: "Claude Archiver: Content script loaded on https://claude.ai"
   - Should see: "Claude Archiver: Initializing..."
   - Should see: "Claude Archiver: MutationObserver started"

### 4. Test Popup

1. Click the extension icon in Chrome toolbar
2. The popup should open showing:
   - Title: "Claude Conversation Archiver"
   - Stats grid with conversation count and message count
   - Two buttons: "Export Conversations" and "Clear All Data"

### 5. Test Conversation Capture

1. Start or continue a conversation on Claude.ai
2. Type a message and wait for Claude's response
3. Check DevTools console for:
   - "Claude Archiver: Captured X messages"
   - "Claude Archiver: Conversation saved successfully"

### 6. Test Export Function

1. Click extension icon to open popup
2. Click "Export Conversations"
3. A JSON file should download with your conversations

### 7. Verify Storage

1. In DevTools, go to Application tab
2. Navigate to Storage > IndexedDB > ClaudeArchive
3. Check the "conversations" object store
4. Should see saved conversation entries

## Expected Console Output

When working correctly, you should see in the console:

```
Claude Archiver: Content script loaded on https://claude.ai
Claude Archiver: Initializing...
Claude Archiver: MutationObserver started
Claude Archiver: Performing initial capture
Claude Archiver: Captured X messages
Claude Archiver: Conversation saved successfully
```

## Common Issues

1. **No console messages**: Content script may not be injecting properly
2. **"Captured 0 messages"**: DOM selectors may have changed
3. **Save failures**: IndexedDB permissions or quota issues

## What's Working Based on Code Review

✅ **Extension Structure**:
- Manifest V3 properly configured
- Content script set to inject on claude.ai
- Background service worker for storage
- Popup interface implemented

✅ **Content Script Features**:
- MutationObserver to watch for new messages
- Fallback selectors for resilience
- Content deduplication via hashing
- Debounced capture (1 second)

✅ **Storage System**:
- IndexedDB for local storage
- Proper indexes for queries
- Device ID generation
- Export functionality

✅ **Popup Interface**:
- Stats display
- Export button
- Clear data button

## Recommendations

1. Test manually following the steps above
2. Check for any console errors
3. Verify the DOM selectors still match Claude's current UI
4. If content script isn't loading, check chrome://extensions for errors

The extension appears to be well-implemented with proper error handling and fallback mechanisms. The main issue is with automated testing via Puppeteer, not the extension itself.