/**
 * 预抓取 Vercel 常用页面词条脚本
 * 
 * 使用方法：
 * 1. 安装依赖: npm install jsdom
 * 2. 运行脚本: node scripts/prefetch_terms.js
 * 
 * 产物将写入 ../i18n/zh-cn.json
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

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
].join(',');

const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

function normalizeKey(text) {
    return text.replace(/\xa0|[\s]+/g, ' ').trim();
}

function isExtractableHeadline(text) {
    if (!text) return false;
    const key = normalizeKey(text);
    if (!key) return false;
    if (key.length === 1) return false;
    if (key.length > 80) return false;
    if (!/[a-zA-Z]/.test(key)) return false;
    if (/^[\u4e00-\u9fff]+$/.test(key)) return false;
    if (/\d{3,}/.test(key)) return false;
    if (/[<>\[\]{}=\\]/.test(key)) return false;
    if (key.includes('http') || key.includes('@') || key.includes('var(') || key.includes('/')) return false;
    if (/^avatar for /i.test(key)) return false;
    if (/logo$/i.test(key) || / logo$/i.test(key)) return false;
    const words = key.split(' ').filter(Boolean);
    if (words.length > 8) return false;
    return true;
}

function extractTermsFromDocument(document) {
    const terms = new Set();
    const targetTags = ['h1', 'h2', 'label', 'button'];
    
    // Polyfill closest if needed (jsdom supports it but let's be safe)
    // Actually jsdom supports standard DOM API.

    for (const tag of targetTags) {
        document.querySelectorAll(tag).forEach((el) => {
            if (el.closest && el.closest(IGNORE_SELECTOR)) return;
            const text = normalizeKey(el.textContent || '');
            if (!isExtractableHeadline(text)) return;
            terms.add(text);
        });
    }

    for (const attr of ATTRS) {
        document.querySelectorAll(`[${attr}]`).forEach((el) => {
            if (el.closest && el.closest(IGNORE_SELECTOR)) return;
            const val = el.getAttribute(attr);
            if (!isExtractableHeadline(val)) return;
            terms.add(normalizeKey(val));
        });
    }

    return Array.from(terms);
}

(async () => {
    const allTerms = new Set();
    console.log(`Starting prefetch for ${PREFETCH_URLS.length} URLs...`);

    for (const url of PREFETCH_URLS) {
        try {
            console.log(`Fetching ${url}...`);
            const res = await fetch(url);
            if (!res.ok) {
                console.error(`  Failed to fetch ${url}: ${res.status} ${res.statusText}`);
                continue;
            }
            const html = await res.text();
            const dom = new JSDOM(html);
            const terms = extractTermsFromDocument(dom.window.document);
            console.log(`  Found ${terms.length} terms.`);
            terms.forEach(t => allTerms.add(t));
        } catch (e) {
            console.error(`  Error processing ${url}: ${e.message}`);
        }
    }

    const result = {};
    const sortedTerms = Array.from(allTerms).sort((a, b) => a.localeCompare(b));
    
    sortedTerms.forEach(term => {
        result[term] = "";
    });

    const outputPath = path.resolve(__dirname, '../i18n/zh-cn.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`Written ${sortedTerms.length} terms to ${outputPath}`);
})();
