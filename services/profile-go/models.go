package main

// GithubUser 是 GitHub GET /user 响应里我们关心的字段（snake_case 对应 API JSON）。
type GithubUser struct {
	ID          int64  `json:"id"`
	Login       string `json:"login"`
	Name        string `json:"name"`
	AvatarURL   string `json:"avatar_url"`
	HTMLURL     string `json:"html_url"`
	Bio         string `json:"bio"`
	PublicRepos int    `json:"public_repos"`
}

// Profile 是落库/对外返回的档案结构，对应现有 Prisma 表 github_account。
// 指针字段表示该列可空（name/avatarUrl/htmlUrl/bio 在 schema 里是可选）。
type Profile struct {
	ID          string  `json:"id"`
	GithubID    int64   `json:"githubId"`
	Login       string  `json:"login"`
	Name        *string `json:"name"`
	AvatarURL   *string `json:"avatarUrl"`
	HTMLURL     *string `json:"htmlUrl"`
	Bio         *string `json:"bio"`
	PublicRepos int     `json:"publicRepos"`
}
