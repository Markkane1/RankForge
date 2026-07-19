# External Dependencies, Gates & Cost Model
Version 1.0 | July 2026 | Pricing verified via web search July 2026 — re-verify before
committing budget, as third-party pricing changes quarterly (DataForSEO alone
changed its rate card on July 1, 2026, mid-research).

## 1. How to read this document

Each tool is classified as a **gate type**:
- **HARD GATE** — the corresponding blueprint capability literally cannot function
  without this tool/approval. No workaround exists.
- **SOFT GATE** — the capability can launch in a reduced/manual form without it,
  and be upgraded later. Recommended sequencing note included.
- **FREE / NO GATE** — official, free, no approval friction (beyond standard
  account signup).

All monthly figures are **per-agency**, i.e., cover all clients on that plan tier
unless stated as "per client" or "per location."

---

## 2. Hard Gates (blocking — sequence these first)

### 2.1 Google Business Profile (GBP) API access — THE single biggest gate

| Field | Detail |
|---|---|
| Gate type | **HARD GATE** — the entire Module 1 automation layer depends on this |
| What's gated | Programmatic read/write to Business Information, Reviews, Posts, Photos, Performance, Verifications APIs |
| Cost | **$0 — the API itself is free**, no per-call billing |
| The actual gate | Google Cloud projects start at **zero quota**. You must submit a formal access-request form demonstrating a legitimate business use case, and Google manually reviews it. Typical approval window: **7–10 business days**, sometimes longer. |
| Hard prerequisites | (a) A Google Cloud project, (b) an **Organization account** in GBP's partner system, (c) at least one **verified GBP that has been active 60+ days** at time of request, (d) a live business website matching that profile, (e) OAuth 2.0 client configured — **API keys are rejected outright (401)**; this API is OAuth-only because the data is user-owned. |
| Consequence for sequencing | You cannot request this until Hafiz (or a design partner client) already has a GBP that is 60+ days old and verified. **This means: the very first "client" onboarded onto the platform must be an already-existing, already-verified, 60-day-old profile** — a brand-new profile created *by* the platform cannot bootstrap its own API access. Plan the first pilot client accordingly. |
| Hard capability ceilings (true even after approval) | Cannot create a **new** listing via API (dashboard + manual verification only); cannot **delete** reviews via API (flag-as-inappropriate is dashboard-only); bulk **primary category changes** trigger Google's manual quality review and can suppress rankings — this is why the blueprint marks category changes as a human gate, not just a preference. |
| Action item for the build | Module 6's capability map (blueprint Appendix D) must be implemented as **real, enforced routing logic** (api / partner / human), not a comment — see `03` REQ-M6-CAP-01. |

### 2.2 Domain, hosting, and cloud accounts
| Item | Gate type | Notes |
|---|---|---|
| Client's own domain registration | HARD (per-client) | Blueprint mandates the agency never owns a client's domain (Appendix A/C guardrail). Each client must register their own domain or transfer an existing one; ~$12-15/yr, paid by client, not the agency. |
| Google Cloud / GCP project | HARD (one-time, agency) | Free tier sufficient at this scale; required host for the GBP API OAuth client. |
| Google Search Console + GA4 property per client | FREE / NO GATE | Client owns the property, agency gets Editor/Viewer access — standard OAuth consent, no approval wait. |

---

## 3. Soft Gates & Paid Tools (per Module)

### 3.1 Module 1 — GBP data & verification support

| Tool | Purpose | Gate type | Signup friction | Pricing model | Est. initial cost | Est. monthly (2 clients) | Est. monthly (10 clients) |
|---|---|---|---|---|---|---|---|
| Local Falcon | Geo-grid rank tracking + API | SOFT | Instant signup, credit-card, no approval wait | Credit-based: $24.99–$199.99/mo retail tiers, **API access requires the $199/mo "Basic-and-up" tier** per Local Falcon's own API terms, plus $0.0032/request pay-as-you-go on top | $0 | **$199/mo** (API tier) + ~$20-40 usage | $199-499/mo as scan volume across 10 clients' grids grows |
| DataForSEO | Keyword volume/difficulty, SERP data, competitor category/business-listing data, backlinks (Labs API) | SOFT | Instant, free $1 test credit, **no monthly fee — pure pay-as-you-go** | Per-call: SERP Standard queue $0.0006/call, Live $0.002/call; Business Data API ~+20% July 2026 rate update; $50 minimum top-up (not recurring, just a wallet minimum) | $50 (initial wallet top-up) | **$15-40/mo** at 2-client research + weekly grid/competitor refresh volume | **$60-150/mo** at 10 clients |
| Ahrefs or Semrush API (backlink gap mining, Module 3) | Competitor backlink data for link-building | SOFT — **recommend against** at this stage | Instant signup | Flat subscription: Ahrefs Lite $129/mo (or $99/mo annual); Semrush Pro $139.95/mo | $0 | Optional — **DataForSEO's Backlinks API covers the same data at pay-per-call rates (no $100+/mo minimum as of July 2026 update) and is the recommended default; add Ahrefs/Semrush only if a client specifically needs their UI-based reporting.** | Same |
| PageSpeed Insights / CrUX API | Core Web Vitals audit | FREE | Google API key only | Free | $0 | $0 | $0 |

### 3.2 Module 3 — Citations & authority

| Tool | Purpose | Gate type | Pricing model | Est. initial cost | Est. monthly (2 clients) | Est. monthly (10 clients) |
|---|---|---|---|---|---|---|
| BrightLocal | Citation tracking, audit, GBP audit, geo-grid (secondary), white-label reports | SOFT | Tiered by **location count**: Track $39/loc/mo, Manage $49/loc/mo, Grow $59/loc/mo (per-location pricing; 25% off annual) | $0 | **Grow tier × 2 locations ≈ $118/mo** (needed for review-monitoring features in Task 3.1.3) | Grow × 10 locations ≈ $590/mo — **at this scale, evaluate BrightLocal's multi-location bulk tier vs. building the equivalent citation-audit logic in-house on top of a raw citation-scan API** |
| BrightLocal Citation Builder | Actual citation submissions (pay-as-you-go, separate from subscription) | SOFT | $2.00–$3.20 per site submitted; Data Aggregator submissions ~$30 each | $0 | ~$100-150/mo (one-time-ish per client onboarding, tapering after initial build) | Scales with new client onboarding cadence, not client count directly |

### 3.3 Module 4 — Content & AI-visibility

| Tool | Purpose | Gate type | Pricing model | Est. monthly (2 clients) | Est. monthly (10 clients) |
|---|---|---|---|---|---|
| Copyscape (or equivalent plagiarism/similarity API) | Fact/compliance check step before publish | SOFT | Pay-per-search, ~$0.03-0.05/search; Copyscape Premium API ~$0.05/1000-word check | ~$5-10/mo | ~$20-30/mo |
| LLM content generation (drafting engine) | Powers Task 4.2.1 draft step | HARD for the feature, but you've already sourced this model separately | N/A — out of scope for this cost model per your note that the AI model is already arranged | — | — |
| AI-answer monitoring (Ask Maps / AI Overviews / ChatGPT / Perplexity scripted queries) | Task 4.3.2 | SOFT — build in-house | No dedicated paid tool required; implemented as scheduled scripted queries against public surfaces + your own LLM for analysis | ~$0 tool cost (compute cost only, via your existing model) | ~$0 tool cost |

### 3.4 Module 5 — Analytics & tracking (mostly free)

| Tool | Purpose | Gate type | Cost |
|---|---|---|---|
| GA4 API | Traffic/conversion data | FREE | $0 |
| Google Search Console API | Query/page performance | FREE | $0 |
| GBP Performance API | Impressions, calls, directions | FREE (part of GBP API access, same hard gate as §2.1) | $0 |
| Call tracking (dynamic number insertion) | Attribution for phone leads | SOFT | Twilio phone number: ~$1-2/mo per tracking number + $0.0085-0.013/min for call routing (UAE/international rates vary — verify against Twilio's live rate card for the client's country before quoting) |

### 3.5 Module 1 & 6 — Messaging (review requests, client comms)

| Tool | Purpose | Gate type | Pricing model | Est. monthly (2 clients) | Est. monthly (10 clients) |
|---|---|---|---|---|---|
| WhatsApp Business Platform (via a BSP: Twilio, 360dialog, Gupshup, etc.) | Review-request flow, client one-liners | **HARD GATE for template messages specifically** — requires (a) Meta Business verification, (b) a BSP account, (c) pre-approved message templates before ANY business-initiated message can send, (d) a ramped daily-sending-limit tier that only increases with usage/quality history | Per-message, category-based, **as of July 1, 2025 billing is per delivered template, not per conversation**; rates vary by recipient country. UAE utility-category rates are typically low-single-digit cents; a BSP markup of $0.003-0.010/message is added on top. Free: all messages sent within an open 24-hour customer-initiated service window. | ~$15-30/mo (mostly free service-window replies; a modest number of review-ask templates per client per month) | ~$60-120/mo |
| BSP platform fee (Twilio WhatsApp / 360dialog) | Access to the WhatsApp Cloud API through an approved BSP | SOFT (some BSPs, e.g. Meta's own Cloud API direct, have no separate platform fee — recommended) | $0 if using Meta's Cloud API directly (no BSP middleman fee, only Meta's per-message rates) vs. $0-49/mo BSP platform fee | Recommend **direct Meta Cloud API integration**, no BSP markup layer, to keep costs at Meta's base rate | Same recommendation at scale |
| SendGrid / Resend (email) | Review-ask emails, monthly reports | FREE tier sufficient at this scale | Free up to 100/day (Resend) or 100/day (SendGrid free tier); paid from ~$15-20/mo once client volume requires it | $0-15/mo | $15-35/mo |
| Twilio SMS (optional reminder channel) | One polite reminder after 3 days, fallback if no WhatsApp | SOFT | ~$0.0079/SMS (US benchmark; verify UAE outbound SMS rate, typically higher, ~$0.02-0.05/SMS) | ~$5-10/mo | ~$20-40/mo |

### 3.6 Infrastructure (hosting, storage, monitoring)

| Item | Cost model | Est. monthly (2 clients) | Est. monthly (10 clients) |
|---|---|---|---|
| Vercel (frontend hosting) | Free tier likely sufficient at 2 clients; Pro $20/mo/seat once approaching limits | $0-20/mo | $20/mo |
| Railway/Fly.io (API + worker) | Usage-based compute, small containers | ~$15-25/mo | ~$40-70/mo |
| Neon/Supabase (Postgres) | Free tier at low data volume; paid tier ~$19-25/mo once beyond free storage/compute | $0-19/mo | $25-69/mo |
| Upstash (Redis, BullMQ backend) | Pay-per-request free tier, then ~$10-20/mo | $0-10/mo | $10-20/mo |
| Cloudflare R2 (photo/video storage) | ~$0.015/GB-month storage, no egress fee | ~$2-5/mo | ~$10-15/mo |
| Sentry (error tracking) | Free tier (5k events/mo) sufficient initially | $0 | $0-26/mo |
| Domain for the SaaS platform itself | ~$12-15/yr | negligible | negligible |

---

## 4. Consolidated Cost Summary

### 4.1 Initial one-time cost to acquire tools (before first client goes live)

| Item | Cost |
|---|---|
| DataForSEO wallet top-up | $50 |
| BrightLocal Citation Builder (first client's citation build wave, ~20-25 citations) | ~$60-80 |
| Local Falcon — first month (charged monthly, no separate setup fee) | included in monthly below |
| Domain(s) — SaaS platform | ~$15 |
| Google Cloud project — free | $0 |
| Meta Business verification / WhatsApp Business setup | $0 (verification itself is free; templates cost nothing to submit) |
| Misc. dev tool subscriptions (GitHub, design assets if any) | ~$0-20 |
| **Total realistic one-time cash outlay before go-live** | **≈ $150 – $250** |

Note: the biggest "cost" at the start is not money, it's **time** — the GBP API
approval (7-10 business days) and the 60-day profile-age prerequisite are the true
initial-cost bottleneck, not cash. Budget calendar time for this, not just dollars.

### 4.2 Recurring monthly cost — At pilot scale (1-2 clients)

| Category | Low estimate | High estimate |
|---|---|---|
| GBP/local rank tracking (Local Falcon) | $199 | $240 |
| SEO/keyword/competitor data (DataForSEO) | $15 | $40 |
| Citations & audit (BrightLocal Grow × 2 locations) | $100 | $118 |
| Citation building (ongoing, amortized) | $30 | $80 |
| Content compliance check (Copyscape-class) | $5 | $10 |
| WhatsApp Business messaging | $15 | $30 |
| Email (Resend/SendGrid) | $0 | $15 |
| SMS fallback | $5 | $10 |
| Infrastructure (hosting/db/redis/storage/monitoring) | $17 | $79 |
| **Total / month at 2 clients** | **≈ $386** | **≈ $622** |
| **Per client, at 2 clients** | **≈ $193** | **≈ $311** |

### 4.3 Recurring monthly cost — At 10-client scale

| Category | Low estimate | High estimate |
|---|---|---|
| GBP/local rank tracking (Local Falcon, scaling credit tier) | $199 | $499 |
| SEO/keyword/competitor data (DataForSEO) | $60 | $150 |
| Citations & audit (BrightLocal Grow × 10 locations) | $590 | $590 |
| Citation building (ongoing) | $100 | $250 |
| Content compliance check | $20 | $30 |
| WhatsApp Business messaging | $60 | $120 |
| Email | $15 | $35 |
| SMS fallback | $20 | $40 |
| Infrastructure | $75 | $174 |
| **Total / month at 10 clients** | **≈ $1,139** | **≈ $1,888** |
| **Per client, at 10 clients** | **≈ $114** | **≈ $189** |

Per-client cost drops noticeably with scale mainly because BrightLocal and Local
Falcon have step-function tiers rather than pure linear per-client pricing —
budget review point: re-evaluate BrightLocal's tier vs. a lighter self-built
citation-audit approach once past ~15 locations, since its per-location cost does
not fall much with volume.

### 4.4 Explicit cost risk flags for the build

1. **BrightLocal's Grow tier is required** (not Track/Manage) the moment review
   monitoring (Task 4.2/Module 1 Phase 4.2) goes live — budget for Grow from day
   one, not Track.
2. **Local Falcon's API tier ($199/mo) is a step function**, not pay-as-you-go —
   it is the single most expensive fixed line item at pilot scale. Confirm this
   is still current pricing before committing; if budget pressure emerges,
   DataForSEO's SERP API can approximate geo-grid scanning at far lower
   pay-per-call cost, at the cost of building your own grid-visualization layer
   instead of using Local Falcon's.
3. **WhatsApp template approval can be rejected or delayed** by Meta — do not
   schedule the review-ask automation (Task 4.2) to go live until at least one
   template has been approved in production; build a manual-send fallback path
   for the first sprint it's needed.
4. **Do not integrate a BSP middleman (Twilio WhatsApp, 360dialog, etc.) unless a
   specific client requirement demands its extra SLA/support** — going direct to
   Meta's Cloud API avoids a recurring platform fee entirely.
