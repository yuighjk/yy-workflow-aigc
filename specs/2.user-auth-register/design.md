# user-auth-register — 技术设计

> 遵循 `.claude/CLAUDE.md` 与 `.claude/rules/frontend.md`、`coding-style.md`、`security.md`。复用 feature 1（user-auth-login）的认证面板 shell 与视觉规范。

## 设计版本

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-07-03 | v1 | 初始设计 |

## 项目架构

- 架构类型: monorepo（Turborepo + pnpm workspaces）。
- 涉及层: **仅前端**（`apps/web`）。无后端 / 数据库改动。
- 路由: TanStack Router（file-based）。表单: TanStack React Form + zod。UI: 复用 `@yy-workflow-aigc/ui` + feature 1 的 `auth/auth-panel.tsx`。

## 功能模块设计

### 模块 1: 注册表单与校验

**涉及层及关键设计（前端）:**

- 新增 `apps/web/src/components/auth/register-form.tsx`。
- 校验 schema（zod，确认密码用 `refine` 绑定到 `confirmPassword` 字段）：
  ```ts
  const registerSchema = z
    .object({
      username: z.string().min(1, "请输入用户名"),
      email: z.string().min(1, "请输入邮箱").email("请输入正确的邮箱格式"),
      password: z.string().min(1, "请输入密码").min(6, "密码至少 6 位"),
      confirmPassword: z.string().min(1, "请再次输入密码"),
    })
    .refine((v) => v.password === v.confirmPassword, {
      message: "两次输入的密码不一致",
      path: ["confirmPassword"],
    });
  ```
- 表单：`useForm({ defaultValues: { username: "", email: "", password: "", confirmPassword: "" }, validators: { onSubmit: registerSchema }, onSubmit })`。
- 4 个 `<form.Field>`，错误经 `field.state.meta.errors` 渲染在各自输入框下方（`text-red-600 text-sm`）。

### 模块 2: 提交行为与成功反馈

**涉及层及关键设计（前端）:**

- `onSubmit`：`setSucceeded(false)` → `await new Promise((resolve) => setTimeout(resolve, 400))`（executor 非 async）→ `setSucceeded(true)`。
- 成功后渲染提示"注册成功，请登录"（`role="status"`，绿色系样式），并显式提供"去登录"入口（`<Link to="/login">`）。
- loading 文案：`isSubmitting ? "注册中..." : "注册"`；按钮 `disabled={!canSubmit || isSubmitting}`。

### 模块 3: 路由与页面装配

**涉及层及关键设计（前端）:**

- 新增 `apps/web/src/routes/register.tsx`：`createFileRoute("/register")`，component 渲染 `AuthPanel`（title="注册"）+ `RegisterForm`，footer 放"已有账号？去登录"链接。
- 路由树由 TanStack Router 插件自动生成到 `routeTree.gen.ts`（勿手改）。

## 接口契约

无（纯前端，无 API / RPC 调用）。

## 数据模型

无持久化。表单内存态：`{ username, email, password, confirmPassword }` + `succeeded: boolean`。

## 安全考虑

- 纯前端 mock，不发送/存储凭据，无 token/cookie/localStorage 写入。
- 密码与确认密码框 `type="password"`；错误文案不回显明文密码。
- 遵循 `.claude/rules/security.md`：不硬编码密钥、不引服务端密钥入前端包。

## 技术决策

| 决策 | 选项 | 理由 |
| ---- | ---- | ---- |
| 复用 feature 1 面板 shell | 复用 `auth/auth-panel.tsx`（选） / 各自实现 | 保持登录/注册视觉一致，`2.T-001 依赖 1.T-001` |
| 确认密码校验 | zod `refine` + `path:["confirmPassword"]`（选） / 手动比较 | 错误定位到确认密码字段，与 TanStack Form 错误渲染一致 |
| 成功反馈 | 页内提示"注册成功，请登录"+ 去登录链接（选） / toast + 自动跳转 | PRD 要求页内提示并"引导用户返回登录页"，不强制自动跳转 |
| 跳登录 | `<Link to="/login">`（选） | 与 feature 1 的 `/login` 路由联动 |
