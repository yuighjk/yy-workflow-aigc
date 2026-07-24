package main

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestReadinessHealthy(t *testing.T) {
	handler := &Handler{
		checkDatabase: func(context.Context) error { return nil },
	}
	request := httptest.NewRequest(http.MethodGet, "/health", nil)
	response := httptest.NewRecorder()

	handler.Routes().ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("期望状态码 %d，实际为 %d", http.StatusOK, response.Code)
	}
	if !strings.Contains(response.Body.String(), `"database":"ok"`) {
		t.Fatalf("期望数据库状态为 ok，实际响应为 %s", response.Body.String())
	}
}

func TestReadinessDatabaseUnavailable(t *testing.T) {
	handler := &Handler{
		checkDatabase: func(context.Context) error {
			return errors.New("数据库不可用")
		},
	}
	request := httptest.NewRequest(http.MethodGet, "/health", nil)
	response := httptest.NewRecorder()

	handler.Routes().ServeHTTP(response, request)

	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf(
			"期望状态码 %d，实际为 %d",
			http.StatusServiceUnavailable,
			response.Code,
		)
	}
	if !strings.Contains(response.Body.String(), `"database":"unavailable"`) {
		t.Fatalf("期望数据库状态为 unavailable，实际响应为 %s", response.Body.String())
	}
}
