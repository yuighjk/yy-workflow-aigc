# github-profile-go — 需求规格

## 概述

在现有 `yy-workflow-aigc`（Hono + tRPC + Prisma/Aurora）基础上，**不改动原有业务**，新增一条独立的 **Go 微服务链路**：用 Go 连接现有 Aurora（Postgres），迁移一部分现有 Node 端 GitHub 抓取/落库逻辑，并新增「根据用户名生成个人简介」的接口与前端页面；随后把该 Go 服务容器化上云（ECR + ECS/Fargate + 内网 ALB + Cloud Map + Lambda BFF），最终用 CodeBuild + IAM + Cloudflare 搭一套「按 PR 的独立预览环境」。

> 本作业是**一个整体、分三个步骤（Phase 1 → 2 → 3）**，不是三个独立作业。参考实现：[Adophlidu/aws-learning](https://github.com/Adophlidu/aws-learning)（架构照搬，DB 由 MySQL 换成本项目现有的 Postgres/Aurora）。

## 项目信息

- 项目名: yy-workflow-aigc
- 架构类型: monorepo（Turborepo + pnpm workspaces，全栈 TS）+ 新增顶层 `services/`（Go，不入 pnpm workspace）
- 涉及层：新增 Go 服务（`services/profile-go`）、新增 Lambda BFF、前端新增页面（`apps/web`）、基础设施（AWS CDK v2）、CI/CD（CodeBuild）
- **不动**：现有 Hono/tRPC 后端、`packages/api` 的 `github` router、better-auth、现有 SAM/Lambda 部署

## 需求版本

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-07-14 | v1 | 初始需求（一体作业，三步） |

## 用户故事

- 作为学习者，我希望用 Go 重写一部分现有 Node 的 GitHub 抓取/落库逻辑，以便掌握 Go 连数据库与服务化。
- 作为用户，我希望输入一个 GitHub 用户名，页面能返回并展示一段自动生成的中文个人简介。
- 作为架构学习者，我希望把 Go 服务容器化并经 ECR/ECS/Fargate/内网 ALB/Cloud Map 跑起来，Lambda BFF 作为对外编排入口。
- 作为团队协作者，我希望每个 PR 自动起一套独立预览环境（前端 Cloudflare + 后端 CodeBuild 部署），PR 合并/关闭后自动清理。

## 决策（已拍板）

| 项 | 决策 |
| ---- | ---- |
| 数据库 | **沿用现有 Postgres/Aurora**，不引入 MySQL；Go 只读写现有 `github_account` 表，不建表 |
| 老业务 | 现有 Hono/tRPC/Prisma 链路**零改动**，Go 是并行新增链路 |
| BFF | **方案 A**：新增轻量 Lambda BFF 站在 API Gateway 与内网 ALB 之间（纯编排转发），练「Lambda 在私网、只调内网」 |
| Go 位置 | 顶层新目录 `services/profile-go/`（独立于 pnpm workspace） |
| CI 工具 | 按作业要求用 **CodeBuild**（参考项目实际用 GitHub Actions + Terraform，此处换工具练习） |
| IaC | **AWS CDK v2 + TypeScript**；Phase 2 引用现有 SAM Stack 的网络，不重复创建线上资源 |
| PR 级 DB 隔离 | **共享一个 dev 库 + 仅迁移校验（validate/dry-run）**，PR 环境不真改共享库（最省、最安全） |

## 功能需求

### Phase 1 — Go 连库 + 迁移逻辑 + 生成简介（本地跑通）

1. [F-101] 新建 Go 服务 `services/profile-go`：HTTP server、配置加载（读环境变量 DB 连接串）、优雅启动。
2. [F-102] Go 用 `pgx` 连接现有 Aurora（Postgres），带 RDS CA 的 TLS；读写现有 `github_account` 表（真实列名 `github_id`/`avatar_url`/`html_url`/`public_repos` 等）。
3. [F-103] 迁移现有 Node 逻辑（来自 `packages/api/src/routers/github.ts`）：
   - `GET /profile/list`：等价 `github.list`（查全部 profile，最新在前）。
   - `POST /profile/fetch`：等价 `github.fetchAndSave`（用传入 PAT 调 GitHub `/user`，抽字段，按 `github_id` upsert；token 不落库）。
4. [F-104] **新增**「生成个人简介」接口 `GET /profile/bio?login={login}`：按用户名查库，用模板拼接生成一段中文个人简介并返回（含名字、公开仓库数、原始 bio 等）。
5. [F-105] 前端新增页面/区块：输入 GitHub 用户名 → 调 `/profile/bio` → 展示生成的简介；沿用 `@yy-workflow-aigc/ui` 组件与现有 `github.tsx` 风格。
6. [F-106] Go 服务含单元测试（至少覆盖 mapper：GitHub 响应 → profile 字段，与简介模板拼接）。

### Phase 2 — 容器化上云（ECR + ECS/Fargate + 内网 ALB + Cloud Map + BFF）

7. [F-201] Go 服务 Dockerfile（多阶段构建，产出精简镜像）+ 本地 `compose` 起服务。
8. [F-202] CDK：通过 CloudFormation Exports 引用现有 SAM Stack 的 VPC、两个私有子网和 Aurora SG；不重复创建 NAT、子网、Lambda 或跳板机。
9. [F-203] CDK：ECR 仓库；ECS 集群 + Fargate 服务跑 Go 容器；任务从 Secrets Manager 注入 DB 凭证。
10. [F-204] CDK：**内网 ALB**，按路径 `/profile/*` 路由到 Go 服务目标组（南北向：BFF → Go）。
11. [F-205] CDK：Cloud Map 私有命名空间，用于**服务间东西向发现**（单服务时预留，多服务时启用）。
12. [F-206] 新增 **Lambda BFF**（方案 A）：API Gateway(HTTP) → Lambda BFF（私网、只调内网 ALB、免 NAT）→ Go 服务。
13. [F-207] Go 服务经 NAT 出网抓 GitHub；Aurora 私网无公网。

### Phase 3 — 按 PR 的独立环境（Cloudflare + CodeBuild + IAM）

14. [F-301] **Cloudflare**：每个 PR 一个预览前端（PR preview URL），指向共享 test 后端。
15. [F-302] **CodeBuild**（配 VPC，跑在内网）：`buildspec` 完成 分支/DB 守卫 → docker build Go → 推 ECR(`:pr-N`) → 有迁移则在 VPC 内对共享 dev 库做**迁移校验（不真改）** → 起/更新该 PR 的 ECS 服务。
16. [F-303] **IAM**：给 CodeBuild 的最小权限角色（ECR push、ECS 部署、进 VPC 的 ENI 权限、读 Secrets）。
17. [F-304] PR 合并/关闭 → 自动销毁该 PR 的 ECS/target group/ALB 规则与前端预览。

## 非功能需求

- 安全：DB 密码进 Secrets Manager，容器启动注入；GitHub PAT 用完即弃、不入库、不记日志；Aurora 私网无公网；遵循 `.claude/rules/security.md`。
- 成本：NAT + ALB + RDS + Fargate 均按小时计费；**验证完即 `terraform destroy`**，只开一套环境，建议配 AWS Budgets 1 美元告警。
- 环境隔离：稳定共享资源与服务资源拆成两个 CDK Stack；Phase 3 再增加 `pr-*` 临时 Stack。
- 可观测：容器日志进 CloudWatch Logs。

## 明确的非目标 / 纠错

- ❌ **不**把现有 Hono/TS 后端改写成 Go —— Go 是新增的并行服务。
- ❌ 作业原文「用 Cloud Map 链接 lambda 接口」表述**有误**：南北向 Lambda BFF → Go 走**内网 ALB 按路径**；**Cloud Map 只做服务间（Go↔Go）东西向发现**，Lambda 不经 Cloud Map 调服务。单个 Go 服务时 Cloud Map 实际用不上，仅为演示/预留。
- ❌ 不引入 MySQL；不让 SAM 与 CDK 同时拥有同一个 AWS 资源。
- ❌ PR 预览环境不对共享库执行破坏性迁移（只校验）。

## 验收标准

- [AC-1] Phase 1：本地 `go run` 起服务，前端输入用户名可返回并展示中文简介；`go test ./...` 通过。
- [AC-2] Phase 2：`cdk deploy` 后，经 API Gateway → BFF → 内网 ALB → Fargate(Go) → Aurora 全链路可访问；Go 能经现有 NAT 抓 GitHub。
- [AC-3] Phase 3：开一个 PR 触发 CodeBuild 构建并部署 `pr-N` 环境，Cloudflare 出预览 URL；PR 关闭后资源被清理。
