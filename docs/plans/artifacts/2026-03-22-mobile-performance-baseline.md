# Mobile performance baseline — 2026-03-22

## Context

- **Worktree:** `mobile-performance-recovery` (isolated)
- **Target URL:** `http://127.0.0.1:4173/` (Vite production preview)
- **Tool:** Lighthouse CLI (performance category only), default **mobile** emulation (412×823, DPR 1.75), simulated throttling
- **Runs:** 3 consecutive audits; JSON outputs stored under `/tmp/lhr-mobile-babypeek-{1,2,3}.json` (not committed)

## Reproducibility metadata

- **Branch:** `perf/mobile-performance-recovery`
- **Commit SHA:** `b9090a207ba2c34b8d90ab776e9c474a609877fc`
- **Lighthouse CLI version:** `13.0.3` (from `lighthouseVersion` in all three captured JSON reports)
- **Runtime browser version:** `HeadlessChrome/146.0.0.0` (from `userAgent` in all three captured JSON reports)

## Build

- Command: `bun run build --filter=web` (from monorepo root)
- Result: success (`vite build` for `apps/web`)

## Preview server

- Command: `cd apps/web && bun run serve -- --host 127.0.0.1 --port 4173`
- Verified before audits: `curl -sI http://127.0.0.1:4173/` → `HTTP/1.1 200 OK`

## Lighthouse commands

```bash
bunx --yes lighthouse http://127.0.0.1:4173/ \
  --only-categories=performance \
  --output=json \
  --output-path=/tmp/lhr-mobile-babypeek-N.json \
  --chrome-flags="--headless=new" \
  --quiet
```

(Repeated for N = 1, 2, 3.)

## Per-run metrics

| Run | Performance score | FCP (ms) | LCP (ms) | TBT (ms) | TTI (ms) | CLS |
|-----|------------------:|---------:|---------:|---------:|---------:|----:|
| 1 | 70 | 3604 | 6156 | 28 | 6231 | 0 |
| 2 | 70 | 3602 | 6154 | 14 | 6229 | 0 |
| 3 | 73 | 2854 | 6156 | 56 | 6231 | 0 |

### Initial navigation transfer sizes

These values come from Lighthouse `resource-summary` for the audited initial navigation and were cross-checked against raw `network-requests` totals from the same JSON reports. They represent bytes transferred during the initial page load (document + subresources requested by that load), not on-disk bundle size.

The transfer values were **identical in all three runs**. The table below therefore shows the shared per-run initial-navigation transfer value, not an aggregate and not a single selected run.

| Metric | Lighthouse JSON source | Transfer size |
|--------|------------------------|---------------|
| Initial navigation JS transfer | `resource-summary` → `Script` (matches summed `network-requests` where `resourceType = Script`) | 338,568 bytes (~331 KiB) |
| Initial navigation image transfer | `resource-summary` → `Image` (matches summed `network-requests` where `resourceType = Image`) | 583,405 bytes (~570 KiB) |
| Initial navigation third-party transfer | `resource-summary` → `Third-party` (matches summed `network-requests` where `entity != 127.0.0.1`) | 111,622 bytes (~109 KiB) |

## Median (computed across runs 1–3)

| Metric | Median |
|--------|--------|
| Performance score | **70** |
| FCP | **3602 ms** |
| LCP | **6156 ms** |
| TBT | **28 ms** |
| TTI | **6231 ms** |
| CLS | **0** |
| Initial navigation JS transfer | **338,568 bytes** |
| Initial navigation image transfer | **583,405 bytes** |
| Initial navigation third-party transfer | **111,622 bytes** |

## Best / worst (across three runs)

| Metric | Best | Worst |
|--------|------|-------|
| Performance score | 73 (run 3) | 70 (runs 1–2) |
| FCP | 2854 ms (run 3) | 3604 ms (run 1) |
| LCP | 6154 ms (run 2) | 6156 ms (runs 1, 3) |
| TBT | 14 ms (run 2) | 56 ms (run 3) |
| TTI | 6229 ms (run 2) | 6231 ms (runs 1, 3) |
| CLS | 0 (all) | 0 (all) |

## Top three Lighthouse opportunities (literal opportunity audits)

Ranked by Lighthouse `numericValue` across the captured runs. Only two opportunity audits had non-zero estimated savings; the third item below is the next literal opportunity row surfaced by Lighthouse after those two.

1. **Reduce unused JavaScript** (`unused-javascript`) — estimated savings: 1350 ms, 1200 ms, 1350 ms across runs 1-3; **median 1350 ms**. Lighthouse also reports **estimated transfer savings of 212 KiB**.
2. **Initial server response time was short** (`server-response-time`) — estimated savings: 2 ms, 1 ms, 2 ms; **median 2 ms**. This is effectively a clean result, but it is still the second-highest literal opportunity audit in all three reports.
3. **Avoid multiple page redirects** (`redirects`) — estimated savings: 0 ms in all three runs. This is the next literal opportunity audit after the two non-zero rows; other remaining opportunity rows (`unminified-css`, `unminified-javascript`, `unused-css-rules`) were also 0 ms.

## Notes / anomalies

- **Score variance:** Only run 3 scored 73 vs 70; FCP on run 3 was notably faster (~2.85 s vs ~3.6 s), while LCP and TTI stayed ~6.15–6.23 s — LCP is likely bound by the same hero/content path across runs.
- **TBT swing:** 14–56 ms across three runs; median 28 ms — low absolute values vs heavy LCP/FCP.
- **Build warnings:** TanStack Router warned that some files under `src/routes/` do not contain route pieces (`marketing-pricing.ts`, `marketing-pricing.test.ts`, `share.$shareId.test.tsx`); unrelated to Lighthouse but visible during `vite build`.
- **Environment caveat:** This is a local `vite preview` baseline against `127.0.0.1`, so it should not be treated as directly equivalent to live production numbers from the design doc.
