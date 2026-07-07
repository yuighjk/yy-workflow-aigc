import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@yy-workflow-aigc/ui/components/button";
import { Input } from "@yy-workflow-aigc/ui/components/input";
import { Label } from "@yy-workflow-aigc/ui/components/label";
import { useState } from "react";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/github")({
	component: GithubPage,
});

function GithubPage() {
	const queryClient = useQueryClient();
	const [token, setToken] = useState("");
	const [error, setError] = useState<string | null>(null);

	const accounts = useQuery(trpc.github.list.queryOptions());

	const invalidateList = () =>
		queryClient.invalidateQueries({ queryKey: trpc.github.list.queryKey() });

	const fetchAndSave = useMutation(
		trpc.github.fetchAndSave.mutationOptions({
			onSuccess: () => {
				setToken("");
				setError(null);
				invalidateList();
			},
			onError: (e) => setError(e.message),
		})
	);

	const remove = useMutation(
		trpc.github.remove.mutationOptions({ onSuccess: invalidateList })
	);

	const savedAccounts = accounts.data ?? [];

	return (
		<div className="mx-auto w-full max-w-2xl px-4 py-8">
			<h1 className="mb-1 font-semibold text-2xl text-gray-900">GitHub 账户</h1>
			<p className="mb-6 text-gray-500 text-sm">
				输入你的 GitHub Personal Access Token 读取并保存账户信息。Token
				仅用于本次读取，不会被存储。
			</p>

			<form
				className="mb-8 rounded-lg border border-gray-200 bg-white p-6"
				onSubmit={(e) => {
					e.preventDefault();
					setError(null);
					fetchAndSave.mutate({ token });
				}}
			>
				<Label className="mb-1.5 text-gray-700 text-sm" htmlFor="github-token">
					Personal Access Token
				</Label>
				<Input
					autoComplete="off"
					className="h-11 rounded-lg border-gray-300 bg-white text-gray-900 text-sm"
					id="github-token"
					onChange={(e) => setToken(e.target.value)}
					placeholder="GitHub Personal Access Token (ghp_xxxx)"
					type="password"
					value={token}
				/>
				{error ? <p className="mt-2 text-red-600 text-sm">{error}</p> : null}
				<Button
					className="mt-4 h-11 w-full rounded-lg bg-blue-600 text-sm text-white hover:bg-blue-700"
					disabled={fetchAndSave.isPending || token.length === 0}
					type="submit"
				>
					{fetchAndSave.isPending ? "读取中..." : "读取并保存"}
				</Button>
			</form>

			<h2 className="mb-3 font-medium text-gray-900 text-lg">已保存的账户</h2>
			{savedAccounts.length > 0 ? (
				<ul className="space-y-3">
					{savedAccounts.map((account) => (
						<li
							className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4"
							key={account.id}
						>
							{account.avatarUrl ? (
								<img
									alt={account.login}
									className="h-12 w-12 rounded-full"
									height={48}
									src={account.avatarUrl}
									width={48}
								/>
							) : null}
							<div className="min-w-0 flex-1">
								<a
									className="font-medium text-blue-600 hover:underline"
									href={account.htmlUrl ?? "#"}
									rel="noopener noreferrer"
									target="_blank"
								>
									{account.name ?? account.login}
								</a>
								<p className="text-gray-500 text-sm">
									@{account.login} · {account.publicRepos} repos
								</p>
								{account.bio ? (
									<p className="mt-1 text-gray-600 text-sm">{account.bio}</p>
								) : null}
							</div>
							<Button
								className="rounded-lg border-gray-300 text-red-600 text-sm hover:bg-red-50"
								disabled={remove.isPending}
								onClick={() => remove.mutate({ id: account.id })}
								type="button"
								variant="outline"
							>
								删除
							</Button>
						</li>
					))}
				</ul>
			) : (
				<p className="text-gray-500 text-sm">还没有保存任何账户。</p>
			)}
		</div>
	);
}
