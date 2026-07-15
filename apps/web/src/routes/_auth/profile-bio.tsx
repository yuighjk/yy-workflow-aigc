import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@yy-workflow-aigc/ui/components/button";
import { Input } from "@yy-workflow-aigc/ui/components/input";
import { Label } from "@yy-workflow-aigc/ui/components/label";
import { useState } from "react";

export const Route = createFileRoute("/_auth/profile-bio")({
	component: ProfileBioPage,
});

// Go 微服务地址（作业 Phase 1：本地直连，非经 tRPC）。
const PROFILE_GO_URL =
	(import.meta as { env?: Record<string, string> }).env?.VITE_PROFILE_GO_URL ??
	"http://localhost:8080";

interface BioResponse {
	bio: string;
	login: string;
}

function ProfileBioPage() {
	const [login, setLogin] = useState("");
	const [bio, setBio] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setBio(null);
		setLoading(true);
		try {
			const res = await fetch(
				`${PROFILE_GO_URL}/profile/bio?login=${encodeURIComponent(login)}`
			);
			const data = (await res.json()) as BioResponse & { error?: string };
			if (!res.ok) {
				setError(data.error ?? `请求失败：${res.status}`);
				return;
			}
			setBio(data.bio);
		} catch {
			setError("无法连接到 Go 服务，请确认服务已启动");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="mx-auto w-full max-w-2xl px-4 py-8">
			<h1 className="mb-1 font-semibold text-2xl text-gray-900">
				生成个人简介
			</h1>
			<p className="mb-6 text-gray-500 text-sm">
				输入已保存的 GitHub 用户名，由 Go 服务读取档案并生成一段个人简介。
			</p>

			<form
				className="mb-8 rounded-lg border border-gray-200 bg-white p-6"
				onSubmit={handleSubmit}
			>
				<Label className="mb-1.5 text-gray-700 text-sm" htmlFor="login">
					GitHub 用户名
				</Label>
				<Input
					autoComplete="off"
					className="h-11 rounded-lg border-gray-300 bg-white text-gray-900 text-sm"
					id="login"
					onChange={(e) => setLogin(e.target.value)}
					placeholder="例如：octocat"
					value={login}
				/>
				{error ? <p className="mt-2 text-red-600 text-sm">{error}</p> : null}
				<Button
					className="mt-4 h-11 w-full rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-700"
					disabled={loading || login.length === 0}
					type="submit"
				>
					{loading ? "生成中..." : "生成简介"}
				</Button>
			</form>

			{bio ? (
				<div
					className="rounded-lg border border-gray-200 bg-white p-6"
					role="status"
				>
					<h2 className="mb-2 font-medium text-gray-900 text-lg">简介结果</h2>
					<p className="text-gray-700 leading-relaxed">{bio}</p>
				</div>
			) : null}
		</div>
	);
}
