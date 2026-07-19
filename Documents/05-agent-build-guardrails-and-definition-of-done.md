# Agent Build Guardrails & Definition of Done
Version 1.0 | July 2026

This document exists for one reason: to prevent the exact failure mode you
named — "half-implemented things, broken modules, insecure app, undeployable
app, or an app that doesn't fulfill the requirements." Give this file to the
coding agent alongside every sprint prompt, every time, without exception.

## 1. The Core Rule

**A feature is either fully working end-to-end against real data, or it does
not exist yet and is visibly marked as such in the Build Status screen.**
There is no third state. Specifically banned, in production code paths:
- Mock data standing in for a real integration ("we'll wire the real API later")
- A UI element that does nothing when clicked (disabled state with a tooltip
  explaining why is fine; silent no-op is not)
- A "TODO" or "FIXME" comment on anything reachable from a live route
- Catching an error and swallowing it silently instead of surfacing it
- A green checkmark on a checklist item that isn't actually programmatically verified

## 2. Per-Requirement Definition of Done (applies to every REQ ID in `03`)

A requirement is DONE only when **all** of the following are true:
1. The corresponding acceptance criteria (from `03`) pass as an automated test.
2. The feature works against a **real** external API call in at least the
   `staging` environment (sandbox/test credentials count as real for this
   purpose; a hand-written mock object does not).
3. Error paths are handled: what happens if the external API times out, returns
   a 4xx, or returns malformed data — each has an explicit, tested behavior
   (retry, alert, or graceful user-facing message), never an unhandled crash.
4. The feature is reachable from the actual navigation — no orphaned pages.
5. RLS/tenant-isolation is verified for any new tenant-scoped table (a query
   as a different tenant must return zero rows).
6. The Build Status tracker (REQ-META-01) reflects the true state.

## 3. CI Gate (must block merge, not just warn)

Every pull request must pass, automatically, before merge is possible:
- [ ] `tsc --noEmit` (typecheck) — zero errors
- [ ] ESLint — zero errors (warnings reviewed, not necessarily blocking)
- [ ] Unit + integration test suite — 100% pass, and **coverage must not
  decrease** versus the prior merged commit (ratchet, not a fixed threshold —
  prevents "add code, skip tests" drift)
- [ ] Prisma migration lint: every new tenant-scoped table has an
  accompanying RLS policy migration in the same PR (custom script, not
  optional)
- [ ] Route-reachability check: every file under the router's page directory
  is linked from at least one navigation component or is explicitly listed
  in an `orphan-routes-allowlist.json` with a reason
- [ ] `npm audit` / Dependabot: no unresolved critical-severity advisory
- [ ] Bundle size check against REQ-NFR-02's 250KB budget on authenticated routes
- [ ] No secret-looking strings (API keys, tokens) committed — a secret-scan
  step (e.g. gitleaks) blocks the merge if it finds one

## 4. What "Nothing Implicit" Means for the Coding Agent, Concretely

- Every business rule stated in the original blueprint (e.g. "max 9 secondary
  categories," "20 service areas," "750-character description," "14-day
  freshness threshold") is implemented as an **enforced validation**, not a
  comment or a UI hint the user can ignore. If the SRS states a number, that
  number is a hard constraint in code, with a test proving it's enforced.
- Every "human gate" named in the blueprint is a **real approval-request
  record with a real block on execution**, not a confirmation dialog the
  Coordinator can click through alone (see REQ-M6-APPR-01 and REQ-AUTH-05).
- Every "never do" item from the blueprint's Appendix D (Module 1) and
  Appendix C (Modules 2-6) is translated into either (a) a validation that
  makes the forbidden action impossible in the UI/API, or (b) if it cannot be
  enforced in code (e.g. "never buy links" — nothing stops a human from doing
  this outside the system), an explicit note in the requirement that this is
  a **process/policy control**, not a code control, so the coding agent does
  not falsely believe it has "handled" it with a comment.

## 5. Security Checklist (run at the end of every sprint touching auth, data
access, or external credentials — not just once at the end of the project)

- [ ] Every new endpoint has an explicit auth guard — an endpoint with no
  `@RequireRole`/session check is a bug, not an oversight to fix later
- [ ] Every new tenant-scoped table has RLS
- [ ] No credential/secret ever appears in a log line, error message, or
  client-side bundle (grep the built output, not just the source)
- [ ] Every file upload path validates file type/size server-side, not just
  in the browser
- [ ] Every external webhook endpoint (e.g. Meta WhatsApp webhook, OAuth
  callback) verifies the request signature/state parameter, not just "assume
  it's Google/Meta because the URL is obscure"
- [ ] Rate limiting is present on login, magic-link request, and any endpoint
  that triggers a paid external API call (defends against runaway cost from a
  bug or abuse)

## 6. How to Hand Sprints to the Coding Agent

1. Paste in: this file (`05`), the architecture doc (`02`), and only the
   relevant REQ sections from `03` for the current sprint (from `04`).
2. Instruct explicitly: "Do not start the next sprint's requirements. Do not
   mark anything done that doesn't meet the Definition of Done in `05` §2."
3. At the end of the sprint, require the agent to produce a **self-report**:
   for every REQ ID in the sprint, state Done / Partial / Blocked and why. Read
   this before accepting the sprint as complete — a "Done" claim without the
   evidence described in `05` §2 items 1-3 (test output, staging screenshot or
   log of a real external call, error-path test) should not be accepted at
   face value.
4. If a requirement is blocked by an external dependency not yet acquired
   (check `01`), the agent should build everything around it and leave that
   one integration point behind a clearly-labeled feature flag defaulting to
   **off**, visible in Build Status as `Blocked: <dependency name>` — never
   silently fake the integration to look complete.

## 7. Red Flags to Watch For When Reviewing the Coding Agent's Output

- A PR description that says "implemented X" but the diff contains no test
  files — reject and ask for tests.
- Any new `console.log` of a variable named `token`, `secret`, `key`, or
  `password`, anywhere.
- A component that fetches data with no loading/error state shown in the JSX.
- A migration file that adds a table with `clientId` but no accompanying RLS
  policy SQL.
- Business logic (e.g. "primary category change needs approval") implemented
  only in a React component's conditional rendering, with no server-side
  enforcement — always check the API layer independently rejects the
  unauthorized action even if a request bypasses the UI entirely.
