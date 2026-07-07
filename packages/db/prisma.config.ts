import path from "node:path";

import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({
	path: "../../apps/server/.env",
});

// prisma generate 不连库、不需要真实 url；用 process.env 兜底一个占位，
// 避免在 CI（无 apps/server/.env）里因缺 DATABASE_URL 直接抛 PrismaConfigEnvError。
// migrate/push 等真正连库的命令仍需在环境里提供真实 DATABASE_URL。
const databaseUrl =
	process.env.DATABASE_URL ??
	"postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
	schema: path.join("prisma", "schema"),
	migrations: {
		path: path.join("prisma", "migrations"),
	},
	datasource: {
		url: databaseUrl,
	},
});
