---
description: 密钥处理、环境变量、输入校验等安全禁止事项
globs: "**/*.{ts,tsx}"
---

# 安全

## 密钥与环境变量

- **禁止硬编码**任何密钥、token、连接串。所有敏感值走环境变量。
- 环境变量必须经 `@yy-workflow-aigc/env` 校验后使用（基于 `@t3-oss/env-core` + zod）：
  - 服务端：`packages/env/src/server.ts` — `DATABASE_URL`、`BETTER_AUTH_SECRET`（≥32 位）、`BETTER_AUTH_URL`、`CORS_ORIGIN`、`NODE_ENV`。
  - 前端：`packages/env/src/web.ts` — 仅 `VITE_` 前缀变量可暴露给浏览器（当前 `VITE_SERVER_URL`）。
- 严禁把非 `VITE_` 前缀的服务端密钥引入 `apps/web` 打包产物。
- 新增环境变量：先在对应 env schema 声明，再在代码中引用，不要直接读 `process.env`。

## 文件与 Git

- `.env`、`.env*.local` 已在根 `.gitignore` 忽略（现存 `apps/web/.env`、`apps/server/.env` 不得入库）。
- 不要提交 `coverage/`、构建产物、`*.tsbuildinfo`、Prisma 生成物。
- 提交前检查 diff 是否误带密钥。

## 认证（better-auth）

- 认证逻辑集中在 `packages/auth`，前端只经 `apps/web/src/lib/auth-client.ts` 调用，不要绕过。
- `BETTER_AUTH_SECRET` 必须 ≥32 位且仅存在于服务端环境。
- 会话/鉴权判断以服务端为准，前端状态仅用于 UI。

## 输入与输出

- 所有外部输入（表单、API 入参）用 zod 校验后再使用；tRPC procedure 必须声明 input schema。
- 前端渲染避免 `dangerouslySetInnerHTML`；`target="_blank"` 链接加 `rel="noopener"`。
- 不使用 `eval()`，不直接写 `document.cookie`。
