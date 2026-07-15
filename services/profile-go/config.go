package main

import (
	"fmt"
	"os"
)

// Config 保存服务运行所需的配置，全部来自环境变量（不硬编码密钥）。
type Config struct {
	// Port 是 HTTP 服务监听端口。
	Port string
	// DatabaseURL 是 Postgres/Aurora 连接串（形如 postgres://user:pass@host:5432/db）。
	DatabaseURL string
	// RDSCAPath 指向 RDS/Aurora 的 CA bundle，用于对数据库做 TLS 校验；
	// 本地非 TLS 库（sslmode=disable）时可留空。
	RDSCAPath string
}

// LoadConfig 从环境变量读取配置。PORT 缺省 8080；DATABASE_URL 为必填。
func LoadConfig() (Config, error) {
	cfg := Config{
		Port:        getenv("PORT", "8080"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		RDSCAPath:   os.Getenv("RDS_CA_PATH"),
	}
	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("环境变量 DATABASE_URL 未设置")
	}
	return cfg, nil
}

// getenv 返回环境变量值，为空时用 fallback。
func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
