# user-auth-login — 技术设计

> 遵循 `.claude/CLAUDE.md` 与 `.claude/rules/frontend.md`、`coding-style.md`、`security.md`。

## 设计版本

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-07-03 | v1 | 初始设计 |

## 项目架构

- 架构类型: monorepo（Turborepo + pnpm workspaces）。
- 涉及层: **仅前端**（`apps/web`）。无后端 / 数据库改动。
- 路由: TanStack Router（file-based，`apps/web/src/routes/`）。
- 表单: TanStack React Form + zod validators（沿用 `sign-in-form.tsx` 既有写法）。
- UI: 复用 `@yy-workflow-aigc/ui/components/{card,button,input,label}`；通知/成功用页内元素（非 toast，PRD 要求页内提示条）。

## 功能模块设计

### 模块 1: 认证面板 shell（共享，feature 2 复用）

居中、浅色的认证面板容器，承载产品名、标题、表单、主按钮、底部链接。

**涉及层及关键设计（前端）:**

- 新增 `apps/web/src/components/auth/auth-panel.tsx`：`AuthPanel({ title, children, footer })`，用 `@yy-workflow-aigc/ui` 的 `Card` 作面板，外层做全高居中。
- 视觉 tokens → Tailwind 映射（PRD 颜色恰好对齐 Tailwind 默认色板，直接用具名类，避免依赖全局暗色主题）：
  | PRD | 值 | Tailwind |
  | --- | -- | -------- |
  | 页面背景 | #f6f8fb | `bg-[#f6f8fb]`（浅色，显式指定） |
  | 面板背景 | #ffffff | `bg-white` |
  | 主色 / hover | #2563eb / #1d4ed8 | `bg-blue-600` / `hover:bg-blue-700` |
  | 文字主/次 | #111827 / #6b7280 | `text-gray-900` / `text-gray-500` |
  | 边框 | #d1d5db | `border-gray-300` |
  | 错误 / 成功 | #dc2626 / #16a34a | `text-red-600` / `text-green-600` |
- 尺寸：面板 `w-full max-w-sm`（384px，落在 360–420px）、内边距 `p-8`（32px）、圆角 `rounded-lg`（8px）、外层 `min-h-full grid place-items-center`、输入间距 `space-y-4`。
- 面板内文字统一深色（`text-gray-900`），确保在全局 `defaultTheme="dark"` 下仍为浅色卡片、可读。

### 模块 2: 登录表单与校验

**涉及层及关键设计（前端）:**

- 新增 `apps/web/src/components/auth/login-form.tsx`（mock 版，独立于 better-auth 的 `sign-in-form.tsx`）。
- 校验 schema（zod，中文文案）：
  ```ts
  const loginSchema = z.object({
    email: z.string().min(1, "请输入邮箱").email("请输入正确的邮箱格式"),
    password: z.string().min(1, "请输入密码").min(6, "密码至少 6 位"),
  });
  ```
- 表单：`useForm({ defaultValues: { email: "", password: "" }, validators: { onSubmit: loginSchema }, onSubmit })`。
- 字段用 `<form.Field>`，错误经 `field.state.meta.errors` 渲染在输入框**下方**（`text-red-600 text-sm`）。
- 提交按钮用 `<form.Subscribe selector>` 取 `canSubmit` / `isSubmitting` 控制 `disabled` 与文案。

### 模块 3: 提交行为与成功反馈

**涉及层及关键设计（前端）:**

- `onSubmit`：模拟请求延迟后置成功态。
  ```ts
  const [succeeded, setSucceeded] = useState(false);
  // onSubmit:
  setSucceeded(false);
  await new Promise((resolve) => setTimeout(resolve, 400)); // 300–500ms 模拟
  setSucceeded(true);
  ```
  注意：executor 不写成 async（Ultracite `noAsyncPromiseExecutor`）。
- 成功后渲染绿色提示条（`role="status"`，`bg-green-50 text-green-700 border border-green-200`，文案"登录成功"）；**不导航**，按钮恢复可点（`isSubmitting` 结束自动恢复）。
- loading 文案：`isSubmitting ? "登录中..." : "登录"`。

### 模块 4: 路由与页面装配

**涉及层及关键设计（前端）:**

- 覆盖 `apps/web/src/routes/login.tsx`：`createFileRoute("/login")`，component 渲染 `AuthPanel` + `LoginForm`，footer 放"还没有账号？去注册"链接（`<Link to="/register">`）。
- 移除该路由对 `SignInForm`/`SignUpForm` 的引用（这两个组件文件保留，供后续接入 better-auth）。

## 接口契约

无（纯前端，无 API / RPC 调用）。登录成功为客户端状态，不发起网络请求。

## 数据模型

无持久化数据模型。表单内存态：`{ email: string; password: string }` + `succeeded: boolean`。

## 安全考虑

- 纯前端 mock，不发送/存储真实凭据，无 token / cookie / localStorage 写入。
- 不引入服务端密钥；不使用 `dangerouslySetInnerHTML` / `eval`。
- 密码框 `type="password"`；错误文案不回显敏感值。

## 技术决策

| 决策 | 选项 | 理由 |
| ---- | ---- | ---- |
| 覆盖现有 `/login` | A: 覆盖为 mock + 新增 `/register`（选） / B: 放新路由 | PRD 明确路径 `/login`、`/register`；现有 better-auth 组件保留不删，后续可接回 |
| 新建 mock 表单组件 | 新建 `auth/login-form.tsx`（选） / 改造 `sign-in-form.tsx` | 与 better-auth 版解耦，避免混淆；后续接入真实后端时二选一挂载 |
| 视觉实现 | 复用 UI 组件 + Tailwind 具名类（选） / 硬编码新组件 | 遵循 rules「优先复用 `@yy-workflow-aigc/ui`」；PRD 颜色对齐 Tailwind 色板 |
| 全局暗色主题 | 认证面板用显式浅色类、不改全局 `defaultTheme`（选） | 最小影响面，PRD 要浅色面板 |
| 成功反馈 | 页内绿色提示条（选） / sonner toast | PRD 明确"页面内展示成功提示条、不跳转" |
| 是否隐藏 `<Header />` | 默认保留（待定） | 非阻塞；如需纯净全屏认证页，后续可为 auth 路由做独立 layout |
