# 用户登录注册与云端部署 PRD

## 1. 文档信息

| 项目 | 内容 |
| ---- | ---- |
| 文档名称 | 用户登录注册与云端部署 PRD |
| 版本 | v1.3 |
| 日期 | 2026-07-03 |
| 状态 | 初稿 |

## 2. 背景

项目中已经存在登录和注册页面能力，当前入口位于 `/login`，并通过 `SignInForm` 与 `SignUpForm` 在同一页面内切换。本次不重写已有登录注册页面，只基于现有页面优化视觉表现、布局层次、输入框、按钮、错误提示和移动端适配。

同时，PRD 仍保留后端与云端部署目标：使用 Hono 开发接口，通过用户提供的 GitHub personal access token 获取 GitHub 个人账户信息，使用 Prisma 管理用户相关字段的新增和删除，并通过 AWS SAM 将服务部署到 AWS。服务和数据库需要配置在同一个 VPC 内，其中 1 个子网具备外网访问能力，其余 2 个子网用于部署 Lambda。

相关现有页面文件：

- `apps/web/src/routes/login.tsx`
- `apps/web/src/components/sign-in-form.tsx`
- `apps/web/src/components/sign-up-form.tsx`

## 3. 目标

- 明确项目已有 `/login`、`SignInForm`、`SignUpForm`，本次只改涉及到的页面样式与交互表现。
- 保留现有登录、注册、切换、校验、提交逻辑。
- 优化 `/login` 页面整体布局，使其具备完整认证页观感。
- 优化登录表单和注册表单样式，让输入、按钮、错误提示更清晰。
- 增加视觉层次，包括背景、标题区、表单容器、说明文案和状态反馈。
- 保证桌面端和移动端都能正常展示，不出现内容溢出或重叠。
- 使用 Hono 开发登录、注册、GitHub 信息获取相关接口。
- 登录或注册流程支持用户输入 GitHub personal access token，并通过该 token 获取 GitHub 个人账户信息。
- 使用 Prisma 完成用户信息字段的新增和删除。
- 使用 AWS SAM 完成服务和数据库相关资源部署。
- 将服务和数据库配置在同一个 VPC 内，其中 1 个子网具备外网访问能力，其余 2 个子网用于部署 Lambda。

## 4. 非目标

- 不重写已有认证页面和 authClient 调用逻辑。
- 不重做登录注册业务流程。
- 不实现忘记密码。
- 不实现登录态持久化。
- 不实现权限系统。
- 不实现复杂用户资料页。
- 不实现 GitHub OAuth 授权流程，本阶段仅使用用户个人 token 调用 GitHub API。

## 5. 用户故事

- 作为新用户，我希望注册页面看起来清晰可信，以便放心创建账户。
- 作为已有用户，我希望登录页面输入路径简单明确，以便快速登录。
- 作为用户，我希望错误提示位置清楚，以便快速修正输入问题。
- 作为用户，我希望登录和注册切换入口明显，以便在两种状态间快速切换。
- 作为用户，我希望可以输入 GitHub personal access token，以便系统读取我的 GitHub 账户信息。
- 作为开发者，我希望服务可以通过 SAM 部署到 AWS，以便快速完成云端验收。

## 6. 页面范围

### 6.1 登录/注册入口页

路径：

```text
/login
```

现有行为：

- 默认展示注册或登录表单，依据现有 `login.tsx` 状态切换逻辑保持不变。
- 用户可以在登录和注册表单之间切换。
- 提交成功和失败仍沿用现有 toast 反馈。

本次优化范围：

- 页面背景。
- 居中认证区域。
- 表单容器样式。
- 标题和辅助文案。
- 输入框、按钮、错误提示、切换链接样式。
- 移动端适配。

### 6.2 登录表单

现有字段保持：

- Email。
- Password。
- Sign In 按钮。
- 切换到 Sign Up 的入口。

样式优化要求：

- 表单标题更明确，例如 `Welcome back`。
- 增加一句简短辅助文案，例如 `Sign in to continue your workflow.`。
- 输入框高度统一，聚焦状态明显。
- 错误提示使用更小字号和红色，放在对应输入框下方。
- 提交按钮占满表单宽度，并提供清晰 hover、disabled、loading 状态。

登录行为：

1. 用户输入邮箱和密码。
2. 点击“登录”。
3. 前端进行现有基础表单校验。
4. 校验通过后沿用现有登录提交逻辑。
5. 登录成功后展示成功反馈或进入现有成功路径。

### 6.3 注册表单

现有字段保持：

- Name。
- Email。
- Password。
- Confirm Password。
- Sign Up 按钮。
- 切换到 Sign In 的入口。

样式优化要求：

- 表单标题更明确，例如 `Create your account`。
- 增加一句简短辅助文案，例如 `Start managing your AI workflow in minutes.`。
- 密码和确认密码字段的错误提示保持清晰。
- 注册表单字段更多，移动端需要保证容器可滚动且按钮可见。

注册行为：

1. 用户填写注册信息。
2. 点击“注册”。
3. 前端进行现有基础表单校验。
4. 校验通过后沿用现有注册提交逻辑。
5. 注册成功后展示成功反馈或进入现有成功路径。

## 7. 后端接口范围

### 7.1 技术要求

- 使用 Hono 开发 API 服务。
- 服务运行在 AWS Lambda 上。
- API 通过 AWS SAM 部署。
- 使用 Prisma 访问数据库并管理用户字段。
- GitHub 信息通过用户提交的 personal access token 获取。

### 7.2 API 设计

#### POST /api/register

请求参数：

```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "githubToken": "string"
}
```

处理逻辑：

1. 校验必填字段。
2. 使用 `githubToken` 请求 GitHub 个人账户接口。
3. 获取 GitHub 用户 ID、login、name、avatar_url、html_url 等字段。
4. 使用 Prisma 新增用户记录。
5. 返回注册成功结果。

#### POST /api/login

请求参数：

```json
{
  "email": "string",
  "password": "string",
  "githubToken": "string"
}
```

处理逻辑：

1. 校验邮箱、密码和 GitHub token。
2. 使用 `githubToken` 请求 GitHub 个人账户接口。
3. 校验成功后返回登录成功结果和 GitHub 账户摘要。

#### DELETE /api/users/:id/fields/:fieldName

处理逻辑：

1. 校验用户 ID 和字段名是否合法。
2. 使用 Prisma 删除或清空指定可删除字段。
3. 返回字段删除结果。

### 7.3 Prisma 数据字段要求

用户表建议字段：

```text
id
username
email
password_hash
github_id
github_login
github_name
github_avatar_url
github_html_url
created_at
updated_at
```

字段新增：

- 注册成功时新增用户基础字段。
- GitHub 请求成功时新增 GitHub 账户字段。

字段删除：

- 支持删除或清空允许变更的 GitHub 账户扩展字段。
- 不允许删除用户主键、邮箱、创建时间等关键字段。

## 8. AWS SAM 部署与网络要求

### 8.1 部署要求

- 使用 AWS SAM 定义 Lambda、API Gateway、VPC、子网、安全组和数据库相关配置。
- Hono 服务部署为 Lambda 处理函数。
- API Gateway 暴露登录和注册 API。
- 数据库和 Lambda 位于同一个 VPC 内。

### 8.2 VPC 与子网要求

- 配置 1 个具备外网访问能力的子网，用于承载 NAT Gateway 或公网出口相关资源。
- 配置 2 个私有子网用于部署 Lambda。
- Lambda 所在私有子网通过路由访问外网，以便调用 GitHub API。
- 数据库部署在 VPC 内，不直接暴露公网。
- 数据库安全组仅允许 Lambda 安全组访问数据库端口。

### 8.3 配置要求

- 数据库连接信息通过环境变量或 Secrets Manager 注入 Lambda。
- GitHub token 由用户请求传入，不在服务端硬编码。
- SAM 模板需支持本地构建、部署和参数化环境配置。

## 9. 视觉设计

### 9.1 整体风格

- 风格：简洁、现代、专业、偏 SaaS 工具感。
- 氛围：可信赖、清爽，不做营销落地页。
- 重点：表单可读性和操作效率优先。

### 9.2 布局

推荐结构：

```text
全屏浅色背景
  └── 中央认证区域
        ├── 品牌/产品小标题
        ├── 表单卡片
        │     ├── 标题
        │     ├── 辅助文案
        │     ├── 表单字段
        │     ├── 主按钮
        │     └── 登录/注册切换入口
        └── 可选底部说明
```

桌面端：

- 页面最小高度 `100vh`。
- 表单容器最大宽度 420px。
- 容器水平居中，垂直居中或略偏上。
- 背景可使用浅灰、浅蓝灰或轻微网格/渐变，但不能影响表单可读性。

移动端：

- 页面左右留白 16px。
- 表单容器宽度跟随屏幕。
- 注册表单高度较长时允许页面自然滚动。
- 按钮和切换入口不得贴边。

### 9.3 颜色建议

```text
页面背景：#f8fafc
卡片背景：#ffffff
主文字：#0f172a
次级文字：#64748b
边框：#e2e8f0
输入框边框：#cbd5e1
主按钮：#2563eb
主按钮 hover：#1d4ed8
错误提示：#dc2626
成功提示：#16a34a
```

### 9.4 组件细节

表单容器：

- 白色背景。
- 8px 圆角。
- 细边框或轻阴影。
- 内边距桌面端 32px，移动端 24px。

输入框：

- 高度 42-44px。
- 默认边框清晰。
- focus 状态显示主色描边或 ring。
- placeholder 文案简洁。

按钮：

- 高度 44px 左右。
- 宽度 100%。
- loading 时文案使用现有 `Submitting...` 或更具体的 `Signing in...` / `Creating account...`。
- disabled 状态降低透明度并禁止交互。

切换入口：

- 放在主按钮下方。
- 使用普通说明文字 + link 样式按钮。
- 不要让链接颜色过亮或抢主按钮视觉权重。

错误提示：

- 与字段保持 4-6px 间距。
- 字号小于正文。
- 多条错误提示之间保持紧凑但不重叠。

## 10. 交互说明

### 10.1 登录与注册切换

- 保留现有 `onSwitchToSignUp` 和 `onSwitchToSignIn` 行为。
- 切换后表单内容应稳定展示，不应出现布局跳动明显的问题。
- 切换入口文案保持清楚，例如：

```text
Need an account? Sign up
Already have an account? Sign in
```

### 10.2 提交状态

- 提交时按钮进入 loading/disabled 状态。
- 提交期间不允许重复点击。
- 成功或失败反馈继续使用现有 toast。

### 10.3 校验错误

- 继续使用现有表单校验逻辑。
- 错误提示必须紧贴对应字段展示。
- 错误状态下输入框边框可变为红色，以提升可见性。

## 11. 验收标准

- [ ] `/login` 页面仍可正常打开。
- [ ] 登录表单仍可正常输入、校验和提交。
- [ ] 注册表单仍可正常输入、校验和提交。
- [ ] 登录和注册切换功能保持可用。
- [ ] 页面具备完整背景、表单容器、标题、辅助文案和主按钮样式。
- [ ] 表单容器在桌面端居中，最大宽度合理。
- [ ] 页面在移动端宽度下无横向滚动。
- [ ] 注册表单字段较多时，移动端可以自然滚动并完成提交。
- [ ] 输入框 focus、error、disabled 状态清晰可见。
- [ ] 主按钮 hover、disabled、loading 状态清晰可见。
- [ ] 错误提示不与输入框、按钮或其他文案重叠。
- [ ] 不破坏现有 authClient 登录注册逻辑。
- [ ] Hono 提供注册接口。
- [ ] Hono 提供登录接口。
- [ ] 服务端可以使用用户提交的 GitHub token 获取 GitHub 个人账户信息。
- [ ] GitHub token 无效时，页面展示明确错误提示。
- [ ] Prisma 可以完成用户字段新增。
- [ ] Prisma 可以完成允许字段的删除或清空。
- [ ] SAM 模板可以部署 API Gateway、Lambda、VPC、子网、安全组和数据库相关配置。
- [ ] Lambda 和数据库位于同一个 VPC 内。
- [ ] 1 个子网具备外网访问能力，其余 2 个子网用于部署 Lambda。
- [ ] Lambda 可以访问 GitHub API。
- [ ] 数据库不直接暴露公网。

## 12. 优先级

| 优先级 | 功能 |
| ------ | ---- |
| P0 | `/login` 页面整体布局优化 |
| P0 | 登录表单样式优化 |
| P0 | 注册表单样式优化 |
| P0 | 移动端适配 |
| P0 | 保持现有登录注册逻辑不变 |
| P0 | Hono 登录和注册接口 |
| P0 | GitHub token 获取个人账户信息 |
| P0 | Prisma 用户字段新增 |
| P0 | SAM 基础部署配置 |
| P0 | Lambda 与数据库同 VPC 配置 |
| P1 | 输入框 focus/error 状态优化 |
| P1 | loading/disabled 状态文案优化 |
| P1 | 认证页背景细节优化 |
| P1 | Prisma 允许字段删除 |
| P1 | 私有子网 Lambda 出网访问 GitHub API |
| P2 | 轻微过渡动画 |

## 13. 后续可扩展

- 增加忘记密码入口。
- 增加第三方登录。
- 接入 GitHub OAuth，替代手动输入 personal access token。
- 增加用户协议和隐私政策勾选。
- 增加登录成功后的欢迎页或引导页。
- 增加品牌插画或产品截图区域。
