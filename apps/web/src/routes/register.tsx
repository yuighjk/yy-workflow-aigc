import { createFileRoute, Link } from "@tanstack/react-router";

import { AuthPanel } from "@/components/auth/auth-panel";
import { RegisterForm } from "@/components/auth/register-form";

export const Route = createFileRoute("/register")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<AuthPanel
			footer={
				<>
					已有账号？
					<Link className="text-blue-600 hover:underline" to="/login">
						去登录
					</Link>
				</>
			}
			title="注册"
		>
			<RegisterForm />
		</AuthPanel>
	);
}
