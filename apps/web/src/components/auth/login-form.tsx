import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { Button } from "@yy-workflow-aigc/ui/components/button";
import { Input } from "@yy-workflow-aigc/ui/components/input";
import { Label } from "@yy-workflow-aigc/ui/components/label";
import { useState } from "react";
import z from "zod";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOCK_DELAY_MS = 400;

const INPUT_CLASS =
	"h-11 rounded-lg border-gray-300 bg-white text-gray-900 text-sm";
const LABEL_CLASS = "mb-1.5 text-gray-700 text-sm";
const ERROR_CLASS = "text-red-600 text-sm";

const loginSchema = z.object({
	email: z
		.string()
		.min(1, "请输入邮箱")
		.regex(EMAIL_REGEX, "请输入正确的邮箱格式"),
	password: z.string().min(1, "请输入密码").min(6, "密码至少 6 位"),
});

/** 登录表单（纯前端 mock）：校验通过后模拟延迟并在页内展示"登录成功"，不跳转。 */
export function LoginForm() {
	const [succeeded, setSucceeded] = useState(false);

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		validators: {
			onSubmit: loginSchema,
		},
		onSubmit: async () => {
			setSucceeded(false);
			// 本阶段用 300–500ms 模拟请求延迟（PRD §7.3），无真实后端。
			await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
			setSucceeded(true);
		},
	});

	return (
		<div>
			{succeeded ? (
				<div
					className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700 text-sm"
					role="status"
				>
					<span>登录成功</span>
					<Link
						className="ml-2 font-medium text-blue-600 hover:underline"
						to="/github"
					>
						查看 GitHub 账户 →
					</Link>
				</div>
			) : null}

			<form
				className="space-y-4"
				// 成功后用户编辑任一字段即清除"登录成功"提示，避免陈旧反馈。
				onChange={() => {
					if (succeeded) {
						setSucceeded(false);
					}
				}}
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
			>
				<form.Field name="email">
					{(field) => {
						const hasError = field.state.meta.errors.length > 0;
						return (
							<div className="space-y-1">
								<Label className={LABEL_CLASS} htmlFor={field.name}>
									邮箱
								</Label>
								<Input
									aria-describedby={
										hasError ? `${field.name}-error` : undefined
									}
									aria-invalid={hasError || undefined}
									autoComplete="email"
									className={INPUT_CLASS}
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="you@example.com"
									type="email"
									value={field.state.value}
								/>
								{hasError ? (
									<div className={ERROR_CLASS} id={`${field.name}-error`}>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message}>{error?.message}</p>
										))}
									</div>
								) : null}
							</div>
						);
					}}
				</form.Field>

				<form.Field name="password">
					{(field) => {
						const hasError = field.state.meta.errors.length > 0;
						return (
							<div className="space-y-1">
								<Label className={LABEL_CLASS} htmlFor={field.name}>
									密码
								</Label>
								<Input
									aria-describedby={
										hasError ? `${field.name}-error` : undefined
									}
									aria-invalid={hasError || undefined}
									autoComplete="current-password"
									className={INPUT_CLASS}
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="至少 6 位"
									type="password"
									value={field.state.value}
								/>
								{hasError ? (
									<div className={ERROR_CLASS} id={`${field.name}-error`}>
										{field.state.meta.errors.map((error) => (
											<p key={error?.message}>{error?.message}</p>
										))}
									</div>
								) : null}
							</div>
						);
					}}
				</form.Field>

				<form.Subscribe
					selector={(state) => ({
						canSubmit: state.canSubmit,
						isSubmitting: state.isSubmitting,
					})}
				>
					{({ canSubmit, isSubmitting }) => (
						<Button
							className="h-11 w-full rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-700"
							disabled={!canSubmit || isSubmitting}
							type="submit"
						>
							{isSubmitting ? "登录中..." : "登录"}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</div>
	);
}
