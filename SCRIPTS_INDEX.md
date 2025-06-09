# Scripts Index - Claude Conversation Archiver

## Debug & Analysis Scripts

These scripts are Chrome DevTools console utilities created during development to diagnose issues and analyze Claude's DOM structure.

| Script Name | Purpose | Usage | Key Features |
|------------|---------|--------|--------------|
| `debug-assistant-messages.js` | Analyze Claude's DOM structure for assistant messages | Run in Chrome console on Claude conversation page | - Finds thought process containers<br>- Checks for hidden elements<br>- Analyzes unique element types<br>- Extracts full text preview |
| `debug-timestamps.js` | Search for timestamp data in Claude's DOM | Run in Chrome console on Claude conversation page | - Checks all message attributes<br>- Searches for time-related text patterns<br>- Analyzes parent elements<br>- Looks for React internal data |
| `deep-timestamp-search.js` | Comprehensive timestamp search across entire DOM | Run in Chrome console on Claude conversation page | - Searches ALL element attributes<br>- Checks data attributes<br>- Analyzes React props<br>- Checks computed styles<br>- Searches window objects |
| `find-message-timestamps.js` | Focused search for timestamps in message elements | Run in Chrome console on Claude conversation page | - Checks message elements and parents<br>- Searches text nodes for time patterns<br>- Checks React Fiber data<br>- Looks for global time elements |
| `monitor-network-timestamps.js` | Intercept network requests to find timestamp data | Run in Chrome console BEFORE navigating conversations | - Overrides fetch() to monitor responses<br>- Intercepts XMLHttpRequest<br>- Searches for timestamp fields in JSON<br>- Logs all time-related data |

## Test Scripts

| Script Name | Purpose | Usage | Key Features |
|------------|---------|--------|--------------|
| `test-message-order.js` | Verify message ordering methods | Run in Chrome console on Claude conversation page | - Tests 3 different ordering approaches<br>- Compares querySelectorAll results<br>- Tests tree walker method<br>- Tests sort by DOM position |

## Usage Examples

### Debug DOM Structure
```javascript
// Run in Chrome DevTools console
copy(await fetch(chrome.runtime.getURL('scripts/debug-assistant-messages.js')).then(r => r.text()))
// Then paste and run the copied code
```

### Monitor API Timestamps
```javascript
// Run BEFORE navigating to a conversation
copy(await fetch(chrome.runtime.getURL('scripts/monitor-network-timestamps.js')).then(r => r.text()))
// Paste, run, then navigate to see API calls
```

### Test Message Ordering
```javascript
// Run on a conversation with multiple messages
copy(await fetch(chrome.runtime.getURL('scripts/test-message-order.js')).then(r => r.text()))
// Compare the output of different methods
```

## Key Findings from These Scripts

1. **No timestamps in DOM**: Deep searches revealed Claude doesn't expose message timestamps in the DOM
2. **Message order**: DOM order is maintained by document structure, not timestamps
3. **Content extraction**: Thought processes are in `<details>` and `<summary>` elements
4. **React internals**: Message data is stored in React Fiber but without timestamps

## When to Use These Scripts

- **Debugging extraction issues**: Use `debug-assistant-messages.js`
- **Investigating timestamp storage**: Use `deep-timestamp-search.js` or `monitor-network-timestamps.js`
- **Verifying message order**: Use `test-message-order.js`
- **Quick timestamp check**: Use `find-message-timestamps.js`

These scripts were instrumental in understanding Claude's DOM structure and improving the extension's message capture capabilities.