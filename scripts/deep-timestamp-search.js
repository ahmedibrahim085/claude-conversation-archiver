// Comprehensive script to find ANY timestamp data in Claude's DOM
// Run this in Chrome DevTools console on a Claude conversation

console.log('=== DEEP TIMESTAMP SEARCH ===\n');

// Helper to check if value might be a timestamp
function mightBeTimestamp(value) {
  if (!value) return false;
  const str = String(value);
  
  // Check for Unix timestamps (10-13 digits)
  if (/^\d{10,13}$/.test(str)) {
    const num = parseInt(str);
    // Check if it's a reasonable timestamp (2020-2030)
    const date = new Date(num > 9999999999 ? num : num * 1000);
    const year = date.getFullYear();
    return year >= 2020 && year <= 2030;
  }
  
  // Check for ISO dates
  if (/\d{4}-\d{2}-\d{2}/.test(str)) return true;
  
  // Check for relative times
  if (/ago|yesterday|today|minute|hour|day|week|month/.test(str)) return true;
  
  return false;
}

// 1. Search ALL element attributes
console.log('1. SEARCHING ALL ATTRIBUTES...');
const allElements = document.querySelectorAll('*');
const timestampAttributes = new Map();

allElements.forEach(el => {
  Array.from(el.attributes).forEach(attr => {
    if (mightBeTimestamp(attr.value) || 
        attr.name.toLowerCase().includes('time') || 
        attr.name.toLowerCase().includes('date') ||
        attr.name.toLowerCase().includes('stamp') ||
        attr.name.toLowerCase().includes('created') ||
        attr.name.toLowerCase().includes('modified')) {
      const key = `${el.tagName}.${el.className} -> ${attr.name}`;
      if (!timestampAttributes.has(key)) {
        timestampAttributes.set(key, []);
      }
      timestampAttributes.get(key).push(attr.value);
    }
  });
});

console.log('Found timestamp-related attributes:');
timestampAttributes.forEach((values, key) => {
  console.log(`  ${key}: ${values[0]} (${values.length} instances)`);
});

// 2. Search data attributes specifically
console.log('\n2. SEARCHING DATA ATTRIBUTES...');
const dataAttributes = new Set();
// Can't use [data-*] selector, so check all elements
allElements.forEach(el => {
  Array.from(el.attributes).forEach(attr => {
    if (attr.name.startsWith('data-')) {
      if (mightBeTimestamp(attr.value)) {
        dataAttributes.add(`${attr.name}="${attr.value}" on ${el.tagName}`);
      }
    }
  });
});

if (dataAttributes.size > 0) {
  console.log('Data attributes with possible timestamps:');
  dataAttributes.forEach(attr => console.log(`  ${attr}`));
} else {
  console.log('No data attributes with timestamps found');
}

// 3. Check message containers specifically
console.log('\n3. ANALYZING MESSAGE CONTAINERS...');
const messages = document.querySelectorAll('.font-user-message, .font-claude-message');
messages.forEach((msg, i) => {
  console.log(`\nMessage ${i + 1}:`);
  
  // Check the element itself
  console.log('  Element attributes:', Array.from(msg.attributes).map(a => `${a.name}="${a.value}"`));
  
  // Check parent elements (up to 5 levels)
  let parent = msg.parentElement;
  let level = 1;
  while (parent && level <= 5) {
    const timeAttrs = Array.from(parent.attributes).filter(attr => 
      mightBeTimestamp(attr.value) || attr.name.toLowerCase().includes('time')
    );
    if (timeAttrs.length > 0) {
      console.log(`  Parent level ${level} has:`, timeAttrs.map(a => `${a.name}="${a.value}"`));
    }
    parent = parent.parentElement;
    level++;
  }
  
  // Check for hidden text that might contain timestamps
  const hiddenElements = msg.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"], .sr-only, [aria-hidden="true"]');
  hiddenElements.forEach(hidden => {
    if (mightBeTimestamp(hidden.textContent)) {
      console.log(`  Hidden element contains: "${hidden.textContent.trim()}"`);
    }
  });
});

// 4. Search for React props (Claude uses React)
console.log('\n4. SEARCHING REACT PROPS...');
function getReactProps(element) {
  const keys = Object.keys(element);
  const reactKey = keys.find(key => key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber'));
  if (reactKey) {
    return element[reactKey];
  }
  return null;
}

messages.forEach((msg, i) => {
  const reactData = getReactProps(msg);
  if (reactData) {
    console.log(`\nMessage ${i + 1} React data:`);
    // Traverse React fiber to find props
    let fiber = reactData;
    while (fiber) {
      if (fiber.memoizedProps) {
        const props = fiber.memoizedProps;
        Object.keys(props).forEach(key => {
          if (mightBeTimestamp(props[key]) || key.toLowerCase().includes('time')) {
            console.log(`  ${key}: ${props[key]}`);
          }
        });
      }
      fiber = fiber.return;
    }
  }
});

// 5. Check window/global objects
console.log('\n5. CHECKING WINDOW OBJECTS...');
Object.keys(window).forEach(key => {
  if (key.toLowerCase().includes('claude') || key.toLowerCase().includes('anthropic')) {
    try {
      const value = window[key];
      if (typeof value === 'object' && value !== null) {
        console.log(`Found window.${key}:`, value);
      }
    } catch (e) {
      // Some properties might throw on access
    }
  }
});

// 6. Search for JSON-LD or metadata
console.log('\n6. SEARCHING FOR METADATA...');
const scripts = document.querySelectorAll('script[type="application/ld+json"], script[type="application/json"]');
scripts.forEach(script => {
  try {
    const data = JSON.parse(script.textContent);
    console.log('Found JSON data:', data);
  } catch (e) {
    // Invalid JSON
  }
});

// 7. Check computed styles (some sites hide data in CSS)
console.log('\n7. CHECKING COMPUTED STYLES...');
messages.forEach((msg, i) => {
  const computed = window.getComputedStyle(msg);
  const before = window.getComputedStyle(msg, '::before');
  const after = window.getComputedStyle(msg, '::after');
  
  [computed, before, after].forEach((style, idx) => {
    const content = style.content;
    if (content && content !== 'none' && content !== '""' && mightBeTimestamp(content)) {
      console.log(`Message ${i + 1} ${['main', '::before', '::after'][idx]} content:`, content);
    }
  });
});

console.log('\n=== SEARCH COMPLETE ===');
console.log('If no timestamps were found above, they might be:');
console.log('1. Loaded dynamically and not stored in DOM');
console.log('2. Only available through API calls');
console.log('3. Computed on-the-fly when needed');
console.log('4. Stored in a state management system not exposed to DOM');