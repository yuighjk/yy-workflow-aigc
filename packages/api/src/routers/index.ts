import { protectedProcedure, publicProcedure, router } from "../index";
import { githubRouter } from "./github";

// 用于publicProcedure.query()向路由器添加查询过程。
export const appRouter = router({
	healthCheck: publicProcedure.query(() => "OK"),
	privateData: protectedProcedure.query(({ ctx }) => ({
		message: "This is private",
		user: ctx.session.user,
	})),
	github: githubRouter,
});
export type AppRouter = typeof appRouter;
