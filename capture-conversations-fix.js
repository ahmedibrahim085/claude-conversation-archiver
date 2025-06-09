function captureConversations() {
  console.log('Claude Archiver: Starting conversation capture...');
  const messages = [];
  
  try {
    // Check if we're on a conversation page
    const conversationId = extractConversationId();
    if (!conversationId) {
      console.log('Claude Archiver: Not on a conversation page');
      return messages;
    }
    
    // Base timestamp - we'll decrement this for older messages
    const baseTimestamp = Date.now();
    const timestampIncrement = 60000; // 1 minute between messages
    
    // Find all message elements in DOM order (chronological)
    const allMessageElements = document.querySelectorAll('.font-user-message, .font-claude-message');
    console.log(`Claude Archiver: Found ${allMessageElements.length} total messages in DOM order`);
    
    // Process messages in their DOM order
    allMessageElements.forEach((msgElement, index) => {
      const isUserMessage = msgElement.classList.contains('font-user-message') || 
                           msgElement.querySelector('[data-testid="user-message"]');
      const role = isUserMessage ? 'user' : 'assistant';
      
      let content = '';
      
      if (role === 'user') {
        // User messages are simpler
        content = extractTextContent(msgElement);
      } else {
        // Assistant messages - use comprehensive extraction
        const contentSelectors = [
          '.whitespace-pre-wrap',
          'details', // Thought process sections
          'summary', // Thought process headers
          'div[class*="prose"]',
          'div[class*="text"]',
          'pre', // Code blocks
          'p', // Paragraphs
          'ul', 'ol', // Lists
          'blockquote' // Quotes
        ].join(', ');
        
        const contentElements = msgElement.querySelectorAll(contentSelectors);
        let fullContent = '';
        
        if (contentElements.length > 0) {
          // Get unique top-level elements (avoid nested duplicates)
          const processedElements = new Set();
          const topLevelElements = [];
          
          contentElements.forEach(el => {
            let isNested = false;
            let parent = el.parentElement;
            
            // Check if this element is nested inside another content element
            while (parent && parent !== msgElement) {
              if (processedElements.has(parent)) {
                isNested = true;
                break;
              }
              parent = parent.parentElement;
            }
            
            if (!isNested) {
              topLevelElements.push(el);
              processedElements.add(el);
            }
          });
          
          // Extract text from each top-level element
          topLevelElements.forEach(el => {
            const text = extractTextContent(el);
            if (text && !fullContent.includes(text)) {
              fullContent += text + '\n\n';
            }
          });
        } else {
          // Fallback to entire element
          fullContent = extractTextContent(msgElement);
        }
        
        content = fullContent.trim();
      }
      
      if (content) {
        // Calculate timestamp - older messages get earlier timestamps
        const messageTimestamp = baseTimestamp - ((allMessageElements.length - index - 1) * timestampIncrement);
        
        messages.push({
          role: role,
          content: content,
          timestamp: messageTimestamp
        });
      }
    });
    
    console.log(`Claude Archiver: Total messages captured: ${messages.length}`);
    return messages;
    
  } catch (error) {
    console.error('Claude Archiver: Error in captureConversations:', error);
    return messages;
  }
}