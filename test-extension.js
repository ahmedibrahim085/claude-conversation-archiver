const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Extension path
const extensionPath = '/Users/ahmedmaged/ai_storage/projects/claude-conversation-archiver';

async function testExtension() {
    console.log('Testing Claude Conversation Archiver Chrome Extension...\n');

    // Launch Chrome with extension loaded
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
        defaultViewport: null
    });

    console.log('✓ Chrome launched with extension');

    // Get the extension ID by checking chrome://extensions
    const page = await browser.newPage();

    // First, let's check if the extension loaded properly by going to chrome://extensions
    await page.goto('chrome://extensions/', { waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);

    console.log('✓ Navigated to chrome://extensions to verify extension is loaded');

    // Take screenshot of extensions page
    await page.screenshot({ 
        path: '/tmp/extensions-page.png',
        fullPage: true 
    });
    console.log('✓ Screenshot saved: /tmp/extensions-page.png');

    // Now navigate to Claude.ai
    const claudePage = await browser.newPage();
    
    // Set up console message listener BEFORE navigating
    claudePage.on('console', msg => {
        console.log(`[Content Script Console]: ${msg.text()}`);
    });
    
    claudePage.on('pageerror', error => {
        console.log(`[Page Error]: ${error.message}`);
    });

    await claudePage.goto('https://claude.ai', { waitUntil: 'networkidle0' });
    console.log('✓ Navigated to claude.ai');

    // Wait a bit for content script to load
    await claudePage.waitForTimeout(3000);

    // Check if content script is injected by evaluating a test
    try {
        const contentScriptCheck = await claudePage.evaluate(() => {
            // Check if our content script added anything to the page
            return {
                hasContentScript: typeof window.__claudeArchiverLoaded !== 'undefined',
                bodyClasses: document.body.className,
                url: window.location.href,
                // Check for any global variables our script might set
                hasArchiverData: typeof window.claudeArchiver !== 'undefined'
            };
        });
        console.log('\nContent script check:', contentScriptCheck);
    } catch (error) {
        console.log('Error checking content script:', error.message);
    }

    // Take screenshot of Claude page
    await claudePage.screenshot({ 
        path: '/tmp/claude-page.png',
        fullPage: false 
    });
    console.log('✓ Screenshot saved: /tmp/claude-page.png');

    // Get all pages (tabs) to find the extension ID
    const pages = await browser.pages();
    console.log(`\nTotal pages open: ${pages.length}`);

    // Try to find extension ID from manifest
    const targets = await browser.targets();
    const extensionTarget = targets.find(target => target.type() === 'service_worker' || target.type() === 'background_page');

    if (extensionTarget) {
        const extensionUrl = extensionTarget.url();
        const extensionId = extensionUrl.split('/')[2];
        console.log(`\n✓ Found extension ID: ${extensionId}`);
        
        // Try to open the popup
        const popupUrl = `chrome-extension://${extensionId}/popup.html`;
        console.log(`\nTrying to open popup at: ${popupUrl}`);
        
        const popupPage = await browser.newPage();
        try {
            await popupPage.goto(popupUrl, { waitUntil: 'networkidle0' });
            console.log('✓ Popup page opened successfully');
            
            // Wait for popup to load
            await popupPage.waitForTimeout(2000);
            
            // Take screenshot of popup
            await popupPage.screenshot({ 
                path: '/tmp/popup-page.png',
                fullPage: true 
            });
            console.log('✓ Screenshot saved: /tmp/popup-page.png');
            
            // Get popup content
            const popupContent = await popupPage.evaluate(() => {
                return {
                    title: document.title,
                    hasStats: !!document.querySelector('.stats-grid'),
                    statsText: document.querySelector('.stats-grid')?.innerText,
                    buttonCount: document.querySelectorAll('button').length,
                    buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent)
                };
            });
            console.log('\nPopup content check:', popupContent);
            
        } catch (error) {
            console.log('Error opening popup:', error.message);
        }
    } else {
        console.log('\n⚠️  Could not find extension service worker. Extension may not be loaded properly.');
        
        // Let's check all targets to debug
        console.log('\nAll browser targets:');
        targets.forEach(target => {
            console.log(`- Type: ${target.type()}, URL: ${target.url()}`);
        });
    }

    // Try to trigger the extension by simulating user action
    console.log('\nAttempting to trigger extension action...');
    try {
        // Click on the page to ensure it's active
        await claudePage.click('body');
        await claudePage.waitForTimeout(1000);
    } catch (error) {
        console.log('Error clicking page:', error.message);
    }

    console.log('\n=== Test Summary ===');
    console.log('1. Chrome launched: ✓');
    console.log('2. Extension loaded: ' + (extensionTarget ? '✓' : '✗'));
    console.log('3. Claude.ai loaded: ✓');
    console.log('4. Content script: Check console messages above');
    console.log('5. Popup accessible: ' + (extensionTarget ? 'Check /tmp/popup-page.png' : '✗'));
    console.log('\nScreenshots saved to:');
    console.log('- /tmp/extensions-page.png');
    console.log('- /tmp/claude-page.png');
    if (extensionTarget) {
        console.log('- /tmp/popup-page.png');
    }

    console.log('\nBrowser will remain open for manual inspection...');
    console.log('Press Ctrl+C to close when done.');

    // Keep browser open
    await new Promise(() => {});
}

// Run the test
testExtension().catch(console.error);