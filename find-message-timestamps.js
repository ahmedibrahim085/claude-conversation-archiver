// Focused script to find timestamps in Claude messages
console.log('=== SEARCHING FOR MESSAGE TIMESTAMPS ===\n');

// Get all messages
const messages = document.querySelectorAll('.font-user-message, .font-claude-message');
console.log(`Found ${messages.length} messages\n`);

messages.forEach((msg, index) => {
  console.log(`--- Message ${index + 1} ---`);
  
  // 1. Check message element and all parents
  let element = msg;
  let level = 0;
  const checkedElements = new Set();
  
  while (element && level < 10 && !checkedElements.has(element)) {
    checkedElements.add(element);
    
    // Check all attributes
    Array.from(element.attributes || []).forEach(attr => {
      // Log any attribute that might contain time info
      const name = attr.name.toLowerCase();
      const value = attr.value;
      
      if (name.includes('time') || name.includes('date') || 
          name.includes('created') || name.includes('modified') ||
          name.includes('stamp') || name.includes('when') ||
          name.startsWith('data-') ||
          // Check if value looks like a timestamp
          /^\d{10,13}$/.test(value) || // Unix timestamp
          /\d{4}-\d{2}-\d{2}/.test(value) || // Date format
          /\d+\s*(second|minute|hour|day|week|month|year)s?\s*ago/i.test(value)) {
        
        console.log(`  Level ${level} - ${element.tagName}: ${attr.name}="${attr.value}"`);
      }
    });
    
    element = element.parentElement;
    level++;
  }
  
  // 2. Check all text nodes for time-related content
  const walker = document.createTreeWalker(
    msg,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (text && (
      /\d+\s*(second|minute|hour|day|week|month|year)s?\s*ago/i.test(text) ||
      /\d{1,2}:\d{2}\s*(AM|PM)?/i.test(text) ||
      /\d{4}-\d{2}-\d{2}/.test(text) ||
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i.test(text)
    )) {
      // Find the parent element of this text node
      let parent = node.parentElement;
      console.log(`  Found time text: "${text}" in ${parent.tagName}.${parent.className}`);
    }
  }
  
  // 3. Check React Fiber (Claude uses React)
  const reactKeys = Object.keys(msg).filter(key => 
    key.startsWith('__reactInternalInstance') || 
    key.startsWith('__reactFiber') ||
    key.startsWith('__reactProps')
  );
  
  if (reactKeys.length > 0) {
    console.log(`  React keys found: ${reactKeys.join(', ')}`);
    reactKeys.forEach(key => {
      try {
        const fiber = msg[key];
        if (fiber && fiber.memoizedProps) {
          Object.entries(fiber.memoizedProps).forEach(([propKey, propValue]) => {
            if (propKey.toLowerCase().includes('time') || 
                propKey.toLowerCase().includes('date') ||
                (typeof propValue === 'number' && propValue > 1600000000000 && propValue < 2000000000000)) {
              console.log(`  React prop: ${propKey} = ${propValue}`);
            }
          });
        }
      } catch (e) {
        // Some properties might not be accessible
      }
    });
  }
  
  console.log(''); // Empty line between messages
});

// Also check for any time display elements globally
console.log('\n=== GLOBAL TIME ELEMENTS ===');
const timeElements = document.querySelectorAll('time, [datetime], [title*="ago"], [aria-label*="ago"], [class*="time"], [class*="date"]');
timeElements.forEach(el => {
  if (el.textContent.trim() || el.getAttribute('datetime') || el.getAttribute('title')) {
    console.log(`${el.tagName}: text="${el.textContent.trim()}", datetime="${el.getAttribute('datetime')}", title="${el.getAttribute('title')}"`);
  }
});

console.log('\n=== SEARCH COMPLETE ===');
console.log('Run the network monitor script to see if timestamps come from API calls.');