// Improved text extraction function that preserves order and captures all content

function improvedExtractTextContent(element) {
  // Clone to avoid modifying DOM
  const clone = element.cloneNode(true);
  
  // Remove only true UI elements (buttons, icons)
  // Keep containers that might have content
  clone.querySelectorAll('button:not(:has(code)), svg:not(:has(text)), [role="button"]:not(:has(pre))').forEach(el => {
    // Only remove if it doesn't contain code or pre elements
    if (!el.querySelector('code, pre, .whitespace-pre-wrap')) {
      el.remove();
    }
  });
  
  // Function to recursively extract text while preserving order
  function extractInOrder(node, result = []) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        result.push(text);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Special handling for code blocks
      if (node.tagName === 'CODE' && node.parentElement?.tagName === 'PRE') {
        result.push('\n```\n' + node.textContent + '\n```\n');
        return result; // Don't process children
      }
      
      // Special handling for thought process sections
      if (node.tagName === 'DETAILS' || node.classList?.contains('thought-process')) {
        const summary = node.querySelector('summary');
        if (summary) {
          result.push('\n[Thought Process]\n');
        }
      }
      
      // Process children
      for (const child of node.childNodes) {
        extractInOrder(child, result);
      }
    }
    return result;
  }
  
  const textParts = extractInOrder(clone);
  return textParts.join(' ').replace(/\s+/g, ' ').trim();
}

// Function to capture assistant messages more thoroughly
function captureAssistantMessage(messageElement) {
  const content = [];
  
  // Look for all possible content containers
  const selectors = [
    '.whitespace-pre-wrap',
    'div[class*="prose"]',
    'div[class*="message"]',
    'details', // Thought process might be in details/summary
    'pre',
    'p',
    'ul',
    'ol',
    'blockquote'
  ];
  
  // Get all content elements in order
  const contentElements = messageElement.querySelectorAll(selectors.join(', '));
  
  if (contentElements.length === 0) {
    // Fallback: get all text content
    return improvedExtractTextContent(messageElement);
  }
  
  // Process each content element in order
  const processedElements = new Set();
  
  contentElements.forEach(el => {
    // Skip if already processed (nested elements)
    if (processedElements.has(el)) return;
    
    // Mark element and all ancestors as processed
    let current = el;
    while (current && current !== messageElement) {
      processedElements.add(current);
      current = current.parentElement;
    }
    
    // Extract content
    const text = improvedExtractTextContent(el);
    if (text && !content.includes(text)) {
      content.push(text);
    }
  });
  
  return content.join('\n\n').trim();
}