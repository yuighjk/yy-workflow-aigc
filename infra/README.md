# Phase 2 AWS CDK

Phase 2 与线上 SAM Stack `yy-workflow-server` 共存：SAM 继续拥有 VPC、NAT、私有子网、原 Lambda 和跳板机；CDK 只创建新增容器基础设施。

## Stack 边界

- `yy-workflow-phase2-shared`：ECR、ECS Cluster、Internal ALB、Cloud Map Namespace 和安全组。
- `yy-workflow-phase2-service`：profile-go Task Definition、ECS IAM Roles、Fargate Service、Target Group、Lambda BFF 和新的 HTTP API。

稳定环境同时创建 AWS Synthetics Canary，每 5 分钟请求公开 `/health` 接口。该请求会经过 HTTP API、Lambda BFF、Internal ALB 和 Fargate，并在 Aurora 上执行 `SELECT 1`。任何一环失败都会使 `yy-workflow-health` 巡检失败，并触发对应的 CloudWatch Alarm。`/healthz` 仍仅用于 ALB/ECS 轻量存活探测。

CDK 通过 CloudFormation Exports 引用 SAM 资源，不会取得或删除这些资源的所有权。

## 首次部署

### 1. 更新 SAM Stack 的跨栈输出

先部署更新后的根目录 `template.yaml`：

```bash
sam build
sam deploy
```

### 2. 安装依赖并 bootstrap CDK

```bash
pnpm install
cd infra
pnpm exec cdk bootstrap aws://ACCOUNT_ID/ap-northeast-1
```

### 3. 创建共享基础设施

```bash
pnpm deploy:shared
```

取得 ECR 地址并登录：

```bash
REPOSITORY_URI="$(aws cloudformation describe-stacks \
  --stack-name yy-workflow-phase2-shared \
  --query 'Stacks[0].Outputs[?OutputKey==`RepositoryUri`].OutputValue' \
  --output text)"
ECR_REGISTRY="${REPOSITORY_URI%%/*}"

aws ecr get-login-password --region ap-northeast-1 \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"
```

### 4. 构建并推送 Go 镜像

在仓库根目录运行：

```bash
IMAGE_TAG="phase2-$(git rev-parse --short HEAD)"
docker build --platform linux/amd64 \
  --file services/profile-go/Dockerfile \
  --tag "$REPOSITORY_URI:$IMAGE_TAG" \
  .
docker push "$REPOSITORY_URI:$IMAGE_TAG"
```
 FROM mirror.gcr.io/library/golang:1.25-alpine AS build


### 5. 准备数据库 Secret

使用 Secrets Manager 创建 JSON Secret，必须包含 `DATABASE_URL` 字段。不要把数据库连接串提交到 Git。

```json
{
  "DATABASE_URL": "postgresql://USER:PASSWORD@AURORA_HOST:5432/postgres"
}
```

记下 Secret 的完整 ARN。

### 6. 部署 Go Service 与 BFF

```bash
pnpm exec cdk deploy yy-workflow-phase2-service \
  --exclusively \
  --parameters "ImageTag=$IMAGE_TAG" \
  --parameters "DatabaseSecretArn=$DATABASE_SECRET_ARN" \
  --require-approval never
```

部署输出的 `ProfileApiUrl` 是前端调用地址。请求链路为：

```text
HTTP API -> Lambda BFF -> Internal ALB -> Fargate profile-go -> Aurora
```

部署后可手动验收数据库巡检接口：

```bash
curl "$PROFILE_API_URL/health"
```

Cloud Map 注册 `profile-go.yy-workflow.internal`，用于后续服务间发现；BFF 的南北向请求仍走 Internal ALB。

## 更新镜像

推送新 tag 后只需重新部署 service stack：

```bash
pnpm exec cdk deploy yy-workflow-phase2-service \
  --exclusively \
  --parameters "ImageTag=$NEW_IMAGE_TAG" \
  --parameters "DatabaseSecretArn=$DATABASE_SECRET_ARN" \
  --require-approval never
```

## 销毁顺序

```bash
pnpm exec cdk destroy yy-workflow-phase2-service
pnpm exec cdk destroy yy-workflow-phase2-shared
```

这不会删除 `yy-workflow-server`。ECR 使用 `RETAIN`，如需删除仓库及镜像必须显式处理。

> Docker Hub 较慢时，`services/profile-go/Dockerfile` 使用 `mirror.gcr.io/library/golang` 的同源镜像加速 builder 拉取。

Phase 3 的 PR 独立环境见 [`PHASE3.md`](./PHASE3.md)。
