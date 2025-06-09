// Debug script to find where Claude stores message timestamps
// Run this in Chrome console on a Claude conversation page

console.log('=== Claude Timestamp Analysis ===');

// Find all messages
const allMessages = document.querySelectorAll('.font-user-message, .font-claude-message');
console.log(`Found ${allMessages.length} total messages`);

allMessages.forEach((msg, index) => {
  console.log(`\n--- Message ${index + 1} ---`);
  
  // Check for time/date related attributes
  const allElements = msg.querySelectorAll('*');
  const timeElements = [];
  
  allElements.forEach(el => {
    // Check attributes
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.toLowerCase().includes('time') || 
          attr.name.toLowerCase().includes('date') ||
          attr.value.toLowerCase().includes('ago') ||
          attr.value.includes('20')) { // Year pattern
        timeElements.push({
          element: el.tagName,
          attr: attr.name,
          value: attr.value
        });
      }
    });
    
    // Check text content for time patterns
    if (el.textContent.match(/\d{1,2}:\d{2}|\d{4}-\d{2}-\d{2}|ago|AM|PM/i)) {
      console.log(`Time text found: "${el.textContent.trim()}" in ${el.tagName}`);
    }
  });
  
  if (timeElements.length > 0) {
    console.log('Time-related attributes:', timeElements);
  }
  
  // Look for any elements that might contain timestamps
  const possibleTimeElements = msg.querySelectorAll('time, [datetime], span, small');
  possibleTimeElements.forEach(el => {
    if (el.textContent.trim()) {
      console.log(`Possible time element ${el.tagName}: "${el.textContent.trim()}"`);
    }
  });
});

// Check for any global time tracking
console.log('\n=== Global Time Elements ===');
document.querySelectorAll('time, [datetime], [data-time], [data-timestamp]').forEach(el => {
  console.log(`${el.tagName} - ${el.textContent} - Attributes:`, Array.from(el.attributes).map(a => `${a.name}="${a.value}"`));
});