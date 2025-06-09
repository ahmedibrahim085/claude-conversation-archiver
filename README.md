# Claude Conversation Archiver

A Chrome extension that automatically archives your Claude AI conversations locally with optional cloud sync via GitHub Gists.

## Features

- 🔄 **Automatic Capture**: Monitors and captures conversations in real-time
- 💾 **Local Storage**: Stores conversations using IndexedDB for unlimited storage
- ☁️ **Cloud Sync**: Optional sync to GitHub Gists for backup and cross-device access
- 📤 **Export**: Export all conversations as JSON
- 🔍 **Detection**: Indicates when viewing previously archived conversations
- 🔒 **Privacy First**: All data stored locally by default, cloud sync is optional

## Installation (Development)

1. Clone this repository:
   ```bash
   git clone [repository-url]
   cd claude-conversation-archiver
   ```

2. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the project directory

3. Visit [claude.ai](https://claude.ai) and start a conversation
   - You should see "Claude Archiver: Content script loaded" in the console
   - The extension icon will appear in your toolbar

## Project Structure

```
claude-conversation-archiver/
├── manifest.json          # Extension manifest (v3)
├── background.js          # Service worker for storage
├── content.js            # Content script for Claude.ai
├── popup.html            # Extension popup interface
├── popup.js              # Popup logic
├── icons/                # Extension icons
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── docs/                 # Planning and design documents
├── README.md             # This file
├── DEBUGGING_GUIDE.md    # Debugging instructions
├── LESSONS_LEARNED.md    # Development insights
├── SESSION_SUMMARY.md    # Session summary
└── progress-tracking.txt # Task completion tracking
```

Debug scripts are maintained in: `/Users/ahmedmaged/ai_storage/projects/scripts-developed/`

### Key Components

- **manifest.json**: Defines extension permissions and configuration
- **content.js**: Runs on claude.ai pages to capture conversation data
- **background.js**: Handles storage operations and message passing
- **popup.html/js**: User interface for viewing and managing archived conversations

## Usage

1. **Automatic Archiving**: Simply use Claude.ai normally - conversations are automatically captured
2. **View Archives**: Click the extension icon to see saved conversations
3. **Export Data**: Use the export button in the popup to download all conversations as JSON
4. **Cloud Sync** (optional): Add your GitHub token in settings to enable automatic backup

## Development

This project is structured for incremental development across multiple tasks:

- Task 1: Project setup and manifest configuration ✅
- Task 2: DOM capture implementation ✅
- Task 3: Local storage with IndexedDB ✅
- Task 4: Popup interface and export functionality ✅
- Task 5: Conversation detection and retrieval ✅
- Task 6: GitHub Gist sync implementation
- Task 7: Performance optimization
- Task 8: Testing and Chrome Store preparation
- Task 9: Cross-device sync enhancement
- Task 10: Final polish and documentation
- Task 11: Incremental message updates (future enhancement)

See `progress-tracking.txt` for detailed task status and completion metrics.

### Debug Scripts

Debug and test scripts are maintained in the shared location: `/Users/ahmedmaged/ai_storage/projects/scripts-developed/`
See `SCRIPTS_DOCUMENTATION.md` in that directory for detailed documentation.

## Privacy

- All conversation data is stored locally in your browser by default
- No data is sent to any servers unless you explicitly enable GitHub sync
- You have full control over your data with export and delete options

## License

[Your chosen license]

## Contributing

See `HANDOFF.md` and `INTERFACES.md` for development guidelines and interface contracts.