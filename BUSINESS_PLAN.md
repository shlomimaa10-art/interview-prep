# Business Plan — Publishing, Getting Users, Earning Money

Everything **non-code**: how to launch the product, attract users with a small network, and start earning money on a **$0 budget**. For the engineering checklist (what to build), see [TECHNICAL_ROADMAP.md](./TECHNICAL_ROADMAP.md).

> **Live app:** https://zealous-pond-0e6b2f103.2.azurestaticapps.net
> **One-line strategy:** Keep the app 100% free (BYO API key), monetize *around* it via donations + affiliate links + a paid digital product, then drive traffic with one big LinkedIn launch + organic Reddit/SEO/YouTube.

---

## Part 1 — Why "free app, paid extras" is the right model for you

Your situation:
- ✅ Working product already deployed
- ✅ No domain, no backend, no payment system
- ✅ Small LinkedIn network
- ❌ No budget
- ❌ No time to run a SaaS billing system

Building auth + Stripe + a server backend is **weeks of work** plus ongoing maintenance — and it adds friction to first-time users (the people you can't afford to lose). So skip the paywall and make money *on the side* of a free product:

| Stream | Up-front cost | Time to first $ | Realistic ceiling |
|---|---|---|---|
| **Ko-fi / Buy Me a Coffee donations** | $0 | days | $20–$200/mo |
| **Affiliate links** (books, courses, AI tools) | $0 | weeks | $50–$1000/mo |
| **Sponsored content** on your YouTube/blog | $0 | months | $200–$2k/mo |
| **Paid digital product** (PDF / Notion template) via Gumroad | $0 | weeks | $100–$2000/mo |
| **GitHub Sponsors** on the repo | $0 | weeks | $20–$200/mo |
| **Open-source consulting / freelance leads** | $0 | months | $1k+/project |

All live within a week, all $0 to set up, none need a backend or a credit-card form.

---

## Part 2 — The four free monetization streams

### Stream 1: Donations (easiest, ship in 30 min)

**Tools — pick one, all free:**
- **Ko-fi** (https://ko-fi.com) — 0% fee on donations, simple widget.
- **Buy Me a Coffee** (https://buymeacoffee.com) — same idea, 0% on one-off tips.
- **GitHub Sponsors** — if you make the repo public, "sponsor this developer" button at the top.

**Where to surface:**
1. Small ❤️ **Support** button in the app header → links to your Ko-fi.
2. After a strong interview feedback score (≥7/10), one-time toast: *"Nailed it? Tip the dev ☕"*.
3. Tagline near the footer: *"Free forever — if it helped you land an offer, buy me a coffee."*

**Expected:** $5–$50/mo at low traffic. Scales with users. Costs nothing.

---

### Stream 2: Affiliate links (set up in 2 hours, passive forever)

The app already has natural "recommend a resource" moments — interview feedback ("brush up on consistent hashing"), study topics, gap analysis. Each one is an affiliate-link opportunity.

**Programs to join (all free, no traffic minimums):**
- **Amazon Associates** — books like *Designing Data-Intensive Applications*, *System Design Interview Vol 1/2*. ~3% commission.
- **Educative.io affiliate** — "Grokking the System Design Interview". ~50% on first purchase.
- **ByteByteGo affiliate** — Alex Xu's newsletter/course. ~30%.
- **DesignGurus affiliate** — system design courses. ~30%.
- **Manning Publications** — software books. ~15%.

**Where to plug:**
1. Interview feedback → "📚 Recommended" card with 1–2 affiliate links tied to the weak area.
2. Study mode → "📖 Further reading" footer per topic.
3. Home → `/resources` section: *"Books that made me a better engineer"* — 5–10 affiliate links with one-line reviews.

**Expected:** $20–$300/mo with a few hundred weekly users. Zero ongoing work.

---

### Stream 3: Paid digital product (highest leverage free play)

**Sell a one-time digital download** related to the app, hosted on a free-up-front platform that takes a small cut only when you sell.

**Platforms:**
- **Gumroad** — 10% per sale, no monthly fee, instant payout. No domain needed.
- **Lemon Squeezy** — 5% + 50¢ per sale, handles EU VAT for you.
- **Payhip** — 5% per sale, free forever.

**Product ideas you can ship in a weekend:**

| Product | Price | Effort | Why it sells |
|---|---|---|---|
| **"50 Real System Design Questions" PDF** (curated questions + sample senior-level answers) | $9–$19 | 1 weekend | Impulse buy after a free interview |
| **"Senior Engineer Interview Prep" Notion template** (study tracker, weak-spot log) | $12 | 1 day | Templates sell well |
| **"7-Day Interview Crash Course" email drip** (Buttondown free tier) | $29 | 2 weekends | Structured = perceived value |
| **AI-graded Mock Interview Pack** — pre-built sessions + model answers | $19–$39 | 2 weekends | Pairs naturally with the free app |
| **Company-specific prep packs** ("Google L5", "Meta E5") | $19 each | 1 weekend per company | Long-tail SEO gold |

**Where to plug:**
- After interview feedback: *"Want 50 more questions like this? → $9 pack"*.
- Home page: dedicated "💎 Pro Pack" card.
- LinkedIn launch post: PS line.

**Expected:** 1% of monthly users buy at $15 → 1k users = $150/mo, 10k users = $1.5k/mo. **This is the realistic primary income.**

---

### Stream 4: YouTube/blog content with sponsorships (slower but compounding)

Once the app has a few hundred users, monetize **content about the app**:

1. Record yourself doing a real mock interview against your own app — narrate why each question matters.
2. Post on YouTube (free) + a blog post on **dev.to** or **Hashnode** (both free, both have built-in audiences).
3. Each video/post links to the free app + your Gumroad pack + affiliate books.
4. After 1000 subs + 4000 watch hours → YouTube ad revenue ($2–$10 per 1000 views).
5. **Before** that → take sponsorships from courses (Educative, ByteByteGo, Hello Interview) for $200–$1000 per video even at modest sizes.

This compounds: videos → users → product sales + affiliate clicks + donations → funds more videos.

---

## Part 3 — Customer Acquisition (the hard part)

Building the streams is easy. Getting users **without spending money or having connections** is the real work. Playbook in launch order.

### Phase A — Pre-launch (1 week before LinkedIn post)

**Goal: 20–50 users + 5 testimonials BEFORE going public.**

1. **DM 10–15 friends/ex-colleagues individually** on LinkedIn or WhatsApp. Don't post publicly yet. Ask them to try it and give one piece of feedback. ~5 will actually use it.
2. **Post in 3 small Slack / Discord communities** you're already in (former bootcamp, work alumni, university CS group). Low-key: *"Built a thing, would love brutal feedback before launch."*
3. **Collect 3–5 short testimonials.** A line like *"Caught a gap in my consistent-hashing knowledge I'd never noticed"* is gold. Save screenshots.
4. **Fix the top 3 friction points** they report. This is the most valuable week of work you'll do.

### Phase B — The LinkedIn launch (your one shot — don't waste it)

Treat the launch post like a product release, not a status update. **Don't go live too early on a small connection base.**

**Structure of the post:**
- **Hook (line 1):** A surprising stat or pain. *"I bombed 3 system design loops before I realized the problem wasn't my knowledge — it was that no one ever pushed back on my designs."*
- **What it is (2–3 lines):** Free AI interviewer that reads your whiteboard, challenges your design, grades the work. Built it because Pramp is dead and Interviewing.io is $500/session.
- **Proof (1 line + screenshot/GIF):** Screenshot of whiteboard + feedback. **Visuals get 5x reach on LinkedIn.**
- **CTA:** *"It's free, no signup. Try it: \[link\]. If it helps, a like means a lot."*
- **PS:** *"Want my 50-question prep pack? $9 here: \[link\]."*

**Maximize the launch (free tactics):**
- Post **Tuesday or Wednesday, 8–10am your timezone**.
- In the first hour, message 5–10 close contacts and ask them to comment with a **real question** (not "Nice!" — algorithm down-weights generic comments).
- Reply to every comment in the first 4 hours. LinkedIn rewards conversations.
- **Don't put the link in the post itself.** Put it in the **first comment**. LinkedIn down-ranks posts with external links — this almost doubles reach.
- Re-post a different angle 1 week later (e.g., "Lessons I learned shipping a free AI tool to 500 users"). Squeeze multiple posts from one launch.

### Phase C — Reddit (this is where the real traffic comes from)

Reddit will likely outperform LinkedIn 10:1 for users **if you do it right**.

**Subreddits, in order:**
1. **r/cscareerquestions** (1.3M) — frame as story: "Built a free system design practice tool — here's what I learned."
2. **r/ExperiencedDevs** (350k) — for seniors: "AI mock interviewer that actually pushes back."
3. **r/SideProject** — supportive crowd, perfect for launches.
4. **r/InternetIsBeautiful** — broad audience, can drive a viral spike.
5. **r/learnprogramming** — for juniors.
6. **r/systemdesign** — smaller but laser-targeted.

**Rules to not get banned:**
- Read each subreddit's rules first. Many require contributions before self-promo.
- Lead with a **story, not a pitch**. Title: *"After failing 3 system design loops, I built my own AI mock interviewer"* (not *"Check out my new app!!!"*).
- Engage with every comment for 24h.
- Don't spam the same post to 6 subs in one day — space them across 2 weeks.

### Phase D — SEO long tail (slow but compounding, costs nothing)

The app is uniquely positioned for long-tail queries like *"system design interview Google L5 example"*. Playbook:

1. Write 1 blog post per week on **dev.to** OR **Hashnode** (both free, both have built-in audiences):
   - *"How to answer the 'design Twitter' question in 30 minutes"*
   - *"5 mistakes I see in 90% of system design interviews"*
   - *"How to use AI to prepare for FAANG interviews"*
2. Each post links to the free app + your Gumroad pack.
3. After 10 posts, dev.to starts ranking you on Google for niche queries.

**Bonus multiplier:** Cross-post each dev.to article to **Medium** (free) and **LinkedIn articles** (free) — 3 audiences from one piece of writing.

### Phase E — Other free channels worth 1–2 hours each

| Channel | Effort | Expected outcome |
|---|---|---|
| **Hacker News "Show HN"** | 30 min | Spike of 200–2000 users *if* it hits front page. Submit Tue 8am ET. |
| **Product Hunt launch** | 1 day | 50–500 users + permanent backlinks. Do it after 50 happy users. |
| **Indie Hackers post** | 30 min | Small but high-quality founder/buyer audience. |
| **Twitter/X with build-in-public threads** | ongoing | Slow start, compounds. Tag @levelsio, indie hacker influencers. |
| **GitHub repo with polished README** | 1 hour | "How I built X" repos earn organic stars + traffic. |
| **Chrome extension wrapper** | 1 weekend | Chrome Web Store = free distribution channel. |

---

## Part 4 — The 1-week starter sprint ($0, ship-everything-at-once)

A concrete checklist. Do this in **one weekend** with $0:

- [ ] Sign up for **Ko-fi** → add ❤️ Support button to header in `index.html`.
- [ ] Sign up for **Amazon Associates** + **Educative** affiliate programs.
- [ ] Add a "📚 Recommended Resources" card to interview feedback with 2–3 affiliate links.
- [ ] Sign up for **Gumroad**.
- [ ] Spend one weekend writing a **"50 System Design Questions PDF"** (use existing question library + ChatGPT to draft sample answers, you edit). Sell for $9.
- [ ] Add a `/resources` or "Pro Pack" card on the Home page linking to the Gumroad product.
- [ ] Add a one-time post-interview toast: *"Want 50 more? → $9 pack"*.
- [ ] DM 10 contacts → ask for honest feedback + collect testimonial quotes.
- [ ] Schedule the LinkedIn launch post for a Tuesday morning, 2 weeks out.

**Expected break-even timeline:**
- **Week 1:** First $5 donation from launch traffic.
- **Month 1:** First Gumroad sale, $9–$45 in affiliate clicks.
- **Month 3:** $50–$200/mo if launch + 1 Reddit hit landed well.
- **Month 6:** $200–$1000/mo with weekly content + Pro Pack iteration.

---

## Part 5 — Day-by-day starter sprint

| Day | Task |
|---|---|
| **Mon** | Set up Ko-fi + add Support button to header |
| **Tue** | Sign up for Amazon Associates + Educative; add Recommended Resources to feedback |
| **Wed** | Draft "50 System Design Questions" PDF (AI scaffold → you edit) |
| **Thu** | Finish PDF + Canva cover image; upload to Gumroad |
| **Fri** | Add "Pro Pack" card to Home + post-interview upsell toast |
| **Sat** | DM 10 contacts for feedback; collect testimonials |
| **Sun** | Write & schedule LinkedIn launch post for next Tuesday |

After this week: **3 live income streams + launch booked, all for $0.**

---

## Part 6 — Graduation checklist: when to invest in paid infrastructure

Don't add a paywall until **all** of these are true:
- ✅ 100+ weekly active users
- ✅ $200+/mo from the free streams
- ✅ At least 20 people have asked you *"Is there a Pro version?"*

Until then, every hour spent on auth/Stripe is better spent on **content and customer acquisition**. When you DO graduate, see Phase 4 in [TECHNICAL_ROADMAP.md](./TECHNICAL_ROADMAP.md) for the engineering work.

---

## Part 7 — Honest numbers and expectations

- **A small LinkedIn network is fine.** Most viral posts come from non-followers via the algorithm picking up early engagement. Post quality > follower count.
- **Reddit is your highest-leverage acquisition channel** for this product. Don't underweight it.
- **Affiliate income is real but slow** — expect $20–$100/mo in the first 6 months.
- **Digital products are the realistic primary income.** A $9 PDF selling 30 copies/mo = $270/mo, more than most affiliate setups.
- **Don't quit your job.** Treat this as a side stream until it's $1k/mo consistently for 3+ months.

---

## Part 8 — Marketing copy assets to prep (reusable across channels)

Write these ONCE, reuse everywhere:

- [ ] **One-line elevator pitch** — *"Free AI interviewer that reads your whiteboard, pushes back on your design, and grades your work — so you walk into the real loop without surprises."*
- [ ] **3-sentence "About" blurb** — for LinkedIn, GitHub, Product Hunt.
- [ ] **5-bullet feature list** — for the landing page, Product Hunt, README.
- [ ] **Hero screenshot** — clean, high-res, shows the whiteboard + chat together.
- [ ] **15-second demo GIF** — record with QuickTime, compress with ezgif.com. Use everywhere.
- [ ] **Founder story (200 words)** — *"Why I built this"* — pinned on your LinkedIn profile, the Home page, dev.to bio.
- [ ] **3 testimonials with photos + names** — from the pre-launch DM round.

---

*Companion doc: [TECHNICAL_ROADMAP.md](./TECHNICAL_ROADMAP.md) — what to build in the code.*
*Last updated: 2026-05-19*
