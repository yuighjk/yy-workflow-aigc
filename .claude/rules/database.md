---
description: 数据库 schema、migration、Prisma Client 使用约定（packages/db）
globs: "packages/db/**"
---

# 数据库

ORM：**Prisma 7**，数据库 **PostgreSQL**，驱动适配 `@prisma/adapter-pg`（`PrismaPg`）。所有 DB 访问集中在 `@yy-workflow-aigc/db`。

## 结构

- `packages/db/prisma.config.ts`：Prisma 配置，schema 目录 `prisma/schema/`，migration 目录 `prisma/migrations/`，从 `apps/server/.env` 读 `DATABASE_URL`。
- `prisma/schema/`：**多文件 schema** — `schema.prisma`（datasource/generator 与业务模型）、`auth.prisma`（better-auth 相关表）。新模型按领域分文件放这里。
- `prisma/generated/client`：生成的 Client（勿手改、勿入库）。
- `src/index.ts`：导出 `createPrismaClient()`（用 PrismaPg adapter）与默认单例 `prisma`。

## Client 使用

- 业务代码经 `@yy-workflow-aigc/db` 导入，不要各处 `new PrismaClient()`。
- 认证侧由 `packages/auth` 通过 `createPrismaClient()` 注入 `prismaAdapter`。

## Schema 与 Migration

- 改模型 → 编辑 `prisma/schema/*.prisma` → `pnpm db:generate` 重新生成 Client → `pnpm db:migrate`（开发用 `prisma migrate dev`）建迁移。
- 快速原型可用 `pnpm db:push`（不生成迁移文件），但**共享/生产环境一律走 migration**，不要用 push 覆盖。
- migration 一旦提交不可改写；需变更就新增迁移。
- `pnpm db:studio` 起 Prisma Studio 查看数据。

## 约定

- 命名：model 用 `PascalCase`，字段 `camelCase`；显式主键与必要索引。
- 时间戳字段用 `DateTime`（`@default(now())` / `@updatedAt`）。
- 迁移与 schema 变更需评估对 better-auth 既有表的兼容性（改动 `auth.prisma` 尤其谨慎）。
- 命令统一从根目录跑（`pnpm db:*` 已用 `-F @yy-workflow-aigc/db` 定向）。
