import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("http://localhost:3001/login");
await page.waitForLoadState("networkidle");

const emailInput = page.locator('input[type="email"]');

// Use evaluate to bypass browser native email validation
await page.evaluate(() => {
	const input = document.querySelector(
		'input[type="email"]'
	) as HTMLInputElement;
	// Use nativeInputValueSetter to bypass React's synthetic event
	const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
		window.HTMLInputElement.prototype,
		"value"
	)?.set;
	nativeInputValueSetter?.call(input, "abc");
	input.dispatchEvent(new Event("input", { bubbles: true }));
	input.dispatchEvent(new Event("change", { bubbles: true }));
});

await page.locator('input[type="password"]').fill("123456");

// Check validity
const validity = await page.evaluate(() => {
	const input = document.querySelector(
		'input[type="email"]'
	) as HTMLInputElement;
	return {
		valid: input.validity.valid,
		value: input.value,
		typeMismatch: input.validity.typeMismatch,
	};
});
console.log("Email input validity:", validity);

// Try submitting the form
await page
	.locator("form")
	.evaluate((form: HTMLFormElement) => form.reportValidity());
console.log("After reportValidity");

// Try clicking submit
await page.getByRole("button", { name: "登录" }).click();
await page.waitForTimeout(2000);

// Check what error text is visible
const pageContent = await page.content();
const hasFormatError = pageContent.includes("请输入正确的邮箱格式");
const hasEmailError = pageContent.includes("请输入邮箱");
console.log("Has format error:", hasFormatError);
console.log("Has email error:", hasEmailError);

// Get all text visible
const bodyText = await page.locator("body").innerText();
console.log("Body text snippet:", bodyText.slice(0, 500));

await browser.close();
