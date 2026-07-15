# github-profile-go — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-07-14 | v1 | 初始任务（三步一体：Phase 1→2→3） |

## 项目信息

- 项目名: yy-workflow-aigc
- specs 路径: specs/3.github-profile-go/
- 序号 3；任务/需求 ID 用 `3.` 前缀（如 `3.T-101`）

## 任务列表

### Phase 1 — Go 服务本地跑通（零 AWS 成本）

- [ ] 3.T-101: 初始化 `services/profile-go`：`go.mod`、`main.go`（HTTP server + `/healthz` + 优雅关停）、`config.go`（读 `DATABASE_URL`/`PORT`/`RDS_CA_PATH`）~40min
- [ ] 3.T-102: `store.go`：用 `pgx`/`pgxpool` 连 Aurora（TLS 带 RDS CA，本地 `sslmode=disable`）；实现 `List()` / `Upsert(p)`（`ON CONFLICT (github_id)`）/ `GetByLogin(login)`，读写现有 `github_account` 表，不建表 ~1h
- [ ] 3.T-103: `github.go` + `models.go`：`FetchUser(token)` 调 GitHub `GET /user`（迁移 `github.ts` 的 header 与错误码：401→Unauthorized、非 2xx→BadGateway）~40min
- [ ] 3.T-104: `mapper.go`：`ToProfile(u)`（迁移 `toProfile`）+ `BuildBio(profile)`（中文简介模板）~30min
- [ ] 3.T-105: `handler.go`：装配 `GET /profile/list`、`POST /profile/fetch`、`GET /profile/bio?login=`；入参校验（token 正则）~40min
- [ ] 3.T-106: `mapper_test.go`：覆盖 `ToProfile` 与 `BuildBio`（含无 bio/无 name 边界）；`go test ./...` 绿 ~30min
- [ ] 3.T-107: 前端页面 `apps/web/src/routes/_auth/profile-bio.tsx`：用户名输入 + 调 Go `/profile/bio` + 展示简介；用 `VITE_` 变量配 Go 地址；复用 `@yy-workflow-aigc/ui` ~40min
- [ ] 3.T-108: Phase 1 手动验收（AC-1）：本地起 Go + 前端，输入用户名返回中文简介；记录连库与抓取是否正常 ~20min

### Phase 2 — 容器化上云（按小时计费，验完即拆）

- [ ] 3.T-201: `Dockerfile`（多阶段：builder + 精简 runtime）+ `compose.yaml`（本地 Go + Postgres）；本地容器跑通 ~40min
- [ ] 3.T-202: Terraform 骨架 `infra/`：`providers/versions/variables/locals/outputs.tf` + workspace（test）约定 ~40min
- [ ] 3.T-203: `network.tf` + `security.tf`：VPC 跨 2 AZ、公私子网、NAT、IGW、安全组链 ~1h
- [ ] 3.T-204: `rds.tf`：data source 引用**现有 Aurora**（不新建）+ 给 Go SG 放行 5432 入站 ~30min
- [ ] 3.T-205: `ecr.tf` + `iam-ecs.tf`：ECR 仓库、ECS 执行/任务角色 ~30min
- [ ] 3.T-206: `ecs.tf`/`ecs-profile.tf`：集群 + Fargate 服务 + 任务定义（Secrets 注入 DB 凭证、CloudWatch 日志）~1h
- [ ] 3.T-207: `alb.tf` + `cloudmap.tf`：内网 ALB + `/profile/*` 目标组；Cloud Map 私有命名空间（预留东西向）~1h
- [ ] 3.T-208: `bff.tf` + Lambda BFF 代码：API Gateway(HTTP) → BFF（私网、只调内网 ALB）→ Go ~1h
- [ ] 3.T-209: `terraform apply` 起 test 环境；推首个镜像到 ECR；Phase 2 端到端验收（AC-2）~40min
- [ ] 3.T-210: `terraform destroy` 拆 test 环境 + 确认无残留计费资源 ~15min

### Phase 3 — 按 PR 的独立环境（Cloudflare + CodeBuild + IAM）

- [ ] 3.T-301: IAM：CodeBuild 服务角色（ECR push、ECS 部署、创建 ENI 进 VPC、读 Secrets、写日志）最小权限 ~40min
- [ ] 3.T-302: `buildspec.yml`：分支/DB 守卫 → docker build Go → 推 ECR `:pr-N` → 迁移**仅校验** → 起/更新 `pr-N` ECS 服务 ~1.5h
- [ ] 3.T-303: CodeBuild 项目（配 VPC 私网子网 + SG）+ webhook 触发（PR 事件）~40min
- [ ] 3.T-304: Cloudflare PR 预览：前端按 PR 出预览 URL，指向共享 test API ~40min
- [ ] 3.T-305: PR 关闭清理：销毁 `pr-N` 的 ECS 服务/目标组/ALB 规则与前端预览 ~40min
- [ ] 3.T-306: Phase 3 验收（AC-3）：开一个 PR 触发构建+部署，拿到预览 URL；关闭 PR 验证清理 ~30min

## 依赖关系

- Phase 1 内：T-102/103/104 → T-105 → T-106；T-107 依赖 T-105（接口就绪）；T-108 依赖 T-107。
- Phase 2 依赖 Phase 1 完成（有可运行的 Go 服务与镜像）；T-201 → T-206 → T-207 → T-208 → T-209 → T-210。
- Phase 3 依赖 Phase 2（有 ECR/ECS/ALB 与 IaC）；T-301 → T-302 → T-303 → T-304 → T-305 → T-306。
- 跨 feature：本 feature 序号 3，复用现有 `github_account` 表（来自已上线的 github 功能），无对 feature 1/2 的代码依赖。

## 执行约定

- 每完成一个 Phase 做一次手动验收再进下一 Phase；Phase 2/3 涉及计费，**验证后立即 `terraform destroy`**，只开一套环境，配 Budgets 告警。
- 编码遵循项目规则：TS 侧 `pnpm fix`/`pnpm check`；Go 侧 `go vet` + `go test`。
- 提交遵循 `.claude/rules/git-workflow.md`：先开分支（如 `feature/github-profile-go`），Conventional Commits。
