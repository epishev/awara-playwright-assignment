# Project guidance

Small Playwright + TypeScript home assignment: one UI end-to-end test and two API tests.

- For any Playwright change (tests, config, CI), use the installed `playwright-best-practices` skill.
- Keep the scope. Do not add authentication, storageState, Docker, Allure, schema libraries, an API client,
  custom fixtures or a BasePage unless the assignment genuinely needs them.
- Do not mock the real site or API, skip tests, loosen assertions or add retries to get a green run.
- UI tests must keep the User-Agent `E2EUI-Tests` (set in `playwright.config.ts`).
- Prefer role / test-id locators and web-first assertions. No `waitForTimeout`, no `networkidle`, no forced clicks.
- Verify with `npm run typecheck`, `npm run test:api`, `npm run test:ui`.
