package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"
)

const databaseHealthTimeout = 3 * time.Second

// Handler 持有依赖（数据库 Store），提供各 HTTP handler。
type Handler struct {
	checkDatabase func(context.Context) error
	store         *Store
}

// NewHandler 构造 Handler。
func NewHandler(store *Store) *Handler {
	return &Handler{checkDatabase: store.Health, store: store}
}

// Routes 注册所有路由并返回 mux。
func (h *Handler) Routes() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", h.health)
	mux.HandleFunc("GET /health", h.readiness)
	mux.HandleFunc("GET /profile/list", h.list)
	mux.HandleFunc("POST /profile/fetch", h.fetch)
	mux.HandleFunc("GET /profile/bio", h.bio)
	return mux
}

// writeJSON 统一输出 JSON。
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// writeErr 输出统一的错误 JSON。
func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// health 健康检查：不依赖数据库，供 ALB/ECS 探活。
func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}

// readiness 执行 SELECT 1，供 AWS Synthetics 巡检应用到数据库的完整链路。
func (h *Handler) readiness(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), databaseHealthTimeout)
	defer cancel()

	if err := h.checkDatabase(ctx); err != nil {
		log.Printf("数据库巡检失败: %v", err)
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"database": "unavailable",
			"status":   "error",
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"database": "ok",
		"status":   "ok",
	})
}

// list 列出已保存档案（最新在前）。
func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	profiles, err := h.store.List(r.Context())
	if err != nil {
		log.Printf("list 失败: %v", err)
		writeErr(w, http.StatusInternalServerError, "查询失败")
		return
	}
	writeJSON(w, http.StatusOK, profiles)
}

// fetch 用请求体里的 PAT 调 GitHub 拉取 profile 并 upsert；token 不落库。
func (h *Handler) fetch(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, http.StatusBadRequest, "请求体解析失败")
		return
	}
	if err := ValidateToken(body.Token); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}

	user, err := FetchUser(r.Context(), body.Token)
	if errors.Is(err, ErrInvalidToken) {
		writeErr(w, http.StatusUnauthorized, err.Error())
		return
	}
	if err != nil {
		log.Printf("fetch GitHub 失败: %v", err)
		writeErr(w, http.StatusBadGateway, "GitHub API 请求失败")
		return
	}

	saved, err := h.store.Upsert(r.Context(), ToProfile(user))
	if err != nil {
		log.Printf("upsert 失败: %v", err)
		writeErr(w, http.StatusInternalServerError, "保存失败")
		return
	}
	writeJSON(w, http.StatusOK, saved)
}

// bio 按 login 查库并生成一段中文个人简介。
func (h *Handler) bio(w http.ResponseWriter, r *http.Request) {
	login := r.URL.Query().Get("login")
	if login == "" {
		writeErr(w, http.StatusBadRequest, "缺少 login 参数")
		return
	}

	profile, err := h.store.GetByLogin(r.Context(), login)
	if errors.Is(err, ErrNotFound) {
		writeErr(w, http.StatusNotFound, "未找到该用户，请先在 GitHub 页读取保存")
		return
	}
	if err != nil {
		log.Printf("bio 查询失败: %v", err)
		writeErr(w, http.StatusInternalServerError, "查询失败")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"login": profile.Login,
		"bio":   BuildBio(profile),
	})
}
