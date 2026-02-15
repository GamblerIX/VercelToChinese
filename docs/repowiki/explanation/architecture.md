# 实现原理

本项目的核心目标是：在不修改服务端、不侵入 Vercel 前端代码的前提下，对页面中出现的英文文案做“就地替换”为中文。

## 翻译流水线

典型流程如下：

1. 从 DOM 中读取文本（文本节点 `nodeValue`，以及常见可见属性如 `placeholder`、`title`、`aria-label`、`alt`）。
2. 将英文字符串映射到中文：
   - 精确字典匹配优先
   - 仅对少量动态文本使用正则规则（例如时间、提示句）
3. 将翻译结果写回 DOM，后续页面渲染继续保持可交互。

## old1.user.js：增量扫描 + 空闲切片

`scripts/old1.user.js` 主要由三部分组成：

- 词库：`I18N`（静态映射）
- 规则：`REGEX_RULES`（动态文本替换）
- 引擎：队列化处理 + `requestIdleCallback` 分片执行 + 缓存

引擎的关键点：

- 初始遍历：用 `TreeWalker` 扫描 `document.body` 的元素与文本节点，推入队列。
- 增量监听：用 `MutationObserver` 监听新增节点与属性/文本变化，把目标推入队列。
- 分片执行：用 `requestIdleCallback`（或降级实现）在浏览器空闲时处理队列，避免一次性遍历导致卡顿。
- 跳过策略：对 `SCRIPT/STYLE/CODE/PRE/INPUT` 等标签与可编辑区域直接跳过，减少误翻与副作用。
- 缓存策略：对 key 的翻译结果做 `Map` 缓存，并显式缓存“空字符串译文”与“无匹配”结果，减少重复计算。

## old2.user.js：逻辑与词库分离

`scripts/old2.user.js` 的特征是：

- 词库通过 `@require` 外部加载，并挂载在 `window.VERCEL_I18N_DATA`。
- 处理方式更直接：对新增节点递归遍历翻译；并对 `placeholder` 与 `aria-label` 做属性翻译。
- 通过延迟启动避免框架水合阶段的潜在冲突，同时等待外部词库加载完成。

