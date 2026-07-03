import { createFileRoute, Link } from "@tanstack/react-router";

import { AuthPanel } from "@/components/auth/auth-panel";
import { LoginForm } from "@/components/auth/login-form";

export const Route = createFileRoute("/login")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<AuthPanel
			footer={
				<>
					还没有账号？
					<Link className="text-blue-600 hover:underline" to="/register">
						去注册
					</Link>
				</>
			}
			title="登录"
		>
			<LoginForm />
		</AuthPanel>
	);
}
