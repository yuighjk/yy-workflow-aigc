<!-- 解释yaml，UI库 -->

| 行号 | 说明 |
|---|---|
| 1-26 | 文件头注释：说明这个 workflow 用来把 `apps/server` 的 Hono 后端打包成 AWS Lambda，并通过 AWS SAM 部署；也列出需要配置的 GitHub Secrets/Variables 和 IAM 权限要求。 |
| 28 | workflow 名称，会显示在 GitHub Actions 页面：`Deploy Server to Lambda (SAM)`。 |
| 30 | `on:` 定义触发条件。 |
| 31 | `push:` 表示代码 push 时可触发。 |
| 32 | 只监听 `master` 分支。 |
| 33 | `paths:` 表示只有这些路径变化才触发。 |
| 34 | `apps/server/**` 改动触发后端部署。 |
| 35 | `packages/**` 改动触发，因为后端依赖 workspace packages。 |
| 36 | `template.yaml` 改动触发，因为 SAM 模板变了。 |
| 37 | `pnpm-lock.yaml` 改动触发，因为依赖锁定变了。 |
| 38 | `pnpm-workspace.yaml` 改动触发，因为 workspace 结构变了。 |
| 39 | workflow 文件自身改动也触发，便于验证部署配置。 |
| 40 | `workflow_dispatch: {}` 允许在 GitHub Actions 页面手动点击运行。 |
| 42-45 | 并发控制：同一 git ref 只允许一个 server 部署组；`cancel-in-progress: false` 表示新任务不会取消正在部署的旧任务，避免 CloudFormation stack 卡在中间状态。 |
| 47 | `permissions:` 设置 GitHub token 权限。 |
| 48 | `contents: read` 只允许读取仓库内容。 |
| 49-50 | 注释：如果改成 AWS OIDC 免密钥，需要打开 `id-token: write`。 |
| 52 | `jobs:` 定义任务集合。 |
| 53 | job id 是 `deploy`。 |
| 54 | job 展示名：`Build & deploy via SAM`。 |
| 55 | 在 GitHub 托管的 Ubuntu 最新 runner 上跑。 |
| 56-57 | 使用 GitHub Environment `aws-iam`，所以该 Environment 下的 secrets/variables 才能被读取。 |
| 58 | `steps:` 开始定义执行步骤。 |
| 59-60 | 使用 `actions/checkout@v4` 拉取仓库代码。 |
| 62-63 | 使用 `pnpm/action-setup@v4` 安装/启用 pnpm。 |
| 65-69 | 使用 `actions/setup-node@v4` 安装 Node 22，并启用 pnpm 依赖缓存。 |
| 71 | 步骤名：安装依赖。 |
| 72 | 注释：安装阶段用占位 DB URL，跳过 env 校验，避免 Prisma postinstall 失败。 |
| 73-75 | 给这个步骤设置环境变量：跳过 env 校验，并提供假的 `DATABASE_URL`。 |
| 76 | 执行 `pnpm install --frozen-lockfile`，严格按 lockfile 安装依赖。 |
| 78 | 步骤名：生成 Prisma client。 |
| 79-81 | 注释：Lambda bundle 需要生成好的 Prisma Client；这里不用 turbo，避免 env 透传问题。 |
| 82-84 | 同样设置跳过校验和占位 `DATABASE_URL`。 |
| 85 | 在 `@yy-workflow-aigc/db` 包里执行 `prisma generate`。 |
| 87 | 步骤名：预构建 Lambda bundle。 |
| 88 | 注释：打包到 `apps/server/dist-lambda/`，供 SAM Makefile 使用。 |
| 89-91 | 构建时继续使用占位环境变量。 |
| 92 | 执行 `pnpm --filter server build:lambda` 构建 Lambda 产物。 |
| 94-97 | 安装 AWS SAM CLI，`use-installer: true` 表示使用官方 installer。 |
| 99-104 | 配置 AWS 凭证：region 来自 GitHub variable，access key/secret 来自 GitHub secrets。 |
| 105-106 | 注释：如果用 OIDC，可改成 `role-to-assume`。 |
| 108-109 | 执行 `sam build`，根据 `template.yaml` 构建 SAM 应用。 |
| 111 | 步骤名：部署 SAM。 |
| 112-113 | 注释：部署参数从 GitHub Secrets/Variables 注入，不依赖本地 `samconfig.toml`。 |
| 114 | `run: \|` 表示下面是多行 shell 脚本。 |
| 115 | `set -euo pipefail`：命令失败、未定义变量、管道失败时立即退出。 |
| 116 | 开始执行 `sam deploy`。 |
| 117 | `--stack-name` 使用 `vars.SAM_STACK_NAME`。 |
| 118 | `--region` 使用 `vars.AWS_REGION`。 |
| 119 | `--capabilities CAPABILITY_IAM` 允许 SAM/CloudFormation 创建 IAM 资源。 |
| 120 | `--resolve-s3` 自动创建/选择 SAM 部署产物桶。 |
| 121 | `--no-confirm-changeset` 不人工确认变更集，适合 CI。 |
| 122 | `--no-fail-on-empty-changeset` 没有变更时不让 workflow 失败。 |
| 123 | `--parameter-overrides` 开始覆盖 SAM 模板参数。 |
| 124 | 把 GitHub secret `DATABASE_URL` 注入为模板参数 `DatabaseUrl`。 |
| 125 | 把 `BETTER_AUTH_SECRET` 注入为 `BetterAuthSecret`。 |
| 126 | 把变量 `CORS_ORIGIN` 注入为 `CorsOrigin`。 |
| 128 | 步骤名：输出 API URL。 |
| 129 | 多行 shell 脚本。 |
| 130-134 | 调用 AWS CLI 查询 CloudFormation stack 输出里的 `ApiUrl`，打印部署后的 API 地址。 |

## deploy-web-cloudflare.yml

| 行号 | 说明 |
|---|---|
| 1-20 | 文件头注释：说明这个 workflow 把 `apps/web` 的 Vite 构建产物部署到 Cloudflare Pages，并列出需要配置的 Cloudflare secrets/variables。 |
| 22 | workflow 名称：`Deploy Web to Cloudflare Pages`。 |
| 24 | `on:` 定义触发条件。 |
| 25 | `push:` 表示 push 时可触发。 |
| 26 | 只监听 `master` 分支。 |
| 27 | `paths:` 表示只有这些路径变化才触发。 |
| 28 | `apps/web/**` 改动触发前端部署。 |
| 29 | `packages/**` 改动触发，因为前端可能依赖共享包。 |
| 30 | `pnpm-lock.yaml` 改动触发。 |
| 31 | `pnpm-workspace.yaml` 改动触发。 |
| 32 | `turbo.json` 改动触发，因为构建 pipeline 可能变化。 |
| 33 | workflow 文件自身改动也触发。 |
| 34 | `workflow_dispatch: {}` 允许手动运行。 |
| 36-38 | 并发控制：同一 ref 的前端部署使用同一组；`cancel-in-progress: true` 表示新 push 会取消旧的前端部署，因为 Pages 部署可安全重跑。 |
| 40-41 | GitHub token 只给 `contents: read`，用于读取仓库代码。 |
| 43 | `jobs:` 定义任务。 |
| 44 | job id 是 `deploy`。 |
| 45 | job 展示名：`Build & deploy to Pages`。 |
| 46 | 使用 Ubuntu 最新 runner。 |
| 47-48 | job 级环境变量：关闭 Turbo telemetry。 |
| 49 | 开始 steps。 |
| 50-51 | checkout 仓库代码。 |
| 53-54 | 安装/启用 pnpm。 |
| 56-60 | 安装 Node 22，并启用 pnpm 缓存。 |
| 62 | 步骤名：安装依赖。 |
| 63 | 注释：前端构建不需要真实 DB，但 postinstall 可能跑 Prisma generate，所以用占位 DB URL。 |
| 64-66 | 设置 `SKIP_ENV_VALIDATION=1` 和假的 `DATABASE_URL`。 |
| 67 | 执行 `pnpm install --frozen-lockfile`。 |
| 69 | 步骤名：构建 web。 |
| 70 | 注释：`VITE_SERVER_URL` 会被打进前端包；没配就用默认 Lambda API。 |
| 71-72 | 设置构建时环境变量 `VITE_SERVER_URL`，优先用 GitHub variable，否则用默认 API Gateway 地址。 |
| 73 | 执行 `pnpm exec turbo run build --filter=web`，只构建 `web` 包。 |
| 75 | 步骤名：验证构建产物。 |
| 76 | 多行 shell 脚本。 |
| 77 | 判断 `apps/web/dist/index.html` 是否存在。 |
| 78 | 如果不存在，输出 GitHub Actions error 并 `exit 1` 让任务失败。 |
| 81 | 步骤名：部署到 Cloudflare Pages。 |
| 82-84 | 注释：不用 `cloudflare/wrangler-action`，改用 `pnpm dlx wrangler@latest`，避免 monorepo 里 wrangler 未安装导致失败。 |
| 85-87 | 设置 Cloudflare 认证环境变量，来自 GitHub repository secrets。 |
| 88 | 多行 shell 脚本。 |
| 89 | `set -euo pipefail`，严格失败处理。 |
| 90 | 注释：先幂等创建 Pages 项目，已存在则忽略。 |
| 91-92 | 执行 `wrangler pages project create yy-workflow-aigc --production-branch=master || true`；失败也继续，主要用于项目已存在的情况。 |
| 93 | 注释：部署构建产物。 |
| 94-95 | 执行 `wrangler pages deploy apps/web/dist --project-name=yy-workflow-aigc --branch=master`，把前端 dist 部署到 Cloudflare Pages 的 master 分支。 |

## UI 层的库，TanStack 是状态/路由/表单/请求类库。
项目里大概是这样分工：
@tanstack/react-router：前端路由
@tanstack/react-form：表单状态和校验
@tanstack/react-query：服务端数据请求缓存
lucide-react：图标库
@base-ui/react/menu：无样式、可访问性较好的菜单基础组件
sonner：toast 通知
next-themes：主题切换
tailwind-merge：合并 Tailwind class
比如 lucide-react 用在 [mode-toggle.tsx (line 8)](/Users/yueyangyang/yy-workflow-aigc/apps/web/src/components/mode-toggle.tsx:8)，提供太阳/月亮图标。
@base-ui/react/menu 用在 [dropdown-menu.tsx (line 3)](/Users/yueyangyang/yy-workflow-aigc/packages/ui/src/components/dropdown-menu.tsx:3)，用来封装 dropdown menu。

## twMerge from tailwind-merge
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
它通常和 clsx 一起用。
clsx 负责把条件 class 拼起来：
clsx("px-2", isActive && "bg-blue-500")
twMerge 负责解决 Tailwind class 冲突。
比如：
twMerge("p-2 p-4")
结果会保留后面的 p-4，避免同时存在两个冲突的 padding class。

## 项目结构图
flowchart TD
  Browser[Browser 用户浏览器]

  subgraph Web[apps/web 前端]
    Main[main.tsx<br/>createRouter routeTree]
    Routes[routes 文件路由<br/>login/register/_auth/github]
    TRPCClient[utils/trpc.ts<br/>createTRPCClient AppRouter]
    ReactQuery[React Query<br/>useQuery/useMutation]
    AuthClient[auth-client.ts<br/>better-auth/react]
  end

  subgraph Server[apps/server 后端]
    HonoApp[app.ts<br/>new Hono]
    NodeEntry[index.ts<br/>serve app.fetch]
    LambdaEntry[lambda.ts<br/>handler = handle app]
    AuthRoute[/api/auth/*<br/>auth.handler]
    TRPCRoute[/trpc/*<br/>trpcServer]
  end

  subgraph API[packages/api]
    AppRouter[appRouter<br/>router]
    Procedures[publicProcedure/protectedProcedure]
    GithubRouter[githubRouter<br/>list/fetchAndSave/remove]
  end

  subgraph Auth[packages/auth]
    BetterAuth[betterAuth<br/>emailAndPassword]
    PrismaAdapter[prismaAdapter]
  end

  subgraph DB[packages/db]
    PrismaClient[PrismaClient]
    Schema[prisma/schema/*.prisma]
    Migration[migrations/*.sql]
  end

  Aurora[(Aurora PostgreSQL)]

  Browser --> Main
  Main --> Routes
  Routes --> ReactQuery
  ReactQuery --> TRPCClient
  Routes --> AuthClient

  TRPCClient -->|HTTP /trpc| HonoApp
  AuthClient -->|HTTP /api/auth/*| HonoApp

  NodeEntry --> HonoApp
  LambdaEntry --> HonoApp

  HonoApp --> AuthRoute
  HonoApp --> TRPCRoute

  AuthRoute --> BetterAuth
  BetterAuth --> PrismaAdapter
  PrismaAdapter --> PrismaClient

  TRPCRoute --> AppRouter
  AppRouter --> Procedures
  Procedures --> GithubRouter
  GithubRouter --> PrismaClient

  Schema -->|prisma generate| PrismaClient
  Migration -->|prisma migrate deploy/dev| Aurora
  PrismaClient --> Aurora