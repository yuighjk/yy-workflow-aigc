# user-auth-register — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-07-03 | v1 | 初始任务 |

## 项目信息

- 项目名: yy-workflow-aigc
- 架构类型: monorepo（全栈 TS，本 feature 仅前端 `apps/web`）
- specs 路径: specs/2.user-auth-register/

## 任务列表

### 功能 1: 路由与页面骨架

- [x] T-001: 新增 `apps/web/src/routes/register.tsx`（`createFileRoute("/register")`），复用 feature 1 的 `auth/auth-panel.tsx`（title="注册"）搭页面骨架与视觉 tokens ~15min

### 功能 2: 注册表单与校验

- [x] T-002: 注册校验 schema（zod：username 非空、email 非空+格式、password 非空+≥6、confirmPassword 用 `refine` 校验与 password 一致并 `path:["confirmPassword"]`）~15min
- [x] T-003: 注册表单 UI 与字段联动 `auth/register-form.tsx`：用户名/邮箱/密码/确认密码 4 输入项、错误提示渲染在各输入框下方、底部"去登录"链接（`Link to="/login"`）~30min

### 功能 3: 提交行为与成功反馈

- [x] T-004: 注册提交行为：`onSubmit` 用 `setTimeout` 模拟 300–500ms loading、按钮"注册中..."并禁用、校验通过渲染"注册成功，请登录"提示（`role="status"`）并展示返回登录入口 ~30min

### 功能 4: 联调与验收

- [x] T-005: 桌面/移动响应式与视觉核验（面板 360–420px、无重叠/溢出）+ 登录↔注册双向跳转联调 + 手动验收 ~15min

## 依赖关系

- T-003 依赖 T-001（页面骨架）、T-002（校验 schema）
- T-004 依赖 T-003
- T-005 依赖 T-004
- 跨 feature：`2.T-001 依赖 1.T-001`（复用认证面板 shell）；`/login` 路由由 feature 1 提供，T-005 的跳转联调需 feature 1 已完成

## 风险点

- 确认密码校验若绑错字段，错误会显示在表单顶层而非 `confirmPassword` 下方 → 用 `refine` 的 `path` 指定字段。
- 与 feature 1 的视觉一致性依赖同一 `auth-panel.tsx` → 不要在本 feature 另造面板样式。
- 跳转联调需 `/login` 就绪 → 遵循 PLAN.md 执行顺序 1 → 2。
