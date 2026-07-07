import path from "node:path";
import { expect, test } from "@playwright/test";

const SCREENSHOTS_DIR = path.join(import.meta.dirname, "../../screenshots");

// URL 断言用的顶层正则常量（biome useTopLevelRegex）。
const REGISTER_URL = /\/register/;
const LOGIN_URL = /\/login/;
const DASHBOARD_URL = /\/dashboard/;

test.describe("Register Page — Feature 2 AC Verification", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/register");
		await page.waitForLoadState("networkidle");
	});

	// AC-001: User can open /register page
	test("AC-001 — /register page renders without error", async ({ page }) => {
		await expect(page).toHaveURL(REGISTER_URL);
		const title = page.locator("h1");
		await expect(title).toBeVisible();
	});

	// AC-002: Register page contains username, email, password, confirmPassword, button, login link
	test("AC-002 — page contains all 4 inputs, register button, and login link", async ({
		page,
	}) => {
		// Product name
		await expect(page.getByText("AIGC Workflow")).toBeVisible();
		// Title "注册"
		await expect(page.locator("h1")).toHaveText("注册");
		// Username input (no type attribute, so use name or placeholder)
		await expect(
			page.locator('input[name="username"], input[placeholder="请输入用户名"]')
		).toBeVisible();
		// Email input
		await expect(page.locator('input[type="email"]')).toBeVisible();
		// Password inputs (2: password + confirmPassword)
		const passwordInputs = page.locator('input[type="password"]');
		await expect(passwordInputs).toHaveCount(2);
		// Register button
		await expect(page.getByRole("button", { name: "注册" })).toBeVisible();
		// Login link
		await expect(page.getByRole("link", { name: "去登录" })).toBeVisible();
	});

	// AC-003: Empty form submission shows required errors for all 4 fields
	test("AC-003 — empty form shows required errors for all 4 fields", async ({
		page,
	}) => {
		await page.getByRole("button", { name: "注册" }).click();
		await expect(page.getByText("请输入用户名")).toBeVisible();
		await expect(page.getByText("请输入邮箱")).toBeVisible();
		await expect(page.getByText("请输入密码")).toBeVisible();
		await expect(page.getByText("请再次输入密码")).toBeVisible();
	});

	// AC-004: Invalid email format shows format error
	test("AC-004 — invalid email format shows format error", async ({ page }) => {
		await page
			.locator('input[name="username"], input[placeholder="请输入用户名"]')
			.fill("testuser");
		await page.locator('input[type="email"]').fill("notanemail");
		await page.locator('input[name="password"]').fill("123456");
		await page.locator('input[name="confirmPassword"]').fill("123456");
		await page.getByRole("button", { name: "注册" }).click();
		await expect(page.getByText("请输入正确的邮箱格式")).toBeVisible();
	});

	// AC-005: Password shorter than 8 chars shows length error
	// （对齐 better-auth 默认 minPasswordLength=8 与登录表单）
	test("AC-005 — password shorter than 8 chars shows length error", async ({
		page,
	}) => {
		await page
			.locator('input[name="username"], input[placeholder="请输入用户名"]')
			.fill("testuser");
		await page.locator('input[type="email"]').fill("test@example.com");
		await page.locator('input[name="password"]').fill("123");
		await page.locator('input[name="confirmPassword"]').fill("123");
		await page.getByRole("button", { name: "注册" }).click();
		await expect(page.getByText("密码至少 8 位")).toBeVisible();
	});

	// AC-006: Mismatched passwords show mismatch error
	test("AC-006 — mismatched passwords show 两次输入的密码不一致", async ({
		page,
	}) => {
		await page
			.locator('input[name="username"], input[placeholder="请输入用户名"]')
			.fill("testuser");
		await page.locator('input[type="email"]').fill("test@example.com");
		await page.locator('input[name="password"]').fill("123456");
		await page.locator('input[name="confirmPassword"]').fill("654321");
		await page.getByRole("button", { name: "注册" }).click();
		await expect(page.getByText("两次输入的密码不一致")).toBeVisible();
	});

	// AC-007: Submit button shows "注册中..." and is disabled while signup is in flight.
	// 拦截 better-auth 注册请求并延迟返回，以便观察 loading 态（不打真实后端/Aurora）。
	test("AC-007 — submit button shows loading state (注册中...) during signup", async ({
		page,
	}) => {
		await page.route("**/sign-up/email", async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 800));
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					token: "test-token",
					user: { id: "u1", email: "test@example.com", name: "testuser" },
				}),
			});
		});

		await page
			.locator('input[name="username"], input[placeholder="请输入用户名"]')
			.fill("testuser");
		await page.locator('input[type="email"]').fill("test@example.com");
		await page.locator('input[name="password"]').fill("12345678");
		await page.locator('input[name="confirmPassword"]').fill("12345678");

		await page.getByRole("button", { name: "注册" }).click();

		await expect(page.getByRole("button", { name: "注册中..." })).toBeVisible({
			timeout: 2000,
		});
		await expect(
			page.getByRole("button", { name: "注册中..." })
		).toBeDisabled();
	});

	// AC-008: Successful registration creates the user (via better-auth) and navigates to /dashboard.
	// 拦截注册 + 会话查询，验证成功后自动登录并跳转（前端契约，不依赖真实 Aurora）。
	test("AC-008 — successful registration navigates to /dashboard", async ({
		page,
	}) => {
		await page.route("**/sign-up/email", (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					token: "test-token",
					user: { id: "u1", email: "test@example.com", name: "testuser" },
				}),
			})
		);
		// /dashboard 的路由守卫会调用 get-session，返回一个有效会话让其通过。
		await page.route("**/get-session", (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					session: {
						id: "s1",
						userId: "u1",
						expiresAt: "2999-01-01T00:00:00.000Z",
					},
					user: { id: "u1", email: "test@example.com", name: "testuser" },
				}),
			})
		);

		await page
			.locator('input[name="username"], input[placeholder="请输入用户名"]')
			.fill("testuser");
		await page.locator('input[type="email"]').fill("test@example.com");
		await page.locator('input[name="password"]').fill("12345678");
		await page.locator('input[name="confirmPassword"]').fill("12345678");
		await page.getByRole("button", { name: "注册" }).click();

		await page.waitForURL(DASHBOARD_URL);
		await expect(page).toHaveURL(DASHBOARD_URL);
		await expect(
			page.getByRole("heading", { name: "Dashboard" })
		).toBeVisible();
	});

	// AC-008 extension: clicking 去登录 navigates to /login
	test("AC-008 (ext) — 去登录 link navigates to /login", async ({ page }) => {
		await page.getByRole("link", { name: "去登录" }).click();
		await page.waitForURL(LOGIN_URL);
		await expect(page).toHaveURL(LOGIN_URL);
	});
});

// Console error check
test.describe("Register Page — Console Error Check", () => {
	test("no JS console errors on /register", async ({ page }) => {
		const errors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				errors.push(msg.text());
			}
		});
		page.on("pageerror", (err) => {
			errors.push(err.message);
		});

		await page.goto("/register");
		await page.waitForLoadState("networkidle");

		const realErrors = errors.filter(
			(e) =>
				!(
					e.includes("Download the React DevTools") ||
					e.includes("favicon") ||
					e.includes("ERR_ABORTED")
				)
		);
		expect(
			realErrors,
			`Console errors found: ${realErrors.join("\n")}`
		).toHaveLength(0);
	});
});

// AC-009: Screenshots at desktop and mobile viewports
test.describe("Register Page — Screenshots (AC-009)", () => {
	test("desktop 1280x800 screenshot", async ({ page, browserName }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto("/register");
		await page.waitForLoadState("networkidle");
		const screenshotPath = path.join(
			SCREENSHOTS_DIR,
			`register-desktop-${browserName}.png`
		);
		await page.screenshot({ path: screenshotPath, fullPage: false });
		console.log(`Screenshot saved: ${screenshotPath}`);
	});

	test("mobile 375x812 screenshot", async ({ page, browserName }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto("/register");
		await page.waitForLoadState("networkidle");
		const screenshotPath = path.join(
			SCREENSHOTS_DIR,
			`register-mobile-${browserName}.png`
		);
		await page.screenshot({ path: screenshotPath, fullPage: false });
		console.log(`Screenshot saved: ${screenshotPath}`);
	});
});
