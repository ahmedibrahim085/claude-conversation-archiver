// Debug script to analyze Claude's DOM structure
// Run this in Chrome console on a Claude conversation page

console.log('=== Claude DOM Structure Analysis ===');

// Find all assistant messages
const assistantMessages = document.querySelectorAll('.font-claude-message');
console.log(`Found ${assistantMessages.length} assistant messages`);

assistantMessages.forEach((msg, index) => {
  console.log(`\n--- Assistant Message ${index + 1} ---`);
  
  // Check for thought process containers
  const thoughtProcesses = msg.querySelectorAll('[class*="thought"], [class*="process"], details, summary');
  console.log(`Thought process elements: ${thoughtProcesses.length}`);
  thoughtProcesses.forEach(el => {
    console.log(`  - ${el.tagName}.${el.className}: "${el.textContent.substring(0, 50)}..."`);
  });
  
  // Check all child elements
  const allChildren = msg.querySelectorAll('*');
  const elementTypes = new Set();
  allChildren.forEach(el => {
    elementTypes.add(`${el.tagName}.${el.className}`);
  });
  console.log('Unique element types:', Array.from(elementTypes).sort());
  
  // Look for actual content containers
  const contentContainers = msg.querySelectorAll('div, p, pre, code, span');
  console.log(`Content containers: ${contentContainers.length}`);
  
  // Get full text content to compare
  console.log('Full text preview:', msg.textContent.substring(0, 200) + '...');
});

// Check for any elements that might contain "Thought process"
const thoughtElements = document.querySelectorAll('*');
const thoughtContainers = Array.from(thoughtElements).filter(el => 
  el.textContent.includes('Thought process') && 
  !el.querySelector('*:has(Thought process)')
);
console.log('\n=== Elements containing "Thought process" ===');
thoughtContainers.forEach(el => {
  console.log(`${el.tagName}.${el.className} - Parent: ${el.parentElement?.tagName}.${el.parentElement?.className}`);
});