import { expect, test } from "@playwright/test";
import path from "path";

const SCREENSHOTS_DIR = path.join(import.meta.dirname, "./screenshots");

test.describe("Register Page — Feature 2 AC Verification", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/register");
		await page.waitForLoadState("networkidle");
	});

	// AC-001: User can open /register page
	test("AC-001 — /register page renders without error", async ({ page }) => {
		await expect(page).toHaveURL(/\/register/);
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

	// AC-005: Password shorter than 6 chars shows length error
	test("AC-005 — password shorter than 6 chars shows length error", async ({
		page,
	}) => {
		await page
			.locator('input[name="username"], input[placeholder="请输入用户名"]')
			.fill("testuser");
		await page.locator('input[type="email"]').fill("test@example.com");
		await page.locator('input[name="password"]').fill("123");
		await page.locator('input[name="confirmPassword"]').fill("123");
		await page.getByRole("button", { name: "注册" }).click();
		await expect(page.getByText("密码至少 6 位")).toBeVisible();
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

	// AC-007: Submit button shows "注册中..." and is disabled during loading
	test("AC-007 — submit button shows loading state (注册中...) for 300-500ms", async ({
		page,
	}) => {
		await page
			.locator('input[name="username"], input[placeholder="请输入用户名"]')
			.fill("testuser");
		await page.locator('input[type="email"]').fill("test@example.com");
		await page.locator('input[name="password"]').fill("123456");
		await page.locator('input[name="confirmPassword"]').fill("123456");

		await page.getByRole("button", { name: "注册" }).click();

		await expect(page.getByRole("button", { name: "注册中..." })).toBeVisible({
			timeout: 2000,
		});
		await expect(
			page.getByRole("button", { name: "注册中..." })
		).toBeDisabled();
	});

	// AC-008: Successful registration shows success message and page stays / login link works
	test("AC-008 — successful registration shows success banner with login link", async ({
		page,
	}) => {
		await page
			.locator('input[name="username"], input[placeholder="请输入用户名"]')
			.fill("testuser");
		await page.locator('input[type="email"]').fill("test@example.com");
		await page.locator('input[name="password"]').fill("123456");
		await page.locator('input[name="confirmPassword"]').fill("123456");
		await page.getByRole("button", { name: "注册" }).click();

		// Wait for success message
		await expect(page.getByText("注册成功，请登录")).toBeVisible({
			timeout: 3000,
		});
		// The success banner should have role="status"
		const banner = page.locator('[role="status"]');
		await expect(banner).toBeVisible();
		await expect(banner).toContainText("注册成功，请登录");

		// Footer link to /login should be present
		await expect(page.getByRole("link", { name: "去登录" })).toBeVisible();
	});

	// AC-008 extension: clicking 去登录 navigates to /login
	test("AC-008 (ext) — 去登录 link navigates to /login", async ({ page }) => {
		await page.getByRole("link", { name: "去登录" }).click();
		await page.waitForURL(/\/login/);
		await expect(page).toHaveURL(/\/login/);
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
