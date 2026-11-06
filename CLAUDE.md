# Project guidance

Small Playwright + TypeScript home assignment: one UI end-to-end test per mattress size and two API tests.

- For any Playwright change (tests, config, CI), use the installed `playwright-best-practices` skill.
- API tests call `/products` only through the `productsController` fixture (`fixtures/api.fixture.ts`,
  `controllers/products.controller.ts`) and validate bodies with the Ajv schema in `schemas/products.schema.ts`.
- UI tests get their page objects and popup cookies from `fixtures/ui.fixture.ts` and call only named page-object methods.
- Do not mock the real site or API, skip tests, loosen assertions or add retries to get a green run.
- UI tests must keep the User-Agent `E2EUI-Tests` (set in `playwright.config.ts`).
- Prefer role / test-id locators and web-first assertions. No `waitForTimeout`, no `networkidle`, no forced clicks.
- Verify with `npm run typecheck`, `npm run test:api`, `npm run test:ui`.
