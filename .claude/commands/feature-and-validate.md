Implement a feature for InterviewApp with a quality gate: classifies the change, delegates to the right agent (or implements inline), runs /test, fixes any critical failures, then deploys.

## 1. Understand
Ask the user ONE concise question if their request is ambiguous. Otherwise skip to step 2.

## 2. Classify the change
Decide the best implementation path based on what the feature touches:

| Change type | Path |
|-------------|------|
| UI / layout / CSS / HTML appearance | Delegate to **@ui-designer** |
| Interview prompt behavior / AI tone / hint rules | Delegate to **@prompt-tune** |
| JS logic, callAI(), new feature, anything else | Implement **inline** (steps below) |

## 3. Implement

### If delegating to @ui-designer:
Say: "Use the ui-designer agent to [precise task description]."
The agent works in its isolated context and returns. Do not also implement inline.

### If delegating to @prompt-tune:
Say: "Use the prompt-tune agent to [precise behavioral complaint]."
The agent proposes a fix, waits for approval, then applies it. Do not also implement inline.

### If implementing inline:
- Make the change to `~/Desktop/InterviewApp/index.html` (and any other relevant files)
- Minimal changes only — don't rewrite what isn't touched
- Match existing code style exactly
- No new frameworks, no build steps

## 4. Test
Run /test. Read the full report carefully, noting which failures are CRITICAL vs NON-CRITICAL.

**If OVERALL STATUS is ✅ ALL CRITICAL PASS (or CRITICAL PASS with warnings):**
→ Proceed to step 5.

**If OVERALL STATUS is ❌ CRITICAL FAILURES:**
→ Apply one targeted fix per failure using the fix playbook below.
→ If the original change was done via an agent, push the fix request back to that same agent with the specific failure details.
→ Re-run /test once.
→ If critical failures still remain after one fix attempt: STOP. Report to the user which failures could not be fixed and do NOT deploy.

### Fix playbook (critical failures only)

| Failure | Location in index.html | Fix |
|---------|------------------------|-----|
| Missing PHASE 1/2/3/4 section | `buildSystemPrompt()` template literal | Restore the missing phase block |
| Missing INTERVIEWER RULES / SPECIAL COMMANDS / RESPONSE FORMAT | Same template literal | Restore the missing section header and content |
| Wrong style string (Strict/Balanced/Friendly) | `styleGuide` object | Verify keys exactly: `Strict`, `Balanced`, `Friendly` |
| Wrong level string | `levelExp` object | Verify keys exactly: `junior`, `'mid-level'`, `senior` (note quoted key) |
| Question not interpolated in prompt | `QUESTION: "${question}"` line | Restore the interpolation |
| T0 gives solution or asks for requirements | Final paragraph of template literal | Restore: "One sentence. Do NOT ask the candidate for requirements" |
| hint / feedback / give full answer broken | `SPECIAL COMMANDS:` block | Restore all three command definitions with exact trigger words in quotes |
| callAI() missing headers or response parsing | `callAI()` function | Restore the affected provider branch (x-api-key, anthropic-version, system prepend, error check) |

Non-critical failures (format, style drift, soft behavioral variation) → log them in the summary, do NOT attempt fixes.

## 5. Deploy
Run /deploy to push index.html to production.

## 6. Confirm
Tell the user:
- What feature was implemented
- Which path was used: @ui-designer / @prompt-tune / inline
- Test result: critical X/Y passed, non-critical X/Y passed
- Any fixes that were applied (or "none")
- Any non-critical warnings to be aware of
- Live at https://zealous-pond-0e6b2f103.2.azurestaticapps.net
