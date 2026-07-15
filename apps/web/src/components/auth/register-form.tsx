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
const AUTH_ERROR_MESSAGE = "注册失败，请检查后重试";
const AUTH_UNAVAILABLE_MESSAGE = "注册服务暂不可用，请稍后重试";

const registerSchema = z
	.object({
		username: z.string().min(1, "请输入用户名"),
		email: z
			.string()
			.min(1, "请输入邮箱")
			.regex(EMAIL_REGEX, "请输入正确的邮箱格式"),
		// 密码至少 8 位，与登录表单及 better-auth 默认 minPasswordLength 一致。
		password: z.string().min(1, "请输入密码").min(8, "密码至少 8 位"),
		confirmPassword: z.string().min(1, "请再次输入密码"),
	})
	.refine((v) => v.password === v.confirmPassword, {
		message: "两次输入的密码不一致",
		path: ["confirmPassword"],
	});

/**
 * 注册表单：经 better-auth（authClient.signUp.email）在 Aurora 创建用户，
 * 成功后跳转 /login 让用户手动登录。用户名映射到 better-auth 的 name 字段。
 */
export function RegisterForm() {
	const navigate = useNavigate();
	const [authError, setAuthError] = useState<string | null>(null);

	const form = useForm({
		defaultValues: {
			username: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
		validators: {
			onSubmit: registerSchema,
		},
		onSubmit: async ({ value }) => {
			setAuthError(null);

			try {
				const result = await authClient.signUp.email({
					email: value.email,
					password: value.password,
					name: value.username,
				});

				if (result.error) {
					setAuthError(result.error.message ?? AUTH_ERROR_MESSAGE);
					return;
				}

				await navigate({ to: "/login" });
			} catch {
				setAuthError(AUTH_UNAVAILABLE_MESSAGE);
			}
		},
	});
	/*
<form.Field name="username"> 表单字段，name：字段名

每个字段都有自己的状态，包括其当前值、验证状态、错误消息和其他元数据。
const {
  value,
  meta: { errors, isValidating },
} = field.state
*/
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
				// 用户编辑任一字段即清除错误提示，避免陈旧反馈。
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
				<form.Field name="username">
					{(field) => {
						const hasError = field.state.meta.errors.length > 0;
						return (
							<div className="space-y-1">
								<Label className={LABEL_CLASS} htmlFor={field.name}>
									用户名
								</Label>
								<Input
									aria-describedby={
										hasError ? `${field.name}-error` : undefined
									}
									aria-invalid={hasError || undefined}
									autoComplete="username"
									className={INPUT_CLASS}
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="请输入用户名"
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
									autoComplete="new-password"
									className={INPUT_CLASS}
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="至少 8 位"
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

				<form.Field name="confirmPassword">
					{(field) => {
						const hasError = field.state.meta.errors.length > 0;
						return (
							<div className="space-y-1">
								<Label className={LABEL_CLASS} htmlFor={field.name}>
									确认密码
								</Label>
								<Input
									aria-describedby={
										hasError ? `${field.name}-error` : undefined
									}
									aria-invalid={hasError || undefined}
									autoComplete="new-password"
									className={INPUT_CLASS}
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="再次输入密码"
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
							{isSubmitting ? "注册中..." : "注册"}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</div>
	);
}
