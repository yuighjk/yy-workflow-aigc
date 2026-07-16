import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_SERVER_URL: z.url(),
		// Go profile 微服务地址（作业 Phase 1 本地直连，如 http://localhost:8080）。
		VITE_PROFILE_GO_URL: z.url().default("http://localhost:8080"),
		// Cloudflare PR Preview 注入；正式环境为空，不发送 PR 路由 Header。
		VITE_PR_NUMBER: z.string().regex(/^\d+$/).optional(),
	},
	runtimeEnv: (import.meta as unknown as { env: Record<string, string> }).env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
