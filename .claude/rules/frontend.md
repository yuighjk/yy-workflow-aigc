---
description: 前端组件、路由、状态、表单与样式约定（apps/web + packages/ui）
globs: "apps/web/**, packages/ui/**"
---

# 前端

技术栈：**Vite + React + TypeScript**，路由 **TanStack Router（file-based）**，数据 **TanStack Query + tRPC**，表单 **TanStack React Form + zod**，样式 **Tailwind CSS v4**，UI 库 `@yy-workflow-aigc/ui`（shadcn + base-ui），通知 `sonner`，主题 `next-themes`。

## 路由（TanStack Router）

- 文件式路由在 `apps/web/src/routes/`，用 `createFileRoute("/path")({ component })` 声明。
- 受保护路由放 `routes/_auth/` 布局分组；根布局在 `routes/__root.tsx`。
- `routeTree.gen.ts` 为自动生成，**勿手改**（已在 gitignore / biome ignore）。

## 组件

- 一律函数组件；不在组件内部定义组件。
- hooks 只在顶层调用；`useEffect` 依赖数组写全（Biome `useExhaustiveDependencies` 为 info，仍应写对）。
- 列表 `key` 用稳定唯一 id，避免数组索引。
- 优先复用 `@yy-workflow-aigc/ui/components/*`（Button、Input、Label、Card、sonner 等），不要重复造。
- React 19：用 ref 作为 prop，不用 `React.forwardRef`。

## 表单（现有约定，见 sign-in-form.tsx）

- `useForm({ defaultValues, onSubmit, validators: { onSubmit: z.object({...}) } })`。
- 字段用 `<form.Field name="...">`，错误经 `field.state.meta.errors` 渲染在输入框下方。
- 提交态用 `<form.Subscribe selector>` 取 `canSubmit` / `isSubmitting` 控制按钮 disabled 与文案。

## 样式

- Tailwind 工具类为主；类名会被 Biome 自动排序（`clsx`/`cva`/`cn`）。
- 全局主题由 `__root.tsx` 的 `ThemeProvider`（next-themes）控制，默认 `dark`；改局部视觉时不要动全局主题。
- 可访问性：`img` 带 alt、表单 `label` 关联 input、语义化标签、键盘事件与鼠标事件并存。

## 数据获取

- 经 `apps/web/src/utils/trpc.ts` 的 tRPC + TanStack Query 客户端调用后端 procedure，不裸写 fetch。
