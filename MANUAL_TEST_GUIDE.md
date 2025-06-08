# Manual Testing Guide - Claude Conversation Archiver

## Prerequisites
- Chrome browser (latest version)
- Access to Claude.ai

## Step 1: Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the folder: `/Users/ahmedmaged/ai_storage/projects/claude-conversation-archiver/`
5. Verify the extension appears in the list with no errors

**✅ Expected**: Extension loads with name "Claude Conversation Archiver"

## Step 2: Test DOM Capture

1. Navigate to https://claude.ai
2. Open Chrome DevTools (F12 or Cmd+Option+I)
3. Go to the Console tab
4. Look for message: "Claude Conversation Archiver initialized"

**✅ Expected**: Initialization message in console

5. Start a new conversation or continue an existing one
6. Type a message and wait for Claude's response
7. Check console for "New message detected" logs

**✅ Expected**: Console logs showing message capture

## Step 3: Test Popup Interface

1. Click the extension icon in Chrome toolbar (puzzle piece icon if not pinned)
2. The popup should open showing:
   - Title "Claude Conversation Archiver"
   - Statistics section
   - Export and Clear buttons

**✅ Expected**: Clean popup interface with all elements

3. Check the statistics display:
   - Should show conversation count
   - Should show message count
   - Should show device ID

**✅ Expected**: Stats reflecting captured conversations

## Step 4: Test Export Functionality

1. In the popup, click "Export Conversations"
2. A JSON file should download with filename format: `claude-conversations-YYYY-MM-DD.json`
3. Open the downloaded file
4. Verify the JSON structure:
   ```json
   {
     "conversations": [
       {
         "id": "conv_xxx",
         "messages": [...],
         "createdAt": "...",
         "updatedAt": "..."
       }
     ],
     "exportDate": "...",
     "deviceId": "..."
   }
   ```

**✅ Expected**: Valid JSON with conversation data

## Step 5: Test Clear Functionality

1. In the popup, click "Clear All Data"
2. Confirm the action when prompted
3. Check that stats reset to 0
4. Reload popup to verify data is cleared

**✅ Expected**: All data cleared, stats show 0

## Step 6: Test Persistence

1. Close and reopen Chrome
2. Navigate back to Claude.ai
3. Open the extension popup
4. Verify previous conversations are still stored (if you didn't clear)

**✅ Expected**: Data persists across browser sessions

## Step 7: Test Multiple Conversations

1. Start multiple different conversations on Claude.ai
2. Switch between conversations
3. Check popup stats increase correctly
4. Export and verify all conversations are captured

**✅ Expected**: All conversations tracked separately

## Troubleshooting

### Extension doesn't load
- Check manifest.json for syntax errors
- Ensure all files are present in directory
- Check Chrome version compatibility

### No messages captured
- Verify you're on claude.ai domain
- Check DevTools console for errors
- Ensure content script has permission

### Popup doesn't work
- Check if popup.html exists
- Look for JavaScript errors in popup DevTools
- Verify chrome.storage permissions

### Export fails
- Check browser download settings
- Verify chrome.downloads permission
- Check console for errors

## Test Results Checklist

- [ ] Extension loads without errors
- [ ] Content script initializes on Claude.ai
- [ ] Messages are captured in real-time
- [ ] Popup displays correct statistics
- [ ] Export produces valid JSON file
- [ ] Clear function removes all data
- [ ] Data persists across sessions
- [ ] Multiple conversations handled correctly

## Notes
- First message capture may take a few seconds
- Extension only works on claude.ai domain
- Exported files save to default download location