import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@yy-workflow-aigc/env/server";

import { PrismaClient } from "../prisma/generated/client";

// RDS/Aurora 的 CA bundle，用于对数据库做 TLS 证书校验（verify-full 等价：校验证书链 + 主机名）。
// node-postgres 默认不信任 RDS CA，故显式加载。
// 路径解析：优先用 RDS_CA_PATH 环境变量（Lambda 里指向打进包的绝对路径），
// 否则回退到相对本模块的仓库内路径（本地开发）。
/*
一般本地数据库可能不用 TLS。
Aurora 开 TLS 时，Node 需要信任 RDS 的证书。 packages/db/certs/rds-global-bundle.pem
 */
const caPath =
	process.env.RDS_CA_PATH ??
	fileURLToPath(new URL("../certs/rds-global-bundle.pem", import.meta.url));

// 用来从数据库连接字符串里移除 sslmode=...。
const SSLMODE_RE = /([?&])sslmode=[^&]*(&|$)/;

// 本地/非 RDS（如 localhost）连接不带 TLS：URL 里显式 sslmode=disable 时跳过 ssl 配置。
const useTls = !env.DATABASE_URL.includes("sslmode=disable");

// 剥掉 URL 里的 sslmode，避免 node-postgres 用它覆盖下面显式的 ssl(CA) 配置。
// TLS 完全由 adapter 的 ssl 对象控制（带 RDS CA、校验证书链与主机名）。
function stripSslMode(url: string): string {
	return url.replace(SSLMODE_RE, (_, pre, post) => (post === "&" ? pre : ""));
}
/* ca：信任 AWS RDS CA
rejectUnauthorized: true：如果证书不可信，拒绝连接 */
export function createPrismaClient() {
	const adapter = new PrismaPg({
		connectionString: stripSslMode(env.DATABASE_URL),
		...(useTls
			? {
					ssl: {
						ca: readFileSync(caPath, "utf8"),
						rejectUnauthorized: true,
					},
				}
			: {}),
	});
	return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();
export default prisma;
