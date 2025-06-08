const puppeteer = require('puppeteer');
const path = require('path');

async function testWithProfile() {
  console.log('🚀 Starting Chrome Extension Test with User Profile...\n');
  
  // Path to the extension directory
  const extensionPath = path.join(__dirname);
  
  // Use your existing Chrome profile
  const userDataDir = '/Users/ahmedmaged/Library/Application Support/Google/Chrome';
  
  // Launch Chrome with extension and user profile
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      `--user-data-dir=${userDataDir}`,
      '--profile-directory=Default'
    ],
    defaultViewport: null
  });

  try {
    console.log('📋 Chrome launched with your profile and extension loaded');
    console.log('⏳ You have 60 seconds to:');
    console.log('   1. Navigate to claude.ai if needed');
    console.log('   2. Log in if required');
    console.log('   3. Have a conversation\n');
    
    // Wait for user to log in and navigate
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    console.log('\n📋 Starting automated checks...\n');
    
    // Get the active page
    const pages = await browser.pages();
    let claudePage = pages.find(page => page.url().includes('claude.ai'));
    
    if (!claudePage) {
      console.log('❌ No Claude.ai tab found. Opening one now...');
      claudePage = await browser.newPage();
      await claudePage.goto('https://claude.ai', { waitUntil: 'networkidle2' });
    }
    
    // Check current URL
    console.log(`📍 Current URL: ${claudePage.url()}`);
    
    // Look for conversation elements
    const conversationCheck = await claudePage.evaluate(() => {
      const selectors = [
        '[data-testid*="conversation"]',
        '[data-testid*="message"]',
        '[class*="conversation"]',
        '[class*="message"]',
        '[class*="chat"]',
        'div[class*="prose"]',
        'article',
        '.prose',
        '[role="article"]',
        '[data-message-id]'
      ];
      
      const results = {};
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          results[selector] = {
            count: elements.length,
            firstElement: {
              tag: elements[0].tagName,
              classes: elements[0].className,
              text: elements[0].textContent?.substring(0, 100)
            }
          };
        }
      }
      
      // Also check console for extension logs
      return {
        foundElements: results,
        pageTitle: document.title,
        hasConversation: Object.keys(results).length > 0
      };
    });
    
    console.log('\n📊 Conversation Elements Found:');
    if (conversationCheck.hasConversation) {
      console.log('✅ Found conversation elements:');
      for (const [selector, info] of Object.entries(conversationCheck.foundElements)) {
        console.log(`   ${selector}: ${info.count} elements`);
        console.log(`     First: <${info.firstElement.tag}> "${info.firstElement.text?.substring(0, 50)}..."`);
      }
    } else {
      console.log('❌ No conversation elements found');
    }
    
    // Check extension popup
    console.log('\n📋 Checking extension popup...');
    const targets = await browser.targets();
    const extensionTarget = targets.find(target => 
      target.type() === 'service_worker' && 
      target.url().includes('chrome-extension://')
    );
    
    if (extensionTarget) {
      const extensionId = extensionTarget.url().split('/')[2];
      console.log(`✅ Extension ID: ${extensionId}`);
      
      // Open popup
      const popupPage = await browser.newPage();
      await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const popupData = await popupPage.evaluate(() => {
        const stats = document.getElementById('stats');
        return {
          statsText: stats ? stats.innerText : 'Stats not found',
          conversationCount: stats ? stats.querySelector('p')?.textContent : 'Unknown'
        };
      });
      
      console.log('\n📊 Extension Popup Stats:');
      console.log(popupData.statsText);
      
      // Check IndexedDB directly
      console.log('\n🗄️ Checking IndexedDB directly...');
      const dbCheck = await popupPage.evaluate(async () => {
        try {
          const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('ClaudeArchiver', 1);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          
          const transaction = db.transaction(['conversations'], 'readonly');
          const store = transaction.objectStore('conversations');
          const count = await new Promise((resolve, reject) => {
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          
          return { success: true, count };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });
      
      if (dbCheck.success) {
        console.log(`✅ IndexedDB has ${dbCheck.count} conversations stored`);
      } else {
        console.log(`❌ IndexedDB error: ${dbCheck.error}`);
      }
    }
    
    console.log('\n🔍 Debugging Tips:');
    console.log('1. Check Chrome DevTools Console on Claude.ai for extension logs');
    console.log('2. Look for "Claude Conversation Archiver initialized" message');
    console.log('3. Send a new message and check for "New message detected" logs');
    console.log('4. The extension only captures messages sent AFTER it was loaded');
    
    console.log('\n⏰ Keeping browser open for manual inspection...');
    console.log('Press Ctrl+C when done');
    
    // Keep browser open
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testWithProfile().catch(console.error);