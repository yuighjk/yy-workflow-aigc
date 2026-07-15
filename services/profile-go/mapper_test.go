package main

import "testing"

func TestToProfile(t *testing.T) {
	u := GithubUser{
		ID: 42, Login: "octocat", Name: "The Octocat",
		AvatarURL: "https://a.png", HTMLURL: "https://github.com/octocat",
		Bio: "hi", PublicRepos: 8,
	}
	p := ToProfile(u)

	if p.GithubID != 42 || p.Login != "octocat" || p.PublicRepos != 8 {
		t.Fatalf("标量字段映射错误: %+v", p)
	}
	if p.Name == nil || *p.Name != "The Octocat" {
		t.Fatalf("Name 应为指针且等于原值, got %v", p.Name)
	}
	if p.ID == "" {
		t.Fatal("ID 应被生成，不能为空")
	}
}

func TestToProfile_EmptyNullableToNil(t *testing.T) {
	// GitHub 对空字段返回 ""，应落库为 NULL（nil 指针）。
	p := ToProfile(GithubUser{ID: 1, Login: "x"})
	if p.Name != nil || p.Bio != nil || p.AvatarURL != nil || p.HTMLURL != nil {
		t.Fatalf("空字段应映射为 nil, got name=%v bio=%v avatar=%v html=%v",
			p.Name, p.Bio, p.AvatarURL, p.HTMLURL)
	}
}

func strptr(s string) *string { return &s }

func TestBuildBio_FullFields(t *testing.T) {
	p := Profile{
		Login: "octocat", Name: strptr("The Octocat"),
		Bio: strptr("Building things"), HTMLURL: strptr("https://github.com/octocat"),
		PublicRepos: 8,
	}
	got := BuildBio(p)
	for _, want := range []string{"The Octocat", "@octocat", "8 个", "Building things", "https://github.com/octocat"} {
		if !contains(got, want) {
			t.Errorf("简介应包含 %q，实际: %s", want, got)
		}
	}
}

func TestBuildBio_NoNameFallsBackToLogin(t *testing.T) {
	p := Profile{Login: "octocat", PublicRepos: 0}
	got := BuildBio(p)
	if !contains(got, "octocat") {
		t.Errorf("无 name 时应以 login 作称呼，实际: %s", got)
	}
	// 无 name 时称呼即 login，不应再出现 (@login) 后缀。
	if contains(got, "@octocat") {
		t.Errorf("称呼已是 login 时不应再附 @login，实际: %s", got)
	}
}

func TestBuildBio_NoBioNoURL(t *testing.T) {
	p := Profile{Login: "x", Name: strptr("X"), PublicRepos: 3}
	got := BuildBio(p)
	if contains(got, "个人简介") || contains(got, "主页") {
		t.Errorf("无 bio/url 时不应出现对应片段，实际: %s", got)
	}
}

// contains 是 strings.Contains 的薄封装，避免测试文件再引入依赖。
func contains(s, sub string) bool {
	return len(s) >= len(sub) && indexOf(s, sub) >= 0
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
