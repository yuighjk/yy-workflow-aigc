import { handle } from "hono/aws-lambda";

import { app } from "./app";

// 打包工具从 lambda.ts -> app.ts -> appRouter/auth -> prisma 一路追依赖，都会打进去。
// AWS Lambda 入口：由 API Gateway (HTTP API / payload v2) 触发。
export const handler = handle(app);
