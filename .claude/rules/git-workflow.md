---
description: 分支、commit、PR 规范
---

# Git 工作流

> 现状：仓库仅有单条 `initial commit`，主分支 `master`，尚未形成历史约定。以下为团队推荐规范。

## 分支

- 主分支：`master`（保护，禁止直接 push 大改动）。
- 特性分支：`feature/{feature-name}`，对应 specs 里的 feature（如 `feature/user-auth-login`）。
- 修复分支：`fix/{短描述}`；杂项：`chore/{短描述}`。

## Commit（推荐 Conventional Commits）

格式：`type(scope): 简述`

- **type**：`feat` / `fix` / `chore` / `refactor` / `docs` / `test` / `style` / `perf`。
- **scope**（可选，用 workspace 名）：`web`、`server`、`api`、`auth`、`db`、`ui`、`env`。
- 例：`feat(web): 新增 /register 注册页与表单校验`、`fix(api): 修正登录 procedure 错误码`。
- 一次 commit 只做一件事；提交前跑 `pnpm check` 确保 lint 通过。

## PR

- 标题沿用 commit 规范；正文说明改动动机、影响范围、验证方式。
- 关联对应 spec/任务 ID（如 `2.T-003`）。
- 合并前确保 `pnpm check-types` 与 `pnpm check` 通过。

## 约束

- 仅在用户明确要求时才 commit / push；当前在主分支上要先开分支再改。
- commit 信息末尾按仓库约定附署名（如需）。
