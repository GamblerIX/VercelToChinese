# UserScript 元数据字段

用户脚本通过脚本头部（`// ==UserScript==`）声明名称、匹配范围、加载方式等信息。以下字段在本仓库脚本中出现频率较高。

## 常用字段

- `@name`：脚本名称
- `@description`：脚本用途简介
- `@version`：版本号（影响自动更新）
- `@match`：脚本生效的 URL 匹配规则
- `@run-at`：注入时机（例如 `document-end`、`document-idle`）
- `@grant`：脚本权限声明（`none` 表示不需要额外 GM API）
- `@require`：在脚本执行前加载的外部依赖脚本（常用于外置词库）
- `@downloadURL` / `@updateURL`：脚本平台用于更新的地址（常见于 GreasyFork）
- `@license`：脚本声明的许可证信息

## 本仓库的用法示例

- `scripts/old1.user.js`：使用多个 `@match` 覆盖 `vercel.com`、`*.vercel.com` 与 `*.vercel.app/*`，并在 `document-end` 注入以尽早生效。
- `scripts/old2.user.js`：通过 `@require` 加载外部词库脚本，并在 `document-idle` 注入以降低与页面脚本的时序冲突。

