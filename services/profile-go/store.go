package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound 表示按条件未查到记录。
var ErrNotFound = errors.New("profile not found")

// Store 封装数据库访问（连接池）。
type Store struct {
	pool *pgxpool.Pool
}

// NewStore 用连接串建连接池。若提供 RDS CA 路径，则启用 TLS 并校验证书链。
// 连接现有 Prisma 表 github_account，本服务只读写、不建表。
func NewStore(ctx context.Context, databaseURL, caPath string) (*Store, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("解析 DATABASE_URL 失败: %w", err)
	}

	// 若配置了 RDS CA，则用它校验 Aurora 证书（等价 verify-full）。
	if caPath != "" {
		pem, readErr := os.ReadFile(caPath)
		if readErr != nil {
			return nil, fmt.Errorf("读取 RDS CA 失败: %w", readErr)
		}
		roots := x509.NewCertPool()
		if !roots.AppendCertsFromPEM(pem) {
			return nil, errors.New("RDS CA bundle 解析失败")
		}
		cfg.ConnConfig.TLSConfig = &tls.Config{
			RootCAs:    roots,
			ServerName: cfg.ConnConfig.Host,
			MinVersion: tls.VersionTLS12,
		}
	}

	// Lambda/容器友好：限制单实例连接池上限，避免打爆 Aurora max_connections。
	cfg.MaxConns = 4
	cfg.MaxConnLifetime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("建立连接池失败: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("数据库 Ping 失败: %w", err)
	}
	return &Store{pool: pool}, nil
}

// Close 释放连接池。
func (s *Store) Close() {
	s.pool.Close()
}

// scanColumns 是各查询共用的列顺序。
// 注意：现有表由 Prisma 生成，列名是 camelCase 原样（@@map 只映射表名，未映射列名），
// 在 Postgres 中必须用双引号引用，否则会被折叠成小写而找不到列。
const scanColumns = `id, "githubId", login, name, "avatarUrl", "htmlUrl", bio, "publicRepos"`

// scanProfile 从一行读出 Profile（列顺序需与 scanColumns 一致）。
func scanProfile(row pgx.Row) (Profile, error) {
	var p Profile
	err := row.Scan(
		&p.ID, &p.GithubID, &p.Login, &p.Name,
		&p.AvatarURL, &p.HTMLURL, &p.Bio, &p.PublicRepos,
	)
	return p, err
}

// List 返回全部档案，最新在前（等价 prisma.findMany orderBy createdAt desc）。
func (s *Store) List(ctx context.Context) ([]Profile, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT `+scanColumns+` FROM github_account ORDER BY "createdAt" DESC`)
	if err != nil {
		return nil, fmt.Errorf("查询列表失败: %w", err)
	}
	defer rows.Close()

	profiles := make([]Profile, 0)
	for rows.Next() {
		p, scanErr := scanProfile(rows)
		if scanErr != nil {
			return nil, fmt.Errorf("扫描行失败: %w", scanErr)
		}
		profiles = append(profiles, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历结果失败: %w", err)
	}
	return profiles, nil
}

// GetByLogin 按 login 精确查一条；无记录返回 ErrNotFound。
func (s *Store) GetByLogin(ctx context.Context, login string) (Profile, error) {
	row := s.pool.QueryRow(ctx,
		`SELECT `+scanColumns+` FROM github_account WHERE login = $1 LIMIT 1`, login)
	p, err := scanProfile(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Profile{}, ErrNotFound
	}
	if err != nil {
		return Profile{}, fmt.Errorf("按 login 查询失败: %w", err)
	}
	return p, nil
}

// Upsert 按 github_id 去重写入档案（等价 prisma.upsert）。
// 插入分支需要提供主键 id（Prisma 用 cuid）；更新分支保留原 id、仅刷新字段与 updated_at。
func (s *Store) Upsert(ctx context.Context, p Profile) (Profile, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO github_account
			(id, "githubId", login, name, "avatarUrl", "htmlUrl", bio, "publicRepos", "createdAt", "updatedAt")
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
		ON CONFLICT ("githubId") DO UPDATE SET
			login = EXCLUDED.login,
			name = EXCLUDED.name,
			"avatarUrl" = EXCLUDED."avatarUrl",
			"htmlUrl" = EXCLUDED."htmlUrl",
			bio = EXCLUDED.bio,
			"publicRepos" = EXCLUDED."publicRepos",
			"updatedAt" = now()
		RETURNING `+scanColumns,
		p.ID, p.GithubID, p.Login, p.Name,
		p.AvatarURL, p.HTMLURL, p.Bio, p.PublicRepos,
	)
	out, err := scanProfile(row)
	if err != nil {
		return Profile{}, fmt.Errorf("upsert 失败: %w", err)
	}
	return out, nil
}
