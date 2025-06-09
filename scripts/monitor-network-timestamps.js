// Script to monitor network requests for timestamp data
// Run this in Chrome DevTools console BEFORE loading/navigating conversations

console.log('=== MONITORING NETWORK FOR TIMESTAMPS ===\n');

// Store original fetch
const originalFetch = window.fetch;

// Override fetch to intercept responses
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);
  
  // Clone response to read it without consuming
  const clone = response.clone();
  
  try {
    const text = await clone.text();
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(text);
      
      // Look for timestamp fields in the response
      const findTimestamps = (obj, path = '') => {
        if (!obj || typeof obj !== 'object') return;
        
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          const currentPath = path ? `${path}.${key}` : key;
          
          // Check if key suggests timestamp
          if (key.toLowerCase().includes('time') || 
              key.toLowerCase().includes('date') ||
              key.toLowerCase().includes('created') ||
              key.toLowerCase().includes('modified') ||
              key.toLowerCase().includes('stamp')) {
            console.log(`Found timestamp field: ${currentPath} = ${value}`);
          }
          
          // Check if value might be timestamp
          if (typeof value === 'number' && value > 1600000000000 && value < 2000000000000) {
            const date = new Date(value);
            console.log(`Possible timestamp: ${currentPath} = ${value} (${date.toISOString()})`);
          }
          
          // Recurse into objects and arrays
          if (Array.isArray(value)) {
            value.forEach((item, index) => {
              findTimestamps(item, `${currentPath}[${index}]`);
            });
          } else if (typeof value === 'object' && value !== null) {
            findTimestamps(value, currentPath);
          }
        });
      };
      
      console.log(`\n--- Response from ${args[0]} ---`);
      findTimestamps(data);
      
    } catch (e) {
      // Not JSON
    }
  } catch (e) {
    console.error('Error reading response:', e);
  }
  
  return response;
};

// Also monitor XMLHttpRequest
const XHR = XMLHttpRequest.prototype;
const originalOpen = XHR.open;
const originalSend = XHR.send;

XHR.open = function(method, url) {
  this._url = url;
  return originalOpen.apply(this, arguments);
};

XHR.send = function() {
  this.addEventListener('load', function() {
    if (this.responseType === '' || this.responseType === 'text' || this.responseType === 'json') {
      try {
        const data = this.responseType === 'json' ? this.response : JSON.parse(this.responseText);
        console.log(`\n--- XHR Response from ${this._url} ---`);
        // Use same timestamp finder from above
        // ... (would repeat the findTimestamps function here)
      } catch (e) {
        // Not JSON
      }
    }
  });
  return originalSend.apply(this, arguments);
};

console.log('Network monitoring active. Now navigate or refresh the conversation to see API responses.');
console.log('Look for any timestamp fields in the responses above.');