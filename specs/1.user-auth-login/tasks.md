# user-auth-login — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-07-03 | v1 | 初始任务 |

## 项目信息

- 项目名: yy-workflow-aigc
- 架构类型: monorepo（全栈 TS，本 feature 仅前端 `apps/web`）
- specs 路径: specs/1.user-auth-login/

## 任务列表

### 功能 1: 认证面板 shell（共享）

- [x] T-001: 认证面板 shell 组件 `apps/web/src/components/auth/auth-panel.tsx`：居中全高布局、白色 Card 面板、PRD 视觉 tokens（`bg-[#f6f8fb]` / `bg-white` / `rounded-lg` / `max-w-sm` / `p-8` / 蓝主色），复用 `@yy-workflow-aigc/ui` 的 Card/Button/Input/Label ~30min

### 功能 2: 登录表单与校验

- [x] T-002: 登录校验 schema（zod：email 非空+格式、password 非空+≥6，中文错误文案），供表单 `validators.onSubmit` 使用 ~15min
- [x] T-003: 登录表单 UI 与字段联动 `auth/login-form.tsx`：邮箱/密码输入、错误提示渲染在输入框下方、底部"去注册"链接（`Link to="/register"`）~30min

### 功能 3: 提交行为与成功反馈

- [x] T-004: 登录提交行为：`onSubmit` 用 `setTimeout` 模拟 300–500ms loading、按钮"登录中..."并禁用、校验通过渲染绿色"登录成功"提示条（`role="status"`）、不跳转 ~30min

### 功能 4: 路由装配与验收

- [x] T-005: 覆盖 `apps/web/src/routes/login.tsx` 装配 `AuthPanel`+`LoginForm`（移除对 SignInForm/SignUpForm 的引用，组件文件保留）；桌面/移动响应式与视觉核验（面板 360–420px、无重叠/溢出）+ 手动验收 ~15min

## 依赖关系

- T-003 依赖 T-001（面板 shell）、T-002（校验 schema）
- T-004 依赖 T-003
- T-005 依赖 T-004
- 跨 feature：本 feature 序号为 1，无对外依赖；feature 2 的 `2.T-001 依赖 1.T-001`（复用面板 shell）

## 风险点

- 全局 `defaultTheme="dark"`（`__root.tsx`）可能影响面板配色 → 面板一律用显式浅色具名类，不依赖主题 token。
- 根布局的 `<Header />` 占位可能影响"完全居中"观感 → 用 `min-h-full grid place-items-center` 在内容区居中；如需纯净页后续单独做 auth layout（非本期）。
- `/register` 路由由 feature 2 提供，先做本 feature 时 `Link to="/register"` 在类型/路由树生成前可能告警 → 与 feature 2 顺序衔接，或临时占位。
