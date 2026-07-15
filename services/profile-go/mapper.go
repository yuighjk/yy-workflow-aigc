package main

import (
	"fmt"
	"strings"
)

// ptrOrNil 把字符串转为指针；空串视为 NULL（对应可空列 name/avatarUrl/htmlUrl/bio）。
func ptrOrNil(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// deref 安全解引用，nil 返回空串。
func deref(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

// ToProfile 把 GitHub 用户响应映射为待落库的 Profile（不含 token）。
// 迁移自 Node 版 toProfile；新增 id（Prisma 表主键 cuid，本服务插入新行时生成）。
func ToProfile(u GithubUser) Profile {
	return Profile{
		ID:          newID(),
		GithubID:    u.ID,
		Login:       u.Login,
		Name:        ptrOrNil(u.Name),
		AvatarURL:   ptrOrNil(u.AvatarURL),
		HTMLURL:     ptrOrNil(u.HTMLURL),
		Bio:         ptrOrNil(u.Bio),
		PublicRepos: u.PublicRepos,
	}
}

// BuildBio 根据档案生成一段中文个人简介（作业新增能力）。
// 规则：以 name 优先、否则 login 作称呼；带上公开仓库数；有 bio 则附上；有主页则附链接。
func BuildBio(p Profile) string {
	name := deref(p.Name)
	if name == "" {
		name = p.Login
	}

	var b strings.Builder
	fmt.Fprintf(&b, "%s 是一位 GitHub 开发者", name)
	if p.Login != "" && p.Login != name {
		fmt.Fprintf(&b, "（@%s）", p.Login)
	}
	fmt.Fprintf(&b, "，目前公开仓库 %d 个。", p.PublicRepos)

	if bio := deref(p.Bio); bio != "" {
		fmt.Fprintf(&b, "个人简介：%s。", strings.TrimSpace(bio))
	}
	if url := deref(p.HTMLURL); url != "" {
		fmt.Fprintf(&b, "主页：%s", url)
	}
	return b.String()
}
