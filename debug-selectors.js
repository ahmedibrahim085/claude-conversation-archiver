// Debug script to find Claude.ai conversation selectors
// Paste this in Chrome DevTools Console while on Claude.ai chat page

console.log('🔍 Searching for Claude conversation elements...\n');

const selectors = [
  // Current selectors from content.js
  '[data-testid="conversation-turn"]',
  '.group.w-full',
  '.font-semibold',
  '.prose',
  '[class*="font-bold"]',
  '[class*="prose"]',
  
  // Additional potential selectors
  '[data-testid*="message"]',
  '[data-testid*="chat"]',
  '[class*="message"]',
  '[class*="chat"]',
  'article',
  '[role="article"]',
  'div[class*="text-base"]',
  'div[class*="whitespace-pre-wrap"]',
  '.flex.flex-col.gap-3',
  '.flex.flex-col.gap-4',
  '[class*="ConversationItem"]',
  '[class*="MessageItem"]',
  '[class*="conversation-turn"]',
  'div[class*="group"][class*="w-full"]',
  '.relative.flex.w-full',
  '[class*="relative"][class*="flex"]',
  
  // Look for specific Claude UI patterns
  'div:has(> div > div > .font-semibold)',
  'div:has(> div > .prose)',
  '.flex.gap-3:has(.prose)',
  
  // Common chat app patterns
  '.chat-message',
  '.message-container',
  '.conversation-message',
  '[data-message-id]',
  '[data-conversation-id]'
];

console.log('Testing', selectors.length, 'selectors...\n');

const results = {};

selectors.forEach(selector => {
  try {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      results[selector] = {
        count: elements.length,
        samples: []
      };
      
      // Get first 3 samples
      for (let i = 0; i < Math.min(3, elements.length); i++) {
        const elem = elements[i];
        results[selector].samples.push({
          tagName: elem.tagName,
          className: elem.className,
          id: elem.id || '(no id)',
          text: elem.textContent?.trim().substring(0, 100) + '...',
          html: elem.outerHTML.substring(0, 200) + '...'
        });
      }
    }
  } catch (e) {
    // Ignore selector syntax errors
  }
});

// Display results
console.log('✅ Found elements with these selectors:\n');
Object.entries(results).forEach(([selector, data]) => {
  console.log(`📍 ${selector} (${data.count} elements)`);
  data.samples.forEach((sample, i) => {
    console.log(`   Sample ${i + 1}:`);
    console.log(`   - Tag: ${sample.tagName}`);
    console.log(`   - Classes: ${sample.className || '(no classes)'}`);
    console.log(`   - Text: "${sample.text}"`);
    console.log(`   - HTML: ${sample.html}`);
    console.log('');
  });
});

// Try to identify message structure
console.log('\n🔍 Analyzing page structure for messages...\n');

// Look for text that looks like messages
const allText = document.querySelectorAll('*');
const messagePatterns = [];

allText.forEach(elem => {
  const text = elem.textContent?.trim();
  if (text && text.length > 20 && text.length < 5000) {
    // Check if this might be a message
    const hasNoChildren = elem.children.length === 0 || 
                         (elem.children.length === 1 && elem.children[0].tagName === 'BR');
    const parent = elem.parentElement;
    
    if (hasNoChildren && parent) {
      // Check if parent has "You" or "Claude" nearby
      const siblingText = Array.from(parent.children)
        .map(child => child.textContent)
        .join(' ');
        
      if (siblingText.includes('You') || siblingText.includes('Claude') || 
          siblingText.includes('Assistant') || siblingText.includes('Human')) {
        messagePatterns.push({
          messageElement: {
            tag: elem.tagName,
            class: elem.className,
            text: text.substring(0, 100)
          },
          parentStructure: {
            tag: parent.tagName,
            class: parent.className,
            childCount: parent.children.length
          }
        });
      }
    }
  }
});

if (messagePatterns.length > 0) {
  console.log('🎯 Potential message patterns found:');
  messagePatterns.slice(0, 5).forEach((pattern, i) => {
    console.log(`\nPattern ${i + 1}:`);
    console.log('Message element:', pattern.messageElement);
    console.log('Parent structure:', pattern.parentStructure);
  });
}

console.log('\n✨ Debugging complete! Copy relevant selectors to update content.js');