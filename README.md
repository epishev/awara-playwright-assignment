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

On the product page, a size chosen while the page is still loading is silently reset to Queen, because the page keeps
re-pricing the cart and its last request resets the size. The cart then receives the wrong size. The UI shows no sign of this.
Locally the re-pricing takes about 2 s; on a slow runner the requests were spread over about 15 s with gaps of up to about 3.3 s.
`MattressPage.selectSize` therefore waits until the page's pricing requests (`/carts/quote`, `/api/products`, `/applicable-offers`)
have been quiet for 3.5 s, selects the size, waits for quiet again, and checks the size is still selected (choosing again if not).
`networkidle` was tried and is not reliable here, so it is not used.

## Verification status

**Local run** (macOS, Node 24, Playwright 1.65, Chromium):

- `npm run typecheck` passes.
- `npm run test:ui` passes: 30 of 30 repeats with the first version of the size wait, and 5 of 5 after it was made more robust.
- `npm run test:api` fails: both tests get HTTP 403.

**GitHub Actions** (private repo, `ubuntu-latest`): typecheck, install, and artifact upload work, but `npm test` fails on every run so far:

- Both API tests get HTTP 403 from `api.qa-env.residenthome.com`.
- The UI test fails at "Add to Cart". The trace shows that every request the page makes to `api.qa-env.residenthome.com`
  (carts, users, quote, and the add-to-cart POST) fails with `net::ERR_FAILED`, while the site itself, its media and third-party scripts load fine.

**Cause (environment, not the test code):** the QA API is behind Cloudflare, which answers "you have been blocked" to both Playwright's
request client and the browser's cross-origin calls from these networks (a developer machine for the API tests, a GitHub-hosted runner
for the API tests and for the UI cart calls). The same API URLs return 200 JSON when opened directly in a browser on the developer machine,
which is how the response shape above was confirmed. No workaround (header spoofing, proxying or mocking) was attempted, so the red CI
status is left as it is.

**What would fix it:** ask the owner of the QA environment to allow the GitHub runner IPs or a CI header, or run the suite on a
self-hosted runner or machine that is allowed. The workflow needs no other change.
