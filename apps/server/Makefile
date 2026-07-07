# SAM 用 makefile 构建方式调用此目标（BuildMethod: makefile）。
# 注意：sam build 会把源码复制到临时目录再执行本 Makefile，那里没有 pnpm 的 node_modules，
# 也无法用仓库相对路径访问其它包。所以先由 `pnpm --filter server build:lambda` 预打包到
# 源目录的 dist-lambda/（含 index.mjs + certs/ 证书），本目标只把整个目录复制进 ARTIFACTS_DIR。
build-ServerFunction:
	cp -r dist-lambda/. "$(ARTIFACTS_DIR)/"
