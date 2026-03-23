# Mobile performance — Phase 3 summary (2026-03-22)

## Checkpoint medians

Source/protocol: each row below is the **median of 3 consecutive Lighthouse CLI mobile audits** against the local Vite production preview at `http://127.0.0.1:4173/` (performance category only, default mobile emulation, simulated throttling), using the same local preview protocol as the earlier baseline artifact.

These are **successive checkpoints within this task set**, not the original baseline artifact captured earlier: Phase 1 is **after task 5**, Phase 2 **after task 7**, Phase 3 **after task 10**, and Final **after task 11**.

| Checkpoint | Score | FCP (ms) | LCP (ms) | TBT (ms) | Script transfer | Image transfer |
|------------|------:|---------:|---------:|---------:|------------------:|---------------:|
| Phase 1 (after task 5) | 78 | ~2702 | ~4880 | ~8.5 | ~339 KB | ~583 KB |
| Phase 2 (after task 7) | 84 | ~2552 | ~3978 | ~9.5 | ~330 KB | ~199 KB |
| Phase 3 (after task 10, route splitting) | 89 | ~2102 | ~3528 | ~11 | ~240 KB | ~199 KB |
| Final (after task 11, `manualChunks`) | 88 | ~2402 | ~3529 | ~9.5 | ~241 KB | ~199 KB |

## >91 target

**Not met.** Best median in this sequence was **89** (Phase 3); final median **88**.

## What moved vs. what stalled

- **Improved:** Image transfer dropped sharply Phase 1→2 (~583 KB → ~199 KB), pulling **LCP down ~900 ms**. Route splitting cut **script transfer** (~339 KB → ~240 KB) and **FCP** improved Phase 2→3 (~2552 → ~2102 ms). Score climbed 78 → 89.
- **Stalled / noisy:** After Phase 3, **LCP stayed ~3.5 s**; `manualChunks` did not improve LCP and **score/FCP regressed slightly** (89→88, FCP ~2102→~2402) — within run variance but shows diminishing returns on chunk tuning alone.
- **Dominant remaining bottleneck (read of the numbers):** **LCP ~3.5 s** with **image bytes already ~199 KB** suggests the critical path is less “bytes on the wire” and more **when the LCP element paints** (HTML parse, JS execution/hydration, layout, or hero scheduling) under mobile throttling — not another easy transfer-size win.

## Recommendation

**Open a separate spike: prerendered or static HTML for marketing routes** (landing + key marketing URLs), evaluated with the same Lighthouse protocol. Further script reduction and `manualChunks` tuning did **not materially move LCP** (~3.53 s after tasks 10 and 11), so the next lever is **earlier HTML / hero paint timing**, not more chunk surgery.

That spike should be **separate from the current branch/task set** so shipping Phase 1–3 improvements is not blocked by framework or build-pipeline experimentation.

**Alternative:** Stop here if **~88–89** is acceptable for the current release; further gains likely need architectural changes, not incremental bundling tweaks.
