# Final Synthesis — Best browser automation workflows

_Stage: final_synthesis · Provider: codex (coordinator)_

---

## Recommendation

**Use Playwright as your primary browser automation tool.**

Both debaters converged on this conclusion independently. The cross-browser support,
first-class TypeScript API, built-in tracing, and active release cadence make it the
lowest-risk choice for greenfield projects in 2026. The points of disagreement were
degree of emphasis, not direction.

---

## Where the debaters agreed

1. **Playwright dominates general-purpose automation** — multi-tab, multi-origin, CI-ready
   out of the box, and the ecosystem momentum is clear.

2. **Puppeteer is the right tool when Chrome-only is acceptable and binary size matters** —
   `puppeteer-core` lets you bring your own browser, making it lean enough for Lambda or
   serverless scraping pipelines where a full Playwright install is too heavy.

3. **Cypress should not be evaluated as a Playwright alternative** — it solves a different
   problem (component/e2e DX for a single web app) and should be chosen on those merits,
   not as a general-purpose automation runner.

4. **LLM-augmented automation (Stagehand, Browser Use) is genuinely useful for dynamic
   pages** but adds latency and cost; it is not a replacement for deterministic selectors
   when the DOM is predictable.

---

## Where the debaters diverged

| Point | Claude | Gemini |
|-------|--------|--------|
| Puppeteer viability | Narrower use case; Playwright is almost always preferable | Still relevant for scraping teams already invested in it |
| Cypress inclusion | Worth mentioning as a DX story | Out of scope for "automation workflows" |
| LLM agents | Experimental — monitor but don't adopt yet | Ready for production on login/CAPTCHA-heavy flows |

The Puppeteer disagreement is the most practically significant. Gemini's position is better
supported by evidence: existing Puppeteer codebases have low migration urgency, and
`puppeteer-core` continues to ship improvements. Claude's position ("migrate when you
touch it anyway") is reasonable engineering hygiene but overstates the cost of staying.

---

## Actionable guidance

### Greenfield project
```
Playwright + @playwright/test
├── tests/e2e/          ← Playwright specs
├── playwright.config.ts
└── CI: npx playwright install --with-deps chromium
```

### Existing Puppeteer scraper
- Stay on Puppeteer; migrate opportunistically, not as a standalone effort.
- Pin `puppeteer-core` and supply your own Chromium to keep Docker images lean.

### Web app with heavy test coverage
- Use Cypress for component and integration tests (DX advantage).
- Use Playwright for cross-browser smoke tests and any multi-tab flows.

### Dynamic / auth-gated pages
- Add Stagehand's `act()` / `extract()` on top of Playwright for the subset of flows
  where LLM understanding outweighs the latency cost.

---

## Decision log

This synthesis was produced by Accord from a three-way debate between codex (coordinator),
claude, and gemini. Full stage outputs are in this directory. Reference this file in your
ADR when recording the tooling decision.
