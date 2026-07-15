import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_SERVER_URL: z.url(),
		// Go profile 微服务地址（作业 Phase 1 本地直连，如 http://localhost:8080）。
		VITE_PROFILE_GO_URL: z.url().default("http://localhost:8080"),
	},
	runtimeEnv: (import.meta as unknown as { env: Record<string, string> }).env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
