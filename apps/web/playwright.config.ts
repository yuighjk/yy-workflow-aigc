import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	retries: 0,
	workers: 1,
	reporter: [["list"]],
	use: {
		baseURL: "http://localhost:3001",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "desktop-chromium",
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1280, height: 800 },
			},
		},
		{
			name: "mobile-chromium",
			use: {
				...devices["Pixel 5"],
				viewport: { width: 375, height: 812 },
			},
		},
	],
	outputDir: "playwright-results/",
});
