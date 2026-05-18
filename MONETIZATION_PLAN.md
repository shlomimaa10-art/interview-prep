# Monetization Plan — $0 Budget Edition

A step-by-step plan to start earning money from the InterviewApp **without paying for anything** (no Stripe fees up front, no domain, no paid ads, no paid backend). Everything in this doc uses free tiers or revenue-share platforms that only take a cut when you actually earn.

> **Live app:** https://zealous-pond-0e6b2f103.2.azurestaticapps.net
> **Strategy in one line:** Keep the app 100% free (BYO API key), monetize *around* it via donations, affiliate links, sponsored content, and a paid "coaching pack" — then drive traffic with one big LinkedIn launch + organic SEO/Reddit/YouTube.

---

## Part 1 — Why "free app, paid extras" is the right model for you

You have:
- ✅ A working product already deployed
- ✅ No domain, no backend, no payment system
- ✅ A small LinkedIn network
- ❌ No budget
- ❌ No time to run a SaaS billing system

Building auth + Stripe + a server backend is **weeks of work** and a real ongoing maintenance burden. Worse, it adds friction to first-time users — exactly the people you can't afford to lose. So instead of putting a paywall in front of the app, **make money on the side of a free product**:

| Stream | Up-front cost | Time to first $ | Ceiling |
|---|---|---|---|
| **"Buy me a coffee" / Ko-fi donations** | $0 | days | low ($20–$200/mo) |
| **Affiliate links** (books, courses, AI tools) | $0 | weeks | medium ($50–$1000/mo) |
| **Sponsored content** on your YouTube/blog about the app | $0 | months | medium-high |
| **Paid digital product** (PDF interview pack, Notion template) sold via Gumroad/Lemonsqueezy | $0 | weeks | medium ($100–$2000/mo) |
| **GitHub Sponsors** on the repo | $0 | weeks | low-medium |
| **Open-source consulting / freelance leads from the app** | $0 | months | highest ($1k+/project) |

All of these can be live within a week, all are $0 to set up, and none require a backend or a credit-card form on your site.

---

## Part 2 — Free monetization streams, in order of effort

### Stream 1: Donations (easiest, ship in 30 min)

**Tools — pick one, all free:**
- **Ko-fi** (https://ko-fi.com) — no fees on donations, has a "Buy me a coffee" widget
- **Buy Me a Coffee** (https://buymeacoffee.com) — same idea, 0% platform fee on one-off tips
- **GitHub Sponsors** — if you push this repo public, Anthropic-style "sponsor this developer" button

**Steps:**
1. Create a Ko-fi or BuyMeACoffee account (5 min, no ID needed up to a threshold).
2. Add a small ❤️ **Support** button to the app header in `index.html` linking to your Ko-fi page.
3. Add a one-line tagline: *"This is free forever — if it helped you land an offer, buy me a coffee ☕."*
4. After a user finishes an interview and gets feedback ≥ 7/10, show a one-time toast: *"Nailed it? Tip the dev →"*.

**Expected:** $5–$50/mo at low traffic. Scales with users. Costs nothing.

---

### Stream 2: Affiliate links (set up in 2 hours, passive forever)

The app already has natural "recommend a resource" moments — feedback ("you should brush up on consistent hashing"), study mode topics, gap analysis. Each one is an affiliate link opportunity.

**Programs to join (all free, no minimum traffic):**
- **Amazon Associates** — books like *Designing Data-Intensive Applications*, *System Design Interview Vol 1/2*. ~3% commission.
- **Educative.io affiliate** — "Grokking the System Design Interview" course. 50% commission on first purchase.
- **ByteByteGo affiliate** — Alex Xu's newsletter/course. ~30% commission.
- **DesignGurus affiliate** — system design courses, ~30%.
- **Manning Publications** affiliate — software books, ~15%.

**How to wire it in:**
1. In the interview **feedback** screen, when a weak area is named, render a small "📚 Recommended" card with an affiliate link to a relevant book/course.
2. In **Study mode**, each curated topic gets a "📖 Further reading" footer with one affiliate link.
3. Add a `/resources` section in the Home page: *"Books that made me a better engineer"* — 5–10 affiliate links with one-sentence reviews.

**Expected:** $20–$300/mo once you have a few hundred weekly users. Scales linearly with traffic. Zero ongoing work after setup.

---

### Stream 3: Paid digital product (the highest leverage free play)

This is where the real money is. You sell a **one-time digital download** related to the app, hosted on a platform that's free until you sell:

**Platforms (all free up-front, take a small cut per sale):**
- **Gumroad** — 10% per sale, no monthly fee, instant payout. No domain needed.
- **Lemon Squeezy** — 5% + 50¢ per sale, handles EU VAT for you.
- **Payhip** — 5% per sale, free tier forever.

**Product ideas you can ship in a weekend:**

| Product | Price | Effort | Why it sells |
|---|---|---|---|
| **"50 Real System Design Questions" PDF** (curated from your library + sample answers) | $9–$19 | 1 weekend | Cheap impulse buy after a free interview |
| **"Senior Engineer Interview Prep" Notion template** (study tracker, weak-spot log) | $12 | 1 day | Templates sell well, low effort |
| **"7-Day Interview Crash Course" email drip** (ConvertKit free tier) | $29 | 2 weekends | Structured = perceived value |
| **AI-graded Mock Interview Pack** — pre-built sessions with model answers + your commentary | $19–$39 | 2 weekends | Pairs naturally with the free app |
| **Company-specific prep packs** ("Google L5 SysDesign Pack", "Meta E5 Pack") | $19 each | 1 weekend per company | Long-tail SEO gold |

**Where to plug it:**
- After interview feedback: *"Want 50 more questions like this? → Get the pack ($9)"*
- On the Home page in a dedicated "Pro Pack" card.
- In your LinkedIn launch post (see Part 3).

**Expected:** If 1% of monthly users buy at $15, and you reach 1000 monthly users → $150/mo. Reach 10k users → $1.5k/mo. This is the realistic primary income stream.

---

### Stream 4: YouTube/blog content with sponsorships (slower but compounding)

Once the app has a few hundred users, you can monetize **content about the app**:

1. Record yourself doing a real mock interview against your own app — narrate why each question matters.
2. Post on YouTube (free) + write a blog post on **dev.to** or **Hashnode** (free).
3. Each video/post links to the free app + your Gumroad pack + affiliate books.
4. After 1000 subscribers + 4000 watch hours → YouTube ad revenue ($2–$10 per 1000 views).
5. Before that → you can take sponsorships from courses (Educative, ByteByteGo, Hello Interview) for $200–$1000 per video at modest channel sizes.

This compounds: every video drives users → users drive product sales + donations + affiliate clicks → revenue funds more videos.

---

## Part 3 — Customer Acquisition (the hard part, since your network is small)

Building the streams is easy. Getting **users without spending money or having connections** is the real work. Here's the playbook in launch order.

### Phase A — Pre-launch (1 week before LinkedIn post)

**Goal: have 20–50 users + 5 testimonials before going public.**

1. **DM 10–15 friends/ex-colleagues individually** on LinkedIn or WhatsApp. Don't post publicly yet. Ask them to try it and give one piece of feedback. ~5 will actually use it.
2. **Post in 3 small Slack/Discord communities** you're already in (former bootcamp, work alumni, university CS group). Low-key: *"Built a thing, would love brutal feedback before I launch."*
3. **Collect 3–5 short testimonials.** A line like *"Caught a gap in my consistent-hashing knowledge I'd never noticed"* is gold. Save screenshots.
4. **Fix the top 3 friction points** they report. This is the most valuable week of work you'll do.

### Phase B — The LinkedIn launch (the one shot)

Since LinkedIn is your main channel, treat the launch post like a product release, not a status update. **Don't waste it on a small connection base by going live too early.**

**Structure of the launch post:**
- **Hook (line 1):** A surprising stat or pain point. *"I bombed 3 system design loops before realizing the problem wasn't my knowledge — it was that no one ever pushed back on my designs."*
- **What it is (2–3 lines):** A free AI interviewer that reads your whiteboard, challenges your design, and grades the work. Built it because Pramp is dead and Interviewing.io is $500/session.
- **Proof (1 line + screenshot/GIF):** A screenshot of the whiteboard + feedback. **Visuals get 5x the reach on LinkedIn.**
- **Call to action:** *"It's free, no signup. Try it: \[link\]. If it helps, a like means a lot."*
- **PS:** *"If you want my 50-question prep pack, it's $9 here: \[link\]."*

**Maximize the launch reach (free LinkedIn tactics):**
- Post **Tuesday or Wednesday, 8–10am your timezone**.
- In the first hour, message 5–10 close contacts and ask them to comment with a real question (not "Nice!" — algorithm down-weights generic comments).
- Reply to every single comment in the first 4 hours. LinkedIn rewards conversations.
- **Don't put the link in the post itself.** Put it in the **first comment**. LinkedIn down-ranks posts with external links — this almost doubles reach.
- Re-post a different angle 1 week later (e.g., "Lessons I learned shipping a free AI tool to 500 users"). Squeeze multiple posts out of the same launch.

### Phase C — Reddit (this is where the real traffic comes from)

Reddit will outperform your LinkedIn 10:1 for users, if you do it right.

**Subreddits to post in, in order:**
1. **r/cscareerquestions** (1.3M members) — frame it as "Built a free system design practice tool, here's what I learned." Don't link-drop, share the *story*.
2. **r/ExperiencedDevs** (350k) — frame for seniors: "AI mock interviewer that actually pushes back."
3. **r/SideProject** — perfect for launches, supportive crowd.
4. **r/InternetIsBeautiful** — broad audience, can drive a viral spike.
5. **r/learnprogramming** — for the juniors.
6. **r/systemdesign** (smaller but laser-targeted).

**Reddit rules to not get banned:**
- Read the subreddit rules before posting. Many require contributions before self-promo.
- Post the tool with a story, not a pitch. Title: *"After failing 3 system design loops, I built my own AI mock interviewer"* (not *"Check out my new app!!!"*).
- Engage with every comment for 24h.
- Don't post the same thing to 6 subs in one day — space them across 2 weeks.

### Phase D — SEO long tail (slow but compounding, costs nothing)

Your app is uniquely positioned to rank for long-tail searches like *"system design interview Google L5 example"*. Free SEO playbook:

1. Write 1 blog post per week on **dev.to** or **Hashnode** (both free, both have built-in audiences):
   - *"How to answer the 'design Twitter' question in 30 minutes"*
   - *"5 mistakes I see in 90% of system design interviews"*
   - *"How to use AI to prepare for FAANG interviews"*
2. Each post links to the free app + your Gumroad pack.
3. After 10 posts, dev.to starts ranking you on Google for niche queries.

**Bonus:** Cross-post each dev.to article to **Medium** (free) and **LinkedIn articles** (free) — 3 audiences for one piece of writing.

### Phase E — Other free channels worth 1–2 hours each

| Channel | Effort | Expected outcome |
|---|---|---|
| **Hacker News "Show HN"** | 30 min | Spike of 200–2000 users *if* it gets to front page; submit Tue 8am ET |
| **Product Hunt launch** | 1 day | 50–500 users + permanent backlinks; do it after you have 50 happy users |
| **Indie Hackers post** | 30 min | Small but high-quality founder/buyer audience |
| **Twitter/X with build-in-public threads** | ongoing | Slow start, compounds; tag @levelsio, indie hacker influencers |
| **GitHub repo with a polished README** | 1 hour | "How I built X" repos get organic stars + traffic |
| **A free Chrome extension** that wraps the app | 1 weekend | Chrome Web Store = free distribution channel |

---

## Part 4 — The minimum viable monetization stack (do this in this order)

A concrete checklist. You can do all of this in **one weekend** with $0:

- [ ] Sign up for **Ko-fi** → add ❤️ Support button to header in `index.html`.
- [ ] Sign up for **Amazon Associates** + **Educative** affiliate programs.
- [ ] Add a "📚 Recommended Resources" card to interview feedback with 2–3 affiliate links.
- [ ] Sign up for **Gumroad**.
- [ ] Spend one weekend writing a **"50 System Design Questions PDF"** (use your existing question library + ChatGPT to draft answers, you edit). Sell for $9.
- [ ] Add a `/resources` or "Pro Pack" card on the Home page linking to the Gumroad product.
- [ ] Add a one-time post-interview toast: *"Want 50 more? → $9 pack"*.
- [ ] Write 3 testimonial requests to friends who've tried the app.
- [ ] Schedule the LinkedIn launch post for a Tuesday morning, 2 weeks out.

**Expected break-even timeline:**
- Week 1: First $5 donation from launch traffic.
- Month 1: First Gumroad sale, $9–$45 affiliate clicks.
- Month 3: $50–$200/mo if launch + 1 Reddit hit landed well.
- Month 6: $200–$1000/mo if you're posting weekly content + iterating on the Pro Pack.

---

## Part 5 — When to graduate to paid infrastructure

Don't build a paywall until you hit **all** of these:
- ✅ 100+ weekly active users
- ✅ $200+/mo from the free streams
- ✅ At least 20 people have asked you "is there a Pro version?"

At that point — and only then — invest a weekend in:
1. Buying a domain (~$12/yr).
2. Adding **Supabase auth** (free tier covers 50k users).
3. Adding **Stripe Checkout** (no monthly fee, 2.9% + 30¢ per sale).
4. A "Pro" tier ($15/mo) that unlocks hosted Claude (your token cost eats some margin but at scale it works).

Until then, every hour you'd spend on auth/Stripe is better spent on **content and customer acquisition**.

---

## Part 6 — One-week starter sprint (when you're ready)

| Day | Task |
|---|---|
| Mon | Set up Ko-fi + add support button to header |
| Tue | Sign up for Amazon Associates + Educative; add Recommended Resources to feedback |
| Wed | Draft "50 System Design Questions" PDF (use AI to scaffold, you edit) |
| Thu | Finish PDF + cover image (Canva free tier); upload to Gumroad |
| Fri | Add "Pro Pack" card to Home; add post-interview upsell toast |
| Sat | DM 10 contacts for feedback; collect testimonials |
| Sun | Write & schedule LinkedIn launch post for next Tuesday |

After this week you have **3 income streams live** and a launch booked — all for $0.

---

## Appendix — Numbers to be honest about

- **A small LinkedIn network is fine.** Most viral posts come from non-followers via the algorithm picking up early engagement. Quality of the post matters more than follower count.
- **Reddit is your highest-leverage acquisition channel** for this product. Don't underweight it.
- **Affiliate income is real but slow** — don't expect more than $20–$100/mo in the first 6 months.
- **Digital products are the realistic primary income.** A $9 PDF that sells 30 copies/month is $270/mo — more than most affiliate setups.
- **Don't quit your job for this.** Treat it as a side stream until it hits $1k/mo consistently for 3+ months.

---

*Last updated: 2026-05-19*
