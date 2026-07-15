# profile-go

GitHub Profile 抓取/生成简介的 Go 微服务（作业 Phase 1）。详见 [`specs/3.github-profile-go/`](../../specs/3.github-profile-go/)。

## 现状（3.T-101）

- HTTP 服务骨架 + `GET /healthz` + 环境变量配置（`config.go`）。
- 尚未接数据库与 GitHub（3.T-102 起）。

## 本地运行

```bash
cd services/profile-go
export DATABASE_URL="postgres://user:pass@localhost:5432/postgres?sslmode=disable"
export PORT=8080
go run .
# 另开终端
curl localhost:8080/healthz   # -> ok
```

## 环境变量

| 变量 | 必填 | 说明 |
| ---- | ---- | ---- |
| `DATABASE_URL` | 是 | Postgres/Aurora 连接串 |
| `PORT` | 否 | HTTP 端口，默认 8080 |
| `RDS_CA_PATH` | 否 | Aurora TLS 的 CA bundle 路径；本地非 TLS 可留空 |
