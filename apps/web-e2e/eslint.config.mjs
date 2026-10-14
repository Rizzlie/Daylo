import playwright from "eslint-plugin-playwright";
import baseConfig from "../../eslint.config.mjs";

export default [
    playwright.configs["flat/recommended"],
    ...baseConfig,
    {
        files: ["**/environment/*.test.mjs"],
        // These are node:test lifecycle checks using node:assert, not Playwright tests.
        rules: { "playwright/expect-expect": "off" }
    },
    {
        files: [
            "**/*.ts",
            "**/*.js"
        ],
        // Override or add rules here
        rules: {}
    }
];
