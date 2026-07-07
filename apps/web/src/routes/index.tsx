import { createFileRoute, redirect } from "@tanstack/react-router";

// 根路径 / 直接重定向到登录页。
export const Route = createFileRoute("/")({
	beforeLoad: () => {
		throw redirect({ to: "/login" });
	},
});
