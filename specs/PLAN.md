# 开发计划索引

## 本次 PRD（2026-07-03）切分为 2 个 feature

来源需求：`docs/login-register-prd.md`（用户登录与注册页面，纯前端 mock，不接后端/DB/持久化）。

| 序号 | feature | 说明 | 依赖 | 状态 |
| ---- | ------- | ---- | ---- | ---- |
| 1 | user-auth-login | `/login` 登录页：邮箱+密码、基础校验、loading、页内"登录成功"提示、跳注册 | - | 待开发 |
| 2 | user-auth-register | `/register` 注册页：用户名+邮箱+密码+确认密码、基础校验、loading、"注册成功，请登录"、跳登录 | 1 | 待开发 |

**推荐执行顺序**：1 → 2（feature 2 复用 feature 1 建立的认证面板 shell 与视觉 tokens；`2.T-001 依赖 1.T-001`）。

## 架构练习作业（2026-07-14）

来源：AWS 架构练习作业。**一个作业、三步一体**（非三个独立 feature）。

| 序号 | feature | 说明 | 依赖 | 状态 |
| ---- | ------- | ---- | ---- | ---- |
| 3 | github-profile-go | 新增 Go 微服务链路（不动原业务）：Go 连现有 Aurora + 迁移部分 Node 抓取逻辑 + 生成个人简介（Phase 1）→ ECR/ECS/Fargate/内网 ALB/Cloud Map/Lambda BFF 上云（Phase 2）→ Cloudflare+CodeBuild+IAM 的按 PR 独立环境（Phase 3） | 复用现有 `github_account` 表 | 待开发 |

**关键决策**：沿用 Postgres/Aurora（不引入 MySQL）｜ BFF 方案 A（轻 Lambda BFF）｜ Go 放顶层 `services/profile-go`｜ CI 用 CodeBuild｜ PR 级 DB「共享 dev 库 + 仅迁移校验」。详见 `specs/3.github-profile-go/`。

## ID 编号约定

- 功能需求 / 任务 / 验收标准 ID **在单个 feature 内编号**，跨 feature 用 `{序号}.` 前缀区分。
- 例：`1.T-001` = 序号 1 这个 feature 的 T-001；`2.F-005` = 序号 2 的 F-005。
- **跨 feature 依赖**写全限定 ID，如 `2.T-001 依赖 1.T-001`。

## 全局约束（来自 PRD 非目标 + 项目规则）

- **纯前端**：不接真实后端认证、验证码、找回密码、第三方登录、真实用户库、登录态持久化、权限系统。
- 登录/注册"成功"均为**前端校验通过后的页内反馈**，用 300–500ms 模拟请求延迟。
- 技术栈遵循 `.claude/rules/frontend.md`：TanStack Router（file-based）+ TanStack React Form + zod validators，复用 `@yy-workflow-aigc/ui` 组件，Tailwind v4。
- 现有 `apps/web/src/routes/login.tsx`（better-auth 版）本次被 mock 版覆盖；`sign-in-form.tsx` / `sign-up-form.tsx` 保留在仓库不挂载，留待 PRD §11 后续接入真实后端。
