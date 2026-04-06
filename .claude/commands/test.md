Test the InterviewApp interview logic end-to-end without requiring a browser or running server.

Runs two types of checks: (1) fast static analysis of `buildSystemPrompt()` and `callAI()` source code, and (2) behavioral simulation of a scripted conversation. Produces a structured report with CRITICAL and NON-CRITICAL severity tiers.

---

## Test question and configs

Both configs use the same question:
> "Design a URL shortener at global scale."

**Config A — Balanced / mid-level**
```
style:      "Balanced"
level:      "mid-level"
focusAreas: ["Scalability", "Reliability"]
```

**Config B — Strict / senior**
```
style:      "Strict"
level:      "senior"
focusAreas: ["Scalability", "Reliability", "Latency"]
```

---

## CHECK 1 — buildSystemPrompt() integrity (CRITICAL, static)

Read `~/Desktop/InterviewApp/index.html` lines 548–625. Extract the `buildSystemPrompt` function. Call it mentally/logically with each config to produce the two system prompts.

For each generated prompt, verify the following markers are present using **substring / pattern matching** (not exact string matching). A marker passes if ANY of its listed acceptable variants is found.

| # | Marker | Acceptable variants (substring match) | Severity |
|---|--------|---------------------------------------|----------|
| 1 | Phase 1 scoping | prompt contains `PHASE 1` AND `scoping` | CRITICAL |
| 2 | Phase 2 design | prompt contains `PHASE 2` AND (`design` OR `blueprint`) | CRITICAL |
| 3 | Phase 3 deep dive | prompt contains `PHASE 3` AND (`deep` OR `probe`) | CRITICAL |
| 4 | Phase 4 wrap-up | prompt contains `PHASE 4` AND (`wrap` OR `failure`) | CRITICAL |
| 5 | Interviewer rules block | prompt contains `INTERVIEWER RULES` | CRITICAL |
| 6 | Special commands block | prompt contains `SPECIAL COMMANDS` | CRITICAL |
| 7 | Response format | prompt contains `RESPONSE FORMAT` AND `sentence` | CRITICAL |
| 8 | feedback command | prompt contains `"feedback"` | CRITICAL |
| 9 | hint command | prompt contains `"hint"` | CRITICAL |
| 10 | give full answer command | prompt contains `"give full answer"` | CRITICAL |
| 11 | Style string (Config A) | prompt contains `slightly challenging` | CRITICAL |
| 11 | Style string (Config B) | prompt contains `challenging and direct` | CRITICAL |
| 12 | Level string (Config A) | prompt contains `3–6 yrs` OR `mid-level` | CRITICAL |
| 12 | Level string (Config B) | prompt contains `6+` OR `senior` | CRITICAL |
| 13 | Question interpolated | prompt contains the exact question string | CRITICAL |

**Run these 13 checks × 2 configs = 26 static checks total.**

---

## CHECK 2 — callAI() contract (CRITICAL, static)

Read `~/Desktop/InterviewApp/index.html` lines 628–684. Inspect the `callAI` function source. Verify each of the following by reading the code — no execution needed.

| # | Check | What to look for | Severity |
|---|-------|-----------------|----------|
| 1 | custom provider sends `system` field | `system: sysPrompt` inside the JSON body for the custom branch | CRITICAL |
| 2 | anthropic provider sends `x-api-key` | `'x-api-key': key` in the headers object | CRITICAL |
| 3 | anthropic provider sends API version header | `'anthropic-version':` present in headers | CRITICAL |
| 4 | openai provider prepends system as first message | pattern like `[{ role: 'system', content: sysPrompt }, ...messages]` | CRITICAL |
| 5 | error path exists per provider | `.error` check or try-catch present for at least anthropic and openai branches | CRITICAL |
| 6 | response extraction covers both formats | `d.content?.[0]?.text` OR `d.choices?.[0]?.message?.content` pattern present | CRITICAL |

**6 static checks total.**

---

## CHECK 3 — Scripted conversation simulation (behavioral)

Use your own AI capability to simulate the interviewer. For each config, activate the system prompt you built in Check 1 and role-play as the interviewer responding to each candidate turn in sequence. Maintain a running conversation history (`[{role, content}]`) as the app does.

Run both Config A and Config B through the full script below. Pass conditions use **pattern/substring matching**, not exact responses.

| Turn | Candidate says | Pass condition | Severity |
|------|---------------|----------------|----------|
| T0 | `"Start."` | Response is ≤2 sentences AND does NOT contain any of (`load balancer`, `database`, `cache`, `CDN`, `API gateway`, `hash service`) AND does NOT ask candidate to provide requirements | CRITICAL |
| T1 | `"Let me just start designing — I'll use a distributed hash table with consistent hashing."` | Response contains at least one of: `before`, `question`, `clarif`, `requirement`, `scope`, `ask` (pushback pattern) | CRITICAL |
| T2 | `"How many users are we expecting?"` | Response contains a concrete number — any digit sequence, or `million`, `billion`, `M DAU`, `B users` | CRITICAL |
| T3 | `"What's the read-to-write ratio and do we need analytics?"` | Response addresses both parts — contains a ratio indicator (`:`, `to-`, `ratio`, `reads`) AND a yes/no on analytics | NON-CRITICAL |
| T4 | `"OK — 100M DAU, high read ratio. High-level: web server, hash service, SQL DB."` | Response ends with `?` (follow-up question) AND does not open by restating the candidate's design verbatim | NON-CRITICAL |
| T5 | `"For the DB I'll use PostgreSQL with an index on the short code column."` | Response contains at least one probe word: `why`, `scale`, `bottleneck`, `tradeoff`, `alternative`, `million`, `justify`, `limitation` | NON-CRITICAL |
| T6 | `"hint"` | Response is ≤3 sentences AND contains ≤2 named architecture components (i.e. does NOT dump a full solution) | CRITICAL |
| T7 | `"I'd add Redis in front of the DB to cache reads."` | Response ends with `?` (probing follow-up) | NON-CRITICAL |
| T8 | `"What happens if the hash service goes down?"` | Response contains at least one of: `replac`, `failover`, `backup`, `retry`, `redundan`, `crash`, `replica`, `recover` | NON-CRITICAL |
| T9 | `"feedback"` | Response contains ALL THREE: a strengths signal (`strength`, `well`, `good`, `solid`), a gaps signal (`gap`, `miss`, `weak`, `improve`, `could`), and a score signal (`/10`, `out of 10`, `score`) | CRITICAL |
| T10 | `"give full answer"` | Response length is >3× the average length of T0–T8 responses AND contains ≥3 architecture component terms from: `load balancer`, `cache`, `database`, `CDN`, `hash`, `replication`, `sharding`, `queue` | CRITICAL |

---

## CHECK 4 — Format checks (NON-CRITICAL, T0–T8 only)

For each of T0–T8 in both configs:

- **No bullet points:** response lines do not start with `- `, `• `, or `* `
- **Sentence count ≤ 5:** count sentence-ending punctuation (`.`, `?`, `!`); fail if > 5
- **No filler opener:** response does not start with `Certainly`, `Of course`, `Great question`, `Sure!`, `Absolutely`

---

## CHECK 5 — Style differentiation (NON-CRITICAL)

Compare Config A and Config B responses at T4 and T5.

**PASS** if at least one of:
- Config B response contains demanding language not in Config A: `justify`, `prove`, `failure mode`, `why not`, `what's the downside`
- Config B response does NOT contain encouraging language that Config A does: `good`, `nice`, `solid`, `that makes sense`

**FAIL** if both responses are near-identical in tone.

---

## Behavioral failure handling rule

For any **NON-CRITICAL** behavioral check failure (Checks 3–5):
1. Make **at most one** targeted tweak to the relevant section of `buildSystemPrompt()` in `index.html`
2. Re-simulate only that specific turn once
3. If it still fails → mark as **MODEL VARIANCE** (not a code bug), log it, and do NOT retry again
4. Do NOT make cascading edits across multiple prompt sections

---

## Report format

Print the full report in this structure:

```
═══════════════════════════════════════════════════════
 INTERVIEWAPP TEST REPORT
═══════════════════════════════════════════════════════

── CHECK 1: buildSystemPrompt() integrity ─────────────
  Config A (Balanced / mid-level)
  ✅ PHASE 1 scoping present
  ✅ PHASE 2 design present
  ✅ PHASE 3 deep dive present
  ✅ PHASE 4 wrap-up present
  ✅ INTERVIEWER RULES present
  ✅ SPECIAL COMMANDS present
  ✅ RESPONSE FORMAT + sentence present
  ✅ "feedback" command present
  ✅ "hint" command present
  ✅ "give full answer" command present
  ✅ Style string (slightly challenging) present
  ✅ Level string (mid-level / 3–6 yrs) present
  ✅ Question interpolated
  Config B (Strict / senior): [same 13 lines]

── CHECK 2: callAI() contract ─────────────────────────
  ✅ custom branch sends system field
  ✅ anthropic branch sends x-api-key header
  ✅ anthropic branch sends anthropic-version header
  ✅ openai branch prepends system message
  ✅ error path present for anthropic and openai
  ✅ response extraction covers both formats

── CHECK 3: Scripted conversation (Config A) ──────────
  T0  Opening move          [CRITICAL]  ✅ PASS – short, no solution
  T1  Pushback on skip      [CRITICAL]  ✅ PASS – pushback detected
  T2  Concrete number       [CRITICAL]  ✅ PASS – "100M DAU"
  T3  Ratio + analytics     [non-crit]  ✅ PASS
  T4  Follow-up question    [non-crit]  ✅ PASS
  T5  DB probe              [non-crit]  ✅ PASS
  T6  Hint not a lecture    [CRITICAL]  ✅ PASS – 2 sentences
  T7  Redis probe           [non-crit]  ✅ PASS
  T8  Failure engagement    [non-crit]  ✅ PASS
  T9  Feedback structured   [CRITICAL]  ✅ PASS – score + strengths + gaps
  T10 Full answer revealed  [CRITICAL]  ✅ PASS – long + 4 components

── CHECK 3: Scripted conversation (Config B) ──────────
  [same 11 lines]

── CHECK 4: Format checks (both configs) ──────────────
  ✅ No bullet points in any turn
  ✅ All turns ≤ 5 sentences
  ✅ No filler openers detected

── CHECK 5: Style differentiation ────────────────────
  ✅ PASS – Config B noticeably harder at T4/T5

───────────────────────────────────────────────────────
CRITICAL checks:  XX / YY passed
NON-CRITICAL checks: XX / YY passed  (failures = model variance, not blocking)
OVERALL STATUS: ✅ ALL CRITICAL PASS  [or ❌ N CRITICAL FAILURES — DO NOT DEPLOY]
═══════════════════════════════════════════════════════
```

For any FAIL, quote the actual response text (truncated to 200 chars) that caused the failure immediately below the failed line.

**If any CRITICAL check fails, mark OVERALL STATUS as ❌ CRITICAL FAILURES — DO NOT DEPLOY.**
**If only NON-CRITICAL checks fail, mark OVERALL STATUS as ✅ CRITICAL PASS (with warnings).**
