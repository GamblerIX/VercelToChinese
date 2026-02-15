# 安装与启用

本项目以用户脚本（UserScript）的形式运行。推荐使用 Tampermonkey 或 Violentmonkey。

## 选择脚本

仓库当前包含两份历史脚本变体：

- `scripts/old1.user.js`：词库内置、包含增量扫描与缓存优化，匹配范围覆盖 `vercel.com`、`*.vercel.com` 与 `*.vercel.app/*`。
- `scripts/old2.user.js`：逻辑与词库分离，通过 `@require` 加载外部词库脚本，匹配范围覆盖 `vercel.com` 与 `*.vercel.com`。

如果你不希望依赖外部词库加载，优先尝试 `old1.user.js`；如果你希望“词库独立更新、脚本逻辑保持稳定”，优先尝试 `old2.user.js`。

## 安装步骤

1. 安装浏览器扩展
   - Chrome/Edge：Tampermonkey 或 Violentmonkey
   - Firefox：Violentmonkey（或 Greasemonkey）
2. 打开要安装的脚本文件
   - `scripts/old1.user.js`
   - `scripts/old2.user.js`
3. 由扩展提示安装后，访问 `https://vercel.com/` 或 `https://<team>.vercel.com/` 验证是否生效。

## 生效范围说明

- `old1.user.js` 额外包含 `*://*.vercel.app/*`，可能会对部署在 `vercel.app` 域名下的非 Vercel 控制台站点造成误翻译。
- `old2.user.js` 不包含 `vercel.app` 域名匹配，范围更保守。

## 常见现象

- 初次打开页面短时间内逐步翻译：属于正常现象，脚本会监听 DOM 变化并增量处理。
- `old2.user.js` 需要等待约 2.5 秒：用于避开框架水合阶段的潜在冲突，并等待外部词库加载。

