# Awara Playwright assignment

Playwright + TypeScript tests for the QA Automation Engineer home assignment.

| Area | Test | File |
| --- | --- | --- |
| UI | Homepage -> Hero Banner "Shop Mattress" -> choose size -> add to cart -> verify the cart | `tests/ui/mattress-cart.spec.ts` |
| API | `GET /products?brand=awara` returns 200 and a non-empty `result.data` array | `tests/api/products.spec.ts` |
| API | `GET /products?name=the-awara-hybrid-mattress-30&lang=en&brand=awara` returns 200 and exactly one product | `tests/api/products.spec.ts` |

The tests never go to checkout and never place an order.

## Prerequisites

Node.js 20 or newer (developed on Node 24, CI uses Node 24) and npm.

## Install

```bash
npm ci
npx playwright install chromium
```

On a bare Linux machine also install the browser's system libraries: `npx playwright install --with-deps chromium`.

## Run

| Command | What it does |
| --- | --- |
| `npm test` | All tests (UI and API projects) |
| `npm run test:ui` | UI project only (Chromium) |
| `npm run test:api` | API project only (no browser) |
| `npm run test:headed` | UI tests in a visible browser |
| `npm run test:debug` | UI tests in Playwright Inspector debug mode |
| `npm run typecheck` | `tsc --noEmit` with strict mode |
| `npm run report` | Open the last HTML report |

Base URLs default to the assignment values and can be overridden:

| Variable | Default |
| --- | --- |
| `UI_BASE_URL` | `https://qa.awarasleep.com` |
| `API_BASE_URL` | `https://api.qa-env.residenthome.com` |

```bash
UI_BASE_URL=https://example.test npm run test:ui
```

## Reports

Every run writes an HTML report to `playwright-report/` and prints a list in the terminal.
Failures keep a screenshot and a trace in `test-results/`.

```bash
npm run report                                        # open the HTML report
npx playwright show-trace test-results/<test-folder>/trace.zip   # open one saved trace
```

## GitHub Actions

`.github/workflows/playwright.yml` runs on every push, every pull request and manually (`workflow_dispatch`).
It installs dependencies, installs Chromium, type-checks, runs `npm test`, and uploads two artifacts
(kept for 14 days, uploaded even when tests fail): `playwright-report` and `test-results`.
To read them, open the workflow run on GitHub, scroll to **Artifacts**, download and unzip `playwright-report`,
then open `index.html` (or run `npx playwright show-report <unzipped-folder>`). Unzip `test-results` to get traces.

## Structure

```
.github/workflows/playwright.yml   CI
pages/home.page.ts                 homepage: hero link, overlays
pages/mattress.page.ts             product page: name, size, add to cart
pages/cart.page.ts                 cart page: line items
tests/ui/mattress-cart.spec.ts     UI scenario (one test, test.step phases)
tests/api/products.spec.ts         two independent API tests (request fixture)
playwright.config.ts               "ui" and "api" projects
```

## Key decisions

- **Two projects.** `ui` (Chromium, UI base URL, User-Agent `E2EUI-Tests` set after the device descriptor so it is not overridden)
  and `api` (no browser). `testMatch` keeps each test in exactly one project.
- **Isolation.** Playwright creates a fresh browser context per test, so every run starts with an empty cart and no cookies.
- **Locators.** Role and test-id locators only. The hero link is scoped to `hero_content_container`, because the
  comparison table has another "Shop Mattress" link and the hero has hidden responsive duplicates.
- **Proof that the right item was added.** On the cart page the test expects exactly one line item, whose name equals the
  product title captured before adding, whose size line equals `Size: King` (selected explicitly), and whose quantity is `1`.
  A toast or cart badge is never used as evidence.
- **Cart is a page, not a drawer.** After "Add to Cart" the site shows two upsell dialogs ("Upgrade to Certified Organic",
  "Protect your ... mattress"), declined with "No Thanks", and then navigates to `/checkout/cart`.
- **Overlays.** A cookie banner (about 2 s after load) and a promo modal (about 7 s) block clicks. The test waits for each and closes it
  with its "Close" button, so no cookie consent is given. They do not come back afterwards.
- **Waiting for pricing to settle.** See the defect below.
- **API assertions** check status 200 first, then validate the JSON shape at runtime with `toMatchObject`, not with a type cast.

## Discrepancies with the assignment

1. **Hero Banner destination.** The assignment says the click should land on `/mattress`. On the real site the Hero Banner
   "Shop Mattress" link (`data-testid="hero_shop_mattress_btn"`) always points to
   `/mattresses/essential-latex-hybrid-mattress` (observed on 4 fresh page loads); only the comparison-table button points to `/mattress`.
   The test clicks the Hero Banner as required and asserts the observed path. To assert `/mattress` instead, change the one
   `toHaveURL` in the UI test, which then fails against the current site.
2. **API response path.** The assignment names `status.result.data`. The real body is
   `{ "status": "ok", "result": { "total_count": N, "data": [ ... ], "count_by_category": { ... } } }`.
   `status` is the string `"ok"`, a sibling of `result`, so the products collection is `result.data`. The tests check
   `status === "ok"` and `result.data`. Observed from a browser: 91 products for `brand=awara`, 1 for the name query.

## Known application defect (handled in the test)

On the product page, a size chosen within about 2 s of page load is silently reset to Queen, because the page keeps
re-pricing the cart and its last request resets the size. The cart then receives the wrong size. The UI shows no sign of this.
`MattressPage.selectSize` first waits until the page's pricing requests (`/carts/quote`, `/api/products`, `/applicable-offers`)
have been quiet for 1 s. `networkidle` was tried and is not reliable here, so it is not used.

## Verification status

Observed on a developer machine (macOS, Node 24, Playwright 1.65, Chromium):

- `npm run typecheck` passes.
- `npm run test:ui` passes. It passed 30 of 30 consecutive repeats after the final changes, and `npm run test:ui -- --repeat-each=3` passed 3 of 3.
- `npm test` ran both projects: the UI test passed and both API tests failed.

**API tests: not verified.** From that machine, Playwright's `request` client gets HTTP 403 (a Cloudflare "you have been blocked" HTML page)
for both endpoints, with or without the `E2EUI-Tests` User-Agent. The same URLs return 200 JSON when opened as a browser navigation,
which is how the response shape above was confirmed. No workaround was attempted for the block. Whether the tests pass depends on the
network running them, for example a GitHub Actions runner. This file does not claim they pass.

GitHub Actions: the workflow has not been run (see delivery notes in the submission).
