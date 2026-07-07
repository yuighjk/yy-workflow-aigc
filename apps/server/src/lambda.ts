import { handle } from "hono/aws-lambda";

import { app } from "./app";

// AWS Lambda 入口：由 API Gateway (HTTP API / payload v2) 触发。
export const handler = handle(app);
