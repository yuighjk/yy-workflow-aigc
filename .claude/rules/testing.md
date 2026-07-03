---
description: 测试约定与覆盖率要求
globs: "**/*.{test,spec}.{ts,tsx}"
---

# 测试

> ⚠️ 现状：仓库当前**尚未安装任何测试框架**（package.json 中无 vitest/jest/playwright），也无 `test` 脚本。以下为推荐约定，落地前需先安装依赖并补 `turbo` 任务。

## 推荐技术选型

- **单元/组件测试**：Vitest（与 Vite/ESM/TS 生态一致）+ `@testing-library/react`（测 `apps/web` 组件）。
- **E2E / 可视化回归**：Playwright（覆盖 `/login`、`/register` 等关键流程）。
- **API/tRPC**：对 `packages/api` 的 procedure 直接单测；对 `apps/server` 可用 Hono 的 `app.request()` 做集成测试。

## 文件与命名

- 测试文件与被测文件同目录或就近 `__tests__/`，命名 `*.test.ts` / `*.test.tsx`。
- E2E 用例集中放 `apps/web/e2e/` 或各 app 的 `e2e/`。

## 编写规范（与 CLAUDE.md 一致）

- 断言写在 `it()` / `test()` 内。
- 异步测试用 `async/await`，不要用 done 回调。
- 禁止提交 `.only` / `.skip`。
- `describe` 嵌套保持扁平。

## 覆盖率

- 关键业务逻辑（表单校验、错误处理、tRPC procedure）应有测试。
- 建议核心包（`packages/api`、`packages/auth`）行覆盖率 ≥ 70%，UI 交互以关键路径 E2E 兜底。

## 运行（安装后）

- 单测：`pnpm turbo run test`
- E2E：各 app 内 `pnpm exec playwright test`
