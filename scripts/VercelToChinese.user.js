// ==UserScript==
// @name         Vercel 汉化脚本 - 中文化界面
// @namespace    https://github.com/GamblerIX/VercelToChinese
// @version      1.3.0
// @description  将 Vercel 界面翻译为中文。
// @author       GamblerIX
// @match        *://vercel.com/*
// @match        *://*.vercel.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=vercel.com
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @run-at       document-idle
// @license      AGPL-3.0
// @downloadURL  https://raw.githubusercontent.com/GamblerIX/VercelToChinese/main/scripts/VercelToChinese.user.js
// @updateURL    https://raw.githubusercontent.com/GamblerIX/VercelToChinese/main/scripts/VercelToChinese.user.js
// ==/UserScript==

(function () {
    'use strict';

    if (window.__VERCEL_TO_CHINESE_LOADED__) return;
    window.__VERCEL_TO_CHINESE_LOADED__ = true;

    const DEFAULT_DICT_URLS = [
        'https://raw.githubusercontent.com/GamblerIX/VercelToChinese/main/i18n/zh-cn.json',
    ];

    const IGNORE_TAGS = new Set([
        'STYLE',
        'SCRIPT',
        'TEXTAREA',
        'CODE',
        'PRE',
        'INPUT',
        'SVG',
        'PATH',
        'NOSCRIPT',
        'META',
        'LINK',
    ]);

    const IGNORE_SELECTOR = [
        'pre',
        'code',
        'script',
        'style',
        'textarea',
        'input',
        '[contenteditable="true"]',
        '.monaco-editor',
        '.shiki',
        '.geist-code',
    ].join(',');

    const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

    const REGEX_RULES = [
        { re: /^Created\s+(.+)\s+ago$/, to: '创建于 $1 前' },
        { re: /^Updated\s+(.+)\s+ago$/, to: '更新于 $1 前' },
        { re: /^Updated\s+just now$/, to: '刚刚更新' },
        { re: /^([0-9]+)m\s+([0-9]+)s$/, to: '$1分 $2秒' },
        { re: /^([0-9]+)s$/, to: '$1秒' },
        { re: /^([0-9]+)h$/, to: '$1小时' },
    ];

    function isPlainObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function gmGetText(url) {
        return new Promise((resolve, reject) => {
            const gm = typeof GM !== 'undefined' && GM && typeof GM.xmlHttpRequest === 'function' ? GM : null;
            if (gm) {
                gm.xmlHttpRequest({
                    method: 'GET',
                    url,
                    onload: (res) => resolve(res.responseText),
                    onerror: (err) => reject(err),
                    ontimeout: () => reject(new Error('timeout')),
                });
                return;
            }

            if (typeof GM_xmlhttpRequest === 'function') {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url,
                    onload: (res) => resolve(res.responseText),
                    onerror: (err) => reject(err),
                    ontimeout: () => reject(new Error('timeout')),
                });
                return;
            }

            fetch(url)
                .then((r) => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r.text();
                })
                .then(resolve)
                .catch(reject);
        });
    }

    async function loadDictObject() {
        if (isPlainObject(window.VERCEL_I18N_DATA) && Object.keys(window.VERCEL_I18N_DATA).length > 0) {
            return window.VERCEL_I18N_DATA;
        }

        for (const url of DEFAULT_DICT_URLS) {
            try {
                const raw = await gmGetText(url);
                const data = JSON.parse(raw);
                if (isPlainObject(data)) return data;
            } catch {
            }
        }

        return {};
    }

    function shouldSkipText(text) {
        if (!text) return true;
        if (/^[\s0-9]*$/.test(text)) return true;

        const trimmed = text.trim();
        if (!trimmed) return true;
        if (/^[\u4e00-\u9fff]+$/.test(trimmed)) return true;
        if (!/[a-zA-Z]/.test(trimmed)) return true;

        return false;
    }

    function normalizeKey(text) {
        return text.replace(/\xa0|[\s]+/g, ' ').trim();
    }

    const MISS = Symbol('miss');
    const translationCache = new Map();
    const MAX_CACHE_SIZE = 2000;

    function cacheSet(key, value) {
        if (translationCache.size >= MAX_CACHE_SIZE) {
            const firstKey = translationCache.keys().next().value;
            translationCache.delete(firstKey);
        }
        translationCache.set(key, value);
    }

    function translateText(text, dict) {
        if (shouldSkipText(text)) return null;

        const trimmed = text.trim();
        const key = normalizeKey(trimmed);
        if (!key || key.length > 300) return null;

        if (translationCache.has(key)) {
            const cached = translationCache.get(key);
            if (cached === MISS) return null;
            return text.replace(trimmed, cached);
        }

        let translated = dict.get(key);
        if (translated === undefined && (key.includes(' ') || /\d/.test(key))) {
            for (const rule of REGEX_RULES) {
                if (rule.re.test(key)) {
                    translated = key.replace(rule.re, rule.to);
                    break;
                }
            }
        }

        if (translated === undefined) {
            cacheSet(key, MISS);
            return null;
        }

        if (typeof translated !== 'string') {
            cacheSet(key, MISS);
            return null;
        }

        cacheSet(key, translated);
        return text.replace(trimmed, translated);
    }

    function isInIgnoredArea(node) {
        const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        if (!el) return false;
        if (typeof el.closest !== 'function') return false;
        return !!el.closest(IGNORE_SELECTOR);
    }

    function processNode(node, dict) {
        if (!node) return;

        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node;
            if (IGNORE_TAGS.has(el.tagName) || el.isContentEditable) return;
            if (el.matches && el.matches(IGNORE_SELECTOR)) return;

            for (const attr of ATTRS) {
                if (!el.hasAttribute(attr)) continue;
                const val = el.getAttribute(attr);
                const translated = translateText(val, dict);
                if (translated !== null) el.setAttribute(attr, translated);
            }
            return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            if (isInIgnoredArea(node)) return;
            const val = node.nodeValue;
            const translated = translateText(val, dict);
            if (translated !== null) node.nodeValue = translated;
        }
    }

    const nodeQueue = [];
    const queued = new WeakSet();
    let isProcessing = false;

    function enqueue(node) {
        if (!node) return;
        if (queued.has(node)) return;
        queued.add(node);
        nodeQueue.push(node);
    }

    function scheduleProcessing(dict) {
        if (isProcessing) return;
        if (nodeQueue.length === 0) return;

        isProcessing = true;

        const requestIdle =
            window.requestIdleCallback ||
            ((cb) => setTimeout(() => cb({ timeRemaining: () => 1 }), 1));

        requestIdle(
            (deadline) => {
                while (nodeQueue.length > 0 && deadline.timeRemaining() > 0.5) {
                    const node = nodeQueue.shift();
                    if (!node) continue;
                    if (node !== document.body && !node.isConnected) continue;

                    processNode(node, dict);

                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const el = node;
                        if (!IGNORE_TAGS.has(el.tagName) && !el.isContentEditable && !isInIgnoredArea(el)) {
                            let child = el.firstChild;
                            while (child) {
                                enqueue(child);
                                child = child.nextSibling;
                            }
                        }
                    }
                }

                isProcessing = false;
                if (nodeQueue.length > 0) scheduleProcessing(dict);
            },
            { timeout: 2000 }
        );
    }

    function initObserver(dict) {
        const observer = new MutationObserver((mutations) => {
            let hasChanges = false;

            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) enqueue(node);
                    hasChanges = hasChanges || mutation.addedNodes.length > 0;
                    continue;
                }

                if (mutation.type === 'characterData') {
                    enqueue(mutation.target);
                    hasChanges = true;
                    continue;
                }

                if (mutation.type === 'attributes') {
                    enqueue(mutation.target);
                    hasChanges = true;
                }
            }

            if (hasChanges) scheduleProcessing(dict);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
            attributeFilter: ATTRS,
        });
    }

    function init(dict) {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
            null
        );
        let node;
        while ((node = walker.nextNode())) enqueue(node);
        scheduleProcessing(dict);
        initObserver(dict);
    }

    async function main() {
        if (!document.body) return;

        const dictObj = await loadDictObject();
        if (!isPlainObject(dictObj) || Object.keys(dictObj).length === 0) {
            console.error('[VercelToChinese] 词库为空，未执行翻译。');
            return;
        }

        const dict = new Map(Object.entries(dictObj));
        init(dict);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(main, 0);
        });
    } else {
        setTimeout(main, 0);
    }
})();
