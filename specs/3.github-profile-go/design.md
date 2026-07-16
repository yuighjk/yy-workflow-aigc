# github-profile-go — 设计文档

## 设计版本

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-07-14 | v1 | 初始设计（三步一体） |

## 架构总览（目标形态）

```
                         Internet
   浏览器 ─► Cloudflare(前端, PR 预览) 
             │ /api/*
             ▼
        API Gateway(HTTP) ─► Lambda BFF ─┐  (私网子网, 只调内网, 免 NAT)
                                          │  纯编排/转发: 不碰 GitHub、不碰 DB
   ┌═══════════════════ VPC (私网, 跨 2 AZ) ═══════════│════════┐
   ║                            内网 ALB(internal) ◄────┘        ║
   ║                             │ 按路径 /profile/* 路由         ║
   ║                             ▼                               ║
   ║                    profile-go(Go/Fargate)                   ║
   ║                    读写现有 github_account 表                ║
   ║                    抓 GitHub /user、生成简介                 ║
   ║                             │                               ║
   ║      ┌────────── Aurora Postgres(私网, 无公网) ──────────┐  ║
   ║      └──────────────────────────────────────────────────┘  ║
   ║   NAT Gateway ◄── Go 出网抓 GitHub                           ║
   ║   Cloud Map(east-west, 多服务时启用；单服务预留)             ║
   ╚═════════════════════════════════════════════════════════════╝
   ECR: profile-go 镜像
   CodeBuild(VPC 内): 构建/迁移校验/部署   IAM: 最小权限
```

对比参考项目：架构照搬 [aws-learning](https://github.com/Adophlidu/aws-learning)，差异 = DB 用 Postgres（非 MySQL）、CI 用 CodeBuild（非 GitHub Actions）、前端用 Cloudflare（非 S3+CloudFront）。

## Phase 1 设计：Go 服务

### 目录结构（对齐参考 `services/profile-service`）

```
services/profile-go/
├── go.mod / go.sum
├── main.go        起 HTTP server、注册路由、优雅关停
├── config.go      读环境变量：DATABASE_URL / PORT / RDS_CA_PATH
├── github.go      调 GitHub GET /user（从 fetchAndSave 迁移）
├── mapper.go      GitHubUser → Profile 字段（从 toProfile 迁移）+ 简介模板
├── store.go       pgx 连库；list / upsert / getByLogin（从 prisma 迁移）
├── models.go      GitHubUser / Profile 结构体
├── handler.go     HTTP handlers: /profile/list /profile/fetch /profile/bio
├── mapper_test.go 单测
├── Dockerfile     多阶段构建（Phase 2 用）
└── compose.yaml   本地起服务（Phase 2 用）
```

### 数据库对接（关键：复用 Prisma 已建表）

现有表来自 `packages/db/prisma/schema/github.prisma`，`@@map("github_account")`：

| Prisma 字段 | 实际列名 | Go 读写用列名 |
| ---- | ---- | ---- |
| id (cuid) | id | id（Go 侧 upsert 用 `ON CONFLICT (github_id)`，不自己造 id 走 update 分支） |
| githubId @unique | github_id | github_id |
| login | login | login |
| name? | name | name |
| avatarUrl? | avatar_url | avatar_url |
| htmlUrl? | html_url | html_url |
| bio? | bio | bio |
| publicRepos | public_repos | public_repos |
| createdAt/updatedAt | created_at/updated_at | 由默认值/触发器维护 |

- 驱动：`github.com/jackc/pgx/v5`（+ `pgxpool`）。
- TLS：连 Aurora 需信任 RDS CA（复用 `packages/db/certs/rds-global-bundle.pem`）。本地非 TLS 库用 `sslmode=disable`。
- **不建表**：表由 Prisma 迁移维护，Go 只 `SELECT`/`INSERT ... ON CONFLICT`。

### 逻辑迁移映射（Node → Go）

| 现有 `github.ts` | Go 落点 | 说明 |
| ---- | ---- | ---- |
| `TOKEN_REGEX` 校验 | handler.go 入参校验 | token 以 `ghp_`/`github_pat_` 开头 |
| `fetch("/user", ...)` | github.go `FetchUser(token)` | 同样的 header（Bearer / Accept / UA / API-Version），401→Unauthorized、非 2xx→BadGateway |
| `toProfile(u)` | mapper.go `ToProfile(u)` | 抽字段，不含 token |
| `prisma.upsert({...})` | store.go `Upsert(p)` | `INSERT ... ON CONFLICT (github_id) DO UPDATE` |
| `prisma.findMany({orderBy})` | store.go `List()` | `ORDER BY created_at DESC` |

### 新增：生成简介

- `GET /profile/bio?login={login}` → store.getByLogin → mapper.BuildBio(profile)。
- `BuildBio` 模板（示例）：
  > 「{name或login} 是一位 GitHub 开发者，公开仓库 {public_repos} 个。{bio 存在则拼一句}。主页：{html_url}。」
- 返回 JSON：`{ login, bio: "<生成文本>" }`。
- 无记录 → 404，前端提示「未找到该用户，请先在 GitHub 页读取保存」。

### HTTP 契约（Phase 1，Go 直连；Phase 2 起前置 BFF/ALB）

| 方法 | 路径 | 入参 | 出参 |
| ---- | ---- | ---- | ---- |
| GET | /healthz | - | 200 "ok" |
| GET | /profile/list | - | Profile[] |
| POST | /profile/fetch | `{token}` | Profile |
| GET | /profile/bio | `?login=` | `{login, bio}` |

### 前端（Phase 1）

- 新增路由（如 `apps/web/src/routes/_auth/profile-bio.tsx`），仿 `github.tsx`：输入框（用户名）+ 按钮 + 结果展示区。
- 数据获取：Phase 1 直连 Go 服务地址（本地 `http://localhost:<port>`），用 `VITE_` 变量配置；**不接 tRPC**（Go 不在 tRPC 体系内）。
- 复用 `@yy-workflow-aigc/ui` 的 Button/Input/Label/Card。

## Phase 2 设计：容器化上云

### CDK 文件与 Stack 边界（`infra/`）

| 文件 | 内容 |
| ---- | ---- |
| `phase2-shared-stack.ts` | 引用 SAM 网络；创建 ECR、ECS Cluster、Internal ALB、Cloud Map 和安全组 |
| `phase2-service-stack.ts` | ECS Roles、Task Definition、Fargate Service、Target Group、Secrets 注入、Lambda BFF 与 HTTP API |
| `lambda/profile-bff/index.mjs` | 纯转发 BFF，不读 DB、不调用 GitHub |
| `bin/app.ts` | 装配 shared/service 两个 Stack |

现有 `yy-workflow-server` SAM Stack 继续拥有 NAT、私有子网、原 Lambda 和跳板机。CDK 通过 CloudFormation Exports 引用它们，不取得资源所有权。

### 请求路径（务必分清南北向/东西向）

- **南北向**：用户 → API Gateway → Lambda BFF →（内网 ALB，按路径 `/profile/*`）→ Go。**不经 Cloud Map。**
- **东西向**：Go ↔ Go（本作业暂只有一个 Go 服务，Cloud Map 预留；多服务时 `xxx.svc.internal`）。
- **出网**：Go → NAT → GitHub API。
- **DB**：Go → Aurora（私网 5432，TLS）。

### Lambda BFF（方案 A）

- Node 轻函数，`/profile/*` 透传到内网 ALB 的私有 DNS；不碰 GitHub、不碰 DB。
- 放私网子网、只调内网 → 免 NAT（省钱），对齐参考项目取舍。

## Phase 3 设计：按 PR 的独立环境

### 组件职责

| 角色 | 职责 |
| ---- | ---- |
| Cloudflare | 每 PR 一个 `pr-N` 预览前端，注入共享 API URL 与 PR Header |
| GitHub OIDC | 无长期 AWS Key；上传当前 commit ZIP 到私有 S3，并启动/等待 CodeBuild |
| CodeBuild（VPC 内） | buildspec：DB 守卫 → docker build Go → 推 ECR `:pr-N-SHA` → 迁移 diff → CDK 起/更新或销毁 `pr-N` Stack |
| IAM | 三个显式角色：GitHub OIDC、CodeBuild Service、PR ECS execution/runtime |

### 为什么用 CodeBuild（而非跳板机）

CodeBuild 项目可配 VPC（指定私网子网 + 安全组），从而**在内网直连私有 Aurora 跑迁移**——既不用跳板机、也不把 DB 暴露公网，职责分明。这正是本作业让 CodeBuild 出场的意义。

### PR 生命周期

```
开/更新 PR → GitHub OIDC→S3 Source→CodeBuild(pr-N): build→push→迁移校验→CDK 部署 ECS pr-N
           → Cloudflare 出 pr-N 预览 URL（共享 API + x-yy-pr-number）
PR 合并/关闭 → 清理: ECS 服务 pr-N / 目标组 / ALB 规则 / 前端预览
```

### PR 级 DB 策略（已定）

- 共享一个 dev 库；PR 迁移**只做 validate/dry-run**，不真实变更共享库，避免 PR 之间迁移打架。
- 若某 PR 确需真实 schema 变更，走正式迁移流程合并后再由 test/prod 部署应用。

## 风险与成本

- **成本**：NAT/ALB/RDS/Fargate 按小时计费。约定「学完即拆」：先销毁 `yy-workflow-phase2-service`，再销毁 `yy-workflow-phase2-shared`；不删除 `yy-workflow-server`；配 Budgets 1 美元告警。
- **ALB 规则上限**：共享 ALB 监听器默认 100 条规则/监听器，PR 多时注意配额。
- **端到端顺序**：先 Phase 1（零 AWS 成本本地跑通），再 Phase 2（上云），最后 Phase 3（CI/PR 环境）。
