/**
 * 预抓取 Vercel 常用页面词条脚本 (Playwright 版本)
 * 
 * 使用方法：
 * 1. 安装依赖: npm install playwright
 * 2. 安装浏览器: npx playwright install chromium
 * 3. 运行脚本: node scripts/prefetch_terms.js
 * 
 * 产物将写入 ../i18n/zh-cn.json
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PREFETCH_URLS = [
    'https://vercel.com/',
    'https://vercel.com/ai-gateway',
    'https://vercel.com/agent',
    'https://vercel.com/sandbox',
    'https://vercel.com/products/previews',
    'https://vercel.com/cdn',
    'https://vercel.com/fluid',
    'https://vercel.com/products/observability',
    'https://vercel.com/security/bot-management',
    'https://vercel.com/botid',
    'https://vercel.com/security',
    'https://vercel.com/security/web-application-firewall',
    'https://vercel.com/customers',
    'https://vercel.com/events',
    'https://vercel.com/academy',
    'https://vercel.com/kb',
    'https://vercel.com/frameworks/nextjs',
    'https://vercel.com/solutions/turborepo',
    'https://vercel.com/ai',
    'https://vercel.com/solutions/composable-commerce',
    'https://vercel.com/solutions/marketing-sites',
    'https://vercel.com/solutions/multi-tenant-saas',
    'https://vercel.com/solutions/web-apps',
    'https://vercel.com/marketplace',
    'https://vercel.com/templates',
    'https://vercel.com/partners/solution-partners',
    'https://vercel.com/solutions/platform-engineering',
    'https://vercel.com/solutions/design-engineering',
    'https://vercel.com/enterprise',
    'https://vercel.com/pricing',
    'https://vercel.com/login',
    'https://vercel.com/signup',
    'https://vercel.com/contact/sales',
];

const IGNORE_SELECTOR = [
    'pre',
    'code',
    'script',
    'style',
    'textarea',
    '[contenteditable="true"]',
    '.monaco-editor',
    '.shiki',
    '.geist-code',
    'noscript',
    'iframe',
    'svg',
].join(',');

const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

(async () => {
    const allTerms = new Set();
    console.log(`Starting prefetch for ${PREFETCH_URLS.length} URLs using Playwright...`);

    const browser = await chromium.launch({ headless: true }); // headless: true for speed
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    for (const url of PREFETCH_URLS) {
        try {
            console.log(`Fetching ${url}...`);
            const page = await context.newPage();
            
            // Go to page and wait for network idle to ensure dynamic content is loaded
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            try {
                await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
            } catch (e) {
                // Ignore networkidle timeout, continue processing
            }

            // Extract terms in browser context
            const terms = await page.evaluate(({ IGNORE_SELECTOR, ATTRS }) => {
                const result = new Set();
                
                function normalizeKey(text) {
                    return text.replace(/\xa0|[\s]+/g, ' ').trim();
                }

                function isExtractableHeadline(text) {
                    if (!text) return false;
                    const key = normalizeKey(text);
                    if (!key) return false;
                    if (key.length === 1) return false;
                    if (key.length > 300) return false; // Increased limit to 300 chars
                    if (!/[a-zA-Z]/.test(key)) return false;
                    if (/^[\u4e00-\u9fff]+$/.test(key)) return false;
                    if (/\d{3,}/.test(key)) return false; // Avoid pure numbers
                    // Allow simple punctuation but filter out code-like strings
                    if (/[{}=\\]/.test(key)) return false; 
                    if (key.includes('http://') || key.includes('https://') || key.includes('var(')) return false;
                    if (/^avatar for /i.test(key)) return false;
                    if (/logo$/i.test(key) || / logo$/i.test(key)) return false;
                    
                    const words = key.split(' ').filter(Boolean);
                    if (words.length > 50) return false; // Increased word count limit
                    
                    return true;
                }

                // 1. Traverse all elements to get direct text nodes
                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    {
                        acceptNode: (node) => {
                            if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
                            const parent = node.parentElement;
                            if (!parent) return NodeFilter.FILTER_REJECT;
                            
                            // Check ignore selectors
                            if (parent.closest && parent.closest(IGNORE_SELECTOR)) return NodeFilter.FILTER_REJECT;
                            
                            // Check visibility (simple check)
                            const style = window.getComputedStyle(parent);
                            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return NodeFilter.FILTER_REJECT;

                            return NodeFilter.FILTER_ACCEPT;
                        }
                    }
                );

                while (walker.nextNode()) {
                    const text = normalizeKey(walker.currentNode.textContent);
                    if (isExtractableHeadline(text)) {
                        result.add(text);
                    }
                }

                // 2. Extract attributes
                for (const attr of ATTRS) {
                    document.querySelectorAll(`[${attr}]`).forEach((el) => {
                        if (el.closest && el.closest(IGNORE_SELECTOR)) return;
                        const val = el.getAttribute(attr);
                        if (isExtractableHeadline(val)) result.add(normalizeKey(val));
                    });
                }

                return Array.from(result);
            }, { IGNORE_SELECTOR, ATTRS });

            console.log(`  Found ${terms.length} terms.`);
            terms.forEach(t => allTerms.add(t));
            await page.close();

        } catch (e) {
            console.error(`  Error processing ${url}: ${e.message}`);
        }
    }

    await browser.close();

    // Read existing file to preserve translations
    const outputPath = path.resolve(__dirname, '../i18n/zh-cn.json');
    let existingData = {};
    if (fs.existsSync(outputPath)) {
        try {
            existingData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
        } catch (e) {
            console.warn('  Could not parse existing zh-cn.json, starting fresh.');
        }
    }

    const result = {};
    const sortedTerms = Array.from(allTerms).sort((a, b) => a.localeCompare(b));
    
    let newCount = 0;
    sortedTerms.forEach(term => {
        if (existingData[term]) {
            result[term] = existingData[term];
        } else {
            result[term] = ""; // New term
            newCount++;
        }
    });

    // Also keep existing terms that were not found (optional, but safer to keep manual entries)
    // However, user said "remove all original entries" before, implying a clean slate preference for auto-generated ones.
    // But since I just translated them, I should keep them if they are valid.
    // Let's stick to "only keep what's found + what's already translated" or just "what's found".
    // User said "你给出的翻译词条严重不全", implying the list needs to be expanded.
    // I will merge: result contains all FOUND terms (with existing translation if available).
    // If an existing term is NOT found in this crawl, should I keep it?
    // Maybe it was from a page I didn't crawl or dynamic state I missed. 
    // SAFEST STRATEGY: Keep existing keys if they have translation, AND add new keys.
    
    Object.keys(existingData).forEach(key => {
        if (!result.hasOwnProperty(key) && existingData[key]) {
            result[key] = existingData[key];
        }
    });

    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`Updated ${outputPath}`);
    console.log(`Total terms: ${Object.keys(result).length} (New: ${newCount})`);
})();
