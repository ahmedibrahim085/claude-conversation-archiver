# New Features Specification

## Task 12: Selective Conversation Export

### Overview
Allow users to select specific conversations to export instead of all-or-nothing approach.

### UI Design
```
┌─────────────────────────────────┐
│ Claude Conversation Archiver    │
├─────────────────────────────────┤
│ Conversations: 45               │
│ Last capture: Today at 3:45 PM  │
│ Storage: 2.3 MB                 │
├─────────────────────────────────┤
│ [Export All] [Select Export]    │
├─────────────────────────────────┤
│ ☐ Select All | 3 selected       │
├─────────────────────────────────┤
│ ☑ "How to build a Chrome..."    │
│    Jun 9, 2025 - 45 messages    │
│                                 │
│ ☐ "Explain quantum computing"   │
│    Jun 8, 2025 - 23 messages    │
│                                 │
│ ☑ "Debug my Python code"        │
│    Jun 7, 2025 - 67 messages    │
│    📎 2 artifacts               │
└─────────────────────────────────┘
```

### Implementation Details

#### popup.html changes:
- Add "Select Export" button
- Add conversation list view (hidden by default)
- Checkbox for each conversation
- "Select All" checkbox
- Selected count indicator

#### popup.js changes:
```javascript
// New functions needed
async function showConversationList() {
  // Toggle between normal view and selection view
  // Load all conversations with metadata
  // Render list with checkboxes
}

async function exportSelected() {
  // Get checked conversation IDs
  // Request specific conversations from background
  // Export only selected ones
}
```

#### background.js changes:
```javascript
// New message handler
case 'getConversationsByIds':
  const conversations = await db.getByIds(message.ids);
  // Return full conversation data
  
case 'getConversationList':
  // Return simplified list for UI
  // Include: id, title, date, messageCount, hasArtifacts
```

---

## Task 13: Artifact Download Support

### Overview
Detect and extract artifacts (code files, SVGs, documents) from conversations for download.

### Artifact Detection
Claude creates artifacts in specific formats:
- Code blocks with file indicators
- SVG diagrams
- Markdown documents
- CSV/JSON data

### Implementation Details

#### content.js changes:
```javascript
// Detect artifact containers
function detectArtifacts(messageElement) {
  const artifacts = [];
  
  // Look for artifact containers
  const artifactElements = messageElement.querySelectorAll('[data-artifact]');
  
  // Extract artifact metadata
  artifacts.push({
    type: 'code',
    filename: 'script.py',
    language: 'python',
    content: artifactContent
  });
  
  return artifacts;
}
```

#### Storage Enhancement:
```javascript
// Modified conversation structure
{
  id: 123,
  messages: [...],
  artifacts: [
    {
      messageIndex: 3,
      type: 'code',
      filename: 'app.js',
      language: 'javascript',
      content: '...',
      timestamp: Date.now()
    }
  ]
}
```

#### Export Options:
1. **Include in JSON**: Artifacts embedded in export
2. **Separate files**: Create ZIP with conversation.json + artifact files
3. **Artifacts only**: Export just the files

### UI Indicators:
- Show 📎 icon next to conversations with artifacts
- Display artifact count
- Preview artifacts before export

---

## Technical Considerations

### Database Schema Update
Need to add indexes for:
- Conversation title/first message (for display)
- Artifact presence (for filtering)

### Performance Impact
- Lazy load conversation list
- Virtual scrolling for large archives
- Artifact extraction during save (not export)

### Storage Calculation
- Track artifact sizes separately
- Warn if artifacts exceed storage quota

### Export Format for Selected Conversations
```json
{
  "version": "1.1",
  "exportType": "selective",
  "exportedAt": "2025-06-09T16:00:00Z",
  "selectedCount": 3,
  "totalCount": 45,
  "conversations": [...],
  "artifacts": {
    "conversationId_123": [...]
  }
}
```

---

## Priority Implementation Order

### Phase 1: Basic Selective Export (1 hour)
1. Add conversation list to popup
2. Implement checkbox selection
3. Export selected conversations only

### Phase 2: Enhanced UI (30 min)
1. Add select all functionality
2. Show selection count
3. Improve list styling

### Phase 3: Artifact Detection (1.5 hours)
1. Detect artifacts in content.js
2. Store artifact metadata
3. Show artifact indicators

### Phase 4: Artifact Export (1 hour)
1. Include artifacts in JSON
2. Create ZIP export option
3. Separate artifact download

---

## User Benefits

1. **Selective Export**
   - Share specific conversations without exposing all
   - Smaller export files
   - Better organization

2. **Artifact Preservation**
   - Never lose Claude-generated code
   - Preserve diagrams and visualizations
   - Complete conversation backup

3. **Enhanced Workflow**
   - Export project-related conversations together
   - Archive code snippets with context
   - Better collaboration options