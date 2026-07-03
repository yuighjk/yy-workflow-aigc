import type { ReactNode } from "react";

const PRODUCT_NAME = "AIGC Workflow";

/**
 * 认证页共享面板 shell：浅色、居中、圆角白卡片。
 * 显式使用浅色具名类，不依赖全局暗色主题（见 specs/1.user-auth-login/design.md 技术决策）。
 */
export function AuthPanel({
	title,
	children,
	footer,
}: {
	title: string;
	children: ReactNode;
	footer?: ReactNode;
}) {
	return (
		<div className="flex min-h-full items-center justify-center bg-[#f6f8fb] px-4 py-8">
			<div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm ring-1 ring-gray-200">
				<div className="mb-6 text-center">
					<p className="font-semibold text-blue-600 text-lg">{PRODUCT_NAME}</p>
					<h1 className="mt-2 font-semibold text-gray-900 text-xl">{title}</h1>
				</div>
				{children}
				{footer ? (
					<div className="mt-6 text-center text-gray-500 text-sm">{footer}</div>
				) : null}
			</div>
		</div>
	);
}
