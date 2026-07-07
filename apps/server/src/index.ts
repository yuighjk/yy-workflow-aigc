import { serve } from "@hono/node-server";

import { app } from "./app";

// 本地开发入口：以 Node 常驻服务运行（pnpm dev → tsx watch）。
serve(
	{
		fetch: app.fetch,
		port: 3000,
	},
	(info) => {
		process.stdout.write(
			`Server is running on http://localhost:${info.port}\n`
		);
	}
);
