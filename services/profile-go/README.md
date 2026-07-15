# profile-go

GitHub Profile 抓取/生成简介的 Go 微服务（作业 Phase 1）。详见 [`specs/3.github-profile-go/`](../../specs/3.github-profile-go/)。

## 现状

- Go HTTP 服务、Aurora/Postgres、GitHub Profile 和简介接口已实现。
- Phase 2 使用多阶段 Dockerfile，并部署到 ECR + ECS/Fargate。

## 本地运行

```bash
cd services/profile-go
export DATABASE_URL="postgres://user:pass@localhost:5432/postgres?sslmode=disable"
export PORT=8080
go run .
# 另开终端
curl localhost:8080/healthz   # -> ok
```

## Docker

Docker 构建上下文必须使用仓库根目录，才能把 RDS CA 一起放入镜像：

```bash
docker build \
  --platform linux/amd64 \
  --file services/profile-go/Dockerfile \
  --tag profile-go:local \
  .
```

也可以从服务目录启动 Compose：

```bash
cd services/profile-go
DATABASE_URL="postgres://...?...sslmode=disable" docker compose up --build
```

连接 Aurora 时再设置 `RDS_CA_PATH=/etc/ssl/certs/rds-global-bundle.pem`；本地非 TLS Postgres 保持为空。

## 环境变量

| 变量 | 必填 | 说明 |
| ---- | ---- | ---- |
| `DATABASE_URL` | 是 | Postgres/Aurora 连接串 |
| `PORT` | 否 | HTTP 端口，默认 8080 |
| `RDS_CA_PATH` | 否 | Aurora TLS 的 CA bundle 路径；本地非 TLS 可留空 |
