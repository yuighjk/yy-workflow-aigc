import { TRPCError } from "@trpc/server";
import prisma from "@yy-workflow-aigc/db";
import { z } from "zod";

import { publicProcedure, router } from "../index";

// GitHub PAT 格式：经典 token(ghp_) 或细粒度 token(github_pat_)。
const TOKEN_REGEX = /^(ghp_|github_pat_)/;

interface GithubUser {
	avatar_url: string;
	bio: string | null;
	html_url: string;
	id: number;
	login: string;
	name: string | null;
	public_repos: number;
}

// 从拉到的 GitHub 用户里挑出要落库的 profile 字段（不含 token）。
function toProfile(u: GithubUser) {
	return {
		login: u.login,
		name: u.name,
		avatarUrl: u.avatar_url,
		htmlUrl: u.html_url,
		bio: u.bio,
		publicRepos: u.public_repos,
	};
}

// https://docs.github.com/zh/rest/users/users?apiVersion=2026-03-10
export const githubRouter = router({
	// 列出已保存的 GitHub 账户卡片（最新在前）。
	list: publicProcedure.query(() =>
		prisma.githubAccount.findMany({ orderBy: { createdAt: "desc" } })
	),

	// 用用户提交的 PAT 调 GitHub /user，拉取 profile 并 upsert（按 githubId 去重）。token 不落库。
	fetchAndSave: publicProcedure
		.input(
			z.object({
				token: z
					.string()
					.min(1, "请输入 token")
					.regex(TOKEN_REGEX, "token 格式应以 ghp_ 或 github_pat_ 开头"),
			})
		)
		.mutation(async ({ input }) => {
			const res = await fetch("https://api.github.com/user", {
				headers: {
					Authorization: `Bearer ${input.token}`,
					Accept: "application/vnd.github+json",
					"User-Agent": "yy-workflow-aigc",
					"X-GitHub-Api-Version": "2022-11-28",
				},
			});

			if (res.status === 401) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "GitHub token 无效或已过期",
				});
			}
			if (!res.ok) {
				throw new TRPCError({
					code: "BAD_GATEWAY",
					message: `GitHub API 请求失败：${res.status}`,
				});
			}

			const user = (await res.json()) as GithubUser;
			const profile = toProfile(user);

			return prisma.githubAccount.upsert({
				where: { githubId: user.id },
				create: { githubId: user.id, ...profile },
				update: profile,
			});
		}),

	// 删除整条已保存的账户记录（整张卡片）。
	remove: publicProcedure
		.input(z.object({ id: z.string().min(1) }))
		.mutation(({ input }) =>
			prisma.githubAccount.delete({ where: { id: input.id } })
		),
});
