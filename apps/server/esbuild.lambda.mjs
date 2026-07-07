// 把 Hono Lambda 入口打成单文件 ESM bundle，产物给 SAM 打包上传。
// Prisma 7 用纯 JS 的 driver-adapter 引擎（无原生二进制），可整体 bundle。
import { copyFileSync, mkdirSync, rmSync } from "node:fs";

import { build } from "esbuild";

const outdir = process.env.ARTIFACTS_DIR ?? "dist-lambda";

// 清空产物目录，避免残留旧文件（如早期的 CJS index.js）。
rmSync(outdir, { recursive: true, force: true });

await build({
	entryPoints: ["src/lambda.ts"],
	bundle: true,
	platform: "node",
	target: "node22",
	format: "esm",
	// ESM 输出 + .mjs 让 import.meta 正常工作；Lambda handler 指向 index.mjs。
	outfile: `${outdir}/index.mjs`,
	// workspace 包一并打进来（与 tsdown 的 noExternal 一致）；pg 等三方依赖也 bundle 进单文件。
	minify: true,
	sourcemap: false,
	// esbuild 把 ESM bundle 里对 CJS 内置的 require 垫平（部分依赖用到 createRequire）。
	banner: {
		js: "import{createRequire as __cr}from'module';const require=__cr(import.meta.url);",
	},
	logLevel: "info",
});

// 把 RDS CA bundle 一并放进产物（Lambda 运行时用 RDS_CA_PATH=/var/task/certs/... 读取）。
mkdirSync(`${outdir}/certs`, { recursive: true });
copyFileSync(
	"../../packages/db/certs/rds-global-bundle.pem",
	`${outdir}/certs/rds-global-bundle.pem`
);
