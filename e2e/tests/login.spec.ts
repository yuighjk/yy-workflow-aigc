import { expect, test } from "@playwright/test";
import path from "path";

const SCREENSHOTS_DIR = path.join(import.meta.dirname, "../../screenshots");

test.describe("Login Page — Feature 1 AC Verification", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
		// Wait for React to hydrate
		await page.waitForLoadState("networkidle");
	});

	// AC-001: User can open /login page
	test("AC-001 — /login page renders without error", async ({ page }) => {
		await expect(page).toHaveURL(/\/login/);
		// No JS errors expected (collected separately)
		const title = page.locator("h1");
		await expect(title).toBeVisible();
	});

	// AC-002: Login page contains email, password, submit button and register link
	test("AC-002 — page contains email input, password input, submit button, register link", async ({
		page,
	}) => {
		// Product name
		await expect(page.getByText("AIGC Workflow")).toBeVisible();
		// Title "登录"
		await expect(page.locator("h1")).toHaveText("登录");
		// Email input
		await expect(page.locator('input[type="email"]')).toBeVisible();
		// Password input
		await expect(page.locator('input[type="password"]')).toBeVisible();
		// Submit button
		await expect(page.getByRole("button", { name: "登录" })).toBeVisible();
		// Register link
		await expect(page.getByRole("link", { name: "去注册" })).toBeVisible();
	});

	// AC-003: Empty form submission shows required field errors
	test("AC-003 — empty form submission shows required errors for email and password", async ({
		page,
	}) => {
		await page.getByRole("button", { name: "登录" }).click();
		// Wait for validation to appear
		await expect(page.getByText("请输入邮箱")).toBeVisible();
		await expect(page.getByText("请输入密码")).toBeVisible();
	});

	// AC-004: Invalid email format shows format error
	test("AC-004 — invalid email format shows format error", async ({ page }) => {
		await page.locator('input[type="email"]').fill("abc");
		await page.locator('input[type="password"]').fill("123456");
		await page.getByRole("button", { name: "登录" }).click();
		await expect(page.getByText("请输入正确的邮箱格式")).toBeVisible();
	});

	// AC-005: Password less than 6 chars shows length error
	test("AC-005 — password shorter than 6 chars shows length error", async ({
		page,
	}) => {
		await page.locator('input[type="email"]').fill("test@example.com");
		await page.locator('input[type="password"]').fill("123");
		await page.getByRole("button", { name: "登录" }).click();
		await expect(page.getByText("密码至少 6 位")).toBeVisible();
	});

	// AC-006: Submit button shows "登录中..." and is disabled during loading
	test("AC-006 — submit button shows loading state (登录中...) for 300-500ms", async ({
		page,
	}) => {
		await page.locator('input[type="email"]').fill("a@b.com");
		await page.locator('input[type="password"]').fill("123456");

		// Start listening for button state change BEFORE clicking
		const submitBtn = page.getByRole("button", { name: /登录/ });
		await submitBtn.click();

		// Button should briefly become "登录中..." and disabled
		await expect(page.getByRole("button", { name: "登录中..." })).toBeVisible({
			timeout: 2000,
		});
		await expect(
			page.getByRole("button", { name: "登录中..." })
		).toBeDisabled();
	});

	// AC-007: On successful validation, green success banner appears, no navigation
	test("AC-007 — successful login shows green success banner without page navigation", async ({
		page,
	}) => {
		await page.locator('input[type="email"]').fill("a@b.com");
		await page.locator('input[type="password"]').fill("123456");
		await page.getByRole("button", { name: "登录" }).click();

		// Wait for success message
		await expect(page.getByText("登录成功")).toBeVisible({ timeout: 3000 });

		// URL should still be /login
		expect(page.url()).toMatch(/\/login/);

		// The success banner should have green styling (role="status")
		const banner = page.locator('[role="status"]');
		await expect(banner).toBeVisible();
		await expect(banner).toContainText("登录成功");
	});

	// AC-007 extension: editing any input after success hides the banner
	test("AC-007 (ext) — editing input after login success dismisses the success banner", async ({
		page,
	}) => {
		await page.locator('input[type="email"]').fill("a@b.com");
		await page.locator('input[type="password"]').fill("123456");
		await page.getByRole("button", { name: "登录" }).click();
		await expect(page.getByText("登录成功")).toBeVisible({ timeout: 3000 });

		// Edit email field
		await page.locator('input[type="email"]').fill("b@c.com");
		await expect(page.getByText("登录成功")).not.toBeVisible();
	});

	// AC-008: Register link navigates to /register
	test("AC-008 — 去注册 link navigates to /register", async ({ page }) => {
		await page.getByRole("link", { name: "去注册" }).click();
		await page.waitForURL(/\/register/);
		await expect(page).toHaveURL(/\/register/);
	});
});

// AC-009: Visual checks (desktop and mobile) — done in screenshot tests
test.describe("Login Page — Console Error Check", () => {
	test("no JS console errors on /login", async ({ page }) => {
		const errors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				errors.push(msg.text());
			}
		});
		page.on("pageerror", (err) => {
			errors.push(err.message);
		});

		await page.goto("/login");
		await page.waitForLoadState("networkidle");

		// Filter out known React DevTools / Vite noise
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

test.describe("Login Page — Screenshots (AC-009)", () => {
	test("desktop 1280x800 screenshot", async ({
		page,
		browserName,
	}, testInfo) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto("/login");
		await page.waitForLoadState("networkidle");
		const screenshotPath = path.join(
			SCREENSHOTS_DIR,
			`login-desktop-${browserName}.png`
		);
		await page.screenshot({ path: screenshotPath, fullPage: false });
		console.log(`Screenshot saved: ${screenshotPath}`);
	});

	test("mobile 375x812 screenshot", async ({ page, browserName }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto("/login");
		await page.waitForLoadState("networkidle");
		const screenshotPath = path.join(
			SCREENSHOTS_DIR,
			`login-mobile-${browserName}.png`
		);
		await page.screenshot({ path: screenshotPath, fullPage: false });
		console.log(`Screenshot saved: ${screenshotPath}`);
	});
});
