import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@yy-workflow-aigc/ui/components/button";
import { Input } from "@yy-workflow-aigc/ui/components/input";
import { Label } from "@yy-workflow-aigc/ui/components/label";
import { useState } from "react";
import z from "zod";

import { authClient } from "@/lib/auth-client";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INPUT_CLASS =
	"h-11 rounded-lg border-gray-300 bg-white text-gray-900 text-sm";
const LABEL_CLASS = "mb-1.5 text-gray-700 text-sm";
const ERROR_CLASS = "text-red-600 text-sm";
const AUTH_ERROR_MESSAGE = "邮箱或密码错误，请检查后重试";
const AUTH_UNAVAILABLE_MESSAGE = "登录服务暂不可用，请稍后重试";

const loginSchema = z.object({
	email: z
		.string()
		.min(1, "请输入邮箱")
		.regex(EMAIL_REGEX, "请输入正确的邮箱格式"),
	password: z.string().min(1, "请输入密码").min(8, "密码至少 8 位"),
});

export function LoginForm() {
	const navigate = useNavigate();
	const [authError, setAuthError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		validators: {
			onSubmit: loginSchema,
		},
		onSubmit: async ({ value }) => {
			setAuthError(null);

			try {
				const result = await authClient.signIn.email({
					email: value.email,
					password: value.password,
				});

				if (result.error) {
					setAuthError(result.error.message ?? AUTH_ERROR_MESSAGE);
					return;
				}

				await navigate({ to: "/dashboard" });
			} catch {
				setAuthError(AUTH_UNAVAILABLE_MESSAGE);
			}
		},
	});

	return (
		<div>
			{authError ? (
				<div
					className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm"
					role="alert"
				>
					{authError}
				</div>
			) : null}

			<form
				className="space-y-4"
				onChange={() => {
					if (authError) {
						setAuthError(null);
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
