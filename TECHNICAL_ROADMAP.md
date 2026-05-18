# Technical Roadmap — Make the Product Ready to Sell

Everything that needs to be **built / fixed in the code** before (and after) launching publicly. This is a pure engineering checklist — no marketing, no money talk. For the business side (how to publish, get users, earn money), see [BUSINESS_PLAN.md](./BUSINESS_PLAN.md).

> **Live app:** https://zealous-pond-0e6b2f103.2.azurestaticapps.net
> **Repo:** single-file `index.html` + small Azure Function scaffold in `function/`

---

## Phase 0 — Pre-launch hardening (do this BEFORE posting publicly)

Things that will hurt you if a stranger lands on the app today.

### 0.1 First-time UX
- [ ] **Empty-state onboarding tour** — first visit: a 3-step tooltip overlay ("1. Pick a level → 2. Generate a question → 3. Whiteboard + chat"). One-time, persisted in `localStorage` (`onboardingSeen_v1`).
- [x] **API-key handling for new users** — today the default provider is `localhost:4141` (copilot-api). A first-time stranger will hit a "Connection failed" error. Detect this and show a clear "You need to either run copilot-api locally OR paste an Anthropic/OpenAI key" modal. *Done — `#apisetup-modal` surfaced on setup/auth failures or empty-key Start; quick-jump buttons via `setProviderInSetup()`.*
- [ ] **Demo mode** — a "Try it without an API key" button that runs a 3-turn pre-recorded interview so users can see the product before committing to setup.
- [x] **Sample questions on Home** — 3 clickable example questions ("Design Twitter", "Design a URL shortener", "Design Uber") that jump straight into a pre-configured interview. *Done — `.home-samples` cards in `#panel-help` wired to `startSampleInterview()` with `SAMPLE_QUESTIONS` prompts.*

### 0.2 Mobile + tablet polish
- [ ] Real test on iPhone Safari + Android Chrome at 360px, 414px, 768px widths.
- [ ] Whiteboard drawer on mobile should be full-screen, not a side panel.
- [ ] Voice mic button must be reachable with thumb on iPhone (avoid the bottom 30px home-indicator zone).
- [ ] Tap targets ≥ 44×44px (focus area chips, history buttons, mic button).

### 0.3 Reliability / error states
- [x] Catch all `fetch` failures in `callAI()` and show a human-readable banner — not silent failures. *Done — every provider call routes through `postJSON()` → `classifyAIError()` → `handleAIError()`; all four `callAI` call-sites (generateQuestion, init opener catch, send, editMsg doSave) wired in.*
- [x] If the API returns rate-limit / 401 / 403, show specific guidance ("Your Anthropic key is invalid" vs "You're rate-limited, wait 60s"). *Done — `AIError.code` ∈ {`setup`, `auth`, `rate`, `server`, `network`, `unknown`}; auth/setup route to `#apisetup-modal`, rate/server/network surface tailored copy in the err-banner.*
- [x] Auto-save retry — if a `localStorage` write fails (quota exceeded), prompt the user to clear old history. *Done — `safeSetItem()` trims `interviewHistory_v1` → 10 and `studyHistory_v1` → 25 on `QuotaExceededError`, then offers a one-time `confirm()` wipe (`_quotaWarned`).*
- [x] Graceful degradation when JSZip / Excalidraw CDN fails to load. *Done — `onerror` on the four CDN scripts pushes into `window._cdnFail`; post-DOMContentLoaded `check()` disables `#wb-tab` and shows a "Whiteboard unavailable" placeholder when React/Excalidraw is missing, surfaces an err-banner for JSZip (separate-file export fallback already exists). `initExcalidraw()` early-returns when ExcalidrawLib is absent.*

### 0.4 Privacy + trust
- [ ] **Privacy notice** in footer — one paragraph: "Your interviews stay in your browser. API keys are never sent to our servers (we don't have any). Direct calls go to Anthropic/OpenAI."
- [ ] **API-key field UX** — type="password", "show/hide" toggle, never logged, never sent to the Azure Function.
- [ ] **Open-source the repo** publicly on GitHub. Add a `LICENSE` (MIT). Builds trust + organic traffic + GitHub Sponsors button.
- [ ] Strip any hard-coded keys, internal URLs, or personal info from the repo before going public.

### 0.5 Analytics (you can't improve what you can't measure)
- [ ] Add **Plausible** (privacy-friendly, free for personal use) OR **Umami** self-hosted on Azure free tier OR even **Google Analytics 4** (free, but heavier).
- [ ] Track these events: `interview_started`, `interview_finished`, `question_generated`, `study_started`, `feedback_requested`, `export_clicked`, `provider_changed`.
- [ ] Add a tiny session counter: number of interviews completed, displayed on Home ("Join 1,234 engineers practicing this week"). Social proof.

---

## Phase 1 — Conversion plumbing (lets the business side actually earn money)

These changes are what BUSINESS_PLAN.md depends on. Without these in the code, none of the monetization streams work.

### 1.1 Support / donations button
- [ ] Header: small ❤️ **Support** button linking to your Ko-fi / BuyMeACoffee URL (open in new tab).
- [ ] Post-interview success toast — after a feedback score ≥ 7/10: *"Nailed it? Tip the dev ☕ →"*. Show **once per session**, dismissible.

### 1.2 Affiliate-link surface
- [ ] In the **interview feedback** UI, when a "weak area" or "gap" is named, render a small "📚 Recommended" card with 1–2 affiliate links (book, course).
- [ ] Build a small JS lookup map: `topic → [resource, resource]`. Topics like `consistent hashing`, `cap theorem`, `event sourcing` → DDIA / Educative system-design / Hello Interview.
- [ ] Add a `<section id="resources">` to Home with 5–10 affiliate-linked books, each with a one-line review.
- [ ] In **Study mode**, append a "📖 Further reading" footer to each curated topic with one affiliate link.

### 1.3 Upsell surface for a paid digital product
- [ ] After interview feedback, show a non-intrusive card: *"Want 50 more questions like this? → $9 pack"* linking to your Gumroad URL.
- [ ] On the Home page, add a "💎 Pro Pack" card next to the existing CTAs.
- [ ] Add a `<section id="pro-pack">` with a screenshot of the PDF cover + bullet features + "Buy on Gumroad" button.

### 1.4 Email capture
- [ ] Tiny form on Home: *"Get weekly system design drills in your inbox"* → free service like **Buttondown** (free up to 100 subs), **ConvertKit** free tier (1k subs), or **Tally** form → Google Sheet.
- [ ] Trigger a second capture after a completed interview: *"Want feedback by email when we add new question packs?"*

### 1.5 GitHub Sponsors / repo polish
- [ ] Public GitHub repo with **README.md** that has: hero screenshot, "Try it live" button, feature list, "Built by @you", **Sponsor** button.
- [ ] Add `.github/FUNDING.yml` pointing to Ko-fi + GitHub Sponsors.

---

## Phase 2 — Product depth (improves conversion + retention)

Things that don't move money directly but make the product *worth* paying for.

### 2.1 Interview quality
- [ ] Expand the curated study-topic library to 30+ topics with structured prerequisites.
- [ ] Better whiteboard auto-suggestions — when the user adds a component, propose 1–2 next components ("you added a load balancer; consider a cache or DB next").
- [ ] **Company-specific interview profiles** — pre-configured "Google L5 SysDesign", "Meta E5", "Stripe Staff" profiles that set company context + style + level + question pool. Each one is a long-tail SEO landing page later.
- [ ] **Question library v2** — categorize the 50+ questions by domain (storage, streaming, social, e-commerce) and difficulty.

### 2.2 Feedback quality
- [ ] Structured rubric output in feedback (Communication / Scoping / Tradeoffs / Depth / Whiteboard) — not just one number.
- [ ] "Compare to a model answer" feature — after feedback, button to reveal what a senior engineer would have done.
- [ ] Per-gap action items — *"You missed: capacity estimation. Practice this: \[link to study mode\]"*.

### 2.3 Study mode polish
- [ ] Spaced-repetition reminders for low-mastery topics ("You scored 40% on consistent hashing 5 days ago — review?").
- [ ] Streak counter (visit-day streak) — pure dopamine, drives retention.
- [ ] Per-topic worked-example library.

### 2.4 Export / shareability
- [ ] "Share this interview" link — generates a read-only public URL of the transcript + whiteboard PNG. Hosted on GitHub Pages or as a static export. **Viral loop — every share is an ad.**
- [ ] "Tweet my feedback" button with a pre-filled compliment-card.
- [ ] LinkedIn-shareable feedback card image (auto-generated PNG with score + top strengths).

---

## Phase 3 — Public landing page (separate from the app)

Right now the Home tab inside the app IS your landing page. For SEO and conversions you want a separate marketing page.

- [ ] New file `landing.html` (or a `/marketing/` subfolder) — pure marketing: hero, features, testimonials, pricing for the Pro Pack, FAQ, sign-up CTA. Links to the actual app.
- [ ] Update `staticwebapp.config.json` so `/` serves `landing.html` and `/app` serves `index.html`.
- [ ] **Open Graph + Twitter Card meta tags** so the link previews beautifully when shared on LinkedIn / Twitter / Slack. Includes title, description, and a hero PNG. **This is the #1 most-skipped pre-launch checklist item.**
- [ ] Favicon + apple-touch-icon variants (192px, 512px) for mobile bookmarks.

---

## Phase 4 — When the free streams break $200/mo, invest in paid infra

Only do this *after* the BUSINESS_PLAN graduation checklist is met. Everything below costs money or significant time.

### 4.1 Auth + per-user state
- [ ] Buy a real domain (~$12/yr — Namecheap / Porkbun).
- [ ] **Supabase** project (free tier: 50k MAU + 500MB Postgres) — handles auth, DB, storage in one.
- [ ] Migrate `localStorage` history → Supabase `interviews` + `study_sessions` tables. Cross-device sync = a real Pro selling point.
- [ ] OAuth: Google + GitHub login (zero-friction).

### 4.2 Server-side LLM proxy
- [ ] Re-enable the existing `function/` Azure Function (already scaffolded — just deploy it).
- [ ] Move the Anthropic / OpenAI API key to function env vars (Azure Key Vault).
- [ ] Per-user rate limiting at the function level (Redis or Azure Table Storage counters).
- [ ] Usage metering: store `input_tokens`, `output_tokens`, `cost_usd` per call per user.

### 4.3 Payments
- [ ] **Stripe Checkout** + **Customer Portal** — no monthly fee, only 2.9% + 30¢ per transaction.
- [ ] Webhooks → set `pro: true` flag in Supabase.
- [ ] Gate hosted LLM access behind `pro: true`. Free tier stays BYO-key.

### 4.4 Tiering
- [ ] Free tier: BYO-key, 3 interviews/week, 20-session history cap (current behavior).
- [ ] Pro tier ($15–$25/mo): hosted Claude, unlimited interviews, unlimited history, cross-device sync, exclusive question packs.

### 4.5 Ops
- [ ] **Sentry** (free tier: 5k events/mo) for error monitoring.
- [ ] **UptimeRobot** (free) for uptime alerts.
- [ ] Daily DB backup (Supabase has this built-in on free tier).
- [ ] A status page (StatusPage.io free tier OR GitHub-pages-hosted JSON).

---

## Phase 5 — Growth-engineering experiments (after Phase 4 is live)

Once paid is working, these are A/B-testable revenue levers.

- [ ] **Free-trial of Pro** — 7 days, no card required. Track conversion.
- [ ] **Referral codes** — "Give 2 weeks free, get 2 weeks free."
- [ ] **Annual plan** ($150/yr vs $20/mo) — pulls forward cash.
- [ ] **Lifetime deal** on AppSumo — one-time $69 deal can earn $5k–$50k in a single launch but you trade long-term LTV. Defer until product is rock-solid.
- [ ] **Team plan** ($99/mo for 5 seats) — for managers prepping their team. Higher ARPU.
- [ ] **Company-specific packs** as add-on products ("Google SysDesign Pack", "Meta E5 Pack").

---

## Cross-cutting technical-debt list

Issues to clean up alongside the above:

- [ ] Single-file `index.html` is now huge — consider splitting into `index.html` + `app.js` + `app.css` (still no build step needed, just better diffs and editor performance).
- [ ] Move all CDN-loaded libraries (Excalidraw, JSZip, React) to versioned URLs — never use `@latest`.
- [ ] Subresource integrity (`integrity="sha384-..."`) on every `<script src=>` from a CDN.
- [ ] Content-Security-Policy header set via `staticwebapp.config.json`.
- [ ] Lighthouse score audit — target 90+ on Performance, Accessibility, Best Practices, SEO.
- [ ] Accessibility audit — keyboard nav for all controls, proper `aria-label`s, color contrast on chips.

---

## Suggested implementation order (one weekend each)

| Weekend | Goal |
|---|---|
| **W1** | Phase 0.1 + 0.4 — onboarding tour, demo mode, privacy notice, public repo |
| **W2** | Phase 0.2 + 0.3 — mobile polish, error states |
| **W3** | Phase 1.1 + 1.2 — donations button + affiliate links surface |
| **W4** | Phase 1.3 + 1.4 — Gumroad upsell + email capture |
| **W5** | Phase 3 — landing page + OG tags |
| **W6** | Phase 2 deep-dives — pick the highest-leverage product depth item |
| **Later (≥$200/mo)** | Phase 4 — domain + Supabase + Stripe |

---

*Companion doc: [BUSINESS_PLAN.md](./BUSINESS_PLAN.md) — how to publish, get users, and earn money.*
*Last updated: 2026-05-19*
