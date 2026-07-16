# Phase 3：按 PR 独立预览环境

Phase 3 复用 Phase 2 的 VPC、私有子网、NAT、ECR、ECS Cluster、Internal ALB、Cloud Map Namespace 和共享数据库。每个 PR 只创建短期 ECS 资源，不创建新的 VPC、NAT、ALB 或 Aurora。

## 请求与部署链路

```text
GitHub PR
├─ Cloudflare Pages Preview（branch: pr-N）
└─ GitHub Actions OIDC
   ├─ GitHub Runner 构建并推送 ECR:pr-N-SHA
   ├─ 数据库变更仅运行离线 Prisma schema diff（不连接 Aurora、不执行 SQL）
   └─ cdk deploy yy-workflow-pr-N

浏览器
└─ 共享 ProfileApiUrl + Header: x-yy-pr-number=N
   └─ Lambda BFF
      └─ Internal ALB Header Rule
         └─ ECS Service profile-go-pr-N
```

PR 关闭时，GitHub Actions 执行 `cdk destroy yy-workflow-pr-N`，并删除对应 ECR tag；Cloudflare 工作流删除 `pr-N` Preview deployments。CodeBuild 资源暂时保留为账号解除限制后的备用路径，当前工作流不调用 CodeBuild。

## 三个显式 IAM 角色

1. `yy-workflow-github-oidc`：仅允许 `yuighjk/yy-workflow-aigc` 通过 GitHub OIDC 推送 PR 镜像，并 Assume CDK bootstrap roles 管理 PR Stack。
2. `yy-workflow-phase3-codebuild`：备用执行角色；新账号 CodeBuild queue 限制解除后可恢复原路径。
3. `yy-workflow-phase3-pr-ecs`：PR Fargate Task 的共享 execution/runtime role，读取镜像、日志和 DB Secret。

## 一次性部署

### 1. 先更新 Phase 2 Service Stack

Phase 3 将稳定环境的 ALB Rule 调整为兜底优先级，并为 HTTP API CORS 增加 `x-yy-pr-number`：

```bash
cd infra
pnpm exec cdk deploy yy-workflow-phase2-service \
  --exclusively \
  --parameters "ImageTag=$CURRENT_IMAGE_TAG" \
  --parameters "DatabaseSecretArn=$DATABASE_SECRET_ARN" \
  --require-approval never
```

### 2. 部署 Pipeline Stack

```bash
pnpm exec cdk deploy yy-workflow-phase3-pipeline \
  --exclusively \
  --parameters "DatabaseSecretArn=$DATABASE_SECRET_ARN" \
  --parameters "GitHubRepository=yuighjk/yy-workflow-aigc" \
  --require-approval never
```

### 3. 读取输出

```bash
GITHUB_ROLE_ARN="$(aws cloudformation describe-stacks \
  --stack-name yy-workflow-phase3-pipeline \
  --query 'Stacks[0].Outputs[?OutputKey==`GitHubOidcRoleArn`].OutputValue' \
  --output text)"

SOURCE_BUCKET="$(aws cloudformation describe-stacks \
  --stack-name yy-workflow-phase3-pipeline \
  --query 'Stacks[0].Outputs[?OutputKey==`SourceBucketName`].OutputValue' \
  --output text)"

CODEBUILD_PROJECT="$(aws cloudformation describe-stacks \
  --stack-name yy-workflow-phase3-pipeline \
  --query 'Stacks[0].Outputs[?OutputKey==`CodeBuildProjectName`].OutputValue' \
  --output text)"
```

### 4. 配置 GitHub Repository Variables

```bash
gh variable set AWS_REGION --body "ap-northeast-1"
gh variable set AWS_GITHUB_OIDC_ROLE_ARN --body "$GITHUB_ROLE_ARN"
gh variable set VITE_PROFILE_GO_URL \
  --body "https://96r1jv57ee.execute-api.ap-northeast-1.amazonaws.com"
```

Cloudflare 的 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` 继续使用现有 Repository Secrets。

## 验收

1. 推送当前分支并创建 PR。
2. 等待 `Phase 3 PR Backend / Build and reconcile PR backend` 成功。
3. 确认 Cloudflare Pages 出现 `pr-N` Preview。
4. 查看 PR Stack：

```bash
aws cloudformation describe-stacks --stack-name "yy-workflow-pr-$PR_NUMBER"
aws ecs describe-services \
  --cluster yy-workflow-profile \
  --services "profile-go-pr-$PR_NUMBER"
```

5. 使用共享 API 加 PR Header 验证路由：

```bash
curl -i \
  -H "x-yy-pr-number: $PR_NUMBER" \
  "https://96r1jv57ee.execute-api.ap-northeast-1.amazonaws.com/healthz"
```

6. 关闭 PR，确认 `yy-workflow-pr-N` Stack、ECS Service、Target Group、ALB Rule 和 Cloudflare Preview 被清理。

## 安全与限制

- Fork PR 不执行带 AWS/Cloudflare 权限的工作流。
- PR 数据库变更只执行离线 `prisma migrate diff --from-empty`，不会连接 Aurora，也不会执行生成的 SQL。
- PR 共用 dev Aurora，因此功能测试可能读取同一批数据。
- ALB Rule priority 使用 `1000 + PR_NUMBER`，当前支持 PR 编号不超过 48000。
- GitHub Actions 当前直接构建并部署，不受 CodeBuild 新账号 queue=0 限制。
