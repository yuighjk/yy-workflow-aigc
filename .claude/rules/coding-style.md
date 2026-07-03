---
description: 命名/缩进/import/注释规范，基于 Biome + Ultracite 实际配置推断
globs: "**/*.{ts,tsx,js,jsx,css}"
---

# 代码风格

本项目用 **Biome（Ultracite preset）** 统一格式化与 lint，配置见根目录 `biome.json`（`extends: ultracite/biome/core, ultracite/biome/react`）。规则以工具为准，人手勿与之对抗。

## 格式化（由 biome.json 固化，勿手改）

- **缩进**：Tab（`formatter.indentStyle: "tab"`），不是空格。
- **引号**：JS/TS 用双引号（`javascript.formatter.quoteStyle: "double"`）。
- **import 排序**：保存时自动整理（`assist.actions.source.organizeImports: "on"`），不要手动排。
- **Tailwind 类名排序**：`nursery.useSortedClasses` 开启，`clsx` / `cva` / `cn` 中的类名会被自动排序。
- **CSS**：启用 Tailwind 指令解析（`@tailwind` / `@apply` 合法）。

## 命名

- 变量/函数：`camelCase`；类型/接口/组件：`PascalCase`；常量枚举值：`PascalCase` 或 `UPPER_SNAKE`。
- 文件名：`kebab-case.ts`（参考 `sign-in-form.tsx`、`auth-client.ts`、`theme-provider.tsx`）。
- React 组件文件与默认导出组件同名（PascalCase 组件，kebab-case 文件）。

## 语言约定（Ultracite 强约束，节选自 CLAUDE.md）

- `const` 优先，需要重新赋值才用 `let`，禁止 `var`。
- 用 `unknown` 而非 `any`；不可变字面量用 `as const`。
- 优先可选链 `?.` 与空值合并 `??`；模板字符串而非拼接；解构赋值。
- 优先 `for...of`，少用 `.forEach()` / 索引 `for`。
- `noParameterAssign`、`noInferrableTypes`、`noUselessElse`、`useSelfClosingElements` 等为 `error`，写代码时直接规避。
- 抛错抛 `Error` 对象并带描述信息，不要抛字符串。
- 生产代码移除 `console.log` / `debugger` / `alert`。

## 注释

- 优先自解释代码；仅为复杂业务逻辑/非显而易见的决策写注释。
- 注释密度、风格向周边既有代码看齐。

## 提交前

- 运行 `pnpm fix`（= `ultracite fix`）自动修复；`pnpm check` 校验。
- 项目已配置 PostToolUse hook，在 Write/Edit 后自动跑 `pnpm run fix`，但仍以提交前手动校验为准。
