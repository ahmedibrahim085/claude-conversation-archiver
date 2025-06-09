// Test script to verify message order
console.log('=== TESTING MESSAGE ORDER ===\n');

// Method 1: Current approach
console.log('METHOD 1: querySelectorAll with comma-separated selectors');
const method1 = document.querySelectorAll('.font-user-message, .font-claude-message');
method1.forEach((msg, i) => {
  const role = msg.classList.contains('font-user-message') ? 'USER' : 'ASSISTANT';
  const preview = msg.textContent.substring(0, 50).replace(/\n/g, ' ');
  console.log(`${i + 1}. ${role}: ${preview}...`);
});

// Method 2: Get parent container first, then find messages
console.log('\n\nMETHOD 2: Find common parent, then traverse children');
const conversationContainer = document.querySelector('main [class*="flex-col"]');
if (conversationContainer) {
  const allMessages = [];
  
  // Walk through all elements in order
  const walker = document.createTreeWalker(
    conversationContainer,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: function(node) {
        if (node.classList.contains('font-user-message') || 
            node.classList.contains('font-claude-message')) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    }
  );
  
  let node;
  while (node = walker.nextNode()) {
    allMessages.push(node);
  }
  
  console.log(`Found ${allMessages.length} messages in tree order`);
  allMessages.forEach((msg, i) => {
    const role = msg.classList.contains('font-user-message') ? 'USER' : 'ASSISTANT';
    const preview = msg.textContent.substring(0, 50).replace(/\n/g, ' ');
    console.log(`${i + 1}. ${role}: ${preview}...`);
  });
}

// Method 3: Find all message containers and sort by position
console.log('\n\nMETHOD 3: Get all messages then sort by DOM position');
const userMessages = Array.from(document.querySelectorAll('.font-user-message'));
const assistantMessages = Array.from(document.querySelectorAll('.font-claude-message'));
const allMessagesArray = [...userMessages, ...assistantMessages];

// Sort by document position
allMessagesArray.sort((a, b) => {
  const position = a.compareDocumentPosition(b);
  if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
    return -1;
  } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
    return 1;
  }
  return 0;
});

console.log(`Found ${allMessagesArray.length} messages after sorting`);
allMessagesArray.forEach((msg, i) => {
  const role = msg.classList.contains('font-user-message') ? 'USER' : 'ASSISTANT';
  const preview = msg.textContent.substring(0, 50).replace(/\n/g, ' ');
  console.log(`${i + 1}. ${role}: ${preview}...`);
});