package main

import (
	"crypto/rand"
	"encoding/hex"
)

// newID 生成一个用于 github_account.id 的唯一标识。
// 现有表 id 是 Prisma 的 cuid（字符串主键），这里用带前缀的随机十六进制串即可满足唯一性要求，
// 不追求与 cuid 完全同构（仅需在本服务插入新行时提供合法字符串主键）。
func newID() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		// crypto/rand 失败极罕见；退化为固定前缀避免 panic（调用方仍能 upsert）。
		return "c_fallback_id"
	}
	return "c_" + hex.EncodeToString(buf)
}
