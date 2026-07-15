import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@yy-workflow-aigc/api/context";
import { appRouter } from "@yy-workflow-aigc/api/routers/index";
import { auth } from "@yy-workflow-aigc/auth";
import { env } from "@yy-workflow-aigc/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// Hono 应用本体（不含具体运行时）。Node 入口(index.ts)与 Lambda 入口(lambda.ts)共用。
export const app = new Hono();

// https://hono.dev/docs/ app.use ( [path,] 中间件)
// logger：中间件，传入请求，传出响应等。

// 路由逻辑只写一份：app.ts
// 本地运行用：index.ts
// AWS Lambda 运行用：lambda.ts
app.use(logger());
app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	})
);
// 多种方法
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => createContext({ context }),
	})
);

app.get("/", (c) => c.text("OK"));
