const puppeteer = require('puppeteer');

async function testExtension() {
    console.log('Testing Claude Conversation Archiver Chrome Extension...\n');
    
    const extensionPath = '/Users/ahmedmaged/ai_storage/projects/claude-conversation-archiver';
    
    try {
        // Launch Chrome with simpler config
        const browser = await puppeteer.launch({
            headless: false,
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`
            ],
            ignoreDefaultArgs: ['--disable-extensions'],
            timeout: 60000 // 60 second timeout
        });
        
        console.log('✓ Chrome launched successfully');
        
        // Give it some time to initialize
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Create a new page
        const page = await browser.newPage();
        console.log('✓ New page created');
        
        // Navigate to Claude.ai
        await page.goto('https://claude.ai', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        console.log('✓ Navigated to claude.ai');
        
        // Wait for the page to fully load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Take a screenshot
        await page.screenshot({ path: '/tmp/claude-test.png' });
        console.log('✓ Screenshot saved to /tmp/claude-test.png');
        
        // Check console messages
        page.on('console', msg => {
            console.log(`Console [${msg.type()}]: ${msg.text()}`);
        });
        
        // Try to check if content script loaded
        const scriptLoaded = await page.evaluate(() => {
            return {
                url: window.location.href,
                title: document.title,
                hasBody: !!document.body
            };
        });
        
        console.log('\nPage info:', scriptLoaded);
        
        // Get browser targets to find extension
        const targets = await browser.targets();
        console.log('\nBrowser targets:');
        targets.forEach(target => {
            console.log(`- ${target.type()}: ${target.url()}`);
        });
        
        console.log('\nTest completed. Browser will remain open.');
        console.log('Press Ctrl+C to exit.');
        
        // Keep browser open
        await new Promise(() => {});
        
    } catch (error) {
        console.error('Error during test:', error);
    }
}

testExtension();