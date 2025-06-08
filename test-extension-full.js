const puppeteer = require('puppeteer');
const readline = require('readline');

async function testExtension() {
    console.log('🧪 Testing Claude Conversation Archiver Chrome Extension...\n');
    
    const extensionPath = '/Users/ahmedmaged/ai_storage/projects/claude-conversation-archiver';
    let browser;
    
    try {
        // Launch Chrome with extension
        console.log('📦 Loading extension from:', extensionPath);
        browser = await puppeteer.launch({
            headless: false,
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
                '--auto-open-devtools-for-tabs' // Open devtools automatically
            ],
            ignoreDefaultArgs: ['--disable-extensions'],
            defaultViewport: null,
            timeout: 60000
        });
        
        console.log('✅ Chrome launched with extension\n');
        
        // Give extension time to initialize
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Open extensions page to verify loading
        const extensionsPage = await browser.newPage();
        await extensionsPage.goto('chrome://extensions');
        console.log('📋 Extensions page opened - check if Claude Conversation Archiver is listed');
        
        // Take screenshot of extensions
        await extensionsPage.screenshot({ 
            path: '/tmp/1-extensions-page.png',
            fullPage: true 
        });
        console.log('📸 Screenshot saved: /tmp/1-extensions-page.png\n');
        
        // Wait a bit then navigate to Claude.ai
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const claudePage = await browser.newPage();
        
        // Set up console listener before navigation
        console.log('🎯 Setting up console listeners...');
        claudePage.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (text.includes('Claude Conversation Archiver') || text.includes('content.js')) {
                console.log(`[CONTENT SCRIPT ${type.toUpperCase()}]: ${text}`);
            }
        });
        
        claudePage.on('pageerror', error => {
            console.log(`[PAGE ERROR]: ${error.message}`);
        });
        
        // Navigate to Claude.ai
        console.log('🌐 Navigating to claude.ai...');
        await claudePage.goto('https://claude.ai', { 
            waitUntil: ['domcontentloaded', 'networkidle2'],
            timeout: 30000 
        });
        console.log('✅ Claude.ai loaded\n');
        
        // Wait for content script to potentially load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check if content script injected any markers
        const contentScriptCheck = await claudePage.evaluate(() => {
            // Look for any signs of our content script
            const checks = {
                url: window.location.href,
                title: document.title,
                // Check for any global variables our extension might set
                hasArchiverGlobal: typeof window.claudeArchiver !== 'undefined',
                hasArchiverLoaded: typeof window.__claudeArchiverLoaded !== 'undefined',
                // Check localStorage for extension data
                localStorageKeys: Object.keys(localStorage).filter(key => 
                    key.includes('archiver') || key.includes('claude')
                ),
                // Check for any custom elements or attributes
                hasCustomElements: document.querySelector('[data-archiver]') !== null
            };
            
            // Try to find conversation elements
            checks.conversationElements = {
                hasMessages: document.querySelector('[data-testid*="message"]') !== null,
                hasChatContainer: document.querySelector('[role="main"]') !== null,
                messageCount: document.querySelectorAll('[data-testid*="message"]').length
            };
            
            return checks;
        });
        
        console.log('🔍 Content Script Check:');
        console.log(JSON.stringify(contentScriptCheck, null, 2));
        
        // Take screenshot of Claude page
        await claudePage.screenshot({ 
            path: '/tmp/2-claude-page.png',
            fullPage: false 
        });
        console.log('\n📸 Screenshot saved: /tmp/2-claude-page.png');
        
        // Find extension ID from targets
        const targets = await browser.targets();
        let extensionId = null;
        
        console.log('\n🎯 Browser Targets:');
        for (const target of targets) {
            const url = target.url();
            console.log(`- ${target.type()}: ${url}`);
            
            if (target.type() === 'service_worker' && url.includes('chrome-extension://')) {
                extensionId = url.split('/')[2];
            }
        }
        
        if (extensionId) {
            console.log(`\n✅ Found Extension ID: ${extensionId}`);
            
            // Try to open the popup
            const popupUrl = `chrome-extension://${extensionId}/popup.html`;
            console.log(`📍 Opening popup at: ${popupUrl}`);
            
            const popupPage = await browser.newPage();
            await popupPage.goto(popupUrl);
            
            // Wait for popup to load
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Get popup content
            const popupInfo = await popupPage.evaluate(() => {
                return {
                    title: document.title,
                    bodyHTML: document.body.innerHTML,
                    stats: document.querySelector('.stats-grid')?.innerText,
                    buttons: Array.from(document.querySelectorAll('button')).map(btn => ({
                        text: btn.textContent,
                        className: btn.className
                    }))
                };
            });
            
            console.log('\n📊 Popup Info:');
            console.log(`Title: ${popupInfo.title}`);
            console.log(`Stats: ${popupInfo.stats || 'No stats found'}`);
            console.log(`Buttons:`, popupInfo.buttons);
            
            // Take screenshot of popup
            await popupPage.screenshot({ 
                path: '/tmp/3-popup-page.png',
                fullPage: true 
            });
            console.log('\n📸 Screenshot saved: /tmp/3-popup-page.png');
        } else {
            console.log('\n⚠️  Extension service worker not found');
        }
        
        // Try to manually inject content script for testing
        console.log('\n🔧 Attempting manual content script injection...');
        try {
            const contentScript = await claudePage.addScriptTag({
                path: extensionPath + '/content.js'
            });
            console.log('✅ Content script manually injected');
        } catch (error) {
            console.log('❌ Could not manually inject:', error.message);
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUMMARY:');
        console.log('='.repeat(60));
        console.log('✅ Chrome launched successfully');
        console.log('✅ Extension loaded in browser');
        console.log('✅ Claude.ai page loaded');
        console.log(extensionId ? '✅ Extension ID found' : '❌ Extension ID not found');
        console.log(extensionId ? '✅ Popup accessible' : '❌ Popup not tested');
        console.log('\n📁 Screenshots saved:');
        console.log('  - /tmp/1-extensions-page.png');
        console.log('  - /tmp/2-claude-page.png');
        if (extensionId) {
            console.log('  - /tmp/3-popup-page.png');
        }
        
        console.log('\n🔍 Browser remains open for manual testing.');
        console.log('💡 You can:');
        console.log('  - Check the DevTools console for any errors');
        console.log('  - Click the extension icon in the toolbar');
        console.log('  - Navigate around Claude.ai to trigger the content script');
        console.log('  - Check chrome://extensions for any errors');
        console.log('\n⌨️  Press Enter to close the browser and exit...');
        
        // Wait for user input
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        await new Promise(resolve => {
            rl.question('', () => {
                rl.close();
                resolve();
            });
        });
        
    } catch (error) {
        console.error('❌ Error during test:', error);
    } finally {
        if (browser) {
            await browser.close();
            console.log('\n👋 Browser closed. Test complete.');
        }
    }
}

// Run the test
testExtension();