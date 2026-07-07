import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		// 支持多个来源：逗号分隔（如 "https://app.example.com,http://localhost:3001"），
		// 解析成去空白的 URL 数组，供 Hono CORS 与 better-auth trustedOrigins 复用。
		CORS_ORIGIN: z
			.string()
			.min(1)
			.transform((value) =>
				value
					.split(",")
					.map((origin) => origin.trim())
					.filter(Boolean)
			)
			.pipe(z.array(z.url()).min(1)),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
	},
	runtimeEnv: process.env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
