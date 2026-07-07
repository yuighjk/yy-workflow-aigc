import { createPrismaClient } from "@yy-workflow-aigc/db";
import { env } from "@yy-workflow-aigc/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

export function createAuth() {
	const prisma = createPrismaClient();

	// 生产为跨域 https 部署，需 sameSite:none + secure 才能种下会话 cookie；
	// 本地开发是 http://localhost，secure cookie 会被浏览器拒收，故放宽为 lax + 非 secure。
	const isProduction = env.NODE_ENV === "production";

	return betterAuth({
		database: prismaAdapter(prisma, {
			provider: "postgresql",
		}),

		trustedOrigins: env.CORS_ORIGIN,
		emailAndPassword: {
			enabled: true,
			// 注册后不自动登录：前端注册成功即跳 /login 由用户手动登录（两步式流程）。
			autoSignIn: false,
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: isProduction ? "none" : "lax",
				secure: isProduction,
				httpOnly: true,
			},
		},
		plugins: [],
	});
}

export const auth = createAuth();
