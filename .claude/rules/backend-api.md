---
description: 后端服务与 tRPC API 设计、错误处理、认证约定（apps/server + packages/api + packages/auth）
globs: "apps/server/**, packages/api/**, packages/auth/**"
---

# 后端 / API

技术栈：**Hono**（HTTP 服务）+ **tRPC**（类型安全 API）+ **better-auth**（认证）+ **zod**（校验）。运行时 Node（`tsx watch` 开发，`tsdown` 构建）。

## 结构

- `apps/server/src/index.ts`：Hono 应用入口，挂载 tRPC handler（`@hono/trpc-server`）与 better-auth 路由，配置 CORS（`env.CORS_ORIGIN`）。
- `packages/api`：tRPC 定义。`src/index.ts` 导出 `router` / `publicProcedure` / `protectedProcedure`；`src/context.ts` 构造请求上下文；`src/routers/` 放各业务 router。
- `packages/auth`：`createAuth()` 用 better-auth + `prismaAdapter`（postgresql），启用 `emailAndPassword`。

## tRPC 约定

- 新增接口在 `packages/api/src/routers/` 建 router，聚合进根 `router`。
- **每个 procedure 必须声明 `input` 的 zod schema**，输出类型由实现推断，供前端端到端复用。
- 需要登录的接口用 `protectedProcedure`（已内置 session 校验，无 session 抛 `UNAUTHORIZED`）；公开接口用 `publicProcedure`。
- 查询用 `.query()`，写操作用 `.mutation()`，语义不要混。

## 错误处理

- 抛 `TRPCError` 并带合适 `code`（`UNAUTHORIZED` / `BAD_REQUEST` / `NOT_FOUND` / `INTERNAL_SERVER_ERROR`）与 `message`。
- 不把内部实现细节/堆栈泄露给客户端；敏感错误记服务端日志即可。
- 业务校验失败优先早返回/抛错，避免深层嵌套。

## 认证

- 会话由 better-auth 管理，cookie 配置 `httpOnly + secure + sameSite:none`（跨域）。
- 鉴权判定一律在服务端（`ctx.session`），前端状态不可信。
- 认证相关改动集中在 `packages/auth`，不要在业务 router 里重复实现登录逻辑。

## 环境

- 服务端环境变量经 `@yy-workflow-aigc/env/server` 校验后使用，勿裸读 `process.env`。
