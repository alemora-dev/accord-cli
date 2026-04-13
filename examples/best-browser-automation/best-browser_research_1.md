# Shared Research — Best browser automation workflows

_Stage: shared_research · Provider: codex (coordinator)_

---

## Landscape (2026)

The browser automation space has consolidated around three dominant tools and a handful of
specialised runners:

### Playwright (Microsoft)
- Supports Chromium, Firefox, and WebKit from a single API
- First-class support for TypeScript, Python, Java, and .NET
- Built-in test runner (`@playwright/test`) with parallelism, retries, and tracing
- `page.waitForSelector` / `page.waitForLoadState` make flaky-test avoidance
  straightforward
- Network interception via `page.route()` — useful for mocking APIs in tests
- Codegen (`playwright codegen`) records interactions to test code

### Puppeteer (Google Chrome team)
- Controls Chrome/Chromium over the DevTools Protocol
- Now supports Firefox in experimental mode
- Lighter surface area than Playwright; preferred for headless scraping pipelines
- Ships with `puppeteer-core` to decouple from a bundled Chromium

### Cypress
- Runs tests inside the browser (not via CDP), giving direct DOM access
- Excellent developer experience: time-travel debugging, automatic waiting
- Not designed for multi-origin or multi-tab scenarios
- Best fit: component tests and e2e tests for web apps under active development

### Selenium / WebDriver
- W3C standard, widest browser matrix
- Slower than CDP-based tools; primarily used in enterprise QA pipelines that predate
  Playwright

### Emerging
- **Stagehand** (Browserbase): LLM-driven automation on top of Playwright — natural-language
  `act()` / `extract()` for dynamic pages
- **Browser Use**: open-source agent framework; wraps Playwright with vision + LLM loop

## Key Decision Axes

| Axis | Playwright | Puppeteer | Cypress |
|------|-----------|-----------|---------|
| Cross-browser | ✓ | partial | ✓ (limited) |
| Multi-tab | ✓ | ✓ | ✗ |
| Speed (headed) | fast | fast | slower |
| DX / debugging | good | moderate | excellent |
| Scraping suitability | high | high | low |
| CI integration | native | manual | native |

## Performance Benchmarks (community, Q1 2026)

- Playwright test suite cold-start: ~1.2 s overhead per worker
- Puppeteer launch time: ~400 ms (no bundled browser download in `puppeteer-core`)
- Cypress open-mode: ~3 s; run-mode: ~1.5 s first test
