import { chromium } from "../node_modules/playwright/index.mjs";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("http://localhost:3001/login");
await page.waitForLoadState("networkidle");

// Use React's nativeInputValueSetter to bypass browser constraint
const emailInput = await page.$('input[id="email"]');
await page.evaluate((el) => {
	const nativeSetter = Object.getOwnPropertyDescriptor(
		window.HTMLInputElement.prototype,
		"value"
	).set;
	nativeSetter.call(el, "abc");
	el.dispatchEvent(new Event("input", { bubbles: true }));
	el.dispatchEvent(new Event("change", { bubbles: true }));
}, emailInput);

await page.fill('input[type="password"]', "123456");

const validity = await page.evaluate(() => {
	const input = document.querySelector('input[id="email"]');
	return {
		valid: input.validity.valid,
		value: input.value,
		typeMismatch: input.validity.typeMismatch,
	};
});
console.log("validity:", JSON.stringify(validity));

// Try clicking submit — browser blocks if input is type=email with invalid value
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);

const bodyText = await page.innerText("body");
console.log("body after click:", bodyText.slice(0, 600));

await browser.close();
