You are helping develop the InterviewApp. The user wants to make a change or add a feature.

Follow this workflow:

## 1. Understand
Ask the user ONE concise question if their request is ambiguous. Otherwise skip straight to step 2.

## 2. Plan
Briefly explain (2-4 bullet points) what you're going to change and why. Keep it short.

## 3. Implement
Make the change to ~/Desktop/InterviewApp/index.html (and any other relevant files).
- Minimal changes only — don't rewrite what isn't touched
- Match existing code style exactly
- No new frameworks, no build steps

## 4. Deploy + update docs IN PARALLEL
Once the code change is written, kick off these two agents **in the same message** (single message, two Agent tool calls) so they run concurrently:

- **`deploy`** agent: deploys the current `index.html` to the Azure SWA. Pass: "Deploy current state to production."
- **`docs-update`** agent: audits all `.md` files vs the new code state. Pass: `"trigger: feature — <one-line description of what changed>"`

They are independent — deploy doesn't read docs, docs-update doesn't write code.

## 5. Commit + push (as soon as docs-update returns — don't wait for deploy)
The moment **`docs-update`** returns, immediately invoke the **`git-manager`** agent to stage, commit, and push everything (code + doc edits). Do NOT wait for the deploy agent to finish — the commit is independent of the deploy result.

Pass git-manager a one-line summary of the feature change so it can write a proper commit message.

Then wait for the `deploy` agent to finish (if it hasn't already).

## 6. Confirm
Tell the user:
- What changed and that it's live at https://zealous-pond-0e6b2f103.2.azurestaticapps.net (from the deploy agent)
- Docs update summary (from `docs-update`, or "Docs are up to date — no changes needed")
- Commit SHA + push status (from `git-manager`)
