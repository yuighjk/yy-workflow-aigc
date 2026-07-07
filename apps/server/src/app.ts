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

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => createContext({ context }),
	})
);

app.get("/", (c) => c.text("OK"));
