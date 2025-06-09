/**
 * Popup Script for Claude Conversation Archiver
 * Purpose: Handles user interface interactions and displays extension status
 * Communicates with: background.js
 */

// DOM elements
let countElement;
let lastCaptureElement;
let storageSizeElement;
let exportBtn;
let importBtn;
let clearBtn;
let statusElement;
let autoExportSchedule;
let exportOnClose;
let clearAfterExport;
let importFile;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Claude Archiver: Popup loaded');
  
  // Get DOM elements
  countElement = document.getElementById('count');
  lastCaptureElement = document.getElementById('lastCapture');
  storageSizeElement = document.getElementById('storageSize');
  exportBtn = document.getElementById('exportBtn');
  importBtn = document.getElementById('importBtn');
  clearBtn = document.getElementById('clearBtn');
  statusElement = document.getElementById('status');
  autoExportSchedule = document.getElementById('autoExportSchedule');
  exportOnClose = document.getElementById('exportOnClose');
  clearAfterExport = document.getElementById('clearAfterExport');
  importFile = document.getElementById('importFile');
  
  // Set up event listeners
  exportBtn.addEventListener('click', exportConversations);
  importBtn.addEventListener('click', () => importFile.click());
  clearBtn.addEventListener('click', clearAllData);
  importFile.addEventListener('change', handleImport);
  
  // Settings listeners
  autoExportSchedule.addEventListener('change', saveSettings);
  exportOnClose.addEventListener('change', saveSettings);
  clearAfterExport.addEventListener('change', saveSettings);
  
  // Footer links
  document.getElementById('helpLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/your-username/claude-archiver#readme' });
  });
  
  document.getElementById('privacyLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/your-username/claude-archiver#privacy' });
  });
  
  // Load initial data
  await loadConversationStats();
  await loadSettings();
});

/**
 * Loads and displays conversation statistics
 */
async function loadConversationStats() {
  try {
    // Request all conversations from background script
    const response = await chrome.runtime.sendMessage({ 
      action: 'getAllConversations' 
    });
    
    if (response.success) {
      const conversations = response.conversations || [];
      
      // Update conversation count
      countElement.textContent = conversations.length;
      
      // Find most recent capture
      if (conversations.length > 0) {
        const mostRecent = Math.max(...conversations.map(c => c.capturedAt));
        lastCaptureElement.textContent = formatDate(mostRecent);
      } else {
        lastCaptureElement.textContent = 'Never';
      }
      
      // Estimate storage size (rough calculation)
      const estimatedSize = conversations.reduce((total, conv) => {
        return total + (conv.messageCount * 500); // ~500 bytes per message
      }, 0);
      storageSizeElement.textContent = formatBytes(estimatedSize);
      
    } else {
      console.error('Failed to load conversations:', response.error);
      showStatus('Failed to load conversations', 'error');
    }
  } catch (error) {
    console.error('Error loading stats:', error);
    showStatus('Error loading data', 'error');
  }
}

/**
 * Exports all conversations as JSON
 */
async function exportConversations() {
  try {
    // Disable button and show loading
    exportBtn.disabled = true;
    exportBtn.innerHTML = 'Exporting<span class="loading"></span>';
    
    // Request export data from background script
    const response = await chrome.runtime.sendMessage({ 
      action: 'exportConversations',
      format: 'json'
    });
    
    if (response.success) {
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `claude-conversations-${formatDateForFilename(Date.now())}.json`;
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      
      showStatus('Conversations exported successfully!', 'success');
    } else {
      showStatus('Export failed: ' + (response.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    console.error('Export error:', error);
    showStatus('Export failed', 'error');
  } finally {
    // Re-enable button
    exportBtn.disabled = false;
    exportBtn.innerHTML = 'Export All Conversations';
  }
}

/**
 * Clears all conversation data after confirmation
 */
async function clearAllData() {
  // Confirm action
  const confirmed = confirm(
    'This will delete all archived conversations.\n\n' +
    'This action cannot be undone.\n\n' +
    'Are you sure you want to continue?'
  );
  
  if (!confirmed) return;
  
  try {
    // Disable button and show loading
    clearBtn.disabled = true;
    clearBtn.innerHTML = 'Clearing<span class="loading"></span>';
    
    // Request clear from background script
    const response = await chrome.runtime.sendMessage({ 
      action: 'clearAllConversations' 
    });
    
    if (response.success) {
      showStatus('All conversations cleared', 'info');
      
      // Reset stats
      countElement.textContent = '0';
      lastCaptureElement.textContent = 'Never';
      storageSizeElement.textContent = '0 KB';
    } else {
      showStatus('Clear failed: ' + (response.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    console.error('Clear error:', error);
    showStatus('Clear failed', 'error');
  } finally {
    // Re-enable button
    clearBtn.disabled = false;
    clearBtn.innerHTML = 'Clear All Data';
  }
}

/**
 * Shows a status message
 * @param {string} message - Message to display
 * @param {string} type - Type of message (success, error, info)
 */
function showStatus(message, type) {
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
  statusElement.style.display = 'block';
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusElement.style.display = 'none';
  }, 3000);
}

/**
 * Formats a timestamp as a readable date
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  
  // If today, show time
  if (date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  }
  
  // If yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  }
  
  // Otherwise show date
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Formats a timestamp for filename
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date string for filename
 */
function formatDateForFilename(timestamp) {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Formats bytes as human-readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 KB';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Loads settings from storage
 */
async function loadSettings() {
  try {
    const settings = await chrome.storage.local.get(['exportSettings']);
    if (settings.exportSettings) {
      autoExportSchedule.value = settings.exportSettings.schedule || 'off';
      exportOnClose.checked = settings.exportSettings.exportOnClose || false;
      clearAfterExport.checked = settings.exportSettings.clearAfterExport || false;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Saves settings to storage
 */
async function saveSettings() {
  try {
    const settings = {
      schedule: autoExportSchedule.value,
      exportOnClose: exportOnClose.checked,
      clearAfterExport: clearAfterExport.checked
    };
    
    await chrome.storage.local.set({ exportSettings: settings });
    
    // Send message to background to update alarm
    await chrome.runtime.sendMessage({
      action: 'updateAutoExport',
      settings: settings
    });
    
    showStatus('Settings saved', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Failed to save settings', 'error');
  }
}

/**
 * Handles import of conversations from JSON file
 */
async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    importBtn.disabled = true;
    importBtn.innerHTML = 'Importing<span class="loading"></span>';
    
    const text = await file.text();
    const data = JSON.parse(text);
    
    // Validate data structure
    if (!data.conversations || !Array.isArray(data.conversations)) {
      throw new Error('Invalid file format');
    }
    
    // Send to background for import
    const response = await chrome.runtime.sendMessage({
      action: 'importConversations',
      data: data.conversations,
      merge: true // Always merge for now
    });
    
    if (response.success) {
      showStatus(`Imported ${response.imported} conversations`, 'success');
      await loadConversationStats(); // Refresh stats
    } else {
      showStatus('Import failed: ' + response.error, 'error');
    }
  } catch (error) {
    console.error('Import error:', error);
    showStatus('Failed to import: ' + error.message, 'error');
  } finally {
    importBtn.disabled = false;
    importBtn.innerHTML = 'Import Conversations';
    importFile.value = ''; // Reset file input
  }
}