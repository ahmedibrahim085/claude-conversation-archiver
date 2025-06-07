#!/bin/bash

# Claude Conversation Archiver - Project Setup Script
# Run this script to initialize the project with proper structure

echo "🚀 Setting up Claude Conversation Archiver project..."

# Create project directory
PROJECT_NAME="claude-conversation-archiver"
if [ -d "$PROJECT_NAME" ]; then
    echo "❌ Directory $PROJECT_NAME already exists!"
    echo "Please remove it or choose a different location."
    exit 1
fi

mkdir "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Initialize git
echo "📁 Initializing Git repository..."
git init

# Create tracking documents
echo "📄 Creating tracking documents..."

# Create all the tracking documents
cat > HANDOFF.md << 'EOF'
# Claude Conversation Archiver - Development Handoff

## Current Status
**Last Updated**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Last Task Completed**: None - Project Starting
**Current Branch**: main
**Next Task**: Task 1 - Project Setup

[Rest of HANDOFF.md content - copy from artifact]
EOF

cat > INTERFACES.md << 'EOF'
# Interface Contracts - Claude Conversation Archiver

[Copy full INTERFACES.md content from artifact]
EOF

cat > PROGRESS.json << 'EOF'
{
  [Copy full PROGRESS.json content from artifact]
}
EOF

cat > CHECKLISTS.md << 'EOF'
# Development Checklists - Claude Conversation Archiver

[Copy full CHECKLISTS.md content from artifact]
EOF

cat > STATUS_AUDIT.md << 'EOF'
# Status Audit - Claude Conversation Archiver

[Copy full STATUS_AUDIT.md content from artifact]
EOF

# Create .gitignore
echo "📝 Creating .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Build outputs
dist/
build/
*.zip

# IDE files
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Sensitive data
*.pem
secrets.json
.env

# Temporary files
*.tmp
*.log

# Chrome extension key files
*.crx
*.pem

# Test outputs
coverage/
.nyc_output/
EOF

# Create project structure
echo "🏗️ Creating project structure..."
mkdir -p src/{assets,styles}
mkdir -p docs
mkdir -p tests
mkdir -p store-assets

# Create placeholder README
cat > README.md << 'EOF'
# Claude Conversation Archiver

A Chrome extension for archiving Claude AI conversations locally with optional cloud sync.

## Status

🚧 **Under Development** - See HANDOFF.md for current progress

## Project Structure

```
claude-conversation-archiver/
├── manifest.json          # Chrome extension manifest
├── content.js            # Content script for capturing conversations
├── background.js         # Service worker for storage and sync
├── popup.html           # Extension popup interface
├── popup.js             # Popup functionality
├── src/                 # Additional source files
├── docs/                # Documentation
├── tests/               # Test files
└── store-assets/        # Chrome Web Store assets
```

## Development

See the following documents for development guidelines:
- `HANDOFF.md` - Current development status and next steps
- `INTERFACES.md` - Interface contracts between components
- `PROGRESS.json` - Task tracking
- `CHECKLISTS.md` - Pre/post task checklists
- `STATUS_AUDIT.md` - Emergency recovery procedures

## License

[Your chosen license]
EOF

# Initial commit
echo "💾 Creating initial commit..."
git add .
git commit -m "Initial project setup with tracking documents"

# Create main branch (if not already on it)
git branch -M main

echo "✅ Project setup complete!"
echo ""
echo "Next steps:"
echo "1. cd $PROJECT_NAME"
echo "2. Review tracking documents"
echo "3. Start Task 1 by creating branch: git checkout -b task-01-project-setup"
echo "4. Open new conversation with Claude using Task 1 prompt from HANDOFF.md"
echo ""
echo "Happy coding! 🎉"