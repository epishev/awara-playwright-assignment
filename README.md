# Awara Playwright assignment

Playwright + TypeScript tests for the QA Automation Engineer home assignment.

| Area | Test | File |
| --- | --- | --- |
| UI | For each of the 7 sizes: Homepage -> Hero Banner "Shop Mattress" -> choose size -> add to cart -> verify the cart | `tests/ui/mattress-cart.spec.ts` |
| API | `GET /products?brand=awara` returns 200 and a non-empty `result.data` array | `tests/api/products.spec.ts` |
| API | `GET /products?name=the-awara-hybrid-mattress-30&lang=en&brand=awara` returns 200 and exactly one product | `tests/api/products.spec.ts` |

The tests never go to checkout and never place an order.

## Prerequisites

Node.js 22.18 or newer (required by the Allure command-line tool; developed on Node 24, CI uses Node 24) and npm.

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
| `npm run report:allure` | Build the Allure report from the last run and open it |
| `npm run report` | Open the last Playwright HTML report |

Base URLs default to the assignment values and can be overridden:

| Variable | Default |
| --- | --- |
| `UI_BASE_URL` | `https://qa.awarasleep.com` |
| `API_BASE_URL` | `https://api.qa-env.residenthome.com` |

```bash
UI_BASE_URL=https://example.test npm run test:ui
```

## Reports

Every run writes Allure results to `allure-results/` and a Playwright HTML report to `playwright-report/`, and prints a list in the terminal.
Failures keep a screenshot and a trace in `test-results/`.

```bash
npm run report:allure                                 # build the Allure report and open it
npm run report                                        # open the Playwright HTML report
npx playwright show-trace test-results/<test-folder>/trace.zip   # open one saved trace
```

The Allure report is a single file, `allure-report/index.html`, which also opens with a double-click. It shows the readable `test.step`
journey of each test, and `allure-results/` is cleared at the start of each run, so it covers only the latest run. For every browser and
API call, use the Playwright report or the trace.

## GitHub Actions

`.github/workflows/playwright.yml` runs on every push, every pull request and manually (`workflow_dispatch`).
It installs dependencies, installs Chromium, type-checks, runs `npm test`, generates the Allure report, and uploads three artifacts
(kept for 14 days, uploaded even when tests fail): `allure-report`, `playwright-report` and `test-results`.
To read them, open the workflow run on GitHub, scroll to **Artifacts**, download and unzip `allure-report`, then open `index.html`.
For the Playwright report, unzip `playwright-report` and run `npx playwright show-report <unzipped-folder>`. Unzip `test-results` to get traces.

## Structure

```
.github/workflows/playwright.yml   CI
pages/home.page.ts                 homepage: hero link
pages/mattress.page.ts             product page: name, size, add to cart
pages/cart.page.ts                 cart page: line items
controllers/products.controller.ts GET /products requests and schema check
schemas/products.schema.ts         GET /products body: types and JSON Schema
fixtures/api.fixture.ts            provides productsController to the API tests
fixtures/ui.fixture.ts             provides the page objects and popup cookies to the UI test
tests/ui/mattress-cart.spec.ts     UI scenario (one test per size, test.step phases)
tests/api/products.spec.ts         two independent API tests (productsController fixture)
playwright.config.ts               "ui" and "api" projects, reporters
global-setup.ts                    clears old Allure results before each run
allurerc.mjs                       Allure report settings
```

## Key decisions

- **Two projects.** `ui` (Chromium, UI base URL, User-Agent `E2EUI-Tests` set after the device descriptor so it is not overridden)
  and `api` (no browser). `testMatch` keeps each test in exactly one project.
- **Readable UI test.** The test gets its page objects from fixtures and only calls their named methods. Locators and assertions
  live in the page objects, as `expect...` methods. `MattressPage` must exist before navigation to track pricing requests, and
  Playwright creates requested fixtures before a hook or test body runs, so the `beforeEach` that navigates asks for `mattressPage`.
- **Hooks.** `beforeAll` checks once per worker that the site responds, so an outage fails with a clear message before any size test
  starts. It uses its own short-lived page, not a shared one. `beforeEach` opens the homepage and goes to the product page, in the fresh
  browser context of each test.
- **Split King differs from the other sizes.** After the item is saved it shows a "Please Note" dialog about shipping as two Twin XL
  mattresses, and the cart opens from its "Proceed to Checkout" button. Its cart label is `Size: Split King (Ships in 2 Twin XL boxes)`.
- **Isolation.** Playwright creates a fresh browser context per test, so every run starts with an empty cart and only the popup cookies described below.
- **Locators.** Role and test-id locators only. The hero link is scoped to `hero_content_container`, because the
  comparison table has another "Shop Mattress" link and the hero has hidden responsive duplicates.
- **Proof that the right item was added.** On the cart page the test expects exactly one line item, whose name equals the
  product title captured before adding, whose size line exactly equals the chosen size (for example `Size: King`), and whose quantity is `1`.
  A toast or cart badge is never used as evidence.
- **Cart is a page, not a drawer.** After "Add to Cart" the site shows an upsell dialog ("Upgrade to Certified Organic").
  Answering it with "No Thanks" makes the site send `POST /carts/my/items` and navigate to `/checkout/cart`. The test only clicks and does
  not watch that request: the cart contents prove the item was saved, and the flow still passes with the save delayed by 8 s. The cart page then opens
  an Extend protection-plan dialog, loaded late by a third-party script; the cart assertions use test ids and do not need it closed, so
  the test ignores it.
- **Popups.** A cookie banner (about 2 s after load) and a promo modal (about 7 s) would block clicks, so the UI fixture sets cookies that
  stop them, generated for each test. `OptanonAlertBoxClosed` closes the OneTrust banner with only strictly necessary cookies active, like
  its "Close" button, so no cookie consent is given. `_dyjsession` and `_dy_soct` make Dynamic Yield treat the visit as an ongoing session,
  so it skips its first-visit campaigns, including the promo. The test therefore does not exercise that first-visit content. The Dynamic
  Yield format is internal to the vendor and may change: if the popups return, clicks fail as blocked, and the fixture is the place to fix it.
- **Waiting for pricing to settle.** See the defect below.
- **API layer.** Tests send requests only through the `productsController` fixture. The controller returns the response unparsed, so
  each test checks the status before calling `json()`: a Cloudflare 403 is HTML and would otherwise fail as a JSON parse error.
- **API assertions** check status 200 first, then validate the body against a JSON Schema with Ajv, so a failure lists every violation.
  The response types exist only at compile time, so they do not replace that check. `JSONSchemaType` keeps the schema and types in sync.
  The schema requires the fields found on all 91 products in a real `brand=awara` response and allows extra fields, so a new QA product
  that lacks one of them fails the test.

## Discrepancies with the assignment

1. **Hero Banner destination.** The assignment says the click should land on `/mattress`. On the real site the Hero Banner
   "Shop Mattress" link (`data-testid="hero_shop_mattress_btn"`) always points to
   `/mattresses/essential-latex-hybrid-mattress` (observed on 4 fresh page loads); only the comparison-table button points to `/mattress`.
   The test clicks the Hero Banner as required and asserts the observed path. To assert `/mattress` instead, change the one
   `toHaveURL` in `MattressPage.expectToBeOpen`, which then fails against the current site.
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
- `npm run test:ui` passes: 21 of 21 tests with each of the 7 sizes run 3 times, and 7 of 7 with 2 workers as on CI.
- `npm run test:api` fails: both tests get HTTP 403.

**GitHub Actions** (public repo, `ubuntu-latest`): typecheck, install, and artifact upload work, but `npm test` fails on every run so far:

- Both API tests get HTTP 403 from `api.qa-env.residenthome.com`.
- The UI tests fail around "Add to Cart". In the traces of run 42297326584, 118 of the 138 requests the page made to
  `api.qa-env.residenthome.com` (carts, users, quote, and the add-to-cart POST) failed with `net::ERR_FAILED`, and the save got through on only 2 of 14
  attempts, while the site itself, its media and third-party scripts load fine. Chromium's console reports that the CORS preflight response has no
  `Access-Control-Allow-Origin` header. The upsell dialog depends on those calls, so it usually never opens, which shows up as a timeout on its "No Thanks" button.

**Local reproduction:** blocking `api.qa-env.residenthome.com` in the browser on a developer machine gives a matching result: the add-to-cart
POST fails with `net::ERR_FAILED`, the upsell dialog never appears, the site does not open the cart, and the cart page stays on a loading
spinner. The button itself depends on that API, so changing how the test clicks cannot fix CI.

**Cause (environment, not the test code):** the QA API is behind Cloudflare, which answers "you have been blocked" to Playwright's request
client from a developer machine and from a GitHub-hosted runner. On a runner the browser's preflights to the same API are also mostly rejected,
and on a developer machine they are not. Traces do not record preflight responses, so a Cloudflare block is the likely cause for those but is not
confirmed. The same API URLs return 200 JSON when opened directly in a browser on the developer machine, which is how the response shape above
was confirmed. No workaround (header spoofing, proxying or mocking) was attempted, so the red CI status is left as it is.

**What would fix it:** ask the owner of the QA environment to allow the GitHub runner IPs or a CI header, or run the suite on a
self-hosted runner or machine that is allowed. The workflow needs no other change.
