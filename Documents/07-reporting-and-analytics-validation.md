# Post-Implementation Reporting & Analytics Validation
Version 1.0 | July 2026
**Hand this file to the coding agent only after Sprint 10 (full v1 build) is
complete**, alongside `06-security-audit-and-hardening.md`. Its job is to
prove that every number a client or Owner ever sees in a report is real,
correctly computed, correctly attributed, and cannot silently go stale or
wrong without someone noticing.

## 0. Why This Document Exists

The blueprint's entire value proposition to a client is "look what we did for
you, here's the proof" (Module 5). If a report ever shows a wrong, stale, or
fabricated number, the whole system's credibility — and the agency's, since
these reports go out under the agency's name — fails silently. This document
exists to catch that before it happens, not after a client asks why last
month's "47 calls" doesn't match their own phone bill.

Produce a `REPORTING_AUDIT_RESULT.md` artifact structured on these headings,
each item PASS/FAIL/N/A with evidence, same convention as the security audit.

---

## 1. Data Lineage Verification (no number without a source)

- [ ] **[AUTOMATED]** For each figure that appears in the Monthly Client Report (REQ-M5-04) — calls, WhatsApp leads, bookings, review count, rating, geo-grid position, competitor benchmark comparison — trace it back through the code to the exact table/column it's computed from. Produce a lineage map (`metric name → SQL/query → source table`) as evidence. **Any metric that cannot be traced to a real source table is a FAIL**, full stop, regardless of how the number "looks."
- [ ] **[AUTOMATED]** Grep the reporting module's codebase for any hardcoded numeric literal that isn't a genuine constant (a cap, a threshold) — e.g. a leftover `47` or `32%` from a design mock must not still be present anywhere in a code path reachable in production.
- [ ] **[AUTOMATED]** Confirm the plain-language headline generator (REQ-M5-04, "You received 47 calls...") is templated from live variables, not a static string with variables spliced in only for the number — test by changing the underlying data and confirming every part of the sentence updates correctly (including the percentage comparison, which must recompute against the correct prior period, not a fixed prior value).

## 2. Baseline Snapshot Integrity (REQ-M5-02)

- [ ] **[AUTOMATED]** Confirm `BaselineSnapshot` is truly write-once at the database permission level — attempt a raw `UPDATE` against an existing row using the application's own DB role (not a superuser bypassing everything) and confirm it fails with a permissions error, not just an application-layer 403.
- [ ] **[AUTOMATED]** Confirm the `BUILD → GROWTH` state transition is blocked in the absence of a `BaselineSnapshot` row (REQ-M6-STATE-04) — attempt the transition on a test client with no snapshot and confirm rejection.
- [ ] **[AUTOMATED]** Confirm every subsequent report's "before/after" and "% change" comparisons reference the actual stored `BaselineSnapshot.data` JSON, not a re-computed "first available data point" that could silently drift if historical data changes.
- [ ] **[MANUAL VERIFY]** Spot-check one real client's baseline snapshot values against the actual GBP Performance API / GA4 dashboard numbers at the time it was captured — confirm they match within expected variance, not just that a JSON blob exists.

## 3. KPI Computation Accuracy

- [ ] **[AUTOMATED]** Unit-test every formula independently with hand-calculated expected outputs, not just "does it run without error":
  - Week-over-week rank change (geo-grid average rank comparison)
  - Review velocity (reviews/month, rolling window definition explicitly tested at window boundaries)
  - Call/lead trend percentage ("up 32% from last month" — confirm the denominator is *last month's actual value*, not a rounded or cached figure)
  - Competitor benchmark averages (mean calculation across the correct competitor set, not accidentally including the client's own profile)
  - Photo-count benchmark target (competitor average × 1.25) recalculates when new competitor data arrives, not frozen at onboarding
- [ ] **[AUTOMATED]** Test each formula's boundary/edge cases explicitly (see Section 6) — a formula that's "correct" for a normal month but divides by zero or returns `NaN`/`Infinity` for an edge case is a FAIL.
- [ ] **[AUTOMATED]** Confirm timezone/date-boundary handling: a "monthly" report's period start/end is computed consistently (client's local time zone, e.g. Asia/Dubai, not server UTC) — test with a job/task logged at 11:58pm local time near a month boundary and confirm it lands in the correct month's report.

## 4. Cross-Source Consistency Checks

Several metrics can be sourced two ways (native GBP Performance API vs.
Local Falcon/DataForSEO geo-grid; GA4 events vs. GBP-reported website clicks).
Where this overlap exists:

- [ ] **[AUTOMATED]** Confirm the report clearly labels which source each
  overlapping metric came from (never silently blend two sources into one
  number without disclosure) — e.g., "website clicks (GBP-reported)" vs.
  "website sessions (GA4)" are not the same number and must not be presented
  as interchangeable.
- [ ] **[MANUAL VERIFY]** For one real pilot client, manually pull the same
  metric from both the GBP dashboard directly and from the system's stored
  value for the same period, and confirm they match (allowing for Google's
  own reporting lag, typically a few days) — a persistent, unexplained
  mismatch means a bug in the ingestion pipeline, not "just how the data is."

## 5. Report Generation & Rendering QA

- [ ] **[AUTOMATED]** Generate a report for a client with a full month of rich
  data and visually/structurally verify: no truncated tables, no overlapping
  chart labels, correct currency/number formatting (AED, thousands separators
  per locale expectations), geo-grid heatmap image renders correctly in both
  the PDF/HTML export and the in-app view.
- [ ] **[AUTOMATED]** Mobile rendering of the client-portal report page meets
  REQ-NFR-01/02 (responsive at 375px, Lighthouse ≥ 90) — this is the page a
  non-technical client will actually open on their phone.
- [ ] **[AUTOMATED]** PDF export opens correctly in at least two common
  viewers (browser-native PDF viewer + Adobe Acrobat or equivalent) with no
  broken fonts/layout.
- [ ] **[AUTOMATED]** Confirm the report generation job is idempotent — running
  it twice for the same period does not create two `MonthlyReport` rows or
  send two duplicate emails to the client (ties back to the shared
  idempotency infrastructure from `02` §6 — reporting must use it too, not a
  bespoke one-off).

## 6. Edge Case Testing (the cases most likely to embarrass you if untested)

- [ ] **[AUTOMATED]** Zero-activity month (new client, no leads/reviews/posts
  yet) — report must render a clear, honest "still building" message, never a
  0%/NaN/blank calculation error or, worse, a fabricated placeholder number.
- [ ] **[AUTOMATED]** Negative growth month (calls down, rating down) — the
  plain-language headline correctly reflects a decline (never forces positive
  framing onto bad data) and the self-correction diagnosis (REQ-M5-05) is
  triggered per the mandatory order, not skipped because "the report already
  went out."
- [ ] **[AUTOMATED]** Missing data source (e.g., GA4 access revoked mid-month,
  or the GBP API token expired) — the report clearly flags which section is
  incomplete and why, rather than silently showing a zero or, worse, silently
  omitting the section with no explanation.
- [ ] **[AUTOMATED]** Partial month (client onboarded on the 20th) — first
  report correctly scopes to the partial period and labels it as such, does
  not compare a 10-day partial period to a full prior month as if they were
  equivalent.
- [ ] **[AUTOMATED]** Multi-location client (REQ-M1-12) — confirm the report
  correctly separates or clearly aggregates per-location data; a bug that
  silently merges two locations' review counts is a real risk given they
  share a `Client` row.

## 7. Alert & Anomaly Detection Accuracy (REQ-M5-03)

- [ ] **[AUTOMATED]** Each of the five anomaly rules (rank drop >5 WoW,
  unexplained profile edit, review ≤2★, calls down >30% WoW, site
  4xx/5xx/schema/CWV failure) is tested with synthetic data that should
  *just barely* trigger it and data that should *just barely not* trigger it
  — confirms the threshold boundary is implemented correctly, not
  approximately.
- [ ] **[AUTOMATED]** Confirm alerts are not duplicated on every scheduler run
  while the underlying condition persists (e.g., a sustained rank drop should
  alert once and then track as "ongoing," not re-fire a fresh alert every
  polling cycle).
- [ ] **[MANUAL VERIFY]** Confirm the self-correction diagnosis order
  (REQ-M5-05: profile intact? → tracking intact? → algorithm update? →
  competitor surge? → own-work attribution) is actually followed in sequence
  in a real triggered case, not just present as a checklist a Coordinator can
  skip through.

## 8. Report Delivery Testing

- [ ] **[AUTOMATED]** Email delivery of the monthly report actually arrives
  (test inbox), with the PDF/HTML attached or linked correctly, not a broken
  link or missing attachment.
- [ ] **[AUTOMATED]** The optional 3-line WhatsApp summary (blueprint Task
  5.3.1) is generated from the same underlying data as the full report — no
  drift between the two channels' numbers.
- [ ] **[MANUAL VERIFY]** Confirm delivery timing matches the intended cadence
  (monthly, on a consistent day) in a real scheduled run, not just a manually
  triggered test send.

## 9. Client Portal Report Access Control (cross-reference with `06` §3)

- [ ] **[AUTOMATED]** A client-portal user can only ever retrieve their own
  `MonthlyReport`/`LeadLogEntry`/`BaselineSnapshot` rows — re-run the
  cross-client IDOR test from the security audit specifically against the
  reporting endpoints, since these are the endpoints a real client actually
  uses (higher real-world exposure than most internal-only endpoints).
- [ ] **[AUTOMATED]** Confirm no aggregate/benchmark figure shown to a client
  ever reveals another specific client's raw data (e.g., a "vs. top 3
  competitors" comparison must use public competitor data, never another
  agency client's private numbers, even accidentally, if two agency clients
  happen to compete in the same niche).

## 10. Audit Trail & Historical Report Immutability

- [ ] **[AUTOMATED]** Once a `MonthlyReport` has been generated and delivered,
  confirm it cannot be silently edited after the fact (immutable per REQ-NFR-07)
  — if a correction is genuinely needed, the system creates a new, clearly
  labeled corrected version referencing the original, never a silent in-place edit.
- [ ] **[AUTOMATED]** Confirm every report generation event is itself logged
  (who/what triggered it, when, what period) for later audit.

## 11. Sign-Off Template

```
REPORTING & ANALYTICS AUDIT — SIGN-OFF
Date: __________
Auditor (human): __________
Scope: v1 build, Sprints 0-10, prior to first real client-facing report send

Section 1 (Data lineage):        PASS / FAIL — items open: ____
Section 2 (Baseline integrity):  PASS / FAIL — items open: ____
Section 3 (KPI accuracy):        PASS / FAIL — items open: ____
Section 4 (Cross-source):        PASS / FAIL — items open: ____
Section 5 (Rendering QA):        PASS / FAIL — items open: ____
Section 6 (Edge cases):          PASS / FAIL — items open: ____
Section 7 (Alerts/anomalies):    PASS / FAIL — items open: ____
Section 8 (Delivery):            PASS / FAIL — items open: ____
Section 9 (Portal access):       PASS / FAIL — items open: ____
Section 10 (Audit trail):        PASS / FAIL — items open: ____

Overall: CLEARED TO SEND REAL CLIENT REPORTS / NOT CLEARED (list blockers)
```
