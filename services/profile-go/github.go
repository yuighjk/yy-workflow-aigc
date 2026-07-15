package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"time"
)

// tokenRegex 校验 GitHub PAT 格式：经典 token(ghp_) 或细粒度 token(github_pat_)。
// 与现有 Node 版 packages/api/src/routers/github.ts 的 TOKEN_REGEX 保持一致。
var tokenRegex = regexp.MustCompile(`^(ghp_|github_pat_)`)

// 迁移自 Node 版的哨兵错误：token 无效 / GitHub 上游异常，分别映射到 401 / 502。
var (
	ErrInvalidToken   = errors.New("GitHub token 无效或已过期")
	ErrGithubUpstream = errors.New("GitHub API 请求失败")
)

// ValidateToken 校验 token 非空且格式合法。
func ValidateToken(token string) error {
	if token == "" {
		return errors.New("请输入 token")
	}
	if !tokenRegex.MatchString(token) {
		return errors.New("token 格式应以 ghp_ 或 github_pat_ 开头")
	}
	return nil
}

// githubClient 是带超时的 HTTP 客户端，供调用 GitHub API 复用。
var githubClient = &http.Client{Timeout: 10 * time.Second}

// FetchUser 用 PAT 调 GitHub GET /user 拉取当前用户资料。
// 迁移自 Node 版 fetchAndSave：相同的请求头；401 → ErrInvalidToken；非 2xx → ErrGithubUpstream。
// token 仅用于本次请求，不落库、不记录。
func FetchUser(ctx context.Context, token string) (GithubUser, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user", nil)
	if err != nil {
		return GithubUser{}, fmt.Errorf("构造请求失败: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "yy-workflow-aigc")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	res, err := githubClient.Do(req)
	if err != nil {
		return GithubUser{}, fmt.Errorf("%w: %v", ErrGithubUpstream, err)
	}
	defer res.Body.Close()

	if res.StatusCode == http.StatusUnauthorized {
		return GithubUser{}, ErrInvalidToken
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return GithubUser{}, fmt.Errorf("%w：%d", ErrGithubUpstream, res.StatusCode)
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return GithubUser{}, fmt.Errorf("读取响应失败: %w", err)
	}
	var user GithubUser
	if err := json.Unmarshal(body, &user); err != nil {
		return GithubUser{}, fmt.Errorf("解析 GitHub 响应失败: %w", err)
	}
	return user, nil
}
